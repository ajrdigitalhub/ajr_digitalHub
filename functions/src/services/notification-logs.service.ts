import { query } from '../db';

export class NotificationLogsService {
  async addLog(logData: {
    appId: string;
    customerId: string | null;
    notificationId?: string;
    title: string;
    body: string;
    notificationType?: string;
    deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed';
    readStatus?: 'unread' | 'read';
    failureReason?: string;
    retryCount?: number;
  }) {
    const {
      appId,
      customerId,
      notificationId,
      title,
      body,
      notificationType,
      deliveryStatus,
      readStatus,
      failureReason,
      retryCount
    } = logData;

    const res = await query(
      `INSERT INTO firebase_notification_logs 
        (application_id, customer_id, notification_id, title, body, notification_type, delivery_status, read_status, failure_reason, retry_count, sent_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
       RETURNING id`,
      [
        appId,
        customerId,
        notificationId || null,
        title,
        body,
        notificationType || 'transactional',
        deliveryStatus,
        readStatus || 'unread',
        failureReason || null,
        retryCount || 0
      ]
    );

    // Upsert into usage rollup table for daily totals
    const successInc = (deliveryStatus === 'sent' || deliveryStatus === 'delivered') ? 1 : 0;
    const failureInc = deliveryStatus === 'failed' ? 1 : 0;

    await query(
      `INSERT INTO firebase_notification_usage (application_id, customer_id, usage_date, sent_count, success_count, failure_count)
       VALUES ($1, $2, CURRENT_DATE, 1, $3, $4)
       ON CONFLICT (application_id, usage_date) DO UPDATE SET
         sent_count = firebase_notification_usage.sent_count + 1,
         success_count = firebase_notification_usage.success_count + $3,
         failure_count = firebase_notification_usage.failure_count + $4`,
      [appId, customerId, successInc, failureInc]
    );

    return res.rows[0]?.id;
  }

  async getLogs(filters: {
    appId?: string;
    customerId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    let q = `SELECT l.*, a.name as app_name, c.name as customer_name
             FROM firebase_notification_logs l
             LEFT JOIN apps a ON l.application_id = a.id
             LEFT JOIN customers c ON l.customer_id = c.id
             WHERE 1=1`;
    const params: any[] = [];
    let index = 1;

    if (filters.appId) {
      q += ` AND l.application_id = $${index}`;
      params.push(filters.appId);
      index++;
    }
    if (filters.customerId) {
      q += ` AND l.customer_id = $${index}`;
      params.push(filters.customerId);
      index++;
    }
    if (filters.status) {
      q += ` AND l.delivery_status = $${index}`;
      params.push(filters.status);
      index++;
    }
    if (filters.startDate) {
      q += ` AND l.sent_time >= $${index}::timestamp`;
      params.push(filters.startDate);
      index++;
    }
    if (filters.endDate) {
      q += ` AND l.sent_time <= $${index}::timestamp`;
      params.push(filters.endDate);
      index++;
    }

    q += ` ORDER BY l.sent_time DESC LIMIT 100`;

    const res = await query(q, params);
    return res.rows;
  }
}

export const notificationLogsService = new NotificationLogsService();
