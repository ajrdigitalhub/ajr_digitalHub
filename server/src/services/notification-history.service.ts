import { query, isPostgresEnabled } from '../config/db';
import { BaseService } from '../core/base.service';

export interface BillingNotificationLog {
  invoice_id: string;
  channel: 'whatsapp' | 'email';
  recipient: string;
  status: 'sent' | 'failed' | 'pending';
  error_details?: string;
}

export class NotificationHistoryService {
  private baseService = new BaseService('notification_logs');

  /**
   * Log a sent/failed notification.
   */
  async log(logEntry: BillingNotificationLog): Promise<any> {
    if (isPostgresEnabled) {
      const sql = `
        INSERT INTO notification_logs (invoice_id, channel, recipient, status, error_details)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const params = [
        logEntry.invoice_id,
        logEntry.channel,
        logEntry.recipient,
        logEntry.status,
        logEntry.error_details || null
      ];
      const res = await query(sql, params);
      
      // Also write to billing_notifications
      const sqlNotif = `
        INSERT INTO billing_notifications (invoice_id, channel, recipient, status, error_details)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await query(sqlNotif, params);

      return res.rows[0];
    } else {
      // Fallback
      const createdLog = await this.baseService.create(logEntry);
      const notifService = new BaseService('billing_notifications');
      await notifService.create(logEntry);
      return createdLog;
    }
  }

  /**
   * Fetch all logs for admin logs view.
   */
  async getLogs(options: { limit?: number; channel?: string } = {}): Promise<any[]> {
    const limit = options.limit || 50;
    if (isPostgresEnabled) {
      let sql = `
        SELECT nl.*, bi.invoice_number, a.name as app_name
        FROM notification_logs nl
        LEFT JOIN billing_invoices bi ON nl.invoice_id = bi.id
        LEFT JOIN records r ON bi.app_id = r.id AND r.collection = 'apps'
        -- Extract app name from JSONB data
        LEFT JOIN (
          SELECT id, data->>'name' as name FROM records WHERE collection = 'apps'
        ) a ON bi.app_id = a.id
      `;
      const params: any[] = [];
      if (options.channel) {
        sql += ` WHERE nl.channel = $1`;
        params.push(options.channel);
      }
      sql += ` ORDER BY nl.created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const res = await query(sql, params);
      return res.rows;
    } else {
      // Dynamic fallback
      const { data } = await this.baseService.findAll({ limit, sortBy: 'created_at', order: 'DESC' });
      // Resolve app name & invoice number
      const invoicesService = new BaseService('billing_invoices');
      const appsService = new BaseService('apps');
      
      const mapped = [];
      for (const log of data) {
        const inv = await invoicesService.findOne(log.invoice_id);
        const app = inv ? await appsService.findOne(inv.app_id) : null;
        mapped.push({
          ...log,
          invoice_number: inv?.invoice_number || 'N/A',
          app_name: app?.name || 'N/A'
        });
      }
      return mapped;
    }
  }
}

export const notificationHistoryService = new NotificationHistoryService();
