import { query } from '../db';

export interface BillingCalculationResult {
  totalSent: number;
  freeQuotaLimit: number;
  freeQuotaUsed: number;
  billableNotifications: number;
  rawCost: number;
  platformCharge: number;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  currency: string;
  isWithinFreeQuota: boolean;
}

export class FirebaseBillingService {
  async getSettingsForApp(appId: string) {
    const res = await query(
      `SELECT * FROM firebase_notification_settings WHERE app_id = $1 LIMIT 1`,
      [appId]
    );
    if (res.rowCount === 0) {
      // Return default configuration parameters
      return {
        enabled: true,
        free_quota_enabled: true,
        free_notifications: 10000,
        price_per_1000: 0.50,
        platform_service_charge: 10.00,
        gst_percentage: 18.00,
        currency: 'INR',
        billing_frequency: 'monthly',
        threshold_alerts: []
      };
    }
    return res.rows[0];
  }

  async saveSettingsForApp(appId: string, settings: any) {
    const check = await query(
      `SELECT id FROM firebase_notification_settings WHERE app_id = $1 LIMIT 1`,
      [appId]
    );

    const {
      enabled,
      free_quota_enabled,
      free_notifications,
      price_per_1000,
      platform_service_charge,
      gst_percentage,
      currency,
      billing_frequency,
      threshold_alerts
    } = settings;

    if (check.rowCount === 0) {
      await query(
        `INSERT INTO firebase_notification_settings 
          (app_id, enabled, free_quota_enabled, free_notifications, price_per_1000, platform_service_charge, gst_percentage, currency, billing_frequency, threshold_alerts)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          appId,
          enabled ?? true,
          free_quota_enabled ?? true,
          free_notifications ?? 10000,
          price_per_1000 ?? 0.50,
          platform_service_charge ?? 10.00,
          gst_percentage ?? 18.00,
          currency || 'INR',
          billing_frequency || 'monthly',
          JSON.stringify(threshold_alerts || [])
        ]
      );
    } else {
      await query(
        `UPDATE firebase_notification_settings SET
          enabled = $2,
          free_quota_enabled = $3,
          free_notifications = $4,
          price_per_1000 = $5,
          platform_service_charge = $6,
          gst_percentage = $7,
          currency = $8,
          billing_frequency = $9,
          threshold_alerts = $10,
          updated_at = CURRENT_TIMESTAMP
         WHERE app_id = $1`,
        [
          appId,
          enabled ?? true,
          free_quota_enabled ?? true,
          free_notifications ?? 10000,
          price_per_1000 ?? 0.50,
          platform_service_charge ?? 10.00,
          gst_percentage ?? 18.00,
          currency || 'INR',
          billing_frequency || 'monthly',
          JSON.stringify(threshold_alerts || [])
        ]
      );
    }
    return true;
  }

  async calculateBilling(appId: string, startDate: Date, endDate: Date): Promise<BillingCalculationResult> {
    const config = await this.getSettingsForApp(appId);

    // Get count of delivered notifications
    const countRes = await query(
      `SELECT COUNT(*) as total FROM firebase_notification_logs 
       WHERE application_id = $1 AND sent_time >= $2 AND sent_time <= $3 AND delivery_status != 'failed'`,
      [appId, startDate, endDate]
    );
    const totalSent = parseInt(countRes.rows[0]?.total || '0', 10);

    const freeLimit = config.free_quota_enabled ? config.free_notifications : 0;
    const isWithinFreeQuota = config.free_quota_enabled && totalSent <= freeLimit;

    const freeQuotaUsed = Math.min(totalSent, freeLimit);
    const billableNotifications = Math.max(0, totalSent - freeLimit);
    
    // Price per 1,000 notifications
    const pricePer1000 = parseFloat(config.price_per_1000 || '0.50');
    const rawCost = parseFloat(((billableNotifications / 1000) * pricePer1000).toFixed(2));
    
    const platformCharge = parseFloat(config.platform_service_charge || '10.00');
    const subtotal = rawCost + platformCharge;
    
    const gstPercent = parseFloat(config.gst_percentage || '18.00');
    const gstAmount = parseFloat((subtotal * (gstPercent / 100)).toFixed(2));
    const totalAmount = parseFloat((subtotal + gstAmount).toFixed(2));

    return {
      totalSent,
      freeQuotaLimit: freeLimit,
      freeQuotaUsed,
      billableNotifications,
      rawCost,
      platformCharge,
      subtotal,
      gstAmount,
      totalAmount,
      currency: config.currency || 'INR',
      isWithinFreeQuota
    };
  }

  async generateInvoiceRecord(appId: string, customerId: string, startDate: Date, endDate: Date) {
    const calc = await this.calculateBilling(appId, startDate, endDate);
    
    const res = await query(
      `INSERT INTO firebase_notification_billing
        (application_id, customer_id, billing_period_start, billing_period_end, total_notifications_sent, free_quota_used, billable_notifications, notification_cost, platform_charge, gst, total_amount, currency, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
       RETURNING *`,
      [
        appId,
        customerId,
        startDate,
        endDate,
        calc.totalSent,
        calc.freeQuotaUsed,
        calc.billableNotifications,
        calc.rawCost,
        calc.platformCharge,
        calc.gstAmount,
        calc.totalAmount,
        calc.currency
      ]
    );
    return res.rows[0];
  }

  async getBillingHistory(customerId: string | null, appId?: string) {
    let q = `SELECT b.*, a.name as app_name, c.name as customer_name 
             FROM firebase_notification_billing b
             LEFT JOIN apps a ON b.application_id = a.id
             LEFT JOIN customers c ON b.customer_id = c.id`;
    const params: any[] = [];

    if (customerId) {
      q += ` WHERE b.customer_id = $1`;
      params.push(customerId);
    } else if (appId) {
      q += ` WHERE b.application_id = $1`;
      params.push(appId);
    }

    q += ` ORDER BY b.billing_period_end DESC LIMIT 50`;
    const res = await query(q, params);
    return res.rows;
  }
}

export const firebaseBillingService = new FirebaseBillingService();
