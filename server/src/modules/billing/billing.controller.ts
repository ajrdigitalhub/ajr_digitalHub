import { Request, Response } from 'express';
import { query, isPostgresEnabled } from '../../config/db';
import { BaseService } from '../../core/base.service';
import { successResponse, errorResponse } from '../../utils/response';
import { billingNotificationService } from '../../services/billing-notification.service';
import { billingCronService } from '../../services/billing-cron.service';
import { notificationHistoryService } from '../../services/notification-history.service';
import { whatsappBillingService } from '../../services/whatsapp-billing.service';
import { invoiceGeneratorService } from '../../services/invoice-generator.service';
import { bucket } from '../../config/firebase';
import * as path from 'path';
import * as fs from 'fs';

const invoicesService = new BaseService('billing_invoices');
const invoiceItemsService = new BaseService('invoice_items');
const appsService = new BaseService('apps');
const settingsService = new BaseService('settings');
const paymentTxService = new BaseService('payment_transactions');

export const billingController = {
  // 1. GET /api/admin/billing/customer-invoices
  async getCustomerInvoices(req: Request, res: Response): Promise<any> {
    try {
      if (isPostgresEnabled) {
        const sql = `
          SELECT bi.*, a.name as customer_name
          FROM billing_invoices bi
          LEFT JOIN (
            SELECT id, data->>'name' as name FROM records WHERE collection = 'apps'
          ) a ON bi.app_id = a.id
          ORDER BY bi.created_at DESC
        `;
        const result = await query(sql);
        return res.json(result.rows);
      } else {
        const list = await invoicesService.findAll({ limit: 1000, sortBy: 'created_at', order: 'DESC' });
        // Map customer name
        const mapped = [];
        for (const inv of list.data) {
          const app = await appsService.findOne(inv.app_id);
          mapped.push({
            ...inv,
            customer_name: app?.name || 'N/A'
          });
        }
        return res.json(mapped);
      }
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 2. GET /api/admin/billing/admin-stats
  async getAdminStats(req: Request, res: Response): Promise<any> {
    try {
      let totalRevenue = 0;
      let pendingPayments = 0;
      let failedPayments = 0;
      let activeSubscriptions = 0;

      // Active applications count
      const appsResult = await appsService.findAll({ limit: 1000 });
      activeSubscriptions = appsResult.data.filter((a: any) => a.status === 'active').length;

      if (isPostgresEnabled) {
        const revRes = await query(`SELECT SUM(total_amount) as total FROM billing_invoices WHERE status = 'paid'`);
        totalRevenue = parseFloat(revRes.rows[0].total || '0');

        const pendRes = await query(`SELECT SUM(total_amount) as total FROM billing_invoices WHERE status = 'pending'`);
        pendingPayments = parseFloat(pendRes.rows[0].total || '0');

        const failRes = await query(`SELECT COUNT(*) as count FROM billing_invoices WHERE status = 'overdue'`);
        failedPayments = parseInt(failRes.rows[0].count || '0');
      } else {
        const invoices = await invoicesService.findAll({ limit: 10000 });
        invoices.data.forEach((inv: any) => {
          if (inv.status === 'paid') totalRevenue += Number(inv.total_amount || 0);
          else if (inv.status === 'pending') pendingPayments += Number(inv.total_amount || 0);
          else if (inv.status === 'overdue') failedPayments++;
        });
      }

      return res.json({
        totalRevenue,
        pendingPayments,
        activeSubscriptions,
        failedPayments
      });
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 3. GET /api/admin/billing/transactions
  async getTransactions(req: Request, res: Response): Promise<any> {
    try {
      if (isPostgresEnabled) {
        const sql = `
          SELECT pt.*, a.name as customer_name
          FROM payment_transactions pt
          LEFT JOIN billing_invoices bi ON pt.invoice_id = bi.id
          LEFT JOIN (
            SELECT id, data->>'name' as name FROM records WHERE collection = 'apps'
          ) a ON bi.app_id = a.id
          ORDER BY pt.created_at DESC
        `;
        const result = await query(sql);
        return res.json(result.rows);
      } else {
        const txs = await paymentTxService.findAll({ limit: 1000, sortBy: 'created_at', order: 'DESC' });
        const mapped = [];
        for (const tx of txs.data) {
          const inv = tx.invoice_id ? await invoicesService.findOne(tx.invoice_id) : null;
          const app = inv ? await appsService.findOne(inv.app_id) : null;
          mapped.push({
            ...tx,
            customer_name: app?.name || 'N/A'
          });
        }
        return res.json(mapped);
      }
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 4. GET /api/admin/billing/global-config
  async getGlobalConfig(req: Request, res: Response): Promise<any> {
    try {
      const config = await settingsService.findOne('global_billing_config');
      return res.json(config || {});
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 5. POST /api/admin/billing/global-config
  async saveGlobalConfig(req: Request, res: Response): Promise<any> {
    try {
      const existing = await settingsService.findOne('global_billing_config');
      let result;
      if (existing) {
        result = await settingsService.update(existing.id, req.body);
      } else {
        result = await settingsService.create({ ...req.body, key: 'global_billing_config' });
      }
      return res.json(successResponse(result));
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 6. GET /api/admin/billing/logs/cron
  async getCronLogs(req: Request, res: Response): Promise<any> {
    try {
      const logs = await billingCronService.getCronHistory(20);
      return res.json(logs);
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 7. GET /api/admin/billing/logs/notifications
  async getNotificationLogs(req: Request, res: Response): Promise<any> {
    try {
      const logs = await notificationHistoryService.getLogs({ limit: 50 });
      return res.json(logs);
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 8. POST /api/admin/billing/invoice/manual
  async createManualInvoice(req: Request, res: Response): Promise<any> {
    const { customerId, amount } = req.body; // customerId = appId
    if (!customerId || !amount || amount <= 0) {
      return res.status(400).json(errorResponse('Customer and positive amount are required'));
    }

    try {
      const app = await appsService.findOne(customerId);
      if (!app) {
        return res.status(404).json(errorResponse('Customer Application not found'));
      }

      // Read configurations
      const config = app.billing_automation || {};
      const customer = config.customer || {};
      const globalConfigDoc = await settingsService.findOne('global_billing_config') || {};
      const currency = globalConfigDoc.currency_format || 'INR';

      const gstRate = 0.18;
      const subtotal = Number(amount);
      const gstAmount = Number((subtotal * gstRate).toFixed(2));
      const grandTotal = Number((subtotal + gstAmount).toFixed(2));

      const invoiceNumber = `INV-MAN-${Date.now().toString().slice(-6)}`;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const invoiceRecord = {
        app_id: customerId,
        invoice_number: invoiceNumber,
        billing_period_start: new Date(Date.now() - 30*86400000).toISOString().split('T')[0],
        billing_period_end: new Date().toISOString().split('T')[0],
        amount: subtotal,
        gst: gstAmount,
        total_amount: grandTotal,
        status: 'pending',
        due_date: dueDate.toISOString().split('T')[0],
        pdf_url: '',
        whatsapp_status: 'pending',
        whatsapp_retry_count: 0
      };

      let savedInvoiceId: string;
      let savedInvoice: any;

      if (isPostgresEnabled) {
        const sql = `
          INSERT INTO billing_invoices (app_id, invoice_number, billing_period_start, billing_period_end, amount, gst, total_amount, status, due_date)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `;
        const resDb = await query(sql, [
          customerId,
          invoiceNumber,
          invoiceRecord.billing_period_start,
          invoiceRecord.billing_period_end,
          subtotal,
          gstAmount,
          grandTotal,
          'pending',
          invoiceRecord.due_date
        ]);
        savedInvoice = resDb.rows[0];
        savedInvoiceId = savedInvoice.id;

        await query(`
          INSERT INTO invoice_items (invoice_id, item_name, quantity, rate, amount)
          VALUES ($1, $2, $3, $4, $5)
        `, [savedInvoiceId, 'Manual Invoiced Auxiliary Subsystem Development Services', 1, subtotal, subtotal]);
      } else {
        savedInvoice = await invoicesService.create(invoiceRecord);
        savedInvoiceId = savedInvoice.id;

        await invoiceItemsService.create({
          invoice_id: savedInvoiceId,
          item_name: 'Manual Invoiced Auxiliary Subsystem Development Services',
          quantity: 1,
          rate: subtotal,
          amount: subtotal
        });
      }

      // Draw PDF
      const pdfData = {
        invoice_number: invoiceNumber,
        created_at: new Date(),
        due_date: dueDate,
        billing_period_start: new Date(Date.now() - 30*86400000),
        billing_period_end: new Date(),
        customer_name: customer.customer_name || 'Standard Client',
        company_name: customer.company_name || app.name,
        billing_address: customer.company_address || customer.billing_address || 'Billing Address N/A',
        gst_number: customer.gst_number || '',
        pan_number: customer.pan_number || '',
        project_name: app.name,
        amount: subtotal,
        gst: gstAmount,
        total_amount: grandTotal,
        payment_link: `http://localhost:4200/billing/${savedInvoiceId}`,
        status: 'pending',
        currency
      };

      const pdfItems = [{
        item_name: 'Manual Invoiced Auxiliary Subsystem Development Services',
        quantity: 1,
        rate: subtotal,
        amount: subtotal
      }];

      const pdfBuffer = await invoiceGeneratorService.generate(pdfData, pdfItems);
      const pdfFileName = `Invoice_${invoiceNumber}_${Date.now()}.pdf`;
      let pdfUrl = '';

      if (bucket) {
        try {
          const fileRef = bucket.file(`invoices/${pdfFileName}`);
          await fileRef.save(pdfBuffer, {
            metadata: { contentType: 'application/pdf' },
            resumable: false
          });
          await fileRef.makePublic();
          pdfUrl = `https://storage.googleapis.com/${bucket.name}/invoices/${pdfFileName}`;
        } catch (e) {
          console.error("Firebase Storage Upload failed, falling back to local:", e);
        }
      }

      if (!pdfUrl) {
        const publicDir = path.join(process.cwd(), 'public/invoices');
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        fs.writeFileSync(path.join(publicDir, pdfFileName), pdfBuffer);
        pdfUrl = `http://localhost:5000/public/invoices/${pdfFileName}`;
      }

      if (isPostgresEnabled) {
        await query(`UPDATE billing_invoices SET pdf_url = $1 WHERE id = $2`, [pdfUrl, savedInvoiceId]);
        savedInvoice.pdf_url = pdfUrl;
      } else {
        await invoicesService.update(savedInvoiceId, { pdf_url: pdfUrl });
        savedInvoice.pdf_url = pdfUrl;
      }

      // Send WhatsApp
      if (customer.whatsapp_number) {
        const billingPeriodStr = `${new Date(invoiceRecord.billing_period_start).toLocaleDateString('en-IN')} - ${new Date(invoiceRecord.billing_period_end).toLocaleDateString('en-IN')}`;
        
        await whatsappBillingService.sendBillingTemplate({
          apiKey: app.whatsapp?.api_key || globalConfigDoc.whatsapp_config?.apiKey || 'mock_token',
          phoneNumberId: app.whatsapp?.phone_number || globalConfigDoc.whatsapp_config?.phoneNumberId || 'mock_phone_id',
          wabaId: app.whatsapp?.waba_id || globalConfigDoc.whatsapp_config?.wabaId || 'mock_waba_id',
          recipient: customer.whatsapp_number,
          templateName: globalConfigDoc.whatsapp_template || 'kall_me_attach',
          variables: [
            customer.customer_name || 'Customer',
            app.name,
            billingPeriodStr,
            String(grandTotal),
            dueDate.toLocaleDateString('en-IN'),
            `http://localhost:4200/billing/${savedInvoiceId}`
          ],
          pdfUrl,
          invoiceNumber
        });

        await notificationHistoryService.log({
          invoice_id: savedInvoiceId,
          channel: 'whatsapp',
          recipient: customer.whatsapp_number,
          status: 'sent'
        });
      }

      return res.status(201).json(successResponse(savedInvoice));
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 9. POST /api/admin/billing/invoice/:id/refund
  async refundInvoice(req: Request, res: Response): Promise<any> {
    const { id } = req.params;
    try {
      let invoice;
      if (isPostgresEnabled) {
        const result = await query(`SELECT * FROM billing_invoices WHERE id = $1`, [id]);
        invoice = result.rows[0];
      } else {
        invoice = await invoicesService.findOne(id);
      }

      if (!invoice) {
        return res.status(404).json(errorResponse('Invoice not found'));
      }

      // Update status
      if (isPostgresEnabled) {
        await query(`UPDATE billing_invoices SET status = 'cancelled' WHERE id = $1`, [id]);
        
        // Log transaction
        await query(`
          INSERT INTO payment_transactions (invoice_id, provider, amount, status, error_message)
          VALUES ($1, $2, $3, $4, $5)
        `, [id, 'Internal Refund Request', -Number(invoice.total_amount), 'failed', 'Transaction Refunded by System Administrator']);
      } else {
        await invoicesService.update(id, { status: 'cancelled' });
        await paymentTxService.create({
          invoice_id: id,
          provider: 'Internal Refund Request',
          amount: -Number(invoice.total_amount),
          status: 'failed',
          error_message: 'Transaction Refunded by System Administrator',
          created_at: new Date().toISOString()
        });
      }

      return res.json(successResponse({ success: true, message: 'Invoice refunded & cancelled successfully.' }));
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 10. POST /api/admin/billing/run
  async runBillingJob(req: Request, res: Response): Promise<any> {
    try {
      const result = await billingCronService.executeBillingRun({ forceAll: true });
      return res.json(successResponse(result));
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 11. POST /api/admin/billing/run-customer
  async runCustomerBillingJob(req: Request, res: Response): Promise<any> {
    try {
      const result = await billingCronService.executeBillingRun({ forceAll: true });
      return res.json(successResponse(result));
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 12. POST /api/admin/billing/invoice/send
  async sendWhatsApp(req: Request, res: Response): Promise<any> {
    const { phone, amount, url } = req.body;
    if (!phone || !amount || !url) {
      return res.status(400).json(errorResponse('phone, amount and url are required'));
    }

    try {
      // Direct send reminder alert
      const globalConfigDoc = await settingsService.findOne('global_billing_config') || {};
      const opt = {
        apiKey: globalConfigDoc.whatsapp_config?.apiKey || 'mock_token',
        phoneNumberId: globalConfigDoc.whatsapp_config?.phoneNumberId || 'mock_phone_id',
        wabaId: globalConfigDoc.whatsapp_config?.wabaId || 'mock_waba_id',
        recipient: phone,
        templateName: globalConfigDoc.whatsapp_template || 'kall_me_attach',
        variables: ['Customer', 'AJR Application', 'Manual Alert Period', String(amount), new Date().toLocaleDateString('en-IN'), url],
        pdfUrl: url,
        invoiceNumber: 'REMINDER'
      };

      const waRes = await whatsappBillingService.sendBillingTemplate(opt);
      if (waRes.success) {
        return res.json(successResponse({ success: true }));
      } else {
        return res.status(500).json(errorResponse(waRes.error || 'WhatsApp gateway error'));
      }
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 13. POST /api/admin/billing/invoice/mark-paid
  async markPaid(req: Request, res: Response): Promise<any> {
    const { id } = req.body;
    if (!id) return res.status(400).json(errorResponse('Invoice ID (id) is required'));

    try {
      let invoice;
      if (isPostgresEnabled) {
        const result = await query(`SELECT * FROM billing_invoices WHERE id = $1`, [id]);
        invoice = result.rows[0];
      } else {
        invoice = await invoicesService.findOne(id);
      }

      if (!invoice) return res.status(404).json(errorResponse('Invoice not found'));

      if (isPostgresEnabled) {
        await query(`UPDATE billing_invoices SET status = 'paid' WHERE id = $1`, [id]);
        // Insert transaction record
        await query(`
          INSERT INTO payment_transactions (invoice_id, provider, gateway_transaction_id, amount, status)
          VALUES ($1, $2, $3, $4, $5)
        `, [id, 'Manual Office Payment', `TXN_MAN_${Date.now()}`, invoice.total_amount, 'success']);
      } else {
        await invoicesService.update(id, { status: 'paid' });
        await paymentTxService.create({
          invoice_id: id,
          provider: 'Manual Office Payment',
          gateway_transaction_id: `TXN_MAN_${Date.now()}`,
          amount: invoice.total_amount,
          status: 'success',
          created_at: new Date().toISOString()
        });
      }

      return res.json(successResponse({ success: true }));
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 14. GET /api/billing/:invoiceId
  async getInvoiceDetail(req: Request, res: Response): Promise<any> {
    const { invoiceId } = req.params;
    try {
      let invoice: any;
      let items: any[] = [];

      if (isPostgresEnabled) {
        const invRes = await query(`SELECT * FROM billing_invoices WHERE id = $1`, [invoiceId]);
        invoice = invRes.rows[0];
        if (invoice) {
          const itemsRes = await query(`SELECT * FROM invoice_items WHERE invoice_id = $1`, [invoiceId]);
          items = itemsRes.rows;
        }
      } else {
        invoice = await invoicesService.findOne(invoiceId);
        if (invoice) {
          const itemsRes = await invoiceItemsService.findAll({ limit: 100 });
          items = itemsRes.data.filter((i: any) => i.invoice_id === invoiceId);
        }
      }

      if (!invoice) {
        return res.status(404).json(errorResponse('Invoice statement not found', 404));
      }

      // Security check: Customer can only view their own invoices. Admins can view all.
      if (req.user?.role !== 'admin') {
        // Find application of this invoice
        const app = await appsService.findOne(invoice.app_id);
        if (!app) {
          return res.status(403).json(errorResponse('Access Forbidden', 403));
        }

        // Verify ownership: User email must be associated with the app
        const appUsers = app.users || [];
        const isAssociated = appUsers.some((u: any) => u.email === req.user?.email) ||
                             app.billing_automation?.customer?.primary_email === req.user?.email ||
                             app.billing_automation?.customer?.billing_email === req.user?.email;
        
        if (!isAssociated) {
          return res.status(403).json(errorResponse('Access Forbidden: You do not own this application invoice', 403));
        }
      }

      // Fetch app detail
      const appDetail = await appsService.findOne(invoice.app_id);

      // Fetch transaction logs of this invoice
      let transactions: any[] = [];
      if (isPostgresEnabled) {
        const txRes = await query(`SELECT * FROM payment_transactions WHERE invoice_id = $1 ORDER BY created_at DESC`, [invoiceId]);
        transactions = txRes.rows;
      } else {
        const txs = await paymentTxService.findAll({ limit: 100 });
        transactions = txs.data.filter((t: any) => t.invoice_id === invoiceId);
      }

      return res.json({
        invoice,
        items,
        app: appDetail ? { id: appDetail.id, name: appDetail.name, domain: appDetail.domain } : null,
        transactions
      });
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 15. GET /api/customers (resolves to listing applications so they render in manual invoices select)
  async getCustomers(req: Request, res: Response): Promise<any> {
    try {
      const result = await appsService.findAll({ limit: 1000 });
      // Map apps to a customer profile layout
      const customers = result.data.map(app => {
        const custConfig = app.billing_automation?.customer || {};
        return {
          id: app.id,
          name: `${app.name} (${custConfig.company_name || 'No Company'})`
        };
      });
      return res.json(customers);
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  }
};
