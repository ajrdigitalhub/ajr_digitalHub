import { Request, Response } from 'express';
import { query } from '../db';
import { decryptValue } from '../utils/crypto';
import { whatsappCloudService, clearWhatsAppCache } from '../services/whatsappCloud.service';
import { whatsappService } from '../services/whatsappService';
import { METADATA_PRICING_TABLE, getCountryCode } from './whatsapp-billing.controller';

// ────────────────────────────────────────────────────────────────────────────
//  Helper: Resolve app ID for tenant context
// ────────────────────────────────────────────────────────────────────────────
async function resolveAppId(req: Request): Promise<string | null> {
  // If applicationId is explicitly passed
  if (req.tenantContext?.applicationId && req.tenantContext.applicationId !== 'app-default-sandbox-id') {
    return req.tenantContext.applicationId;
  }
  
  // If user is authenticated, check their customer profile app_id
  if (req.user?.id) {
    const res = await query(
      `SELECT cp.app_id FROM customer_profiles cp
       JOIN users u ON u.customer_id = cp.id
       WHERE u.id = $1 LIMIT 1`,
      [req.user.id]
    );
    if (res.rows.length > 0 && res.rows[0].app_id) {
      return res.rows[0].app_id;
    }
  }
  
  // Try mapping via workspace ID
  if (req.tenantContext?.workspaceId) {
     const res = await query(
       `SELECT id FROM apps WHERE id::text = $1 OR domain LIKE $2 LIMIT 1`,
       [req.tenantContext.workspaceId, `%${req.tenantContext.workspaceId}%`]
     );
     if (res.rows.length > 0) return res.rows[0].id;
  }
  
  // Fallback: get the first active app in the system
  const fallback = await query(`SELECT id FROM apps WHERE status = 'active' LIMIT 1`);
  if (fallback.rows.length > 0) {
    return fallback.rows[0].id;
  }
  
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
//  Helper: Fetch decrypted WhatsApp configuration
// ────────────────────────────────────────────────────────────────────────────
async function getWhatsAppConfigDecrypted(appId: string): Promise<{
  wabaId: string;
  token: string;
  phoneId: string;
} | null> {
  try {
    const res = await query(
      `SELECT api_key as token, waba_id, phone_number as phone_id, enabled FROM whatsapp_config WHERE app_id = $1`,
      [appId]
    );
    if (res.rows.length > 0) {
      const row = res.rows[0];
      if (!row.enabled) return null;
      const decryptedToken = decryptValue(row.token || '');
      if (decryptedToken && row.waba_id) {
        return {
          wabaId: row.waba_id || '',
          token: decryptedToken || '',
          phoneId: row.phone_id || '',
        };
      }
    }
  } catch (err: any) {
    console.error(`[WhatsApp Marketing] Failed to query DB config for ${appId}:`, err.message);
  }
  return null;
}

function handleControllerError(err: any, res: Response) {
  console.error('[WhatsApp Marketing API Error]:', err.message);
  
  let errorType = 'UNKNOWN';
  if (err.message.includes('AUTHENTICATION_ERROR')) {
    errorType = 'AUTHENTICATION_ERROR';
  } else if (err.message.includes('PERMISSION_ERROR')) {
    errorType = 'PERMISSION_ERROR';
  } else if (err.message.includes('META_API_ERROR')) {
    errorType = 'META_API_ERROR';
  }

  return res.status(400).json({
    error: err.message,
    errorType,
    message: err.message
  });
}

// ────────────────────────────────────────────────────────────────────────────
//  CONTROLLER EXPORTS
// ────────────────────────────────────────────────────────────────────────────
export const whatsappMarketingController = {

  /**
   * GET /api/whatsapp-marketing/templates
   */
  async getTemplates(req: Request, res: Response) {
    try {
      const appId = await resolveAppId(req);
      if (!appId) {
        throw new Error('PERMISSION_ERROR: No active application resolved.');
      }

      const config = await getWhatsAppConfigDecrypted(appId);
      if (!config) {
        throw new Error('PERMISSION_ERROR: WhatsApp integration is disabled or credentials are not configured.');
      }

      const metaTemplates = await whatsappCloudService.getMessageTemplates(config.wabaId, config.token, false);

      const endEpoch = Math.floor(Date.now() / 1000);
      const startEpoch = endEpoch - 30 * 24 * 3600; // 30 days performance
      const metaAnalytics = await whatsappCloudService.getTemplateAnalytics(config.wabaId, config.token, startEpoch, endEpoch, 'DAILY', false);

      const statsMap: Record<string, { sent: number; delivered: number; read: number; failed: number }> = {};
      for (const t of metaAnalytics) {
        const name = t.name;
        if (!name) continue;
        let sent = 0, delivered = 0, read = 0, failed = 0;
        if (t.data_points) {
          for (const dp of t.data_points) {
            sent += Number(dp.sent || 0);
            delivered += Number(dp.delivered || 0);
            read += Number(dp.read || 0);
            failed += Number(dp.failed || 0);
          }
        }
        statsMap[name] = { sent, delivered, read, failed };
      }

      const templates = metaTemplates.map(t => {
        const stats = statsMap[t.name] || { sent: 0, delivered: 0, read: 0, failed: 0 };
        return {
          name: t.name,
          category: t.category,
          status: t.status || 'APPROVED',
          language: t.language || 'en',
          delivered: stats.delivered,
          read: stats.read,
          failed: stats.failed
        };
      });

      res.json(templates);
    } catch (err: any) {
      return handleControllerError(err, res);
    }
  },

  /**
   * POST /api/whatsapp-marketing/templates/sync
   */
  async syncTemplates(req: Request, res: Response) {
    try {
      // Clear cache to force next reload to query Meta Graph API fresh
      clearWhatsAppCache();
      res.json({ success: true, message: 'Meta templates synchronized successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * GET /api/whatsapp-marketing/campaigns
   */
  async getCampaigns(req: Request, res: Response) {
    try {
      const appId = await resolveAppId(req);
      if (!appId) {
        throw new Error('PERMISSION_ERROR: No active application resolved.');
      }

      const config = await getWhatsAppConfigDecrypted(appId);
      if (!config) {
        throw new Error('PERMISSION_ERROR: WhatsApp integration is disabled or credentials are not configured.');
      }

      const result = await query(
        `SELECT id, name, settings, created_at FROM campaign_configs 
         WHERE channel = 'whatsapp' AND (workspace_id = $1 OR workspace_id::text = $1)
         ORDER BY created_at DESC`,
        [appId]
      );

      const campaigns = [];

      for (const row of result.rows) {
        const settings = typeof row.settings === 'string' ? JSON.parse(row.settings) : (row.settings || {});
        const templateName = settings.templateName || '';

        // Query template analytics from campaign creation date until now
        const launchTime = new Date(row.created_at);
        const startEpoch = Math.floor(launchTime.getTime() / 1000);
        const endEpoch = Math.floor(Date.now() / 1000);

        let sent = 0, delivered = 0, read = 0, failed = 0;

        try {
          const metaAnalytics = await whatsappCloudService.getTemplateAnalytics(
            config.wabaId,
            config.token,
            startEpoch,
            endEpoch,
            'DAILY',
            false
          );
          const targetAnalytics = metaAnalytics.find((t: any) => t.name === templateName);
          if (targetAnalytics && targetAnalytics.data_points) {
            for (const dp of targetAnalytics.data_points) {
              sent += Number(dp.sent || 0);
              delivered += Number(dp.delivered || 0);
              read += Number(dp.read || 0);
              failed += Number(dp.failed || 0);
            }
          }
        } catch (apiErr) {
          // If template analytics fails, count from database logs as fallback
          const dbStats = await query(
            `SELECT 
               COUNT(*) as sent,
               COUNT(*) filter (where status = 'sent' or status = 'delivered' or status = 'read') as delivered,
               COUNT(*) filter (where status = 'read') as read,
               COUNT(*) filter (where status = 'failed') as failed
             FROM notification_logs
             WHERE channel = 'whatsapp' AND event_type = $1 AND app_id = $2 AND created_at >= $3`,
            [templateName, appId, row.created_at]
          );
          const stats = dbStats.rows[0] || { sent: 0, delivered: 0, read: 0, failed: 0 };
          sent = parseInt(stats.sent || '0', 10);
          delivered = parseInt(stats.delivered || '0', 10);
          read = parseInt(stats.read || '0', 10);
          failed = parseInt(stats.failed || '0', 10);
        }

        const cat = (templateName === 'task_status_update' || templateName === 'order_confirmation_admin' || templateName === 'welcome_message' || templateName === 'get_offers') ? 'marketing' : 'utility';
        const price = METADATA_PRICING_TABLE['IN'][cat]?.price || 0.86;
        const cost = Math.round(delivered * price * 100) / 100;

        campaigns.push({
          id: row.id,
          name: row.name,
          status: 'COMPLETED',
          total_sent: sent || settings.contactsCount || 0,
          delivered,
          read,
          failed,
          cost,
          created_at: row.created_at
        });
      }
      res.json(campaigns);
    } catch (err: any) {
      return handleControllerError(err, res);
    }
  },

  /**
   * POST /api/whatsapp-marketing/campaigns
   */
  async createCampaign(req: Request, res: Response) {
    try {
      const { name, templateName, contacts, scheduleTime } = req.body;
      const appId = await resolveAppId(req);
      if (!appId) {
        throw new Error('PERMISSION_ERROR: No active application resolved.');
      }

      const config = await getWhatsAppConfigDecrypted(appId);
      if (!config) {
        throw new Error('PERMISSION_ERROR: WhatsApp integration is disabled or credentials are not configured.');
      }

      const insertCampaign = await query(
        `INSERT INTO campaign_configs (workspace_id, channel, name, settings) VALUES ($1, $2, $3, $4) RETURNING *`,
        [appId, 'whatsapp', name, JSON.stringify({ templateName, scheduleTime, contactsCount: contacts?.length || 0 })]
      );
      const campaign = insertCampaign.rows[0];

      let sentCount = 0;
      let failedCount = 0;

      if (contacts && Array.isArray(contacts)) {
        for (const phone of contacts) {
          try {
            await whatsappService.sendWhatsAppMessage(phone, {
              templateName,
              languageCode: 'en',
              parameters: []
            }, appId);

            sentCount++;

            await query(
              `INSERT INTO notification_logs (channel, event_type, recipient, status, app_id)
               VALUES ($1, $2, $3, $4, $5)`,
              ['whatsapp', templateName, phone, 'sent', appId]
            );
          } catch (waErr: any) {
            console.error(`[Campaign Launch Error] Failed sending message to ${phone}:`, waErr.message);
            failedCount++;
            await query(
              `INSERT INTO notification_logs (channel, event_type, recipient, status, app_id, error_details)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              ['whatsapp', templateName, phone, 'failed', appId, waErr.message]
            );
          }
        }
      }

      res.status(201).json({
        id: campaign.id,
        name: campaign.name,
        status: scheduleTime ? 'SCHEDULED' : 'COMPLETED',
        total_sent: contacts?.length || 0,
        delivered: sentCount,
        read: 0,
        failed: failedCount,
        cost: sentCount * 0.86,
        created_at: campaign.created_at
      });
    } catch (err: any) {
      return handleControllerError(err, res);
    }
  },

  /**
   * GET /api/whatsapp-marketing/analytics
   */
  async getAnalytics(req: Request, res: Response) {
    try {
      const appId = await resolveAppId(req);
      if (!appId) {
        throw new Error('PERMISSION_ERROR: No active application resolved.');
      }

      const config = await getWhatsAppConfigDecrypted(appId);
      if (!config) {
        throw new Error('PERMISSION_ERROR: WhatsApp integration is disabled or credentials are not configured.');
      }

      const endEpoch = Math.floor(Date.now() / 1000);
      const startEpoch = endEpoch - 30 * 24 * 3600; // last 30 days analytics

      const pricingAnalytics = await whatsappCloudService.getPricingAnalytics(
        config.wabaId,
        config.token,
        startEpoch,
        endEpoch,
        'DAILY',
        false
      );

      const templateAnalytics = await whatsappCloudService.getTemplateAnalytics(
        config.wabaId,
        config.token,
        startEpoch,
        endEpoch,
        'DAILY',
        false
      );

      // Aggregate pricing cost
      let spendMonth = 0;
      for (const item of pricingAnalytics) {
        if (!item.values) continue;
        for (const val of item.values) {
          if (val.dimension === 'PRICING_CATEGORY') {
            const costMetric = val.metric_types?.find((m: any) => m.type === 'COST');
            spendMonth += Number(costMetric?.value || 0);
          }
        }
      }

      // Aggregate message volumes
      let sent = 0, delivered = 0, read = 0, failed = 0;
      for (const item of templateAnalytics) {
        if (!item.data_points) continue;
        for (const dp of item.data_points) {
          sent += Number(dp.sent || 0);
          delivered += Number(dp.delivered || 0);
          read += Number(dp.read || 0);
          failed += Number(dp.failed || 0);
        }
      }

      const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 1000) / 10 : 0;
      const readRate = delivered > 0 ? Math.round((read / delivered) * 1000) / 10 : 0;
      const errorRate = sent > 0 ? Math.round((failed / sent) * 1000) / 10 : 0;

      // Query database logs for recent webhook delivery updates
      const feedRes = await query(
        `SELECT created_at, status, recipient, event_type as template
         FROM notification_logs
         WHERE channel = 'whatsapp' AND app_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [appId]
      );

      const liveFeed = feedRes.rows.map(row => {
        const timeDiff = Date.now() - new Date(row.created_at).getTime();
        let timeStr = 'Just now';
        if (timeDiff > 60000) {
          timeStr = `${Math.floor(timeDiff / 60000)}m ago`;
        }
        return {
          time: timeStr,
          event: row.status === 'read' ? 'Read' : (row.status === 'failed' ? 'Failed' : 'Delivered'),
          recipient: row.recipient,
          template: row.template
        };
      });

      res.json({
        sent,
        delivered,
        read,
        failed,
        spendMonth: Math.round(spendMonth * 100) / 100,
        spendToday: Math.round((spendMonth * 0.05) * 100) / 100,
        avgCpc: delivered > 0 ? Math.round((spendMonth / delivered) * 1000) / 1000 : 0.012,
        deliveryRate,
        readRate,
        errorRate,
        liveFeed
      });
    } catch (err: any) {
      return handleControllerError(err, res);
    }
  }
};
