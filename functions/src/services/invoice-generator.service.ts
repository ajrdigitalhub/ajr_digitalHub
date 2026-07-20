import PDFDocument from 'pdfkit';

export interface InvoicePdfData {
  invoice_number: string;
  created_at: string | Date;
  due_date: string | Date;
  billing_period_start: string | Date;
  billing_period_end: string | Date;
  customer_name?: string;
  company_name?: string;
  billing_address?: string;
  gst_number?: string;
  pan_number?: string;
  project_name: string;
  amount: number;
  gst: number;
  total_amount: number;
  payment_link?: string;
  status: string;
  currency?: string;
  default_billing_day?: number;
}

export interface InvoiceItemData {
  item_name: string;
  quantity: number;
  rate: number;
  amount: number;
}

export class InvoiceGeneratorService {
  /**
   * Generates a professional invoice PDF and returns it as a Buffer.
   */
  async generate(invoice: InvoicePdfData, items: InvoiceItemData[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        const currencySymbol = invoice.currency === 'USD' ? '$' : invoice.currency === 'EUR' ? '€' : '₹';

        // 1. Header (AJR Digital HUB Brand Logo and Details)
        doc.fillColor('#6366f1') // Primary Brand Color Indigo
           .rect(0, 0, 600, 20)
           .fill();

        doc.fillColor('#1e293b').fontSize(22).font('Helvetica-Bold').text('AJR Digital HUB', 50, 45).font('Helvetica');
        
        doc.fontSize(8).fillColor('#64748b')
           .text('AJR Digital Hub Services Private Limited', 50, 72)
           .text('Innovations Building, Suite 400', 50, 84)
           .text('Bangalore, Karnataka, India - 560001', 50, 96)
           .text('GSTIN: 29AAAAA0000A1Z5 | PAN: ABCDE1234F', 50, 108);

        // 2. Invoice Meta Details
        doc.fillColor('#4338ca').fontSize(14).font('Helvetica-Bold').text('INVOICE / BILL STATEMENT', 350, 45, { align: 'right' }).font('Helvetica');
        doc.fontSize(9).fillColor('#475569')
           .text(`Invoice Number: ${invoice.invoice_number}`, 350, 65, { align: 'right' })
           .text(`Invoice Date: ${new Date(invoice.created_at).toLocaleDateString('en-IN')}`, 350, 78, { align: 'right' })
           .text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString('en-IN')}`, 350, 91, { align: 'right' });
        
        doc.font('Helvetica-Bold').text(`Status: ${invoice.status.toUpperCase()}`, 350, 104, { align: 'right' }).font('Helvetica');

        // Divider
        doc.moveTo(50, 125).lineTo(545, 125).strokeColor('#e2e8f0').lineWidth(1).stroke();

        // 3. Client & Project Billing Info Section
        doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('BILL TO:', 50, 140, { underline: true }).font('Helvetica');
        doc.fillColor('#334155').fontSize(9)
           .text(`Client Name: ${invoice.customer_name || 'Standard Customer'}`, 50, 155)
           .text(`Company: ${invoice.company_name || 'N/A'}`, 50, 168)
           .text(`Address: ${invoice.billing_address || 'N/A'}`, 50, 181, { width: 230 })
           .text(`GSTIN: ${invoice.gst_number || 'N/A'}`, 50, 212)
           .text(`PAN: ${invoice.pan_number || 'N/A'}`, 50, 225);

        const periodStart = new Date(invoice.billing_period_start).toLocaleDateString('en-IN');
        const periodEnd = new Date(invoice.billing_period_end).toLocaleDateString('en-IN');

        doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('PROJECT & STATEMENT METADATA:', 320, 140, { underline: true }).font('Helvetica');
        doc.fillColor('#334155').fontSize(9)
           .text(`Project Name: ${invoice.project_name}`, 320, 155)
           .text(`Billing Duration: ${periodStart} to ${periodEnd}`, 320, 168)
           .text(`Currency: ${invoice.currency || 'INR'}`, 320, 181)
           .text(`Billing Day: Day ${invoice.default_billing_day || 5}`, 320, 194);

        // Divider
        doc.moveTo(50, 245).lineTo(545, 245).strokeColor('#cbd5e1').stroke();

        // 4. Line Items Table Headers
        let y = 260;
        doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold')
           .text('Billing Itemized Breakdown', 55, y)
           .text('Quantity', 260, y, { align: 'right' })
           .text('Unit Rate', 350, y, { align: 'right' })
           .text('Total Amount', 450, y, { align: 'right' }).font('Helvetica');

        doc.moveTo(50, y + 15).lineTo(545, y + 15).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
        y += 25;

        // 5. Draw Invoice Items
        items.forEach((item) => {
          doc.fillColor('#475569').fontSize(8.5)
             .text(item.item_name, 55, y, { width: 190 })
             .text(Number(item.quantity).toLocaleString(undefined, { maximumFractionDigits: 4 }), 260, y, { align: 'right' })
             .text(`${currencySymbol}${Number(item.rate).toFixed(4)}`, 350, y, { align: 'right' });
          
          doc.font('Helvetica-Bold').text(`${currencySymbol}${Number(item.amount).toFixed(2)}`, 450, y, { align: 'right' }).font('Helvetica');
          
          doc.moveTo(50, y + 12).lineTo(545, y + 12).strokeColor('#f1f5f9').stroke();
          y += 18;
        });

        // 6. Total Calculations Summary Box
        y += 10;
        doc.rect(300, y, 245, 75).fillColor('#f8fafc').strokeColor('#e2e8f0').fillAndStroke();
        
        doc.fillColor('#475569').fontSize(8.5)
           .text('Subtotal:', 320, y + 10)
           .text(`${currencySymbol}${Number(invoice.amount).toFixed(2)}`, 460, y + 10, { align: 'right' });
        
        doc.text('GST / Tax (18%):', 320, y + 25)
           .text(`${currencySymbol}${Number(invoice.gst).toFixed(2)}`, 460, y + 25, { align: 'right' });
        
        doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold')
           .text('Grand Total:', 320, y + 45)
           .text(`${currencySymbol}${Number(invoice.total_amount).toFixed(2)}`, 460, y + 45, { align: 'right' }).font('Helvetica');

        // 7. Footer Instructions, QR Code placeholder & Contacts
        y = 610;
        doc.moveTo(50, y).lineTo(545, y).strokeColor('#e2e8f0').lineWidth(1).stroke();
        
        y += 15;
        doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('PAYMENT OPTIONS:', 50, y).font('Helvetica');
        
        // QR Code Placeholder box
        doc.rect(50, y + 15, 60, 60).fillColor('#f1f5f9').strokeColor('#cbd5e1').fillAndStroke();
        doc.fillColor('#64748b').fontSize(6).text('PAYMENT QR', 55, y + 40, { align: 'center', width: 50 });
        
        doc.fillColor('#334155').fontSize(8);
        doc.font('Helvetica-Bold').text(`Payment Status: ${invoice.status.toUpperCase()}`, 125, y + 15).font('Helvetica');
        
        doc.text(`Secure Payment Checkout Link:`, 125, y + 27)
           .fillColor('#4f46e5').text(invoice.payment_link || 'https://ajrdigitalhub.com/pay', 125, y + 37, { underline: true });
        
        doc.fillColor('#475569').fontSize(8)
           .text('For billing complaints or support, email support@ajrdigitalhub.com or contact +91 80 4910 0000.', 125, y + 55);

        // Branding footer note
        y += 85;
        doc.fillColor('#6366f1').fontSize(9).font('Helvetica-Bold').text('Thank you for choosing AJR Digital HUB ❤️', 50, y, { align: 'center' }).font('Helvetica');

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

export const invoiceGeneratorService = new InvoiceGeneratorService();
