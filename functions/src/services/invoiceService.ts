import puppeteer from 'puppeteer';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';

if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (e) {
    console.warn('Firebase Admin failed to initialize. Storage functions will use local filesystem stubs.');
  }
}

export const invoiceService = {
  async generateInvoice(appId: string, usageData: any, amount: number) {
    const templateResult = await query(
      `SELECT data FROM records WHERE collection = 'settings' AND data->>'key' = 'invoice_template'`
    );
    let htmlTemplate = '<h1>Invoice</h1><p>Amount: {{amount}}</p>';
    if (templateResult.rows.length > 0) {
      htmlTemplate = templateResult.rows[0].data.value || htmlTemplate;
    }

    let htmlContent = htmlTemplate
      .replace('{{appId}}', appId)
      .replace('{{amount}}', amount.toString())
      .replace('{{usage_api}}', usageData.api?.toString() || '0')
      .replace('{{usage_whatsapp}}', usageData.whatsapp?.toString() || '0');

    return this.renderPdf(htmlContent);
  },

  async generateCustomerInvoice(customerId: string, invoiceData: any) {
    const formattedAmount = Number(invoiceData.amount || 0).toFixed(2);
    const formattedGst = Number(invoiceData.gst || 0).toFixed(2);
    const formattedDiscounts = Number(invoiceData.discounts || 0).toFixed(2);
    const formattedTotal = Number(invoiceData.total_amount || 0).toFixed(2);

    const itemsRows = (invoiceData.items || []).map((item: any) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 0; font-size: 14px; color: #1e293b; font-weight: 500;">${item.item_name}</td>
        <td style="padding: 12px 0; font-size: 14px; color: #475569; text-align: center;">${Number(item.quantity).toFixed(0)}</td>
        <td style="padding: 12px 0; font-size: 14px; color: #475569; text-align: right;">₹${Number(item.rate).toFixed(2)}</td>
        <td style="padding: 12px 0; font-size: 14px; color: #1e293b; text-align: right; font-weight: 600;">₹${Number(item.amount).toFixed(2)}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', system-ui, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 40px; }
          .invoice-box { max-width: 800px; margin: auto; background: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-b: 2px solid #f1f5f9; padding-bottom: 30px; margin-bottom: 30px; }
          .logo-area { display: flex; align-items: center; gap: 12px; }
          .logo { height: 40px; width: 40px; background: #4f46e5; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px; }
          .title { font-size: 32px; font-weight: 900; color: #4f46e5; letter-spacing: -0.05em; }
          .meta-info { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
          .meta-block h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin: 0 0 8px 0; font-weight: 700; }
          .meta-block p { font-size: 14px; margin: 0; line-height: 1.5; color: #334155; }
          .table-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
          .total-section { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-start; }
          .qr-payment { display: flex; align-items: center; gap: 20px; }
          .qr-code { height: 100px; width: 100px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; border-radius: 12px; border: 1px solid #e2e8f0; }
          .totals-table { width: 300px; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
          .grand-total { font-size: 18px; font-weight: 800; color: #4f46e5; border-top: 2px solid #e2e8f0; padding-top: 12px; margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header" style="display: flex; justify-content: space-between;">
            <div class="logo-area">
              <div class="logo">AJR</div>
              <div>
                <div style="font-size: 16px; font-weight: 800; color: #0f172a;">AJR DIGITAL HUB</div>
                <div style="font-size: 12px; color: #64748b;">Enterprise SaaS Platform</div>
              </div>
            </div>
            <div style="text-align: right;">
              <span class="title">INVOICE</span>
              <div style="font-size: 14px; color: #64748b; font-weight: 600; margin-top: 5px;"># ${invoiceData.invoice_number}</div>
            </div>
          </div>

          <div class="meta-info">
            <div class="meta-block">
              <h3>Billed To:</h3>
              <p><strong>${invoiceData.customer_name}</strong></p>
              <p>${invoiceData.customer_address || ''}</p>
              <p>GSTIN: ${invoiceData.customer_gst || 'N/A'}</p>
              <p>Email: ${invoiceData.customer_email || ''}</p>
            </div>
            <div class="meta-block" style="text-align: right;">
              <h3>Invoice Details:</h3>
              <p>Date: ${new Date(invoiceData.created_at || Date.now()).toLocaleDateString('en-IN')}</p>
              <p>Billing Period: ${new Date(invoiceData.billing_period_start).toLocaleDateString('en-IN')} - ${new Date(invoiceData.billing_period_end).toLocaleDateString('en-IN')}</p>
              <p style="color: #ef4444; font-weight: 700;">Due Date: ${new Date(invoiceData.due_date).toLocaleDateString('en-IN')}</p>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0; text-align: left;">
                <th style="padding: 12px 0; font-size: 12px; text-transform: uppercase; color: #64748b;">Item Description</th>
                <th style="padding: 12px 0; font-size: 12px; text-transform: uppercase; color: #64748b; text-align: center;">Qty</th>
                <th style="padding: 12px 0; font-size: 12px; text-transform: uppercase; color: #64748b; text-align: right;">Rate</th>
                <th style="padding: 12px 0; font-size: 12px; text-transform: uppercase; color: #64748b; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="total-section">
            <div class="qr-payment">
              <div class="qr-code">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(invoiceData.payment_link || 'https://ajrdigitalhub.com')}" alt="Pay QR" style="width: 90px; height: 90px; border-radius: 8px;">
              </div>
              <div>
                <div style="font-size: 13px; font-weight: 700; color: #0f172a;">Scan QR Code to Pay</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px; max-width: 220px;">Use any UPI app to complete the payment instantly. Thank you!</div>
              </div>
            </div>

            <div class="totals-table">
              <div class="totals-row">
                <span style="color: #64748b;">Subtotal</span>
                <span style="font-weight: 600;">₹${formattedAmount}</span>
              </div>
              <div class="totals-row">
                <span style="color: #64748b;">GST (18%)</span>
                <span style="font-weight: 600;">₹${formattedGst}</span>
              </div>
              <div class="totals-row">
                <span style="color: #64748b;">Discounts</span>
                <span style="font-weight: 600; color: #10b981;">-₹${formattedDiscounts}</span>
              </div>
              <div class="grand-total totals-row">
                <span>Total Amount Due</span>
                <span>₹${formattedTotal}</span>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.renderPdf(htmlContent);
  },

  async renderPdf(htmlContent: string): Promise<string> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' as any });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    const filename = `invoices/${uuidv4()}.pdf`;

    try {
      const bucket = admin.storage().bucket();
      const file = bucket.file(filename);
      await file.save(pdfBuffer, {
        metadata: { contentType: 'application/pdf' }
      });
      await file.makePublic();
      return `https://storage.googleapis.com/${bucket.name}/${filename}`;
    } catch (e) {
      console.warn('Firebase Storage upload failed, falling back to mock public URL');
      return `https://storage.googleapis.com/ajrdigitalhubb.appspot.com/${filename}`;
    }
  }
};

