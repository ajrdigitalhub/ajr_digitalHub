import { query, isPostgresEnabled } from '../db';
import { BaseService } from '../core/base.service';
import { billingNotificationService } from './billing-notification.service';

export class BillingCronService {
  private timer: NodeJS.Timeout | null = null;
  private appsService = new BaseService('apps');
  private cronLogsService = new BaseService('cron_execution_logs');

  /**
   * Initialize and launch the background daily billing day evaluator.
   */
  start() {
    console.log("⏱️ Initializing Billing Cron Scheduler (Evaluator ticks once every 24 hours)...");
    
    // Evaluate daily at 9:00 AM (simulated by checking every 24 hours)
    this.timer = setInterval(() => {
      this.runBillingJobForToday().catch(err => console.error("🔥 Automated Billing Cron Error:", err));
    }, 24 * 60 * 60 * 1000);

    // Initial evaluation shortly after server boot
    setTimeout(() => {
      this.runBillingJobForToday().catch(err => console.error("🔥 Startup Billing Cron Error:", err));
    }, 15000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      console.log("⏱️ Billing Cron Scheduler stopped.");
    }
  }

  /**
   * Automated runner matching today's day of the month with client billing days.
   */
  async runBillingJobForToday(): Promise<void> {
    const today = new Date();
    const currentDay = today.getDate(); // 1 - 31
    console.log(`⏱️ Evaluating automated monthly billing cycle for Day ${currentDay}...`);

    await this.executeBillingRun({ targetBillingDay: currentDay });
  }

  /**
   * Main executor method (supports manual overrides / overrides of specific billing days).
   */
  async executeBillingRun(options: { targetBillingDay?: number; forceAll?: boolean } = {}): Promise<{
    processed: string[];
    errors: { appId: string; error: string }[];
    durationMs: number;
  }> {
    const startTime = Date.now();
    const processed: string[] = [];
    const errors: { appId: string; error: string }[] = [];

    try {
      // 1. Fetch all applications
      const { data: apps } = await this.appsService.findAll({ limit: 1000 });
      
      // Calculate billing period (previous month)
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // 2. Loop through apps
      for (const app of apps) {
        const config = app.billing_automation || {};
        const billing = config.billing || {};

        if (app.status !== 'active') continue;
        if (billing.monthly_billing_enabled === false) continue;

        const billingDay = billing.billing_day || 5;

        // Check if matching day
        if (options.forceAll !== true && options.targetBillingDay !== undefined && billingDay !== options.targetBillingDay) {
          continue;
        }

        try {
          const res = await billingNotificationService.processBillingForApp(app.id, periodStart, periodEnd);
          if (res && res.success) {
            processed.push(app.name);
          }
        } catch (err: any) {
          console.error(`❌ Failed processing billing for ${app.name}:`, err.message);
          errors.push({
            appId: app.id,
            error: err.message
          });
        }
      }

      const durationMs = Date.now() - startTime;
      const status = errors.length > 0 && processed.length === 0 ? 'failed' : 'success';
      const details = `Processed: [${processed.join(', ')}]. Errors: ${JSON.stringify(errors)}`;

      // 3. Log Cron Execution
      await this.logCronRun('monthly_customer_billing', status, durationMs, details);

      return { processed, errors, durationMs };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      console.error('🔥 Fatal error in billing cron job run:', err.message);
      await this.logCronRun('monthly_customer_billing', 'failed', durationMs, err.message);
      throw err;
    }
  }

  /**
   * Helper to write run metrics to database
   */
  private async logCronRun(jobName: string, status: 'success' | 'failed', durationMs: number, details: string): Promise<any> {
    if (isPostgresEnabled) {
      const sql = `
        INSERT INTO cron_execution_logs (job_name, status, execution_time, details)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const res = await query(sql, [jobName, status, durationMs, details]);
      return res.rows[0];
    } else {
      return await this.cronLogsService.create({
        job_name: jobName,
        status,
        execution_time: durationMs,
        details,
        created_at: new Date().toISOString()
      });
    }
  }

  /**
   * Retrieve cron execution history logs.
   */
  async getCronHistory(limit = 20): Promise<any[]> {
    if (isPostgresEnabled) {
      const res = await query(`
        SELECT * FROM cron_execution_logs 
        ORDER BY created_at DESC 
        LIMIT $1
      `, [limit]);
      return res.rows;
    } else {
      const { data } = await this.cronLogsService.findAll({ limit, sortBy: 'created_at', order: 'DESC' });
      return data;
    }
  }
}

export const billingCronService = new BillingCronService();
