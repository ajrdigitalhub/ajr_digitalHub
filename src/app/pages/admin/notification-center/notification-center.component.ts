import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { AdminStoreService } from '../../../services/admin-store.service';
import { HttpClient } from '@angular/common/http';

interface CustomerSearchResult {
  customer_id: string;
  customer_name: string;
  company_name: string;
  primary_email: string;
  whatsapp_number: string;
  mobile_number: string;
  app_id: string;
  project_name: string;
  push_token_count: number;
}

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="min-h-screen bg-app-bg text-app-text font-sans pb-12">
      <!-- Top Navigation Header Only (No Sidebar) -->
      <header class="bg-app-card/60 backdrop-blur-md border-b border-app-border h-16 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
        <div class="flex items-center gap-3">
          <button (click)="goBackToAdmin()" class="p-2 hover:bg-app-bg/50 rounded-lg text-app-muted hover:text-app-text transition-colors cursor-pointer">
            <mat-icon class="!w-5 !h-5 !text-[20px]">arrow_back</mat-icon>
          </button>
          <h1 class="text-md font-bold tracking-tight flex items-center gap-2">
            Notification Center
          </h1>
          <span class="px-2 py-0.5 rounded-full text-[9px] bg-indigo-500/10 text-indigo-400 font-mono font-bold border border-indigo-500/20">
            NOC ADMIN CONSOLE
          </span>
        </div>

        <div class="flex items-center gap-4 text-xs">
          <div class="flex items-center gap-1 text-app-muted">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            System Online
          </div>
        </div>
      </header>

      <main class="max-w-[1400px] mx-auto p-6 md:p-8 space-y-8">
        <!-- 1. Stats Dashboard Ribbon -->
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div class="glass p-4 rounded-2xl border border-app-border flex flex-col justify-between min-h-[90px]">
            <span class="text-[10px] text-app-muted uppercase font-black tracking-wider">Today's Total</span>
            <p class="text-2xl font-mono font-black text-indigo-400">{{ stats().today.total }}</p>
          </div>
          <div class="glass p-4 rounded-2xl border border-app-border flex flex-col justify-between min-h-[90px]">
            <span class="text-[10px] text-app-muted uppercase font-black tracking-wider">WhatsApp Sends</span>
            <p class="text-2xl font-mono font-black text-teal-400">{{ stats().today.whatsapp }}</p>
          </div>
          <div class="glass p-4 rounded-2xl border border-app-border flex flex-col justify-between min-h-[90px]">
            <span class="text-[10px] text-app-muted uppercase font-black tracking-wider">Push Dispatches</span>
            <p class="text-2xl font-mono font-black text-sky-400">{{ stats().today.push }}</p>
          </div>
          <div class="glass p-4 rounded-2xl border border-app-border flex flex-col justify-between min-h-[90px]">
            <span class="text-[10px] text-app-muted uppercase font-black tracking-wider">Pending/Scheduled</span>
            <p class="text-2xl font-mono font-black text-amber-500">{{ stats().scheduledCount || stats().today.pending }}</p>
          </div>
          <div class="glass p-4 rounded-2xl border border-app-border flex flex-col justify-between min-h-[90px]">
            <span class="text-[10px] text-app-muted uppercase font-black tracking-wider">Failed Runs</span>
            <p class="text-2xl font-mono font-black text-rose-500">{{ stats().today.failed }}</p>
          </div>
          <div class="glass p-4 rounded-2xl border border-app-border flex flex-col justify-between min-h-[90px]">
            <span class="text-[10px] text-app-muted uppercase font-black tracking-wider">Success Rate</span>
            <p class="text-2xl font-mono font-black text-emerald-400">{{ stats().successRate }}%</p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- 2. Left Card: Customer & Delivery Channel Configuration -->
          <div class="lg:col-span-1 space-y-6">
            <div class="glass p-6 rounded-2xl border border-app-border space-y-5">
              <h3 class="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-app-border pb-3">
                <mat-icon class="!text-[16px] !w-4 !h-4">account_circle</mat-icon> Client & Channel Target
              </h3>

              <!-- Customer Search Auto-Complete -->
              <div class="relative">
                <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Search Customer Profile</label>
                <div class="relative">
                  <input type="text" [(ngModel)]="searchQuery" (input)="onSearchInput()" placeholder="Type client name, email or mobile..." class="w-full pl-9 pr-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold">
                  <mat-icon class="absolute left-3 top-2.5 !w-4 !h-4 !text-[16px] text-app-muted">search</mat-icon>
                </div>

                <!-- Suggestions dropdown -->
                @if (searchResults().length > 0) {
                  <ul class="absolute z-40 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-app-card border border-app-border rounded-xl shadow-xl custom-scrollbar divide-y divide-app-border/40">
                    @for (cust of searchResults(); track cust.customer_id) {
                      <li (click)="selectCustomer(cust)" class="p-3 hover:bg-indigo-600/10 cursor-pointer transition-colors space-y-1">
                        <div class="flex justify-between items-center">
                          <span class="font-bold text-xs text-app-text">{{ cust.customer_name }}</span>
                          <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-app-bg text-app-muted border border-app-border">{{ cust.project_name || 'No Project' }}</span>
                        </div>
                        <div class="flex justify-between text-[10px] text-app-muted">
                          <span>{{ cust.primary_email || 'No email' }}</span>
                          <span>{{ cust.whatsapp_number || 'No WhatsApp' }}</span>
                        </div>
                      </li>
                    }
                  </ul>
                }
              </div>

              <!-- Selected Customer Card -->
              @if (selectedCustomer()) {
                <div class="bg-indigo-600/5 border border-indigo-500/20 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
                  <div class="flex justify-between items-start">
                    <div>
                      <h4 class="font-bold text-xs text-app-text">{{ selectedCustomer()?.customer_name }}</h4>
                      <p class="text-[10px] text-app-muted mt-0.5">{{ selectedCustomer()?.company_name }}</p>
                    </div>
                    <button (click)="clearCustomer()" class="p-1 hover:bg-app-bg/50 rounded text-app-muted hover:text-rose-500 transition-colors">
                      <mat-icon class="!w-4 !h-4 !text-[16px]">close</mat-icon>
                    </button>
                  </div>
                  
                  <div class="grid grid-cols-2 gap-2 text-[10px] text-app-muted font-semibold">
                    <div class="flex items-center gap-1.5">
                      <mat-icon class="!w-3.5 !h-3.5 !text-[14px]">email</mat-icon>
                      <span class="truncate">{{ selectedCustomer()?.primary_email || 'N/A' }}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <mat-icon class="!w-3.5 !h-3.5 !text-[14px]">chat</mat-icon>
                      <span>{{ selectedCustomer()?.whatsapp_number || 'N/A' }}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <mat-icon class="!w-3.5 !h-3.5 !text-[14px]">apps</mat-icon>
                      <span class="truncate">{{ selectedCustomer()?.project_name || 'N/A' }}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <mat-icon class="!w-3.5 !h-3.5 !text-[14px]" [class.text-emerald-500]="(selectedCustomer()?.push_token_count || 0) > 0">notifications_active</mat-icon>
                      <span [class.text-emerald-400]="(selectedCustomer()?.push_token_count || 0) > 0">
                        {{ (selectedCustomer()?.push_token_count || 0) > 0 ? 'Push Active (' + selectedCustomer()?.push_token_count + ' Devices)' : 'Push Inactive' }}
                      </span>
                    </div>
                  </div>
                </div>
              }

              <!-- Notification Type & Delivery Channels -->
              <div class="space-y-4 pt-3 border-t border-app-border/40 pb-3">
                <div>
                  <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Notification Type</label>
                  <select [(ngModel)]="notificationType" class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none cursor-pointer font-bold">
                    <option value="Reminder">Reminder</option>
                    <option value="Payment Reminder">Payment Reminder</option>
                    <option value="Invoice Reminder">Invoice Reminder</option>
                    <option value="Project Update">Project Update</option>
                    <option value="Maintenance Notice">Maintenance Notice</option>
                    <option value="Subscription Expiry">Subscription Expiry</option>
                    <option value="Custom">Custom Alert</option>
                  </select>
                </div>

                <div class="space-y-2.5">
                  <span class="block text-[9px] font-bold text-app-muted uppercase mb-1">Delivery Channels</span>
                  <div class="flex gap-4">
                    <label class="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input type="checkbox" [(ngModel)]="sendWhatsApp" class="rounded bg-app-bg border-app-border text-indigo-500 w-4 h-4 cursor-pointer">
                      <span>WhatsApp Cloud API</span>
                    </label>
                    <label class="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input type="checkbox" [(ngModel)]="sendPush" class="rounded bg-app-bg border-app-border text-indigo-500 w-4 h-4 cursor-pointer">
                      <span>Firebase Push (FCM)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- Dispatch Button Card -->
            <div class="glass p-6 rounded-2xl border border-app-border space-y-4">
              <button (click)="sendManualNotification()" [disabled]="isDispatching() || !selectedCustomer() || (!sendWhatsApp && !sendPush)" class="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 text-white text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20">
                @if (isDispatching()) {
                  <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>TRANSMITTING ALERT...</span>
                } @else {
                  <mat-icon class="!text-[16px] !w-4 !h-4">send</mat-icon>
                  <span>Dispatch Notification</span>
                }
              </button>

              <button (click)="sendQuickTest()" [disabled]="isTesting() || !selectedCustomer()" class="w-full py-2.5 bg-app-card border border-app-border hover:bg-app-bg text-app-muted hover:text-app-text text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5">
                @if (isTesting()) {
                  <div class="w-4 h-4 border-2 border-app-muted border-t-transparent rounded-full animate-spin"></div>
                  <span>RUNNING TEST...</span>
                } @else {
                  <mat-icon class="!text-[16px] !w-4 !h-4">troubleshoot</mat-icon>
                  <span>Transmit Instant Test</span>
                }
              </button>
            </div>
          </div>

          <!-- 3. Middle/Right Card: Channel-Specific Fields -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Channel 1: WhatsApp templates (Loaded if sendWhatsApp is checked) -->
            @if (sendWhatsApp()) {
              <div class="glass p-6 rounded-2xl border border-app-border space-y-5 animate-in slide-in-from-top-2 duration-300">
                <h3 class="text-xs font-black text-teal-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-app-border pb-3">
                  <mat-icon class="!text-[16px] !w-4 !h-4 text-teal-500">chat</mat-icon> WhatsApp Business API
                </h3>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Select Approved Template</label>
                    <select [(ngModel)]="selectedTemplateName" (change)="onTemplateChange()" class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none cursor-pointer font-semibold">
                      <option value="">Choose Meta Template...</option>
                      @for (t of templates(); track t.name) {
                        <option [value]="t.name">{{ t.name }} ({{ t.language }})</option>
                      }
                    </select>
                  </div>

                  @if (selectedTemplate()) {
                    <div class="grid grid-cols-3 gap-2 text-[10px] bg-app-bg/50 border border-app-border rounded-xl p-2.5">
                      <div>
                        <span class="block text-app-muted uppercase font-bold text-[8px]">Category</span>
                        <span class="font-bold text-app-text">{{ selectedTemplate()?.category }}</span>
                      </div>
                      <div>
                        <span class="block text-app-muted uppercase font-bold text-[8px]">Language</span>
                        <span class="font-bold text-app-text">{{ selectedTemplate()?.language }}</span>
                      </div>
                      <div>
                        <span class="block text-app-muted uppercase font-bold text-[8px]">Status</span>
                        <span class="px-1.5 py-0.5 rounded text-[8px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">APPROVED</span>
                      </div>
                    </div>
                  }
                </div>

                <!-- Variable form fields generator -->
                @if (selectedTemplate() && templateVariables.length > 0) {
                  <div class="space-y-4 border-t border-app-border/40 pt-4">
                    <span class="block text-[10px] font-bold text-teal-400 uppercase tracking-widest">Template Variables Binding</span>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      @for (varNum of templateVariables; track varNum) {
                        <div>
                          <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Parameter {{ varNum }}</label>
                          <input type="text" [(ngModel)]="variableValues[varNum]" (input)="updatePreview()" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-teal-500" [placeholder]="getVariablePlaceholder(varNum)">
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Attachment Upload Widget (Visible if template has DOCUMENT header or manually allowed) -->
                @if (hasDocumentHeader()) {
                  <div class="space-y-3 border-t border-app-border/40 pt-4 animate-in fade-in duration-200">
                    <span class="block text-[10px] font-bold text-teal-400 uppercase tracking-widest">Document Header Attachment</span>
                    <div class="flex items-center gap-4">
                      <div class="flex-grow">
                        <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Attached PDF File URL</label>
                        <input type="text" [(ngModel)]="attachmentUrl" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none font-mono" placeholder="Paste document URL or upload file...">
                      </div>
                      <div class="shrink-0 pt-4">
                        <input type="file" #fileInput (change)="onFileUpload($event)" accept="application/pdf" class="hidden">
                        <button (click)="fileInput.click()" [disabled]="isUploading()" class="px-4 py-2 bg-teal-600/10 border border-teal-500/30 hover:bg-teal-600/20 text-teal-400 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1">
                          @if (isUploading()) {
                            <div class="w-3.5 h-3.5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
                            <span>Uploading...</span>
                          } @else {
                            <mat-icon class="!text-[16px] !w-4 !h-4">upload_file</mat-icon>
                            <span>Upload PDF</span>
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                }

                <!-- Template Preview Box -->
                @if (selectedTemplate()) {
                  <div class="space-y-2 border-t border-app-border/40 pt-4">
                    <span class="block text-[9px] font-bold text-app-muted uppercase tracking-widest">Real-time Delivery Preview</span>
                    <div class="bg-[#0b141a] text-slate-100 rounded-2xl p-4 shadow-md border border-teal-900/30 max-w-sm relative select-all font-sans">
                      <!-- WhatsApp Header Document Mock -->
                      @if (hasDocumentHeader() && attachmentUrl) {
                        <div class="flex items-center gap-2 bg-[#202c33] rounded-lg p-2 mb-3 border border-slate-700/30">
                          <mat-icon class="text-rose-500">picture_as_pdf</mat-icon>
                          <div class="overflow-hidden">
                            <span class="block text-xs font-bold truncate text-slate-200">{{ attachmentFilename || 'attachment.pdf' }}</span>
                            <span class="block text-[9px] text-slate-400 uppercase">PDF Document</span>
                          </div>
                        </div>
                      }

                      <p class="text-xs leading-relaxed whitespace-pre-wrap">{{ messagePreview() }}</p>
                      <div class="text-[9px] text-slate-400/70 text-right mt-1.5 select-none font-mono">
                        12:00 PM • Sent
                      </div>
                    </div>
                  </div>
                }
              </div>
            }

            <!-- Channel 2: Push Notifications configuration -->
            @if (sendPush()) {
              <div class="glass p-6 rounded-2xl border border-app-border space-y-5 animate-in slide-in-from-top-2 duration-300">
                <h3 class="text-xs font-black text-sky-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-app-border pb-3">
                  <mat-icon class="!text-[16px] !w-4 !h-4 text-sky-500">notifications_active</mat-icon> Firebase Cloud Messaging
                </h3>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Notification Title</label>
                    <input type="text" [(ngModel)]="pushTitle" class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-sky-500 font-semibold" placeholder="e.g. Action Required: System Invoice ready">
                  </div>
                  <div>
                    <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Deep Link / Click URL</label>
                    <input type="text" [(ngModel)]="pushUrl" class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-sky-500 font-mono" placeholder="https://ajrdigitalhub.com/dashboard/billing">
                  </div>
                  <div class="md:col-span-2">
                    <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Message Body</label>
                    <textarea rows="3" [(ngModel)]="pushBody" class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-sky-500" placeholder="Type notification contents details..."></textarea>
                  </div>
                  <div>
                    <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Image URL (Optional)</label>
                    <input type="text" [(ngModel)]="pushImage" class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-sky-500 font-mono" placeholder="https://picsum.photos/seed/promo/800/400">
                  </div>
                  <div>
                    <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Priority</label>
                    <select [(ngModel)]="pushPriority" class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none cursor-pointer">
                      <option value="normal">Normal</option>
                      <option value="high">High (Immediate Awake)</option>
                    </select>
                  </div>
                </div>

                <!-- Scheduling Section -->
                <div class="space-y-4 border-t border-app-border/40 pt-4">
                  <div class="flex justify-between items-center">
                    <span class="block text-[10px] font-bold text-sky-400 uppercase tracking-widest">Delivery Schedule Settings</span>
                    <select [(ngModel)]="scheduleMode" class="bg-app-bg border border-app-border rounded-lg text-xs py-1 px-2 cursor-pointer outline-none">
                      <option value="now">Deliver Now (Instant)</option>
                      <option value="schedule">Schedule Future Date</option>
                      <option value="cron">Recurring Cron Job</option>
                    </select>
                  </div>

                  @if (scheduleMode() === 'schedule') {
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-200">
                      <div class="md:col-span-2">
                        <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Schedule Timestamp (UTC)</label>
                        <input type="datetime-local" [(ngModel)]="scheduledTime" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-sky-500 font-mono">
                      </div>
                      <div>
                        <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Timezone</label>
                        <select [(ngModel)]="scheduleTimezone" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none cursor-pointer font-bold">
                          <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                          <option value="UTC">Coordinated Universal (UTC)</option>
                          <option value="America/New_York">US Eastern (EST)</option>
                          <option value="Europe/London">London (GMT/BST)</option>
                        </select>
                      </div>
                    </div>
                  }

                  @if (scheduleMode() === 'cron') {
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                      <div>
                        <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Recurring Pattern (Cron)</label>
                        <select [(ngModel)]="cronExpression" class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none cursor-pointer">
                          <option value="0 9 * * *">Daily at 9 AM</option>
                          <option value="0 9 * * 1">Every Monday at 9 AM</option>
                          <option value="0 9 1 * *">Monthly on the 1st at 9 AM</option>
                          <option value="*/5 * * * *">Every 5 Minutes (Sandbox testing)</option>
                          <option value="0 * * * *">Hourly at minute 0</option>
                        </select>
                      </div>
                      <div>
                        <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Target Timezone</label>
                        <select [(ngModel)]="scheduleTimezone" class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none cursor-pointer font-bold">
                          <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                          <option value="UTC">Coordinated Universal (UTC)</option>
                          <option value="America/New_York">US Eastern (EST)</option>
                          <option value="Europe/London">London (GMT/BST)</option>
                        </select>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- 4. Bottom Grid: Recent logs & upcoming schedules -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Recent notification log history -->
          <div class="glass p-6 rounded-2xl border border-app-border space-y-4">
            <h3 class="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1">
              <mat-icon class="!text-[16px] !w-4 !h-4">history</mat-icon> Recent Notification Despatches
            </h3>
            
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-app-border text-[9px] uppercase tracking-wider text-app-muted">
                    <th class="py-2.5 pr-4 font-bold">Client / Project</th>
                    <th class="py-2.5 px-4 font-bold text-center">Channel</th>
                    <th class="py-2.5 px-4 font-bold">Event Type</th>
                    <th class="py-2.5 px-4 font-bold text-center">Status</th>
                    <th class="py-2.5 pl-4 font-bold text-right">Sent Time</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-app-border/40 font-semibold text-app-muted">
                  @for (log of stats().lastSent; track log.id) {
                    <tr class="hover:bg-app-card/20 transition-colors text-[11px]">
                      <td class="py-3 pr-4">
                        <span class="block font-bold text-app-text">{{ log.customer_name || 'System Guest' }}</span>
                        <span class="block text-[9px] text-app-muted font-mono">{{ log.project_name || 'N/A' }}</span>
                      </td>
                      <td class="py-3 px-4 text-center">
                        <span class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase" [ngClass]="log.channel === 'whatsapp' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'">{{ log.channel }}</span>
                      </td>
                      <td class="py-3 px-4 truncate max-w-[120px]" [title]="log.event_type">{{ log.event_type }}</td>
                      <td class="py-3 px-4 text-center">
                        <span class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase border"
                          [ngClass]="log.status === 'read' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                    log.status === 'delivered' ? 'bg-emerald-500/5 text-emerald-400/80 border-emerald-500/10' :
                                    log.status === 'sent' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                    log.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                    'bg-rose-500/10 text-rose-400 border-rose-500/20'">
                          {{ log.status }}
                        </span>
                      </td>
                      <td class="py-3 pl-4 text-right font-mono text-[10px]">{{ (log.sent_at || log.created_at) | date:'shortTime' }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="py-8 text-center text-app-muted">No notifications sent today.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Upcoming/Scheduled triggers -->
          <div class="glass p-6 rounded-2xl border border-app-border space-y-4">
            <h3 class="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1">
              <mat-icon class="!text-[16px] !w-4 !h-4">schedule</mat-icon> Scheduled & Recurring Triggers
            </h3>
            
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-app-border text-[9px] uppercase tracking-wider text-app-muted">
                    <th class="py-2.5 pr-4 font-bold">Client / Project</th>
                    <th class="py-2.5 px-4 font-bold text-center">Channel</th>
                    <th class="py-2.5 px-4 font-bold">Cron/Scheduled Time</th>
                    <th class="py-2.5 px-4 font-bold text-center">Status</th>
                    <th class="py-2.5 pl-4 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-app-border/40 font-semibold text-app-muted">
                  @for (sch of stats().upcoming; track sch.id) {
                    <tr class="hover:bg-app-card/20 transition-colors text-[11px]">
                      <td class="py-3 pr-4">
                        <span class="block font-bold text-app-text">{{ sch.customer_name || 'System Guest' }}</span>
                        <span class="block text-[9px] text-app-muted font-mono">{{ sch.project_name || 'N/A' }}</span>
                      </td>
                      <td class="py-3 px-4 text-center">
                        <span class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-app-bg border border-app-border text-app-text">{{ sch.channel }}</span>
                      </td>
                      <td class="py-3 px-4 font-mono text-[10px] text-app-text max-w-[140px] truncate" [title]="sch.cron_expression || (sch.scheduled_time | date:'medium')">
                        @if (sch.cron_expression) {
                          <span class="text-amber-500 font-bold">Cron:</span> {{ sch.cron_expression }}
                        } @else {
                          {{ sch.scheduled_time | date:'short' }}
                        }
                      </td>
                      <td class="py-3 px-4 text-center">
                        <span class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">PENDING</span>
                      </td>
                      <td class="py-3 pl-4 text-right">
                        <button (click)="cancelScheduledNotification(sch.id)" class="p-1 hover:text-rose-500 transition-colors inline-flex items-center cursor-pointer" title="Cancel Schedule">
                          <mat-icon class="!text-[14px] !w-3.5 !h-3.5">cancel</mat-icon>
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="py-8 text-center text-app-muted">No pending schedules found.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  `
})
export class NotificationCenterComponent implements OnInit {
  private api = inject(ApiService);
  private store = inject(AdminStoreService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  // Search autocomplete signals
  searchQuery = '';
  searchResults = signal<CustomerSearchResult[]>([]);
  selectedCustomer = signal<CustomerSearchResult | null>(null);

  // Delivery options signals
  notificationType = 'Reminder';
  sendWhatsApp = signal<boolean>(true);
  sendPush = signal<boolean>(false);

  // WhatsApp fields
  templates = signal<any[]>([]);
  selectedTemplateName = '';
  selectedTemplate = signal<any | null>(null);
  templateVariables: number[] = [];
  variableValues: Record<number, string> = {};
  attachmentUrl = '';
  attachmentFilename = '';
  isUploading = signal<boolean>(false);

  // Push fields
  pushTitle = '';
  pushBody = '';
  pushImage = '';
  pushUrl = '';
  pushPriority = 'normal';

  // Scheduling fields
  scheduleMode = signal<string>('now');
  scheduledTime = '';
  cronExpression = '0 9 * * *';
  scheduleTimezone = 'Asia/Kolkata';

  // Dashboard Stats signal
  stats = signal<any>({
    today: { total: 0, whatsapp: 0, push: 0, pending: 0, failed: 0, success: 0 },
    successRate: 100,
    lastSent: [],
    upcoming: [],
    scheduledCount: 0
  });

  isDispatching = signal<boolean>(false);
  isTesting = signal<boolean>(false);

  ngOnInit() {
    this.loadTemplates();
    this.loadDashboardStats();

    this.route.queryParams.subscribe(params => {
      const pId = params['projectId'];
      const cId = params['customerId'];
      if (pId) {
        this.api.get<CustomerSearchResult>(`/notifications/customer-by-project/${pId}`).subscribe({
          next: (cust) => {
            if (cust) {
              this.selectCustomer(cust);
            }
          },
          error: (err) => console.error('Failed to resolve customer by project ID:', err)
        });
      } else if (cId) {
        this.api.get<CustomerSearchResult>(`/notifications/customer-by-id/${cId}`).subscribe({
          next: (cust) => {
            if (cust) {
              this.selectCustomer(cust);
            }
          },
          error: (err) => console.error('Failed to resolve customer by ID:', err)
        });
      }
    });
  }

  goBackToAdmin() {
    this.router.navigate(['/admin']);
  }

  loadTemplates() {
    this.api.get<any[]>('/notifications/templates').subscribe({
      next: (res) => this.templates.set(res || []),
      error: (err) => console.error('Failed to load Meta templates:', err)
    });
  }

  loadDashboardStats() {
    this.api.get<any>('/notifications/dashboard').subscribe({
      next: (res) => {
        if (res) this.stats.set(res);
      },
      error: (err) => console.error('Failed to load dashboard stats:', err)
    });
  }

  onSearchInput() {
    if (!this.searchQuery.trim()) {
      this.searchResults.set([]);
      return;
    }
    this.api.get<CustomerSearchResult[]>(`/customers/search?q=${encodeURIComponent(this.searchQuery)}`).subscribe({
      next: (res) => this.searchResults.set(res || []),
      error: (err) => console.error('Customer search failed:', err)
    });
  }

  selectCustomer(cust: CustomerSearchResult) {
    this.selectedCustomer.set(cust);
    this.searchQuery = cust.customer_name;
    this.searchResults.set([]);

    // Populate defaults for convenient drafting
    this.pushUrl = `https://${cust.project_name || 'ajrdigitalhub.com'}/dashboard`;
    this.variableValues[1] = cust.customer_name;
  }

  clearCustomer() {
    this.selectedCustomer.set(null);
    this.searchQuery = '';
    this.searchResults.set([]);
  }

  onTemplateChange() {
    const tmpl = this.templates().find(t => t.name === this.selectedTemplateName);
    this.selectedTemplate.set(tmpl || null);

    if (tmpl) {
      // 1. Detect dynamic variables in body component text: e.g. {{1}}, {{2}}
      const bodyComp = tmpl.components.find((c: any) => c.type === 'BODY');
      if (bodyComp && bodyComp.text) {
        const matches = bodyComp.text.match(/{{(\d+)}}/g);
        if (matches) {
          const vars: number[] = matches.map((m: string) => parseInt(m.replace(/[{}]/g, ''), 10));
          this.templateVariables = Array.from(new Set<number>(vars)).sort((a: number, b: number) => a - b);
        } else {
          this.templateVariables = [];
        }
      } else {
        this.templateVariables = [];
      }

      // Initialize variable values dictionary
      const clientName = this.selectedCustomer()?.customer_name || 'Client';
      this.variableValues = {};
      this.templateVariables.forEach(v => {
        this.variableValues[v] = v === 1 ? clientName : '';
      });

      // 2. Set default title based on selected notification type
      this.pushTitle = `${this.notificationType}: Update for ${clientName}`;
      this.pushBody = bodyComp?.text ? this.cleanVariablesText(bodyComp.text) : '';
    } else {
      this.templateVariables = [];
      this.variableValues = {};
    }
  }

  hasDocumentHeader(): boolean {
    const tmpl = this.selectedTemplate();
    if (!tmpl || !tmpl.components) return false;
    const headerComp = tmpl.components.find((c: any) => c.type === 'HEADER');
    return headerComp?.format === 'DOCUMENT';
  }

  cleanVariablesText(text: string): string {
    // strip the curly braces variables for standard clean text fallback
    return text.replace(/{{(\d+)}}/g, (_, num) => this.variableValues[parseInt(num, 10)] || `(Param ${num})`);
  }

  getVariablePlaceholder(varNum: number): string {
    const placeholders: Record<number, string> = {
      1: 'e.g. Customer Name',
      2: 'e.g. Invoice Number / Month',
      3: 'e.g. Amount / Project Name',
      4: 'e.g. Payment Link / Date',
      5: 'e.g. System Status Details'
    };
    return placeholders[varNum] || `Variable value {{${varNum}}}`;
  }

  messagePreview = computed(() => {
    const tmpl = this.selectedTemplate();
    if (!tmpl) return '';
    const bodyComp = tmpl.components.find((c: any) => c.type === 'BODY');
    if (!bodyComp || !bodyComp.text) return '';

    let text = bodyComp.text;
    this.templateVariables.forEach(v => {
      const val = this.variableValues[v] || `{{${v}}}`;
      text = text.replace(new RegExp(`{{${v}}}`, 'g'), val);
    });
    return text;
  });

  updatePreview() {
    // Triggers computed property refresh
  }

  onFileUpload(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      this.store.showToast('Only PDF documents are supported.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.store.showToast('Document exceeds 5MB size limit.', 'error');
      return;
    }

    this.isUploading.set(true);
    this.attachmentFilename = file.name;

    const formData = new FormData();
    formData.append('image', file); // upload router expects field named 'image' (busboy upload)

    // Call upload endpoint
    this.http.post<any>('/api/admin/upload', formData).subscribe({
      next: (res) => {
        this.isUploading.set(false);
        if (res?.success && res?.data?.url) {
          this.attachmentUrl = res.data.url;
          this.store.showToast('PDF document uploaded successfully!', 'success');
        } else {
          this.store.showToast('File upload failed.', 'error');
        }
      },
      error: (err) => {
        this.isUploading.set(false);
        this.store.showToast('Upload service error: ' + (err.error?.message || err.message), 'error');
      }
    });
  }

  sendManualNotification() {
    const customer = this.selectedCustomer();
    if (!customer) return;

    this.isDispatching.set(true);

    // Build components array (ordered list of variables values)
    const components: string[] = [];
    this.templateVariables.forEach(v => {
      components.push(this.variableValues[v] || '');
    });

    const payload: any = {
      customerId: customer.customer_id,
      channel: this.sendWhatsApp() && this.sendPush() ? 'both' : (this.sendWhatsApp() ? 'whatsapp' : 'push'),
      template: this.selectedTemplateName || undefined,
      components: components.length > 0 ? components : undefined,
      pushPayload: this.sendPush() ? {
        title: this.pushTitle,
        body: this.pushBody,
        image: this.pushImage || undefined,
        url: this.pushUrl || undefined,
        priority: this.pushPriority,
        ttl: 3600
      } : undefined
    };

    // If PDF header attachment exists
    if (this.hasDocumentHeader() && this.attachmentUrl) {
      payload.attachment = {
        url: this.attachmentUrl,
        filename: this.attachmentFilename || 'invoice.pdf'
      };
    }

    // If scheduled delivery
    if (this.scheduleMode() === 'schedule' && this.scheduledTime) {
      payload.schedule = {
        sendAt: new Date(this.scheduledTime).toISOString(),
        timezone: this.scheduleTimezone
      };
    } else if (this.scheduleMode() === 'cron') {
      payload.schedule = {
        cron: this.cronExpression,
        timezone: this.scheduleTimezone
      };
    }

    this.api.post<any>('/notifications/send', payload).subscribe({
      next: (res) => {
        this.isDispatching.set(false);
        this.store.showToast(
          this.scheduleMode() !== 'now' ? 'Notification successfully scheduled!' : 'Notification successfully queued for dispatch!',
          'success'
        );
        this.loadDashboardStats();
        this.resetForms();
      },
      error: (err) => {
        this.isDispatching.set(false);
        this.store.showToast('Dispatch failed: ' + (err.error?.error || err.message), 'error');
      }
    });
  }

  sendQuickTest() {
    const customer = this.selectedCustomer();
    if (!customer) return;

    this.isTesting.set(true);

    this.api.post<any>('/notifications/test', {
      customerId: customer.customer_id,
      channel: this.sendWhatsApp() && this.sendPush() ? 'both' : (this.sendWhatsApp() ? 'whatsapp' : 'push')
    }).subscribe({
      next: () => {
        this.isTesting.set(false);
        this.store.showToast('Instant test notification dispatched!', 'success');
        this.loadDashboardStats();
      },
      error: (err) => {
        this.isTesting.set(false);
        this.store.showToast('Test trigger failed: ' + (err.error?.error || err.message), 'error');
      }
    });
  }

  cancelScheduledNotification(id: string) {
    if (!confirm('Are you sure you want to cancel this scheduled notification?')) return;

    this.api.delete<any>(`/admin/config/${id}`).subscribe({ // we can reuse DELETE /admin/config/:id or create a specific cancel endpoint. Let's delete this row.
      next: () => {
        this.store.showToast('Scheduled task cancelled.', 'success');
        this.loadDashboardStats();
      },
      error: (err) => this.store.showToast('Failed to cancel task: ' + (err.error?.error || err.message), 'error')
    });
  }

  resetForms() {
    this.selectedTemplateName = '';
    this.selectedTemplate.set(null);
    this.templateVariables = [];
    this.variableValues = {};
    this.attachmentUrl = '';
    this.attachmentFilename = '';
    this.pushTitle = '';
    this.pushBody = '';
    this.pushImage = '';
    this.scheduleMode.set('now');
    this.scheduledTime = '';
  }
}
