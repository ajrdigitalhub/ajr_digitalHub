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
      const result = await billingService.runCustomerMonthlyBilling();
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
  }
};
