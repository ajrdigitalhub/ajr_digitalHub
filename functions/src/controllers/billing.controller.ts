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
        // Try updating the new invoices table
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
  }
};

