import { query } from '../db';
import { invoiceService } from './invoiceService';
import { whatsappService } from './whatsappService';
import { notificationService } from './notificationService';

const API_RATE = 0.01;
const WA_RATE = 0.05;

export const billingService = {
  async runMonthlyBilling() {
    console.log('Starting monthly application billing job...');
    const appsResult = await query(`
        SELECT a.id, a.name, b.usage_json, w.phone_number
        FROM apps a
        LEFT JOIN billing b ON a.id = b.app_id AND b.status = 'pending'
        LEFT JOIN whatsapp_config w ON a.id = w.app_id
        WHERE a.status = 'active'
    `);
    const apps = appsResult.rows;
    const results = [];

    for (const app of apps) {
      const appId = app.id;
      const usage = typeof app.usage_json === 'string' ? JSON.parse(app.usage_json) : (app.usage_json || { api: 0, whatsapp: 0 });
      const limits = { api: 1000, whatsapp: 100 };

      const extra_api = Math.max(0, (usage.api || 0) - limits.api);
      const extra_wa = Math.max(0, (usage.whatsapp || 0) - limits.whatsapp);
      const amount = (extra_api * API_RATE) + (extra_wa * WA_RATE);

      try {
        const invoiceUrl = await invoiceService.generateInvoice(appId, usage, amount);
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        await query(
          `INSERT INTO billing (app_id, usage_json, amount, status, due_date) VALUES ($1, $2, $3, 'pending', $4) RETURNING *`,
          [appId, JSON.stringify({...usage, invoiceUrl}), amount, dueDate.toISOString()]
        );

        if (app.phone_number) {
          await whatsappService.sendWhatsAppMessage(app.phone_number, [
            { type: 'text', text: amount.toString() },
            { type: 'text', text: invoiceUrl }
          ]);
        }
        results.push({ appId, status: 'success', amount });
      } catch (err: any) {
        console.error(`Failed billing for app ${appId}:`, err);
        results.push({ appId, status: 'error', error: err.message });
      }
    }

    console.log('Finished monthly application billing job.');
    return results;
  },

  async runCustomerMonthlyBilling() {
    const startTime = Date.now();
    console.log('Starting SaaS Customer monthly billing job...');
    
    const custRes = await query(`SELECT * FROM customers WHERE status = 'active'`);
    const customers = custRes.rows;
    const results = [];

    for (const cust of customers) {
      try {
        const subRes = await query(`SELECT * FROM subscriptions WHERE customer_id = $1 AND status = 'active'`, [cust.id]);
        const sub = subRes.rows[0];
        
        // Skip billing if customer has no active subscription config
        if (!sub) continue;

        // Obtain plan pricing rules or apply defaults
        let subscriptionCost = 0;
        if (sub.plan.toLowerCase() === 'standard') subscriptionCost = 1500;
        else if (sub.plan.toLowerCase() === 'pro') subscriptionCost = 5000;
        else if (sub.plan.toLowerCase() === 'enterprise') subscriptionCost = 15000;

        // Fetch Live usage summary from tracking tables (last 30 days)
        const waUsage = await query(
          `SELECT COALESCE(SUM(message_count), 0) as msgs, COALESCE(SUM(charges), 0) as charges 
           FROM whatsapp_usage WHERE customer_id = $1 AND created_at >= NOW() - INTERVAL '1 month'`,
          [cust.id]
        );
        const fbUsage = await query(
          `SELECT COALESCE(SUM(charges), 0) as charges FROM firebase_usage 
           WHERE customer_id = $1 AND created_at >= NOW() - INTERVAL '1 month'`,
          [cust.id]
        );
        const adsUsage = await query(
          `SELECT COALESCE(SUM(ad_spend), 0) as spend, COALESCE(SUM(charges), 0) as charges 
           FROM google_ads_usage WHERE customer_id = $1 AND created_at >= NOW() - INTERVAL '1 month'`,
          [cust.id]
        );
        const purchases = await query(
          `SELECT COALESCE(SUM(amount), 0) as purchases FROM purchases 
           WHERE user_id IN (SELECT id FROM users WHERE customer_id = $1) AND created_at >= NOW() - INTERVAL '1 month'`,
          [cust.id]
        );

        const waCost = Number(waUsage.rows[0].charges);
        const fbCost = Number(fbUsage.rows[0].charges);
        const adsCost = Number(adsUsage.rows[0].charges);
        const marketplaceCost = Number(purchases.rows[0].purchases);

        const subtotal = subscriptionCost + waCost + fbCost + adsCost + marketplaceCost;
        const gst = subtotal * 0.18;
        const discounts = 0.00;
        const total = subtotal + gst;

        const invNumber = `INV-2026-${Math.floor(100000 + Math.random() * 900000)}`;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        // Billing contacts
        const bContact = await query(`SELECT * FROM billing_contacts WHERE customer_id = $1`, [cust.id]);
        const billingEmail = bContact.rows[0]?.billing_email || cust.email || 'billing@ajrdigitalhub.com';
        const billingPhone = bContact.rows[0]?.billing_mobile || cust.phone || '';

        const invoiceData = {
          invoice_number: invNumber,
          customer_name: cust.name,
          customer_address: cust.address,
          customer_gst: cust.gst_number,
          customer_email: billingEmail,
          billing_period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          billing_period_end: new Date().toISOString().split('T')[0],
          amount: subtotal,
          gst,
          discounts,
          total_amount: total,
          due_date: dueDate.toISOString().split('T')[0],
          payment_link: `https://ajrdigitalhub.com/pay/${invNumber}`,
          items: [
            { item_name: `${sub.plan} Subscription Plan Fee`, quantity: 1, rate: subscriptionCost, amount: subscriptionCost },
            { item_name: 'WhatsApp Cloud API conversation charges', quantity: waUsage.rows[0].msgs, rate: WA_RATE, amount: waCost },
            { item_name: 'Google Ads campaigns management sync', quantity: 1, rate: adsCost, amount: adsCost },
            { item_name: 'Firebase Hosting & database monitoring', quantity: 1, rate: fbCost, amount: fbCost },
            { item_name: 'Marketplace product acquisitions', quantity: 1, rate: marketplaceCost, amount: marketplaceCost }
          ]
        };

        // Render PDF and generate link
        const pdfUrl = await invoiceService.generateCustomerInvoice(cust.id, invoiceData);

        // Save invoice
        const invRes = await query(
          `INSERT INTO invoices (customer_id, invoice_number, billing_period_start, billing_period_end, amount, gst, discounts, total_amount, status, due_date, pdf_url, payment_link)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11) RETURNING *`,
          [cust.id, invNumber, invoiceData.billing_period_start, invoiceData.billing_period_end, subtotal, gst, discounts, total, invoiceData.due_date, pdfUrl, invoiceData.payment_link]
        );
        const invoice = invRes.rows[0];

        // Save items
        for (const item of invoiceData.items) {
          await query(
            `INSERT INTO invoice_items (invoice_id, item_name, quantity, rate, amount) VALUES ($1, $2, $3, $4, $5)`,
            [invoice.id, item.item_name, item.quantity, item.rate, item.amount]
          );
        }

        // WhatsApp invoice delivery
        if (billingPhone) {
          try {
            await whatsappService.sendWhatsAppMessage(billingPhone, {
              templateName: 'kall_me_deliveryalert',
              parameters: [
                { type: 'text', text: `Invoice ${invNumber} Generated` },
                { type: 'text', text: `Amount: ₹${total.toFixed(2)}. Download PDF: ${pdfUrl}` }
              ]
            });
            await query(`UPDATE invoices SET whatsapp_status = 'sent' WHERE id = $1`, [invoice.id]);
          } catch (waErr) {
            await query(`UPDATE invoices SET whatsapp_status = 'failed' WHERE id = $1`, [invoice.id]);
          }
        }

        // Email invoice notification
        await notificationService.sendNotification(cust.id, 'email', 'invoice_generated', billingEmail, {
          title: `Monthly Invoice Generated: ${invNumber}`,
          message: `Your monthly statement of ₹${total.toFixed(2)} is generated. Download here: ${pdfUrl}`
        });

        results.push({ customerId: cust.id, status: 'success', invoiceNumber: invNumber, total });
      } catch (err: any) {
        console.error(`Failed billing for customer ${cust.id}:`, err);
        results.push({ customerId: cust.id, status: 'error', error: err.message });
      }
    }

    const elapsed = Date.now() - startTime;
    await query(
      `INSERT INTO cron_logs (job_name, status, execution_time, details) VALUES ($1, $2, $3, $4)`,
      ['monthly_billing_cron', 'success', elapsed, JSON.stringify(results)]
    );

    console.log('Finished SaaS Customer monthly billing job.');
    return results;
  }
};

