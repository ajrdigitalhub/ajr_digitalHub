import { query } from '../db';
import { firebaseBillingService } from './firebase-billing.service';

export class FirebaseAnalyticsService {
  async getDashboardStats(customerId: string | null) {
    const params: any[] = [];
    let appFilter = '';
    let tokenFilter = '';
    let logFilter = '';

    if (customerId) {
      appFilter = ` WHERE id IN (SELECT app_id FROM customer_profiles WHERE id = $1)`;
      tokenFilter = ` WHERE customer_id = $1`;
      logFilter = ` WHERE customer_id = $1`;
      params.push(customerId);
    }

    // 1. Total Apps
    const appsCountRes = await query(`SELECT COUNT(*) as count FROM apps` + appFilter, params);
    const totalApps = parseInt(appsCountRes.rows[0]?.count || '0', 10);

    // 2. Total Registered Devices
    const devicesCountRes = await query(`SELECT COUNT(*) as count FROM firebase_notification_tokens` + tokenFilter, params);
    const totalDevices = parseInt(devicesCountRes.rows[0]?.count || '0', 10);

    // 3. Active Subscribers (last 30 days active and token active)
    const activeSubscribersRes = await query(
      `SELECT COUNT(*) as count FROM firebase_notification_tokens 
       ${tokenFilter ? tokenFilter + ' AND' : 'WHERE'} token_status = 'active' AND last_active >= NOW() - INTERVAL '30 days'`,
      params
    );
    const activeSubscribers = parseInt(activeSubscribersRes.rows[0]?.count || '0', 10);

    // 4. Notifications Sent Today
    const todayRes = await query(
      `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN delivery_status = 'failed' THEN 1 END) as failed,
         COUNT(CASE WHEN delivery_status = 'pending' THEN 1 END) as pending,
         COUNT(CASE WHEN delivery_status IN ('sent', 'delivered') THEN 1 END) as success
       FROM firebase_notification_logs 
       ${logFilter ? logFilter + ' AND' : 'WHERE'} sent_time >= CURRENT_DATE`,
      params
    );
    const sentToday = parseInt(todayRes.rows[0]?.total || '0', 10);
    const successToday = parseInt(todayRes.rows[0]?.success || '0', 10);
    const failedToday = parseInt(todayRes.rows[0]?.failed || '0', 10);
    const pendingToday = parseInt(todayRes.rows[0]?.pending || '0', 10);

    // 5. Notifications Sent This Month
    const thisMonthRes = await query(
      `SELECT COUNT(*) as total FROM firebase_notification_logs 
       ${logFilter ? logFilter + ' AND' : 'WHERE'} sent_time >= date_trunc('month', CURRENT_DATE)`,
      params
    );
    const sentThisMonth = parseInt(thisMonthRes.rows[0]?.total || '0', 10);

    // 6. Cumulative Success & Failure Rates
    const accumRes = await query(
      `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN delivery_status = 'failed' THEN 1 END) as failed,
         COUNT(CASE WHEN delivery_status IN ('sent', 'delivered') THEN 1 END) as success
       FROM firebase_notification_logs` + logFilter,
      params
    );
    const accumTotal = parseInt(accumRes.rows[0]?.total || '0', 10);
    const accumSuccess = parseInt(accumRes.rows[0]?.success || '0', 10);
    const accumFailed = parseInt(accumRes.rows[0]?.failed || '0', 10);
    const successRate = accumTotal > 0 ? parseFloat(((accumSuccess / accumTotal) * 100).toFixed(2)) : 100;

    // 7. Estimating Monthly Cost (aggregating for all client apps in current month)
    let totalEstimatedCost = 0.00;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date();
    
    const appsList = await query(`SELECT id FROM apps` + appFilter, params);
    for (const app of appsList.rows) {
      const calc = await firebaseBillingService.calculateBilling(app.id, startOfMonth, endOfMonth);
      totalEstimatedCost += calc.totalAmount;
    }

    // 8. Firebase Project Status check
    const settingsCheck = await query('SELECT enabled, service_account FROM firebase_notification_settings LIMIT 1');
    let projectStatus = 'Offline';
    if (settingsCheck.rows.length > 0 && settingsCheck.rows[0].enabled) {
      const sa = settingsCheck.rows[0].service_account;
      if (sa && sa.encryptedData) {
        projectStatus = 'Active & Online';
      } else {
        projectStatus = 'Credentials Missing';
      }
    }

    return {
      totalApps,
      totalDevices,
      activeSubscribers,
      sentToday,
      successToday,
      failedToday,
      pendingToday,
      sentThisMonth,
      successRate,
      estimatedMonthlyCost: parseFloat(totalEstimatedCost.toFixed(2)),
      firebaseProjectStatus: projectStatus,
      totalSuccess: accumSuccess,
      totalFailed: accumFailed
    };
  }

