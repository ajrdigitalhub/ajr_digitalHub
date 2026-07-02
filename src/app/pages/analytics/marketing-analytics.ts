import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-marketing-analytics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Top Title Grid -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-app-border pb-5">
        <div>
          <h2 class="text-2xl font-black text-app-text flex items-center gap-2">
            <mat-icon class="text-indigo-500">insights</mat-icon>
            Analytics & Billing Hub
          </h2>
          <p class="text-xs text-app-muted mt-1">Review unified performance charts, export reports, and manage multi-tenant billing settings.</p>
        </div>
        
        <!-- Toggle Tabs -->
        <div class="bg-app-card border border-app-border p-1 rounded-xl flex gap-1 shrink-0">
          <button (click)="activeTab.set('analytics')" [class.bg-indigo-600]="activeTab() === 'analytics'" [class.text-white]="activeTab() === 'analytics'" class="px-3.5 py-1.5 text-xs font-bold text-app-muted rounded-lg transition-all cursor-pointer">
            Analytics
          </button>
          <button (click)="activeTab.set('billing')" [class.bg-indigo-600]="activeTab() === 'billing'" [class.text-white]="activeTab() === 'billing'" class="px-3.5 py-1.5 text-xs font-bold text-app-muted rounded-lg transition-all cursor-pointer">
            SaaS Billing
          </button>
          <button (click)="activeTab.set('reports')" [class.bg-indigo-600]="activeTab() === 'reports'" [class.text-white]="activeTab() === 'reports'" class="px-3.5 py-1.5 text-xs font-bold text-app-muted rounded-lg transition-all cursor-pointer">
            Reports Center
          </button>
        </div>
      </div>

      <!-- Tab Content 1: Campaign Spend & Funnel Analytics -->
      @if (activeTab() === 'analytics') {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          
          <!-- Spend gauges (1 col) -->
          <div class="bg-app-card border border-app-border rounded-2xl p-5 space-y-4">
            <h3 class="text-xs font-extrabold text-app-text uppercase tracking-wider">Ad Network Spend</h3>
            <div class="space-y-4">
              <!-- Google Ads Spend Meter -->
              <div class="p-3 bg-app-bg border border-app-border rounded-xl">
                <div class="flex justify-between items-center text-xs font-bold text-app-text">
                  <span>Google Ads Campaign Spend</span>
                  <span class="text-yellow-400 font-mono">₹1,440.00</span>
                </div>
                <div class="w-full bg-app-card h-2 rounded-full mt-2.5 overflow-hidden">
                  <div class="bg-yellow-500 h-full rounded-full" style="width: 72%"></div>
                </div>
                <span class="text-[9px] text-app-muted block mt-1.5">Monthly Budget Limit: ₹2,000.00</span>
              </div>

              <!-- Meta Ads Spend Meter -->
              <div class="p-3 bg-app-bg border border-app-border rounded-xl">
                <div class="flex justify-between items-center text-xs font-bold text-app-text">
                  <span>Meta Marketing Ads Spend</span>
                  <span class="text-blue-400 font-mono">₹890.00</span>
                </div>
                <div class="w-full bg-app-card h-2 rounded-full mt-2.5 overflow-hidden">
                  <div class="bg-blue-500 h-full rounded-full" style="width: 44.5%"></div>
                </div>
                <span class="text-[9px] text-app-muted block mt-1.5">Monthly Budget Limit: ₹2,000.00</span>
              </div>

              <!-- WhatsApp Spend Meter -->
              <div class="p-3 bg-app-bg border border-app-border rounded-xl">
                <div class="flex justify-between items-center text-xs font-bold text-app-text">
                  <span>WhatsApp Cloud API Spend</span>
                  <span class="text-emerald-400 font-mono">₹189.50</span>
                </div>
                <div class="w-full bg-app-card h-2 rounded-full mt-2.5 overflow-hidden">
                  <div class="bg-emerald-500 h-full rounded-full" style="width: 19%"></div>
                </div>
                <span class="text-[9px] text-app-muted block mt-1.5">Monthly Budget Limit: ₹1,000.00</span>
              </div>
            </div>
          </div>

          <!-- Lead Conversion Funnel (2 cols) -->
          <div class="lg:col-span-2 bg-app-card border border-app-border rounded-2xl p-5 space-y-4">
            <h3 class="text-xs font-extrabold text-app-text uppercase tracking-wider">Lead Acquisition Funnel</h3>
            
            <div class="space-y-3 pt-3">
              <!-- Funnel Stage 1 -->
              <div class="flex items-center gap-3">
                <span class="w-20 text-[10px] font-bold text-app-muted uppercase">1. Leads</span>
                <div class="flex-grow bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-4 py-2 rounded-xl text-xs font-bold font-mono">
                  100% Volume (420 Contacts)
                </div>
              </div>
              <!-- Funnel Stage 2 -->
              <div class="flex items-center gap-3">
                <span class="w-20 text-[10px] font-bold text-app-muted uppercase">2. Contacted</span>
                <div class="flex-grow bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-4 py-2 rounded-xl text-xs font-bold font-mono" style="margin-left: 20px; max-width: calc(100% - 40px)">
                  65% Volume (273 Contacts)
                </div>
              </div>
              <!-- Funnel Stage 3 -->
              <div class="flex items-center gap-3">
                <span class="w-20 text-[10px] font-bold text-app-muted uppercase">3. Qualified</span>
                <div class="flex-grow bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-4 py-2 rounded-xl text-xs font-bold font-mono" style="margin-left: 40px; max-width: calc(100% - 60px)">
                  30% Volume (126 Contacts)
                </div>
              </div>
              <!-- Funnel Stage 4 -->
              <div class="flex items-center gap-3">
                <span class="w-20 text-[10px] font-bold text-app-muted uppercase">4. Won Deals</span>
                <div class="flex-grow bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold font-mono" style="margin-left: 60px; max-width: calc(100% - 80px)">
                  12% Volume (50 Deals Closed)
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Tab Content 2: Billing & Sub Plans -->
      @if (activeTab() === 'billing') {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          <!-- Pricing Plans (2 cols) -->
          <div class="lg:col-span-2 bg-app-card border border-app-border rounded-2xl p-5 space-y-4">
            <h3 class="text-xs font-extrabold text-app-text uppercase tracking-wider">Subscription Plan Tiers</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Tier 1 -->
              <div class="border border-app-border bg-app-bg/50 rounded-2xl p-4 flex flex-col justify-between hover:border-indigo-500/50 transition-colors">
                <div>
                  <h4 class="text-xs font-bold text-app-text">Lite Starter</h4>
                  <p class="text-[10px] text-app-muted mt-1">Ideal for small agencies.</p>
                  <h3 class="text-xl font-black text-app-text mt-3 font-mono">₹2,499<span class="text-xs font-normal">/mo</span></h3>
                </div>
                <button (click)="selectPlan('Lite')" class="w-full mt-4 py-1.5 border border-app-border hover:border-indigo-500 text-xs font-bold rounded-xl cursor-pointer transition-colors">Select Plan</button>
              </div>

              <!-- Tier 2 -->
              <div class="border-2 border-indigo-600 bg-app-bg/50 rounded-2xl p-4 flex flex-col justify-between relative shadow-lg">
                <span class="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-app-text bg-indigo-600 px-2 py-0.5 rounded-full uppercase tracking-wider">Popular</span>
                <div>
                  <h4 class="text-xs font-bold text-app-text">Enterprise Pro</h4>
                  <p class="text-[10px] text-app-muted mt-1">Unlimited templates, CRM.</p>
                  <h3 class="text-xl font-black text-app-text mt-3 font-mono">₹7,999<span class="text-xs font-normal">/mo</span></h3>
                </div>
                <button (click)="selectPlan('Pro')" class="w-full mt-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-app-text text-xs font-bold rounded-xl cursor-pointer transition-colors">Current Plan</button>
              </div>

              <!-- Tier 3 -->
              <div class="border border-app-border bg-app-bg/50 rounded-2xl p-4 flex flex-col justify-between hover:border-indigo-500/50 transition-colors">
                <div>
                  <h4 class="text-xs font-bold text-app-text">Agency Cluster</h4>
                  <p class="text-[10px] text-app-muted mt-1">Multi-tenant, White label.</p>
                  <h3 class="text-xl font-black text-app-text mt-3 font-mono">₹14,999<span class="text-xs font-normal">/mo</span></h3>
                </div>
                <button (click)="selectPlan('Agency')" class="w-full mt-4 py-1.5 border border-app-border hover:border-indigo-500 text-xs font-bold rounded-xl cursor-pointer transition-colors">Upgrade</button>
              </div>
            </div>
          </div>

          <!-- Billing Config (1 col) -->
          <div class="bg-app-card border border-app-border rounded-2xl p-5 space-y-4">
            <h3 class="text-xs font-extrabold text-app-text uppercase tracking-wider">Billing Settings</h3>
            
            <div class="space-y-3">
              <div class="flex justify-between items-center text-xs text-app-muted">
                <span>GST Tax Code (18%)</span>
                <span class="font-bold text-app-text">GSTIN-AJR334466</span>
              </div>
              <div class="flex justify-between items-center text-xs text-app-muted">
                <span>Auto-Renewal Status</span>
                <span class="font-bold text-emerald-400">ENABLED</span>
              </div>
              <div class="flex justify-between items-center text-xs text-app-muted pb-3 border-b border-app-border">
                <span>Current Payment Source</span>
                <span class="font-bold text-app-text">VISA •••• 4242</span>
              </div>

              <h4 class="text-[10px] font-bold text-app-muted uppercase tracking-wider mt-3">Active Invoices</h4>
              <div class="space-y-2">
                <div class="flex justify-between items-center bg-app-bg p-2 rounded-xl border border-app-border">
                  <div>
                    <span class="text-[10px] font-bold text-app-text">Invoice #AJR-3294</span>
                    <span class="text-[8px] text-app-muted block">June 2026</span>
                  </div>
                  <button (click)="downloadInvoice('#AJR-3294')" class="text-xs text-indigo-400 hover:text-indigo-500 cursor-pointer">Download</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Tab Content 3: Reports Exporter -->
      @if (activeTab() === 'reports') {
        <div class="bg-app-card border border-app-border rounded-2xl p-6 space-y-4 max-w-xl mx-auto animate-in fade-in duration-200">
          <h3 class="text-xs font-extrabold text-app-text uppercase tracking-wider">Reports Generator</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-app-muted mb-1">Report Module Source</label>
              <select [(ngModel)]="reportSource" class="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-app-text outline-none focus:border-indigo-500 cursor-pointer">
                <option value="campaigns">Digital Marketing Campaigns Spend</option>
                <option value="crm">CRM Leads & Sales Pipeline Status</option>
                <option value="billing">Invoices and SaaS Billing History</option>
              </select>
            </div>

            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-app-muted mb-1">File Format Type</label>
              <div class="grid grid-cols-3 gap-2">
                <button (click)="reportFormat.set('PDF')" [class.bg-indigo-600]="reportFormat() === 'PDF'" [class.text-white]="reportFormat() === 'PDF'" class="py-2 border border-app-border text-xs font-bold rounded-xl cursor-pointer transition-colors">PDF</button>
                <button (click)="reportFormat.set('Excel')" [class.bg-indigo-600]="reportFormat() === 'Excel'" [class.text-white]="reportFormat() === 'Excel'" class="py-2 border border-app-border text-xs font-bold rounded-xl cursor-pointer transition-colors">Excel</button>
                <button (click)="reportFormat.set('CSV')" [class.bg-indigo-600]="reportFormat() === 'CSV'" [class.text-white]="reportFormat() === 'CSV'" class="py-2 border border-app-border text-xs font-bold rounded-xl cursor-pointer transition-colors">CSV</button>
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-app-muted mb-1">Schedule Automatic Delivery</label>
              <select class="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-app-text outline-none focus:border-indigo-500 cursor-pointer">
                <option>None (Manual Export Only)</option>
                <option>Daily Report (Every morning)</option>
                <option>Weekly Report (Sundays)</option>
                <option>Monthly Rollup (First of month)</option>
              </select>
            </div>

            <button (click)="generateReport()" class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-app-text rounded-xl text-xs font-bold transition-all cursor-pointer">
              Export and Download Report
            </button>
          </div>
        </div>
      }

    </div>
  `
})
export class MarketingAnalytics {
  activeTab = signal<'analytics' | 'billing' | 'reports'>('analytics');
  reportSource = 'campaigns';
  reportFormat = signal('PDF');

  selectPlan(plan: string) {
    alert(`Upgraded plan request submitted successfully for: ${plan}`);
  }

  downloadInvoice(invoiceNum: string) {
    alert(`Downloading invoice ${invoiceNum} in PDF format...`);
  }

  generateReport() {
    alert(`Report generated!\nSource: ${this.reportSource}\nFormat: ${this.reportFormat()}\nDownloading file...`);
  }
}
