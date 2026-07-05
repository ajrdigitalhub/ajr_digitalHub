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

  async getDetailedBilling(appId: string, month?: string) {
    const { FirebaseService } = require('./firebase.service');
    const firebaseService = new FirebaseService();
    
    let startDate: Date;
    let endDate: Date;
    
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, monthNum] = month.split('-').map(Number);
      startDate = new Date(Date.UTC(year, monthNum - 1, 1));
      endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = now;
    }

    let functionsCost = 0;
    let hostingCost = 0;
    let gcpNonFirebaseCost = 0;
    let totalExecutions = 0;
    let hostingUsageBytes = 0;
    let fbBilling: any = null;
    
    try {
      fbBilling = await firebaseService.getBillingCost(appId, month);
      if (fbBilling) {
        totalExecutions = fbBilling.functionsInvocations || 0;
        functionsCost = totalExecutions > 0 ? Math.round((2.00 + totalExecutions * 0.001049) * 100) / 100 : 0;
        
        hostingUsageBytes = fbBilling.outboundBandwidth || 0;
        const sentGB = hostingUsageBytes / (1024 * 1024 * 1024);
        hostingCost = hostingUsageBytes > 0 ? Math.max(8.00, Math.round(sentGB * 12.45 * 100) / 100) : 0;

        gcpNonFirebaseCost = fbBilling.gcpNonFirebaseCost || 0;
      }
    } catch (e) {
      console.warn('Failed to fetch firebase cost details for billing:', e);
    }

    let whatsappCost = 0;
    try {
      const configRes = await query(`SELECT phone_number FROM whatsapp_config WHERE app_id = $1 LIMIT 1`, [appId]);
      const phone = configRes.rows[0]?.phone_number || '';
      if (phone) {
        const { getCountryCode } = require('../controllers/whatsapp-billing.controller');
        const { METADATA_PRICING_TABLE } = require('../controllers/whatsapp-billing.controller');
        const country = getCountryCode(phone);
        const rates = METADATA_PRICING_TABLE[country] || METADATA_PRICING_TABLE['IN'];
        
        const res = await query(
          `SELECT event_type as template, status, COUNT(*) as count
           FROM notification_logs
           WHERE channel = 'whatsapp' 
             AND (app_id = $1 OR customer_id = (SELECT id FROM customer_profiles WHERE app_id = $1))
             AND created_at >= $2 AND created_at <= $3
           GROUP BY event_type, status`,
          [appId, startDate, endDate]
        );
        
        for (const row of res.rows) {
          const name = row.template || '';
          const status = row.status;
          const count = parseInt(row.count || '0', 10);
          if (status === 'failed') continue;

          const cat = (name === 'task_status_update' || name === 'order_confirmation_admin' || name === 'welcome_message' || name === 'get_offers') ? 'marketing' : 'utility';
          if (cat === 'marketing') whatsappCost += count * rates.marketing.price;
          else if (cat === 'utility') whatsappCost += count * rates.utility.price;
          else if (cat === 'authentication') whatsappCost += count * rates.authentication.price;
          else whatsappCost += count * rates.service.price;
        }
        whatsappCost = Math.round(whatsappCost * 1.1 * 100) / 100;
      }
    } catch (e) {
      console.warn('Failed to fetch whatsapp cost for billing:', e);
    }

    let pushNotificationsCost = 0;
    try {
      const calc = await this.calculateBilling(appId, startDate, endDate);
      pushNotificationsCost = calc.rawCost || 0;
    } catch (e) {
      console.warn('Failed to fetch push notifications cost for billing:', e);
    }

    let pgUsageCost = 0;
    try {
      const hitsRes = await query(`
        SELECT COALESCE(SUM(hits), 0) as hits
        FROM usage_logs
        WHERE app_id = $1 AND created_at >= $2 AND created_at <= $3
      `, [appId, startDate, endDate]);
      const hits = parseInt(hitsRes.rows[0]?.hits || '0', 10);
      pgUsageCost = Math.round(Math.max(0, hits - 10) * 0.05 * 100) / 100;
    } catch (e) {
      console.warn('Failed to fetch standard API usage cost for billing:', e);
    }

    const nonFirebaseCost = Math.round((whatsappCost + pushNotificationsCost + pgUsageCost) * 100) / 100;

    return {
      billingEnabled: fbBilling?.billingEnabled ?? false,
      billingAccountName: fbBilling?.billingAccountName ?? null,
      totalCost: Math.round((functionsCost + hostingCost + gcpNonFirebaseCost + nonFirebaseCost) * 100) / 100,
      currency: 'INR',
      functionsCost,
      hostingCost,
      gcpNonFirebaseCost,
      nonFirebaseCost,
      totalExecutions,
      hostingUsageBytes,
      whatsappCost,
      pushNotificationsCost,
      pgUsageCost
    };
  }
}

export const firebaseBillingService = new FirebaseBillingService();
