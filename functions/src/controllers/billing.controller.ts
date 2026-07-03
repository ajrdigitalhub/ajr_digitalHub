import { Request, Response } from 'express';
import { query, pool } from '../db';
import { billingService } from '../services/billingService';
import { whatsappService } from '../services/whatsappService';

export const billingController = {
  async runBilling(req: Request, res: Response) {
    try {
      const result = await billingService.runMonthlyBilling();
      res.json({ message: 'Billing run completed', result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async runCustomerBilling(req: Request, res: Response) {
    try {
      const result = await billingService.runCustomerMonthlyBilling(true);
      res.json({ message: 'Customer billing run completed', result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getInvoices(req: Request, res: Response) {
    try {
      const result = await query(`
          SELECT b.*, a.name as app_name, a.domain 
          FROM billing b
          JOIN apps a ON b.app_id = a.id
          ORDER BY b.created_at DESC
      `);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getCustomerInvoices(req: Request, res: Response) {
    try {
      if (!pool) return res.json([]);
      
      let q = `
        SELECT i.*, c.name as customer_name 
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
      `;
      const params: any[] = [];

      if (req.user?.role !== 'admin') {
        const userRes = await query('SELECT customer_id FROM users WHERE id = $1', [req.user?.id]);
        const customerId = userRes.rows[0]?.customer_id;
        if (!customerId) return res.json([]);
        q += ' WHERE i.customer_id = $1';
        params.push(customerId);
      }

      q += ' ORDER BY i.created_at DESC';
      const result = await query(q, params);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getBillingStats(req: Request, res: Response) {
    try {
      if (!pool) {
        return res.json({ currentSpend: 0, plan: 'Lite', waCount: 0, fbCount: 0, adsCount: 0 });
      }

      const userRes = await query('SELECT customer_id FROM users WHERE id = $1', [req.user?.id]);
      const customerId = userRes.rows[0]?.customer_id;
      if (!customerId) {
        return res.status(404).json({ error: 'No customer profile found for user' });
      }

      const subRes = await query('SELECT * FROM subscriptions WHERE customer_id = $1', [customerId]);
      const sub = subRes.rows[0] || { plan: 'Lite' };

      const waUsage = await query(
        `SELECT COALESCE(SUM(message_count), 0) as msgs, COALESCE(SUM(charges), 0) as charges 
         FROM whatsapp_usage WHERE customer_id = $1 AND created_at >= NOW() - INTERVAL '1 month'`,
        [customerId]
      );
      const fbUsage = await query(
        `SELECT COALESCE(SUM(charges), 0) as charges FROM firebase_usage 
         WHERE customer_id = $1 AND created_at >= NOW() - INTERVAL '1 month'`,
        [customerId]
      );
      const adsUsage = await query(
        `SELECT COALESCE(SUM(ad_spend), 0) as spend, COALESCE(SUM(charges), 0) as charges 
         FROM google_ads_usage WHERE customer_id = $1 AND created_at >= NOW() - INTERVAL '1 month'`,
        [customerId]
      );
      const purchases = await query(
        `SELECT COALESCE(SUM(amount), 0) as purchases FROM purchases 
         WHERE user_id IN (SELECT id FROM users WHERE customer_id = $1) AND created_at >= NOW() - INTERVAL '1 month'`,
        [customerId]
      );

      let subCost = 0;
      if (sub.plan?.toLowerCase() === 'standard') subCost = 1500;
      else if (sub.plan?.toLowerCase() === 'pro') subCost = 5000;
      else if (sub.plan?.toLowerCase() === 'enterprise') subCost = 15000;

      const waCost = Number(waUsage.rows[0]?.charges || 0);
      const fbCost = Number(fbUsage.rows[0]?.charges || 0);
      const adsCost = Number(adsUsage.rows[0]?.charges || 0);
      const marketplaceCost = Number(purchases.rows[0]?.purchases || 0);

      const currentSpend = subCost + waCost + fbCost + adsCost + marketplaceCost;

      res.json({
        customerId,
        currentSpend,
        plan: sub.plan,
        renewalDate: sub.renewal_date,
        whatsapp: { msgs: waUsage.rows[0]?.msgs || 0, cost: waCost },
        firebase: { cost: fbCost },
        googleAds: { spend: adsUsage.rows[0]?.spend || 0, cost: adsCost },
        marketplace: { cost: marketplaceCost }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async sendInvoiceWhatsApp(req: Request, res: Response) {
    try {
      const { phone, amount, url } = req.body;
      const result = await whatsappService.sendWhatsAppMessage(phone, [
        { type: 'text', text: amount.toString() },
        { type: 'text', text: url }
      ]);
      res.json({ message: 'WhatsApp reminder sent', result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async markPaid(req: Request, res: Response) {
    try {
      const { id } = req.body;
      const updateResult = await query(`UPDATE billing SET status = 'paid' WHERE id = $1 RETURNING *`, [id]);
      if (updateResult.rows.length === 0) {
        const saasUpdate = await query(`UPDATE invoices SET status = 'paid' WHERE id = $1 RETURNING *`, [id]);
        if (saasUpdate.rows.length === 0) {
          return res.status(404).json({ error: 'Invoice not found' });
        }
        return res.json(saasUpdate.rows[0]);
      }
      res.json(updateResult.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // --- NEW CUSTOMER MANAGEMENT & BILLING APIs ---

  async getAdminStats(req: Request, res: Response) {
    try {
      if (!pool) return res.json({});
      
      const totalRevRes = await query(`SELECT COALESCE(SUM(amount), 0) as total FROM invoices WHERE status = 'paid'`);
      const totalPendingRes = await query(`SELECT COALESCE(SUM(amount), 0) as pending FROM invoices WHERE status != 'paid'`);
      const activeSubsRes = await query(`SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'`);
      const failedPaymentsRes = await query(`SELECT COUNT(*) as count FROM payment_transactions WHERE status = 'failed'`);

      res.json({
        totalRevenue: Number(totalRevRes.rows[0]?.total || 0),
        pendingPayments: Number(totalPendingRes.rows[0]?.pending || 0),
        activeSubscriptions: Number(activeSubsRes.rows[0]?.count || 0),
        failedPayments: Number(failedPaymentsRes.rows[0]?.count || 0),
        revenueTrends: [
          { month: 'Apr', sales: Number(totalRevRes.rows[0]?.total || 0) * 0.2 },
          { month: 'May', sales: Number(totalRevRes.rows[0]?.total || 0) * 0.35 },
          { month: 'Jun', sales: Number(totalRevRes.rows[0]?.total || 0) * 0.45 }
        ]
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async createInvoiceManual(req: Request, res: Response) {
    try {
      const { customerId, amount, description } = req.body;
      const invoiceNumber = 'INV-' + Math.floor(100000 + Math.random() * 900000);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);

      const result = await query(
        `INSERT INTO invoices (customer_id, invoice_number, billing_period_start, billing_period_end, amount, gst, total_amount, status, due_date)
         VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', $3, $3 * 0.18, $3 * 1.18, 'pending', $4) RETURNING *`,
        [customerId, invoiceNumber, amount, dueDate]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async refundInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await query(`UPDATE invoices SET status = 'unpaid' WHERE id = $1 RETURNING *`, [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
      res.json({ message: 'Invoice refunded', invoice: result.rows[0] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getTransactions(req: Request, res: Response) {
    try {
      let q = `SELECT t.*, c.name as customer_name FROM payment_transactions t JOIN customers c ON t.customer_id = c.id`;
      const params: any[] = [];

      if (req.user?.role !== 'admin') {
        const userRes = await query('SELECT customer_id FROM users WHERE id = $1', [req.user?.id]);
        const customerId = userRes.rows[0]?.customer_id;
        if (!customerId) return res.json([]);
        q += ' WHERE t.customer_id = $1';
        params.push(customerId);
      }

      q += ' ORDER BY t.created_at DESC';
      const result = await query(q, params);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async checkoutInvoice(req: Request, res: Response) {
    try {
      const { invoiceId } = req.params;
      const { amount, method } = req.body;

      const invoiceRes = await query('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
      if (invoiceRes.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
      const invoice = invoiceRes.rows[0];

      // Mark Invoice as Paid
      await query(`UPDATE invoices SET status = 'paid' WHERE id = $1`, [invoiceId]);

      // Record transaction
      const tx = await query(
        `INSERT INTO payment_transactions (customer_id, invoice_id, provider, gateway_transaction_id, amount, status)
         VALUES ($1, $2, $3, $4, $5, 'success') RETURNING *`,
        [invoice.customer_id, invoiceId, method || 'Stripe', 'ch_' + Math.random().toString(36).substring(7), amount, ]
      );

      // Record payment
      await query(
        `INSERT INTO payments (invoice_id, amount, payment_method, transaction_id, status)
         VALUES ($1, $2, $3, $4, 'success')`,
        [invoiceId, amount, method || 'Card', tx.rows[0].id]
      );

      res.json({ message: 'Invoice paid successfully', transaction: tx.rows[0] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getGlobalConfig(req: Request, res: Response) {
    try {
      const result = await query("SELECT value FROM settings WHERE key = 'global_billing_config'");
      if (result.rows.length === 0) {
        return res.json({
          default_billing_day: 5,
          cron_schedule: '0 9 5 * *',
          whatsapp_template: 'kall_me_attach',
          invoice_template: 'default_template',
          pdf_layout: 'Modern',
          company_branding: {
            name: 'AJR Digital HUB',
            logo: 'assets/images/logo.png',
            primaryColor: '#6366f1',
            secondaryColor: '#06b6d4',
            address: '123 Tech Park, Bangalore, India'
          },
          footer_notes: 'Thank you for your business!',
          payment_instructions: 'Please pay via the payment link attached to the invoice.',
          gst_settings: {
            cgst: 9,
            sgst: 9,
            igst: 18,
            gstin: '29AAAAA0000A1Z5'
          },
          currency_format: 'INR',
          billing_calculation_rules: {
            whatsappRate: 0.86,
            firebaseInvocationRate: 1.0892,
            platformBaseCharge: 0
          },
          notification_retry_count: 3
        });
      }
      res.json(result.rows[0].value);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async saveGlobalConfig(req: Request, res: Response) {
    try {
      const config = req.body;
      await query(
        `INSERT INTO settings (key, value) VALUES ('global_billing_config', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [JSON.stringify(config)]
      );
      
      const userId = (req as any).user?.id || null;
      await query(`
        INSERT INTO audit_logs (user_id, event, details)
        VALUES ($1, $2, $3)
      `, [userId, 'UPDATE_GLOBAL_BILLING_CONFIG', JSON.stringify({})]);

      res.json({ success: true, message: 'Global billing configuration saved successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getCronLogs(req: Request, res: Response) {
    try {
      const result = await query(`
        SELECT l.*, a.name as app_name
        FROM cron_logs l
        LEFT JOIN apps a ON l.app_id = a.id
        ORDER BY l.created_at DESC
        LIMIT 200
      `);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getNotificationLogs(req: Request, res: Response) {
    try {
      const result = await query(`
        SELECT l.*, a.name as app_name
        FROM notification_logs l
        LEFT JOIN apps a ON l.app_id = a.id
        ORDER BY l.created_at DESC
        LIMIT 200
      `);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getCustomerBillingConfig(req: Request, res: Response) {
    try {
      const userRes = await query('SELECT customer_id FROM users WHERE id = $1', [req.user?.id]);
      const customerId = userRes.rows[0]?.customer_id;
      if (!customerId) return res.status(404).json({ error: 'No customer profile linked' });

      const appRes = await query('SELECT app_id FROM customer_profiles WHERE id = $1', [customerId]);
      const appId = appRes.rows[0]?.app_id;
      if (!appId) return res.status(404).json({ error: 'No app linked to customer profile' });

      const customer = await query('SELECT * FROM customer_profiles WHERE app_id = $1', [appId]);
      const billing = await query('SELECT * FROM billing_configuration WHERE app_id = $1', [appId]);
      const notification = await query('SELECT * FROM notification_configuration WHERE app_id = $1', [appId]);

      res.json({
        customer: customer.rows[0] || null,
        billing: billing.rows[0] || null,
        notification: notification.rows[0] || null
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async updateCustomerBillingConfig(req: Request, res: Response) {
    try {
      const userRes = await query('SELECT customer_id FROM users WHERE id = $1', [req.user?.id]);
      const customerId = userRes.rows[0]?.customer_id;
      if (!customerId) return res.status(404).json({ error: 'No customer profile linked' });

      const appRes = await query('SELECT app_id FROM customer_profiles WHERE id = $1', [customerId]);
      const appId = appRes.rows[0]?.app_id;
      if (!appId) return res.status(404).json({ error: 'No app linked to customer profile' });

      const { customer, billing, notification } = req.body;

      if (customer) {
        await query(
          `UPDATE customer_profiles SET 
            company_name = COALESCE($1, company_name),
            customer_name = COALESCE($2, customer_name),
            designation = COALESCE($3, designation),
            primary_email = COALESCE($4, primary_email),
            secondary_email = COALESCE($5, secondary_email),
            mobile_number = COALESCE($6, mobile_number),
            whatsapp_number = COALESCE($7, whatsapp_number),
            alternative_contact_number = COALESCE($8, alternative_contact_number),
            billing_email = COALESCE($9, billing_email),
            billing_whatsapp_number = COALESCE($10, billing_whatsapp_number),
            company_address = COALESCE($11, company_address),
            city = COALESCE($12, city),
            state = COALESCE($13, state),
            country = COALESCE($14, country),
            postal_code = COALESCE($15, postal_code),
            timezone = COALESCE($16, timezone),
            preferred_currency = COALESCE($17, preferred_currency)
           WHERE app_id = $18`,
          [
            customer.company_name, customer.customer_name, customer.designation,
            customer.primary_email, customer.secondary_email, customer.mobile_number,
            customer.whatsapp_number, customer.alternative_contact_number,
            customer.billing_email, customer.billing_whatsapp_number,
            customer.company_address, customer.city, customer.state,
            customer.country, customer.postal_code, customer.timezone,
            customer.preferred_currency, appId
          ]
        );
      }

      if (billing) {
        await query(
          `UPDATE billing_configuration SET 
            whatsapp_invoice_enabled = COALESCE($1, whatsapp_invoice_enabled),
            email_invoice_enabled = COALESCE($2, email_invoice_enabled)
           WHERE app_id = $3`,
          [billing.whatsapp_invoice_enabled, billing.email_invoice_enabled, appId]
        );
      }

      if (notification) {
        await query(
          `UPDATE notification_configuration SET 
            whatsapp_enabled = COALESCE($1, whatsapp_enabled),
            email_enabled = COALESCE($2, email_enabled),
            push_enabled = COALESCE($3, push_enabled),
            preferences = COALESCE($4, preferences)
           WHERE app_id = $5`,
          [
            notification.whatsapp_enabled, 
            notification.email_enabled, 
            notification.push_enabled,
            notification.preferences ? JSON.stringify(notification.preferences) : null,
            appId
          ]
        );
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
};
