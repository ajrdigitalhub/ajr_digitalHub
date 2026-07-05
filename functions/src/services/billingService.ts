import { query } from '../db';
import { invoiceService } from './invoiceService';
import { whatsappService } from './whatsappService';
import { notificationService } from './notificationService';
import { FirebaseService } from './firebase.service';
import { METADATA_PRICING_TABLE, getCountryCode } from '../controllers/whatsapp-billing.controller';
import crypto from 'crypto';

const API_RATE = 0.01;
const WA_RATE = 0.05;

const firebaseService = new FirebaseService();

// ============================================================
//  AES-256-CBC Encryption / Decryption Helpers
// ============================================================
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env['ENCRYPTION_KEY'] || 'ajr-encryption-key-32chars-2026';
const IV_LENGTH = 16;

function decryptValue(text: string): string {
  if (!text) return '';
  try {
    let key = ENCRYPTION_KEY;
    if (key.length < 32) key = key.padEnd(32, '0');
    else if (key.length > 32) key = key.substring(0, 32);

    const parts = text.split(':');
    if (parts.length < 2) return text;
    const iv = Buffer.from(parts.shift() || '', 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    return text;
  }
}

// ============================================================
//  WhatsApp Conversation Billing Calculation
// ============================================================
async function getWhatsAppBillingSummary(appId: string, phone: string, country: string): Promise<any> {
  const rates = METADATA_PRICING_TABLE[country] || METADATA_PRICING_TABLE['IN'];
  const currency = rates.utility.currency;

  let marketingCount = 0;
  let utilityCount = 0;
  let authCount = 0;
  let serviceCount = 0;

  const res = await query(
    `SELECT event_type as template, status, COUNT(*) as count
     FROM notification_logs
     WHERE channel = 'whatsapp' 
       AND (app_id = $1 OR customer_id = (SELECT id FROM customer_profiles WHERE app_id = $1))
       AND created_at >= NOW() - INTERVAL '1 month'
     GROUP BY event_type, status`,
    [appId]
  );

  for (const row of res.rows) {
    const name = row.template || '';
    const status = row.status;
    const count = parseInt(row.count || '0', 10);
    if (status === 'failed') continue;

    const cat = (name === 'task_status_update' || name === 'order_confirmation_admin' || name === 'welcome_message' || name === 'get_offers') ? 'marketing' : 'utility';
    if (cat === 'marketing') marketingCount += count;
    else if (cat === 'utility') utilityCount += count;
    else if (cat === 'authentication') authCount += count;
    else serviceCount += count;
  }

  const marketingCost = marketingCount * rates.marketing.price;
  const utilityCost = utilityCount * rates.utility.price;
  const authCost = authCount * rates.authentication.price;
  const serviceCost = serviceCount * rates.service.price;

  const providerCost = marketingCost + utilityCost + authCost + serviceCost;
  
  const marketingPlatform = marketingCost * 0.1;
  const utilityPlatform = utilityCost * 0.1;
  const authPlatform = authCost * 0.1;
  const servicePlatform = serviceCost * 0.1;
  const platformCharge = providerCost * 0.1;

  const totalCost = providerCost + platformCharge;

  return {
    marketingCount,
    marketingCost: Math.round(marketingCost * 100) / 100,
    marketingPlatform: Math.round(marketingPlatform * 100) / 100,
    utilityCount,
    utilityCost: Math.round(utilityCost * 100) / 100,
    utilityPlatform: Math.round(utilityPlatform * 100) / 100,
    authCount,
    authCost: Math.round(authCost * 100) / 100,
    authPlatform: Math.round(authPlatform * 100) / 100,
    serviceCount,
    serviceCost: Math.round(serviceCost * 100) / 100,
    servicePlatform: Math.round(servicePlatform * 100) / 100,
    totalCount: marketingCount + utilityCount + authCount + serviceCount,
    providerCost: Math.round(providerCost * 100) / 100,
    platformCharge: Math.round(platformCharge * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    country,
    currency
  };
}

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

  async runCustomerMonthlyBilling(isManual: boolean = false) {
    const startTime = Date.now();
    console.log(`Starting SaaS Customer monthly billing job (manual: ${isManual})...`);

    // Ensure all apps have configuration profiles initialized (self-healing setup)
    const allApps = (await query('SELECT id, name FROM apps')).rows;
    for (const app of allApps) {
      await query(`
        INSERT INTO customer_profiles (app_id, company_name, customer_name)
        VALUES ($1, $2, 'Administrator')
        ON CONFLICT (app_id) DO NOTHING
      `, [app.id, app.name]);
      await query(`
        INSERT INTO billing_configuration (app_id)
        VALUES ($1)
        ON CONFLICT (app_id) DO NOTHING
      `, [app.id]);
      await query(`
        INSERT INTO notification_configuration (app_id)
        VALUES ($1)
        ON CONFLICT (app_id) DO NOTHING
      `, [app.id]);
    }

    // Load global settings
    const globalConfigResult = await query("SELECT value FROM settings WHERE key = 'global_billing_config'");
    const globalConfig = globalConfigResult.rows[0]?.value || {
      default_billing_day: 5,
      whatsapp_template: 'kall_me_attach',
      gst_settings: { cgst: 9, sgst: 9, igst: 18 }
    };

    // Load active customer configurations joined with app and notification configs
    const custRes = await query(`
      SELECT a.id as app_id, a.name as app_name, a.domain as app_domain, a.plan as app_plan,
             cp.id as customer_profile_id, cp.company_name, cp.customer_name, cp.primary_email, cp.billing_email, cp.billing_whatsapp_number, cp.timezone, cp.preferred_currency, cp.company_address, cp.gst_number, cp.pan_number,
             bc.monthly_billing_enabled, bc.whatsapp_invoice_enabled, bc.email_invoice_enabled, bc.include_whatsapp_charges, bc.include_firebase_charges, bc.include_marketplace_purchases, bc.include_subscription_charges, bc.include_gst_tax, bc.billing_day, bc.billing_time, bc.reminder_before_due_days, bc.due_date_days, bc.auto_retry_failed, bc.enable_payment_link, bc.enable_pdf_attachment, bc.enable_detailed_usage_report, bc.custom_billing_notes,
             nc.whatsapp_enabled, nc.email_enabled, nc.in_app_enabled, nc.recipients
      FROM apps a
      JOIN customer_profiles cp ON a.id = cp.app_id
      JOIN billing_configuration bc ON a.id = bc.app_id
      JOIN notification_configuration nc ON a.id = nc.app_id
      WHERE cp.customer_status = 'active'
    `);
    
    const customers = custRes.rows;
    const results = [];
    const today = new Date();

    for (const app of customers) {
      try {
        // Skip if billing disabled
        if (!app.monthly_billing_enabled) {
          continue;
        }

        // Check if today matches billing day (bypass if manually triggered)
        const targetBillingDay = app.billing_day || globalConfig.default_billing_day || 5;
        if (!isManual && today.getDate() !== targetBillingDay) {
          continue;
        }

        // Decrypt PAN and GSTIN
        const gstin = decryptValue(app.gst_number);
        const pan = decryptValue(app.pan_number);

        // 1. Fetch Subscription plan charge
        let subscriptionCost = 0;
        if (app.include_subscription_charges) {
          const plan = (app.app_plan || 'Lite').toLowerCase();
          if (plan === 'standard') subscriptionCost = 1500;
          else if (plan === 'pro') subscriptionCost = 5000;
          else if (plan === 'enterprise') subscriptionCost = 15000;
        }

        // 2. Fetch Live WhatsApp usage
        let whatsappSummary = null;
        let whatsappCost = 0;
        if (app.include_whatsapp_charges) {
          const phone = app.billing_whatsapp_number || '';
          const country = getCountryCode(phone);
          whatsappSummary = await getWhatsAppBillingSummary(app.app_id, phone, country);
          whatsappCost = whatsappSummary.totalCost || 0;
        }

        // 3. Fetch Live Firebase usage
        let firebaseSummary = null;
        let firebaseCost = 0;
        if (app.include_firebase_charges) {
          try {
            const fbBilling = await firebaseService.getBillingCost(app.app_id);
            if (fbBilling) {
              firebaseSummary = fbBilling;
              firebaseCost = fbBilling.totalCost || 0;
            }
          } catch (e) {
            console.warn(`Failed to fetch Firebase billing for ${app.app_name}`, e);
          }
        }

        // 4. Fetch Marketplace charges
        let marketplaceCost = 0;
        if (app.include_marketplace_purchases) {
          const purchases = await query(
            `SELECT COALESCE(SUM(amount), 0) as total FROM purchases 
             WHERE app_id = $1 AND created_at >= NOW() - INTERVAL '1 month'`,
            [app.app_id]
          );
          marketplaceCost = Number(purchases.rows[0]?.total || 0);
        }

        // 5. Calculate Totals
        const subtotal = subscriptionCost + whatsappCost + firebaseCost + marketplaceCost;
        let gst = 0;
        if (app.include_gst_tax) {
          const taxRate = globalConfig.gst_settings?.igst || 18;
          gst = subtotal * (taxRate / 100);
        }
        const discounts = 0.00;
        const total = subtotal + gst;

        const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (app.due_date_days || 7));

        const items = [];
        if (app.include_subscription_charges) {
          items.push({ item_name: `${app.app_plan} Subscription Plan Fee`, quantity: 1, rate: subscriptionCost, amount: subscriptionCost });
        }
        if (app.include_whatsapp_charges && whatsappSummary && whatsappSummary.totalCount > 0) {
          items.push({ item_name: 'WhatsApp Cloud API Conversation Charges', quantity: whatsappSummary.totalCount, rate: whatsappSummary.providerCost / whatsappSummary.totalCount, amount: whatsappSummary.totalCost });
        }
        if (app.include_firebase_charges && firebaseCost > 0) {
          items.push({ item_name: 'Firebase Hosting & Cloud Compute Usage', quantity: 1, rate: firebaseCost, amount: firebaseCost });
        }
        if (app.include_marketplace_purchases && marketplaceCost > 0) {
          items.push({ item_name: 'Marketplace Product Add-ons', quantity: 1, rate: marketplaceCost, amount: marketplaceCost });
        }

        const invoiceData = {
          invoice_number: invNumber,
          customer_name: app.customer_name,
          company_name: app.company_name,
          customer_address: app.company_address,
          customer_gst: gstin,
          customer_email: app.billing_email || app.primary_email || 'billing@ajrdigitalhub.com',
          billing_period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          billing_period_end: new Date().toISOString().split('T')[0],
          amount: subtotal,
          gst,
          discounts,
          total_amount: total,
          due_date: dueDate.toISOString().split('T')[0],
          payment_link: app.enable_payment_link ? `https://ajrdigitalhub.com/pay/${invNumber}` : '',
          subscription_plan: app.app_plan || 'Lite',
          items,
          whatsappSummary,
          firebaseSummary
        };

        // Render PDF Invoice
        const pdfUrl = await invoiceService.generateCustomerInvoice(app.customer_profile_id, invoiceData);

        // Store Invoice Record
        const invRes = await query(
          `INSERT INTO invoices (customer_id, invoice_number, billing_period_start, billing_period_end, amount, gst, discounts, total_amount, status, due_date, pdf_url, payment_link, app_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11, $12) RETURNING *`,
          [app.customer_profile_id, invNumber, invoiceData.billing_period_start, invoiceData.billing_period_end, subtotal, gst, discounts, total, invoiceData.due_date, pdfUrl, invoiceData.payment_link, app.app_id]
        );
        const invoice = invRes.rows[0];

        // Store Invoice Items
        for (const item of items) {
          await query(
            `INSERT INTO invoice_items (invoice_id, item_name, quantity, rate, amount) VALUES ($1, $2, $3, $4, $5)`,
            [invoice.id, item.item_name, item.quantity, item.rate, item.amount]
          );
        }

        // Save Reference in PDF Documents
        await query(
          `INSERT INTO pdf_documents (app_id, invoice_id, file_name, file_url, file_size) VALUES ($1, $2, $3, $4, 0)`,
          [app.app_id, invoice.id, `${invNumber}.pdf`, pdfUrl]
        );

        // Send WhatsApp Template Notification
        if (app.whatsapp_invoice_enabled && app.billing_whatsapp_number) {
          try {
            const billingMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
            const shortSummary = `${app.app_plan} Plan: ₹${subscriptionCost}. WhatsApp: ₹${whatsappCost.toFixed(2)}. Firebase: ₹${firebaseCost.toFixed(2)}.`;
            
            await whatsappService.sendWhatsAppMessage(app.billing_whatsapp_number, {
              templateName: globalConfig.whatsapp_template || 'kall_me_attach',
              documentUrl: pdfUrl,
              documentFilename: `${invNumber}.pdf`,
              parameters: [
                { type: 'text', text: app.customer_name },
                { type: 'text', text: billingMonth },
                { type: 'text', text: `₹${total.toFixed(2)}` },
                { type: 'text', text: new Date(invoiceData.due_date).toLocaleDateString('en-IN') },
                { type: 'text', text: shortSummary },
                { type: 'text', text: invoiceData.payment_link || 'https://ajrdigitalhub.com' }
              ]
            });
            await query(`UPDATE invoices SET whatsapp_status = 'sent' WHERE id = $1`, [invoice.id]);
            await query(`
              INSERT INTO notification_logs (app_id, channel, event_type, recipient, status)
              VALUES ($1, 'whatsapp', 'invoice_generated', $2, 'sent')
            `, [app.app_id, app.billing_whatsapp_number]);
          } catch (waErr: any) {
            console.error(`WhatsApp delivery failed for app ${app.app_id}:`, waErr.message);
            await query(`UPDATE invoices SET whatsapp_status = 'failed' WHERE id = $1`, [invoice.id]);
            await query(`
              INSERT INTO notification_logs (app_id, channel, event_type, recipient, status, error_details)
              VALUES ($1, 'whatsapp', 'invoice_generated', $2, 'failed', $3)
            `, [app.app_id, app.billing_whatsapp_number, waErr.message]);
          }
        }

        // Send Email Notification
        if (app.email_invoice_enabled && app.billing_email) {
          try {
            await notificationService.sendNotification(app.customer_profile_id, 'email', 'invoice_generated', app.billing_email, {
              title: `Monthly Invoice Generated: ${invNumber}`,
              message: `Your monthly statement of ₹${total.toFixed(2)} is generated. Download here: ${pdfUrl}`
            });
            await query(`
              INSERT INTO notification_logs (app_id, channel, event_type, recipient, status)
              VALUES ($1, 'email', 'invoice_generated', $2, 'sent')
            `, [app.app_id, app.billing_email]);
          } catch (emailErr: any) {
            console.error(`Email delivery failed for app ${app.app_id}:`, emailErr.message);
            await query(`
              INSERT INTO notification_logs (app_id, channel, event_type, recipient, status, error_details)
              VALUES ($1, 'email', 'invoice_generated', $2, 'failed', $3)
            `, [app.app_id, app.billing_email, emailErr.message]);
          }
        }

        results.push({ appId: app.app_id, status: 'success', invoiceNumber: invNumber, total });
      } catch (err: any) {
        console.error(`Failed billing run for app ${app.app_id}:`, err);
        results.push({ appId: app.app_id, status: 'error', error: err.message });
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
