import { query } from '../db';
import { whatsappService } from './whatsappService';
import { firebaseMessagingService } from './firebase-messaging.service';
import { whatsappCloudService } from './whatsappCloud.service';
import { decryptValue } from '../utils/crypto';

// Concurrency-limiting Queue for notifications (max 20 concurrency)
class NotificationQueue {
  private activeSends = 0;
  private queue: (() => Promise<void>)[] = [];
  private maxConcurrency = 20;

  enqueue(task: () => Promise<void>) {
    this.queue.push(task);
    this.process();
  }

  private process() {
    while (this.activeSends < this.maxConcurrency && this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        this.activeSends++;
        task().finally(() => {
          this.activeSends--;
          this.process();
        });
      }
    }
  }
}

const nQueue = new NotificationQueue();

// Generic helper for retries with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
  backoffFactor = 2
): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (retries <= 0) {
      throw err;
    }
    console.warn(`[NotificationService] Send failed, retrying in ${delay}ms... Error: ${err.message}`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * backoffFactor, backoffFactor);
  }
}

// Simple cron validator running locally without heavy npm packages
function matchesCron(cron: string, date: Date): boolean {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const min = date.getMinutes();
  const hour = date.getHours();
  const dom = date.getDate();
  const month = date.getMonth() + 1; // 0-indexed in JS
  const dow = date.getDay(); // 0 is Sunday

  const matchPart = (part: string, val: number): boolean => {
    if (part === '*') return true;
    if (part.includes(',')) {
      return part.split(',').some(p => matchPart(p, val));
    }
    if (part.startsWith('*/')) {
      const step = parseInt(part.substring(2), 10);
      return val % step === 0;
    }
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(x => parseInt(x, 10));
      return val >= start && val <= end;
    }
    return parseInt(part, 10) === val;
  };

  return (
    matchPart(parts[0], min) &&
    matchPart(parts[1], hour) &&
    matchPart(parts[2], dom) &&
    matchPart(parts[3], month) &&
    matchPart(parts[4], dow)
  );
}