  async getDashboardCharts(customerId: string | null) {
    const params: any[] = [];
    let logFilter = '';
    let tokenFilter = '';

    if (customerId) {
      logFilter = ` WHERE customer_id = $1`;
      tokenFilter = ` WHERE customer_id = $1`;
      params.push(customerId);
    }

    // 1. Daily Notification Trend (Last 15 days)
    const dailyTrendRes = await query(
      `SELECT 
         usage_date::text as label,
         SUM(sent_count) as sent,
         SUM(success_count) as success,
         SUM(failure_count) as failed
       FROM firebase_notification_usage
       ${logFilter ? logFilter + ' AND' : 'WHERE'} usage_date >= CURRENT_DATE - INTERVAL '15 days'
       GROUP BY usage_date
       ORDER BY usage_date ASC`,
      params
    );

    // 2. Subscriber Growth Trend (Last 30 days registration rollup)
    const subGrowthRes = await query(
      `SELECT 
         created_at::date::text as date_label,
         COUNT(*) as registrations
       FROM firebase_notification_tokens
       ${tokenFilter ? tokenFilter + ' AND' : 'WHERE'} created_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY created_at::date
       ORDER BY created_at::date ASC`,
      params
    );
    
    // Accumulate registrations to simulate growth slope
    let cumulative = 0;
    const growthTrend = subGrowthRes.rows.map(r => {
      cumulative += parseInt(r.registrations || '0', 10);
      return {
        label: r.date_label,
        value: cumulative
      };
    });

    // 3. Application-wise distribution
    const appWiseRes = await query(
      `SELECT 
         a.name as label,
         COUNT(l.id) as value
       FROM firebase_notification_logs l
       LEFT JOIN apps a ON l.application_id = a.id
       ${logFilter ? logFilter : ''}
       GROUP BY a.name
       ORDER BY value DESC
       LIMIT 10`,
      params
    );

    // 4. Notification Type Distribution
    const typeRes = await query(
      `SELECT 
         notification_type as label,
         COUNT(*) as value
       FROM firebase_notification_logs
       ${logFilter ? logFilter : ''}
       GROUP BY notification_type`,
      params
    );

    return {
      dailyTrend: dailyTrendRes.rows,
      subscriberGrowth: growthTrend,
      appWiseDistribution: appWiseRes.rows,
      typeDistribution: typeRes.rows
    };
  }

  async getApplicationMetrics(appId: string) {
    const statsRes = await query(
      `SELECT 
         (SELECT COUNT(*) FROM firebase_notification_tokens WHERE application_id = $1) as total_devices,
         (SELECT COUNT(*) FROM firebase_notification_tokens WHERE application_id = $1 AND token_status = 'active') as active_devices,
         (SELECT COUNT(*) FROM firebase_notification_tokens WHERE application_id = $1 AND token_status = 'inactive') as inactive_devices,
         (SELECT COUNT(*) FROM firebase_notification_tokens WHERE application_id = $1 AND notification_enabled = true) as subscribers,
         (SELECT COUNT(*) FROM firebase_notification_logs WHERE application_id = $1 AND sent_time >= CURRENT_DATE) as sent_today,
         (SELECT COUNT(*) FROM firebase_notification_logs WHERE application_id = $1 AND sent_time >= date_trunc('month', CURRENT_DATE)) as sent_month,
         (SELECT MAX(sent_time) FROM firebase_notification_logs WHERE application_id = $1) as last_sent,
         (SELECT MAX(last_active) FROM firebase_notification_tokens WHERE application_id = $1) as last_refresh
      `,
      [appId]
    );

    const s = statsRes.rows[0];

    // Compute success/failure rates
    const ratesRes = await query(
      `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN delivery_status = 'failed' THEN 1 END) as failed,
         COUNT(CASE WHEN delivery_status IN ('sent', 'delivered') THEN 1 END) as success
       FROM firebase_notification_logs
       WHERE application_id = $1`,
      [appId]
    );
    const total = parseInt(ratesRes.rows[0]?.total || '0', 10);
    const success = parseInt(ratesRes.rows[0]?.success || '0', 10);
    const failed = parseInt(ratesRes.rows[0]?.failed || '0', 10);

    const successRate = total > 0 ? parseFloat(((success / total) * 100).toFixed(2)) : 100;
    const failureRate = total > 0 ? parseFloat(((failed / total) * 100).toFixed(2)) : 0;

    return {
      totalDevices: parseInt(s.total_devices || '0', 10),
      activeDevices: parseInt(s.active_devices || '0', 10),
      inactiveDevices: parseInt(s.inactive_devices || '0', 10),
      totalSubscribers: parseInt(s.subscribers || '0', 10),
      sentToday: parseInt(s.sent_today || '0', 10),
      sentThisMonth: parseInt(s.sent_month || '0', 10),
      lastNotificationTime: s.last_sent,
      lastTokenRefresh: s.last_refresh,
      successRate,
      failureRate
    };
  }
}

export const firebaseAnalyticsService = new FirebaseAnalyticsService();
