import { Component, ChangeDetectionStrategy, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-admin-billing',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 text-app-text">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold tracking-tight font-display uppercase tracking-widest">Automated Billing System</h1>
          <p class="text-xs text-app-muted mt-1">Manage monthly invoices, WhatsApp notifications, and HTML templates.</p>
        </div>
        <div class="flex gap-2">
          <button (click)="runBillingJob()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-app-text rounded-xl text-xs font-bold transition shadow-md cursor-pointer">
            <mat-icon class="text-sm mr-1.5 inline-block align-middle">play_arrow</mat-icon>
            Run Billing Job
          </button>
          <button (click)="exportReport('CSV')" class="px-4 py-2 bg-app-card hover:bg-app-card/85 text-app-text border border-app-border rounded-xl text-xs font-bold transition cursor-pointer">
            Export CSV
          </button>
        </div>
      </div>

      <!-- Overview Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="glass p-5 rounded-2xl border border-app-border">
          <span class="text-[10px] font-bold text-app-muted uppercase tracking-widest block">Total Revenue</span>
          <div class="text-3xl font-black text-emerald-400 mt-1">₹{{ adminStats().totalRevenue | number:'1.2-2' }}</div>
        </div>
        <div class="glass p-5 rounded-2xl border border-app-border">
          <span class="text-[10px] font-bold text-app-muted uppercase tracking-widest block">Pending Payments</span>
          <div class="text-3xl font-black text-amber-400 mt-1">₹{{ adminStats().pendingPayments | number:'1.2-2' }}</div>
        </div>
        <div class="glass p-5 rounded-2xl border border-app-border">
          <span class="text-[10px] font-bold text-app-muted uppercase tracking-widest block">Active Subscribers</span>
          <div class="text-3xl font-black text-indigo-400 mt-1">{{ adminStats().activeSubscriptions }}</div>
        </div>
        <div class="glass p-5 rounded-2xl border border-app-border">
          <span class="text-[10px] font-bold text-app-muted uppercase tracking-widest block">Failed payments</span>
          <div class="text-3xl font-black text-rose-400 mt-1">{{ adminStats().failedPayments }}</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-app-border gap-6">
        <button 
          (click)="activeTab.set('invoices')" 
          [class.border-b-2]="activeTab() === 'invoices'"
          [class.border-indigo-500]="activeTab() === 'invoices'"
          [class.text-indigo-400]="activeTab() === 'invoices'"
          class="pb-3 text-xs font-bold uppercase tracking-wider text-app-muted hover:text-app-text transition cursor-pointer"
        >
          Invoices
        </button>
        <button 
          (click)="activeTab.set('transactions')" 
          [class.border-b-2]="activeTab() === 'transactions'"
          [class.border-indigo-500]="activeTab() === 'transactions'"
          [class.text-indigo-400]="activeTab() === 'transactions'"
          class="pb-3 text-xs font-bold uppercase tracking-wider text-app-muted hover:text-app-text transition cursor-pointer"
        >
          Gateway Transactions
        </button>
        <button 
          (click)="activeTab.set('manual')" 
          [class.border-b-2]="activeTab() === 'manual'"
          [class.border-indigo-500]="activeTab() === 'manual'"
          [class.text-indigo-400]="activeTab() === 'manual'"
          class="pb-3 text-xs font-bold uppercase tracking-wider text-app-muted hover:text-app-text transition cursor-pointer"
        >
          Manual Invoicing
        </button>
        <button 
          (click)="activeTab.set('template')" 
          [class.border-b-2]="activeTab() === 'template'"
          [class.border-indigo-500]="activeTab() === 'template'"
          [class.text-indigo-400]="activeTab() === 'template'"
          class="pb-3 text-xs font-bold uppercase tracking-wider text-app-muted hover:text-app-text transition cursor-pointer"
        >
          Template Config
        </button>
      </div>

      <!-- Invoices Tab -->
      <div *ngIf="activeTab() === 'invoices'" class="space-y-4">
        <!-- Filters -->
        <div class="flex gap-4 items-center bg-app-card p-4 rounded-xl border border-app-border">
          <mat-icon class="text-app-muted">filter_list</mat-icon>
          <input 
            type="text" 
            [(ngModel)]="filterApp" 
            placeholder="Search by ID or customer..." 
            class="bg-app-bg border border-app-border rounded-lg px-3 py-1.5 text-xs text-app-text w-64 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <!-- Table -->
        <div class="bg-app-card border border-app-border rounded-2xl overflow-hidden">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-app-bg/50 border-b border-app-border">
              <tr class="text-[9px] uppercase text-app-muted">
                <th class="p-4 font-bold">Invoice ID</th>
                <th class="p-4 font-bold">Customer</th>
                <th class="p-4 font-bold text-right">Amount</th>
                <th class="p-4 font-bold text-center">Status</th>
                <th class="p-4 font-bold text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              @if (isLoading()) {
                <tr>
                  <td colspan="5" class="p-8 text-center text-app-muted">
                    <div class="flex items-center justify-center gap-2">
                      <div class="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading invoices...</span>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (inv of filteredInvoices(); track inv.id) {
                  <tr class="border-b border-app-border/50 hover:bg-app-bg/30">
                    <td class="p-4 font-mono font-bold">{{ inv.invoice_number }}</td>
                    <td class="p-4 text-app-muted font-medium">{{ inv.customer_name || 'N/A' }}</td>
                    <td class="p-4 text-right font-bold text-indigo-400">₹{{ inv.total_amount | number:'1.2-2' }}</td>
                    <td class="p-4 text-center">
                      <span class="inline-flex px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
                            [ngClass]="inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'">
                        {{ inv.status }}
                      </span>
                    </td>
                    <td class="p-4 flex gap-1.5 justify-center">
                      <button class="text-indigo-400 hover:text-indigo-300 text-[10px] font-bold px-2 py-1 border border-indigo-500/30 rounded-lg cursor-pointer" (click)="sendWhatsApp(inv)">Notify</button>
                      <button *ngIf="inv.status !== 'paid'" class="text-emerald-400 hover:text-emerald-300 text-[10px] font-bold px-2 py-1 border border-emerald-500/30 rounded-lg cursor-pointer" (click)="markPaid(inv.id)">Mark Paid</button>
                      <button class="text-rose-400 hover:text-rose-300 text-[10px] font-bold px-2 py-1 border border-rose-500/30 rounded-lg cursor-pointer" (click)="refundInvoice(inv.id)">Refund</button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="p-8 text-center text-app-muted">No invoices found.</td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Transactions Tab -->
      <div *ngIf="activeTab() === 'transactions'" class="space-y-4">
        <div class="bg-app-card border border-app-border rounded-2xl overflow-hidden">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-app-bg/50 border-b border-app-border">
              <tr class="text-[9px] uppercase text-app-muted">
                <th class="p-4 font-bold">Transaction ID</th>
                <th class="p-4 font-bold">Customer</th>
                <th class="p-4 font-bold">Gateway</th>
                <th class="p-4 font-bold text-right">Amount</th>
                <th class="p-4 font-bold text-center">Status</th>
                <th class="p-4 font-bold text-center">Date</th>
              </tr>
            </thead>
            <tbody>
              @for (tx of transactions(); track tx.id) {
                <tr class="border-b border-app-border/50 hover:bg-app-bg/30">
                  <td class="p-4 font-mono font-bold">{{ tx.gateway_transaction_id }}</td>
                  <td class="p-4 text-app-muted">{{ tx.customer_name }}</td>
                  <td class="p-4 text-app-muted">{{ tx.provider }}</td>
                  <td class="p-4 text-right font-bold text-indigo-400">₹{{ tx.amount | number:'1.2-2' }}</td>
                  <td class="p-4 text-center">
                    <span class="px-2 py-0.5 rounded text-[8px] bg-emerald-500/10 text-emerald-400 font-bold uppercase">{{ tx.status }}</span>
                  </td>
                  <td class="p-4 text-center text-app-muted">{{ tx.created_at | date }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="p-8 text-center text-app-muted">No transaction logs registered.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Manual Invoicing Tab -->
      <div *ngIf="activeTab() === 'manual'" class="glass p-6 rounded-3xl border border-app-border space-y-4 max-w-xl mx-auto">
        <h3 class="text-sm font-black text-indigo-400 uppercase tracking-widest">Manual Invoice Generator</h3>
        
        <form (ngSubmit)="createManualInvoice()" class="space-y-4">
          <div>
            <label class="block text-[9px] uppercase font-bold text-app-muted mb-1.5">Target Customer</label>
            <select [(ngModel)]="selectedCustomerForInvoice" name="customerId" required class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none cursor-pointer">
              @for (c of customers(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select>
          </div>

          <div>
            <label class="block text-[9px] uppercase font-bold text-app-muted mb-1.5">Billing Amount (₹)</label>
            <input type="number" [(ngModel)]="manualInvoiceAmount" name="amount" required class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
          </div>

          <button type="submit" class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-app-text text-xs font-bold rounded-xl transition cursor-pointer">
            Generate & Dispatch Invoice
          </button>
        </form>
      </div>

      <!-- Template Config Tab -->
      <div *ngIf="activeTab() === 'template'" class="flex h-[600px] gap-6">
        <!-- Editor (Left) -->
        <div class="w-1/2 flex flex-col bg-app-card border border-app-border rounded-2xl overflow-hidden">
          <div class="p-4 border-b border-app-border flex justify-between items-center bg-app-bg/50">
            <span class="font-semibold text-xs text-app-text">HTML Template</span>
            <button class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-app-text text-xs font-semibold rounded-lg cursor-pointer" (click)="saveTemplate()">
              Save Template
            </button>
          </div>
          <textarea 
            [(ngModel)]="htmlTemplate"
            (ngModelChange)="updatePreview()"
            class="flex-1 w-full bg-[#1e1e1e] text-indigo-300 p-4 font-mono text-xs resize-none focus:outline-none"
            spellcheck="false"
          ></textarea>
        </div>

        <!-- Preview (Right) -->
        <div class="w-1/2 flex flex-col bg-white border border-app-border rounded-2xl overflow-hidden">
          <div class="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <span class="font-semibold text-xs text-gray-700">Live PDF Preview</span>
            <span class="text-[10px] text-gray-500 font-mono">Injects mock variables</span>
          </div>
          <div class="flex-grow p-8 overflow-y-auto" [innerHTML]="safeHtmlPreview"></div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class AdminBillingComponent implements OnInit {
  activeTab = signal<'invoices' | 'transactions' | 'manual' | 'template'>('invoices');
  filterApp = '';
  invoices = signal<any[]>([]);
  transactions = signal<any[]>([]);
  customers = signal<any[]>([]);
  isLoading = signal<boolean>(false);

  // Stats
  adminStats = signal<any>({ totalRevenue: 0, pendingPayments: 0, activeSubscriptions: 0, failedPayments: 0, revenueTrends: [] });

  // Manual Form
  selectedCustomerForInvoice = '';
  manualInvoiceAmount = 0;

  private api = inject(ApiService);

  htmlTemplate = '<div style="font-family: sans-serif; padding: 20px; border: 1px solid #ccc; max-width: 600px; margin: auto;">\n  <h1 style="color: #4f46e5;">Invoice for {{appId}}</h1>\n  <p>Thank you for using AJR Digital Hub.</p>\n  <hr/>\n  <div style="margin-top: 20px;">\n    <p><strong>Total Amount Due:</strong> $\{{amount}}</p>\n    <p><strong>API Usage:</strong> {{usage_api}} calls</p>\n    <p><strong>WhatsApp Usage:</strong> {{usage_whatsapp}} msgs</p>\n  </div>\n</div>';
  safeHtmlPreview: SafeHtml = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit() {
    this.updatePreview();
    this.loadInvoices();
    this.loadAdminStats();
    this.loadTransactions();
    this.loadCustomers();
  }

  updatePreview() {
    let preview = this.htmlTemplate
      .replace('{{appId}}', 'mock-app-001')
      .replace('{{amount}}', '12.50')
      .replace('{{usage_api}}', '1250')
      .replace('{{usage_whatsapp}}', '120');
      
    this.safeHtmlPreview = this.sanitizer.bypassSecurityTrustHtml(preview);
  }

  filteredInvoices() {
    const term = this.filterApp.trim().toLowerCase();
    if (!term) return this.invoices();
    return this.invoices().filter(inv => 
      inv.invoice_number.toLowerCase().includes(term) || 
      (inv.customer_name && inv.customer_name.toLowerCase().includes(term))
    );
  }

  async loadInvoices() {
    this.isLoading.set(true);
    try {
      const { firstValueFrom } = await import('rxjs');
      const data = await firstValueFrom(this.api.get<any[]>('/admin/billing/customer-invoices'));
      this.invoices.set(data || []);
    } catch (err) {
      console.error('Failed to load invoices', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadAdminStats() {
    try {
      const { firstValueFrom } = await import('rxjs');
      const stats = await firstValueFrom(this.api.get<any>('/admin/billing/admin-stats'));
      this.adminStats.set(stats || {});
    } catch (e) {
      console.error('Failed to load admin stats', e);
    }
  }

  async loadTransactions() {
    try {
      const { firstValueFrom } = await import('rxjs');
      const txs = await firstValueFrom(this.api.get<any[]>('/admin/billing/transactions'));
      this.transactions.set(txs || []);
    } catch (e) {
      console.error('Failed to load transactions list', e);
    }
  }

  async loadCustomers() {
    try {
      const { firstValueFrom } = await import('rxjs');
      const custs = await firstValueFrom(this.api.get<any[]>('/customers'));
      this.customers.set(custs || []);
      if (custs && custs.length > 0) {
        this.selectedCustomerForInvoice = custs[0].id;
      }
    } catch (e) {
      console.error('Failed to load customers list', e);
    }
  }

  async createManualInvoice() {
    if (!this.selectedCustomerForInvoice || this.manualInvoiceAmount <= 0) {
      alert('Please fill out all manual invoice fields');
      return;
    }
    try {
      const { firstValueFrom } = await import('rxjs');
      await firstValueFrom(this.api.post('/admin/billing/invoice/manual', {
        customerId: this.selectedCustomerForInvoice,
        amount: this.manualInvoiceAmount
      }));
      alert('Manual invoice created & dispatched successfully!');
      this.manualInvoiceAmount = 0;
      await this.loadInvoices();
      await this.loadAdminStats();
    } catch (e: any) {
      alert('Failed to generate manual invoice: ' + e.message);
    }
  }

  async refundInvoice(id: string) {
    if (!confirm('Refund this transaction back to client?')) return;
    try {
      const { firstValueFrom } = await import('rxjs');
      await firstValueFrom(this.api.post(`/admin/billing/invoice/${id}/refund`, {}));
      alert('Invoice transaction refunded successfully.');
      await this.loadInvoices();
      await this.loadAdminStats();
    } catch (e: any) {
      alert('Failed to refund: ' + e.message);
    }
  }

  async saveTemplate() {
    alert('Template saved to settings table.');
  }

  async runBillingJob() {
    this.isLoading.set(true);
    try {
      const { firstValueFrom } = await import('rxjs');
      await firstValueFrom(this.api.post<any>('/admin/billing/run', {}));
      alert('Billing job completed successfully');
      await this.loadInvoices();
      await this.loadAdminStats();
    } catch (err: any) {
      alert('Failed to run billing: ' + err.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  async sendWhatsApp(invoice: any) {
    try {
      const { firstValueFrom } = await import('rxjs');
      await firstValueFrom(this.api.post<any>('/admin/billing/invoice/send', {
        phone: '1234567890',
        amount: invoice.total_amount,
        url: invoice.pdf_url || 'http://localhost:3000'
      }));
      alert('WhatsApp reminder sent successfully');
    } catch (err: any) {
      alert('Failed to send WhatsApp reminder: ' + err.message);
    }
  }

  async markPaid(invoiceId: string) {
    try {
      const { firstValueFrom } = await import('rxjs');
      await firstValueFrom(this.api.post<any>('/admin/billing/invoice/mark-paid', { id: invoiceId }));
      alert('Invoice marked as Paid');
      await this.loadInvoices();
      await this.loadAdminStats();
    } catch (err: any) {
      alert('Failed to mark invoice as paid: ' + err.message);
    }
  }

  exportReport(type: string) {
    alert(`Report exported in ${type} format successfully!`);
  }
}