export class NotificationService {
  /**
   * Fetch WhatsApp templates directly from Meta API (No local DB caching)
   */
  async getMetaTemplates(appId?: string) {
    let configs: any[] = [];
    if (appId) {
      const res = await query(
        `SELECT api_key, waba_id FROM whatsapp_config WHERE app_id = $1 AND enabled = true`,
        [appId]
      );
      configs = res.rows;
    } else {
      const res = await query(
        `SELECT api_key, waba_id FROM whatsapp_config WHERE enabled = true`
      );
      configs = res.rows;
    }

    if (configs.length === 0) {
      // Fallback to global config if available
      const wabaId = process.env['WHATSAPP_WABA_ID'] || '';
      const token = process.env['WHATSAPP_TOKEN'] || '';
      if (wabaId && token) {
        configs = [{ api_key: token, waba_id: wabaId }];
      }
    }

    const allTemplates: any[] = [];
    for (const config of configs) {
      const decToken = decryptValue(config.api_key || '');
      const wabaId = config.waba_id;
      if (decToken && wabaId) {
        try {
          const templates = await whatsappCloudService.getMessageTemplates(wabaId, decToken, true);
          for (const t of templates) {
            allTemplates.push({
              ...t,
              wabaId
            });
          }
        } catch (err: any) {
          console.error(`Failed to fetch templates for WABA ${wabaId}:`, err.message);
        }
      }
    }

    // Deduplicate templates by name and language
    const uniqueTemplates: any[] = [];
    const seen = new Set<string>();
    for (const t of allTemplates) {
      const key = `${t.name}_${t.language}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueTemplates.push(t);
      }
    }

    return uniqueTemplates;
  }

  /**
   * Primary route to queue a notification or schedule it
   */
  async queueNotification(
    payload: {
      customerId: string;
      channel: 'whatsapp' | 'push' | 'both';
      template?: string;
      components?: any[];
      pushPayload?: {
        title: string;
        body: string;
        image?: string;
        url?: string;
        priority?: 'normal' | 'high';
        ttl?: number;
      };
      schedule?: {
        sendAt?: string;
        timezone?: string;
        cron?: string;
      };
      attachment?: {
        url: string;
        filename: string;
      };
    },
    sentByUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<any> {
    const { customerId, channel, template, components, pushPayload, schedule, attachment } = payload;

    // Resolve app/project mapping for this customer
    const custProfileRes = await query(
      `SELECT app_id, customer_name, whatsapp_number, primary_email FROM customer_profiles WHERE id = $1`,
      [customerId]
    );
    if (custProfileRes.rows.length === 0) {
      throw new Error('Customer profile not found');
    }
    const customer = custProfileRes.rows[0];
    const projectId = customer.app_id;

    const isScheduled = !!(schedule?.sendAt || schedule?.cron);

    // Helper: log to audit trail
    const logAudit = async (notificationId: string) => {
      try {
        await query(
          `INSERT INTO audit_logs (customer_id, user_id, event, details, ip_address)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            customerId,
            sentByUserId || null,
            'manual_notification_queued',
            JSON.stringify({
              browser: userAgent || 'unknown',
              project_id: projectId,
              notification_id: notificationId,
              channel,
              template: template || 'custom_push',
              scheduled: isScheduled
            }),
            ipAddress || null
          ]
        );
      } catch (auditErr) {
        console.error('[NotificationService] Audit logging failed:', auditErr);
      }
    };

    if (isScheduled) {
      // 1. Log scheduled / pending row
      const schedTime = schedule.sendAt ? new Date(schedule.sendAt) : null;
      const logRes = await query(
        `INSERT INTO notification_logs (customer_id, app_id, channel, event_type, recipient, status, scheduled, scheduled_time, cron_expression, timezone, sent_by, response)
         VALUES ($1, $2, $3, $4, $5, 'pending', true, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          customerId,
          projectId,
          channel,
          template || 'custom_push',
          customer.whatsapp_number || customer.primary_email || 'push_token',
          schedTime,
          schedule.cron || null,
          schedule.timezone || 'UTC',
          sentByUserId || null,
          JSON.stringify({ payload })
        ]
      );
      const logId = logRes.rows[0].id;
      await logAudit(logId);
      return { status: 'scheduled', notificationId: logId };
    }

    // 2. Immediate send (Log separately for each channel if 'both' is selected)
    const channelsToSend: ('whatsapp' | 'push')[] = [];
    if (channel === 'both') {
      channelsToSend.push('whatsapp', 'push');
    } else {
      channelsToSend.push(channel);
    }

    const results: any[] = [];

    for (const chan of channelsToSend) {
      const recipient = chan === 'whatsapp' ? customer.whatsapp_number : 'firebase_push';
      const eventType = chan === 'whatsapp' ? (template || 'unknown') : 'push_alert';

      // Insert pending log
      const logRes = await query(
        `INSERT INTO notification_logs (customer_id, app_id, channel, event_type, recipient, status, sent_by)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6)
         RETURNING id`,
        [customerId, projectId, chan, eventType, recipient || 'unknown', sentByUserId || null]
      );
      const logId = logRes.rows[0].id;
      await logAudit(logId);

      // Enqueue actual delivery task
      nQueue.enqueue(async () => {
        try {
          if (chan === 'whatsapp') {
            if (!customer.whatsapp_number) {
              throw new Error('WhatsApp number not found in customer profile');
            }
            const cleanPhone = customer.whatsapp_number.replace(/\D/g, '');

            const response = await retryWithBackoff(async () => {
              return await whatsappService.sendTemplateNotification(
                cleanPhone,
                template || 'kall_me_deliveryalert',
                'en',
                components || [],
                attachment?.url,
                attachment?.filename,
                projectId
              );
            });

            const metaMessageId = response?.messages?.[0]?.id || null;

            await query(
              `UPDATE notification_logs 
               SET status = 'sent', meta_message_id = $1, response = $2, sent_at = NOW() 
               WHERE id = $3`,
              [metaMessageId, JSON.stringify(response), logId]
            );
          } else {
            // Fetch registered FCM tokens for client
            const tokensRes = await query(
              `SELECT token FROM firebase_notification_tokens 
               WHERE customer_id = $1 OR application_id = $2 
                  OR user_id IN (SELECT id FROM users WHERE customer_id = $1)`,
              [customerId, projectId]
            );
            const tokens = tokensRes.rows.map(r => r.token);

            if (tokens.length === 0) {
              throw new Error('No registered active push tokens found for customer');
            }

            const pushResponse = await retryWithBackoff(async () => {
              return await firebaseMessagingService.sendToTokens(tokens, {
                title: pushPayload?.title || 'Notification Update',
                body: pushPayload?.body || '',
                image: pushPayload?.image,
                url: pushPayload?.url,
                customData: {
                  priority: pushPayload?.priority || 'normal',
                  ttl: pushPayload?.ttl || 3600
                }
              });
            });

            const hasSuccess = (pushResponse.successCount || 0) > 0;
            const fcmMsgId = pushResponse.responses?.[0]?.messageId || null;

            await query(
              `UPDATE notification_logs 
               SET status = $1, firebase_message_id = $2, response = $3, sent_at = NOW() 
               WHERE id = $4`,
              [hasSuccess ? 'sent' : 'failed', fcmMsgId, JSON.stringify(pushResponse), logId]
            );
          }
        } catch (err: any) {
          console.error(`[Notification Queue Error] Failed to deliver ${chan} for customer ${customerId}:`, err.message);
          await query(
            `UPDATE notification_logs 
             SET status = 'failed', error_details = $1, response = $2 
             WHERE id = $3`,
            [err.message, JSON.stringify({ error: err.message, stack: err.stack }), logId]
          );
        }
      });

      results.push({ channel: chan, notificationId: logId });
    }

    return { status: 'queued', dispatches: results };
  }

  /**
   * Quick notify dispatcher
   */
  async sendQuickSendNotification(
    payload: { projectId: string; alertType: string },
    sentByUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<any> {
    const { projectId, alertType } = payload;

    // Resolve customer profile for this project
    const cpRes = await query(
      `SELECT id, customer_name, company_name, whatsapp_number, primary_email FROM customer_profiles WHERE app_id = $1`,
      [projectId]
    );
    if (cpRes.rows.length === 0) {
      throw new Error('No customer profile found for this project');
    }
    const customer = cpRes.rows[0];
    const customerName = customer.customer_name;

    // Resolve app name
    const appRes = await query(`SELECT name FROM apps WHERE id = $1`, [projectId]);
    const projectName = appRes.rows[0]?.name || 'Your App';

    let template = 'kall_me_deliveryalert';
    let components: string[] = [];
    let title = '';
    let body = '';

    switch (alertType) {
      case 'Payment Reminder':
        template = 'billing_reminder';
        components = [customerName, 'OVERDUE-01', '₹4,999.00', 'https://ajrdigitalhub.com/dashboard/billing'];
        title = 'Payment Overdue Alert';
        body = `Hi ${customerName}, your payment of ₹4,999.00 for invoice OVERDUE-01 is pending. Pay here: https://ajrdigitalhub.com/dashboard/billing`;
        break;
      case 'Invoice Ready':
        template = 'billing_reminder';
        components = [customerName, 'INV-2026-07', '₹9,999.00', 'https://ajrdigitalhub.com/dashboard/billing'];
        title = 'New Invoice Generated';
        body = `Hi ${customerName}, your invoice INV-2026-07 for ₹9,999.00 is ready. View and pay here: https://ajrdigitalhub.com/dashboard/billing`;
        break;
      case 'Project Update':
        template = 'project_update';
        components = [customerName, projectName, 'Development milestones completed. Codebase compiled. Ready for UAT.'];
        title = 'Project Update Status';
        body = `Hi ${customerName}, updates for ${projectName} are ready. Milestones: Development completed. Ready for UAT.`;
        break;
      case 'Maintenance':
        template = 'project_update';
        components = [customerName, projectName, 'Scheduled system maintenance on July 25, 2026. Minimal downtime expected.'];
        title = 'System Maintenance Notice';
        body = `Hi ${customerName}, scheduled maintenance for ${projectName} is set for July 25, 2026. Minimal downtime expected.`;
        break;
      case 'Subscription Renewal':
        template = 'billing_reminder';
        components = [customerName, 'RENEWAL-2026', '₹19,999.00', 'https://ajrdigitalhub.com/dashboard/billing'];
        title = 'Subscription Renewal Alert';
        body = `Hi ${customerName}, your subscription is expiring soon. Renewal invoice RENEWAL-2026 for ₹19,999.00 is ready. Renew here: https://ajrdigitalhub.com/dashboard/billing`;
        break;
      default:
        throw new Error('Unsupported alert type');
    }

    return this.queueNotification(
      {
        customerId: customer.id,
        channel: 'both',
        template,
        components,
        pushPayload: {
          title,
          body,
          priority: 'high',
          ttl: 3600
        }
      },
      sentByUserId,
      ipAddress,
      userAgent
    );
  }

  /**
   * Run every minute by cloud scheduler to check and trigger due schedules/crons
   */
  async processScheduledNotifications(): Promise<void> {
    const now = new Date();
    console.log(`[Scheduled Processor] Running cron check at: ${now.toISOString()}`);

    try {
      // 1. Fetch due one-time notifications
      const oneTimeRes = await query(
        `SELECT * FROM notification_logs 
         WHERE scheduled = true AND cron_expression IS NULL 
           AND status = 'pending' AND scheduled_time <= $1`,
        [now]
      );

      for (const row of oneTimeRes.rows) {
        console.log(`[Scheduled Processor] Firing scheduled notification: ${row.id}`);
        const details = row.response?.payload; // payload saved on scheduling
        if (details) {
          try {
            // Trigger actual send now
            await this.queueNotification(details, row.sent_by);
            // Mark the template row as completed
            await query(`UPDATE notification_logs SET status = 'sent', sent_at = NOW() WHERE id = $1`, [row.id]);
          } catch (sendErr: any) {
            await query(`UPDATE notification_logs SET status = 'failed', error_details = $1 WHERE id = $2`, [sendErr.message, row.id]);
          }
        }
      }

      // 2. Fetch recurring cron notifications
      const cronsRes = await query(
        `SELECT * FROM notification_logs 
         WHERE scheduled = true AND cron_expression IS NOT NULL AND status = 'pending'`
      );

      for (const row of cronsRes.rows) {
        if (matchesCron(row.cron_expression, now)) {
          console.log(`[Scheduled Processor] Cron matches! Firing recurrent schedule: ${row.id} (${row.cron_expression})`);
          const details = row.response?.payload;
          if (details) {
            try {
              // Trigger send now (creates independent logs representing this run)
              await this.queueNotification(details, row.sent_by);
            } catch (cronErr: any) {
              console.error(`[Scheduled Processor] Recurring cron run failed:`, cronErr.message);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('[Scheduled Processor] Run encountered error:', err.message);
    }
  }

  /**
   * Get analytics and list widgets for the Admin dashboard
   */
  async getDashboardStats() {
    // 1. Today's counts
    const todayRes = await query(`
      SELECT 
        COUNT(*)::integer as total,
        COUNT(CASE WHEN channel = 'whatsapp' THEN 1 END)::integer as whatsapp,
        COUNT(CASE WHEN channel = 'push' THEN 1 END)::integer as push,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::integer as pending,
        COUNT(CASE WHEN status = 'failed' THEN 1 END)::integer as failed,
        COUNT(CASE WHEN status IN ('sent', 'delivered', 'read') THEN 1 END)::integer as success
      FROM notification_logs
      WHERE created_at >= CURRENT_DATE
    `);

    const today = {
      total: todayRes.rows[0]?.total || 0,
      whatsapp: todayRes.rows[0]?.whatsapp || 0,
      push: todayRes.rows[0]?.push || 0,
      pending: todayRes.rows[0]?.pending || 0,
      failed: todayRes.rows[0]?.failed || 0,
      success: todayRes.rows[0]?.success || 0
    };

    // 2. Cumulative rates
    const accumRes = await query(`
      SELECT 
        COUNT(*)::integer as total,
        COUNT(CASE WHEN status = 'failed' THEN 1 END)::integer as failed,
        COUNT(CASE WHEN status IN ('sent', 'delivered', 'read') THEN 1 END)::integer as success
      FROM notification_logs
    `);
    const accumTotal = accumRes.rows[0]?.total || 0;
    const accumSuccess = accumRes.rows[0]?.success || 0;
    const successRate = accumTotal > 0 ? parseFloat(((accumSuccess / accumTotal) * 100).toFixed(2)) : 100;

    // 3. Last Sent Notifications (5 most recent)
    const lastSentRes = await query(`
      SELECT l.*, cp.customer_name, a.name as project_name 
      FROM notification_logs l
      LEFT JOIN customer_profiles cp ON l.customer_id = cp.id
      LEFT JOIN apps a ON l.app_id = a.id
      ORDER BY l.created_at DESC
      LIMIT 5
    `);

    // 4. Upcoming schedules (5 most recent)
    const upcomingRes = await query(`
      SELECT l.*, cp.customer_name, a.name as project_name 
      FROM notification_logs l
      LEFT JOIN customer_profiles cp ON l.customer_id = cp.id
      LEFT JOIN apps a ON l.app_id = a.id
      WHERE l.scheduled = true AND l.status = 'pending' AND (l.scheduled_time > NOW() OR l.cron_expression IS NOT NULL)
      ORDER BY l.scheduled_time ASC NULLS LAST
      LIMIT 5
    `);

    const scheduledCountsRes = await query(`
      SELECT COUNT(*)::integer as count FROM notification_logs 
      WHERE scheduled = true AND status = 'pending'
    `);
    const scheduledCount = scheduledCountsRes.rows[0]?.count || 0;

    return {
      today,
      successRate,
      lastSent: lastSentRes.rows,
      upcoming: upcomingRes.rows,
      scheduledCount
    };
  }
}

export const notificationService = new NotificationService();
