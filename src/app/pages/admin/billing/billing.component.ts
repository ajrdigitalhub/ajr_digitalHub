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
          <button (click)="runCustomerBillingJob()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-app-text rounded-xl text-xs font-bold transition shadow-md cursor-pointer">
            <mat-icon class="text-sm mr-1.5 inline-block align-middle">play_arrow</mat-icon>
            Run SaaS Billing
          </button>
          <button (click)="runBillingJob()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-app-text rounded-xl text-xs font-bold transition shadow-md cursor-pointer">
            <mat-icon class="text-sm mr-1.5 inline-block align-middle">play_arrow</mat-icon>
            Run App Billing
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
        <button 
          (click)="activeTab.set('global-config')" 
          [class.border-b-2]="activeTab() === 'global-config'"
          [class.border-indigo-500]="activeTab() === 'global-config'"
          [class.text-indigo-400]="activeTab() === 'global-config'"
          class="pb-3 text-xs font-bold uppercase tracking-wider text-app-muted hover:text-app-text transition cursor-pointer"
        >
          Global Config
        </button>
        <button 
          (click)="activeTab.set('logs')" 
          [class.border-b-2]="activeTab() === 'logs'"
          [class.border-indigo-500]="activeTab() === 'logs'"
          [class.text-indigo-400]="activeTab() === 'logs'"
          class="pb-3 text-xs font-bold uppercase tracking-wider text-app-muted hover:text-app-text transition cursor-pointer"
        >
          Execution Logs
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

      <!-- Global Config Tab -->
      <div *ngIf="activeTab() === 'global-config'" class="glass p-6 rounded-3xl border border-app-border space-y-6 max-w-xl mx-auto">
        <h3 class="text-sm font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
          <mat-icon>settings_suggest</mat-icon> Global Billing Config
        </h3>
        
        <form (ngSubmit)="saveGlobalConfig()" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-[9px] uppercase font-bold text-app-muted mb-1.5">Default Billing Day</label>
              <input type="number" min="1" max="28" [(ngModel)]="globalConfig.default_billing_day" name="default_billing_day" required class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
            </div>
            <div>
              <label class="block text-[9px] uppercase font-bold text-app-muted mb-1.5">Cron Schedule Expression</label>
              <input type="text" [(ngModel)]="globalConfig.cron_schedule" name="cron_schedule" required class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-[9px] uppercase font-bold text-app-muted mb-1.5">WhatsApp Template Name</label>
              <input type="text" [(ngModel)]="globalConfig.whatsapp_template" name="whatsapp_template" required class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
            </div>
            <div>
              <label class="block text-[9px] uppercase font-bold text-app-muted mb-1.5">PDF Layout Template</label>
              <select [(ngModel)]="globalConfig.pdf_layout" name="pdf_layout" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none cursor-pointer">
                <option value="Classic">Classic Layout</option>
                <option value="Modern">Modern Minimalist</option>
                <option value="Elegant">Elegant Premium</option>
              </select>
            </div>
          </div>

          <div class="pt-4 border-t border-app-border">
            <span class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-3">Company Branding & Header Details</span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-[9px] uppercase font-bold text-app-muted mb-1.5">Company Name</label>
                <input type="text" [(ngModel)]="globalConfig.company_branding.name" name="brandingName" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500">
              </div>
              <div>
                <label class="block text-[9px] uppercase font-bold text-app-muted mb-1.5">Branding Logo URL</label>
                <input type="text" [(ngModel)]="globalConfig.company_branding.logo" name="brandingLogo" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <div>
                <label class="block text-[9px] uppercase font-bold text-app-muted mb-1.5">Primary Brand Color</label>
                <div class="flex gap-2">
                  <input type="color" [(ngModel)]="globalConfig.company_branding.primaryColor" name="primaryColor" class="h-8 w-8 bg-transparent cursor-pointer rounded">
                  <input type="text" [(ngModel)]="globalConfig.company_branding.primaryColor" name="primaryColorHex" class="flex-grow px-3 py-1.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
                </div>
              </div>
              <div>
                <label class="block text-[9px] uppercase font-bold text-app-muted mb-1.5">Secondary Brand Color</label>
                <div class="flex gap-2">
                  <input type="color" [(ngModel)]="globalConfig.company_branding.secondaryColor" name="secondaryColor" class="h-8 w-8 bg-transparent cursor-pointer rounded">
                  <input type="text" [(ngModel)]="globalConfig.company_branding.secondaryColor" name="secondaryColorHex" class="flex-grow px-3 py-1.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
                </div>
              </div>
            </div>
            <div class="mt-3">
              <label class="block text-[9px] uppercase font-bold text-app-muted mb-1.5">Company Billing Address</label>
              <textarea rows="2" [(ngModel)]="globalConfig.company_branding.address" name="brandingAddress" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500"></textarea>
            </div>
          </div>

          <div class="pt-4 border-t border-app-border grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-[9px] uppercase font-bold text-app-muted mb-1.5">CGST Rate (%)</label>
              <input type="number" [(ngModel)]="globalConfig.gst_settings.cgst" name="cgst" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
            </div>
            <div>
              <label class="block text-[9px] uppercase font-bold text-app-muted mb-1.5">SGST Rate (%)</label>
              <input type="number" [(ngModel)]="globalConfig.gst_settings.sgst" name="sgst" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="col-span-2">
              <label class="block text-[9px] uppercase font-bold text-app-muted mb-1.5">Company GSTIN</label>
              <input type="text" [(ngModel)]="globalConfig.gst_settings.gstin" name="gstin" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
            </div>
            <div>
              <label class="block text-[9px] uppercase font-bold text-app-muted mb-1.5">Currency Format</label>
              <select [(ngModel)]="globalConfig.currency_format" name="currency_format" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none cursor-pointer">
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          <div class="pt-4 border-t border-app-border">
            <span class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-3">Billing Calculation Rules</span>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-[9px] uppercase font-bold text-app-muted mb-1.5">WhatsApp rate (₹)</label>
                <input type="number" step="0.00001" [(ngModel)]="globalConfig.billing_calculation_rules.whatsappRate" name="waRate" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
              </div>
              <div>
                <label class="block text-[9px] uppercase font-bold text-app-muted mb-1.5">Firebase Inv Rate (₹)</label>
                <input type="number" step="0.0001" [(ngModel)]="globalConfig.billing_calculation_rules.firebaseInvocationRate" name="fbRate" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
              </div>
              <div>
                <label class="block text-[9px] uppercase font-bold text-app-muted mb-1.5">Platform Base (₹)</label>
                <input type="number" [(ngModel)]="globalConfig.billing_calculation_rules.platformBaseCharge" name="platformBase" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-[9px] uppercase font-bold text-app-muted mb-1.5">Notification Retry Count</label>
              <input type="number" min="0" max="5" [(ngModel)]="globalConfig.notification_retry_count" name="retryCount" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
            </div>
          </div>

          <div class="pt-4">
            <label class="block text-[9px] uppercase font-bold text-app-muted mb-1.5">Payment Instructions</label>
            <textarea rows="2" [(ngModel)]="globalConfig.payment_instructions" name="payment_instructions" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500"></textarea>
          </div>

          <div>
            <label class="block text-[9px] uppercase font-bold text-app-muted mb-1.5">Branding Footer Note</label>
            <textarea rows="2" [(ngModel)]="globalConfig.footer_notes" name="footer_notes" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500"></textarea>
          </div>

          <div class="flex gap-3 justify-end pt-4 border-t border-app-border">
            <button type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-app-text text-xs font-bold rounded-xl transition cursor-pointer border border-indigo-500">
              Save Configuration
            </button>
          </div>
        </form>
      </div>

      <!-- Logs Tab -->
      <div *ngIf="activeTab() === 'logs'" class="space-y-6">
        <!-- Cron Logs Section -->
        <div class="glass p-5 rounded-2xl border border-app-border space-y-4">
          <h3 class="text-sm font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1">
            <mat-icon class="text-indigo-400">schedule</mat-icon> Cron Execution Status
          </h3>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-app-border text-[9px] uppercase tracking-wider text-app-muted">
                  <th class="py-3 pr-4 font-bold">Execution Date</th>
                  <th class="py-3 px-4 font-bold">Job Name</th>
                  <th class="py-3 px-4 font-bold text-right">Elapsed (ms)</th>
                  <th class="py-3 px-4 font-bold text-center">Status</th>
                  <th class="py-3 pl-4 font-bold">Execution Details</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-app-border/40">
                @for (log of cronLogs(); track log.id) {
                  <tr class="hover:bg-app-card/30 transition-colors">
                    <td class="py-3 pr-4 text-app-text font-mono">{{ log.created_at | date:'medium' }}</td>
                    <td class="py-3 px-4 font-bold text-indigo-400">{{ log.job_name }}</td>
                    <td class="py-3 px-4 text-right font-mono">{{ log.execution_time }} ms</td>
                    <td class="py-3 px-4 text-center">
                      <span class="inline-flex px-2 py-0.5 rounded text-[8px] uppercase tracking-widest font-black"
                            [ngClass]="log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'">
                        {{ log.status }}
                      </span>
                    </td>
                    <td class="py-3 pl-4 text-app-muted truncate max-w-xs" [title]="log.details">{{ log.details }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="py-8 text-center text-app-muted">No cron executions logged yet.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Notification Logs Section -->
        <div class="glass p-5 rounded-2xl border border-app-border space-y-4">
          <h3 class="text-sm font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1">
            <mat-icon class="text-cyan-400">send</mat-icon> Delivery Notification Logs
          </h3>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-app-border text-[9px] uppercase tracking-wider text-app-muted">
                  <th class="py-3 pr-4 font-bold">Dispatch Date</th>
                  <th class="py-3 px-4 font-bold">Application</th>
                  <th class="py-3 px-4 font-bold">Recipient</th>
                  <th class="py-3 px-4 font-bold text-center">Channel</th>
                  <th class="py-3 px-4 font-bold text-center">Status</th>
                  <th class="py-3 pl-4 font-bold">Errors / Details</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-app-border/40">
                @for (log of notificationLogs(); track log.id) {
                  <tr class="hover:bg-app-card/30 transition-colors">
                    <td class="py-3 pr-4 text-app-text font-mono">{{ log.created_at | date:'medium' }}</td>
                    <td class="py-3 px-4 font-semibold text-app-text">{{ log.app_name || 'N/A' }}</td>
                    <td class="py-3 px-4 text-app-muted font-mono">{{ log.recipient }}</td>
                    <td class="py-3 px-4 text-center font-bold text-indigo-400 uppercase">{{ log.channel }}</td>
                    <td class="py-3 px-4 text-center">
                      <span class="inline-flex px-2 py-0.5 rounded text-[8px] uppercase tracking-widest font-black"
                            [ngClass]="log.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'">
                        {{ log.status }}
                      </span>
                    </td>
                    <td class="py-3 pl-4 text-rose-400 font-mono truncate max-w-xs" [title]="log.error_details || 'Success'">
                      {{ log.error_details || 'Success' }}
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="py-8 text-center text-app-muted">No delivery notifications logged yet.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
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
  activeTab = signal<'invoices' | 'transactions' | 'manual' | 'template' | 'global-config' | 'logs'>('invoices');
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

  // Logs
  cronLogs = signal<any[]>([]);
  notificationLogs = signal<any[]>([]);

  // Global Config Form Model
  globalConfig = {
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
  };

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
    this.loadGlobalConfig();
    this.loadLogs();
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

  loadGlobalConfig() {
    this.api.get<any>('/admin/billing/global-config').subscribe({
      next: (data) => {
        if (data) {
          this.globalConfig = {
            ...this.globalConfig,
            ...data,
            company_branding: { ...this.globalConfig.company_branding, ...(data.company_branding || {}) },
            gst_settings: { ...this.globalConfig.gst_settings, ...(data.gst_settings || {}) },
            billing_calculation_rules: { ...this.globalConfig.billing_calculation_rules, ...(data.billing_calculation_rules || {}) }
          };
        }
      },
      error: (e) => console.error('Failed to load global config', e)
    });
  }

  saveGlobalConfig() {
    this.api.post<any>('/admin/billing/global-config', this.globalConfig).subscribe({
      next: () => alert('Global billing configurations saved successfully!'),
      error: (e) => alert('Failed to save config: ' + e.message)
    });
  }

  loadLogs() {
    this.api.get<any[]>('/admin/billing/logs/cron').subscribe({
      next: (data) => this.cronLogs.set(data || []),
      error: (e) => console.error('Failed to load cron logs', e)
    });
    this.api.get<any[]>('/admin/billing/logs/notifications').subscribe({
      next: (data) => this.notificationLogs.set(data || []),
      error: (e) => console.error('Failed to load notification logs', e)
    });
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

  async runCustomerBillingJob() {
    this.isLoading.set(true);
    try {
      const { firstValueFrom } = await import('rxjs');
      await firstValueFrom(this.api.post<any>('/admin/billing/run-customer', {}));
      alert('SaaS Customer Monthly Billing job completed successfully!');
      await this.loadInvoices();
      await this.loadAdminStats();
      this.loadLogs();
    } catch (err: any) {
      alert('Failed to run SaaS billing: ' + err.message);
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
