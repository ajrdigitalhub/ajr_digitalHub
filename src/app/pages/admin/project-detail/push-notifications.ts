import { Component, ChangeDetectionStrategy, input, inject, signal, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ProjectData } from '../../../services/project-detail.service';
import { FirebaseMonitorService } from '../../../services/firebase-monitor.service';
import { AdminStoreService } from '../../../services/admin-store.service';

@Component({
  selector: 'app-project-push-notifications',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10 max-w-5xl space-y-8">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 class="text-2xl font-bold text-app-text flex items-center gap-2">
          <mat-icon class="text-indigo-400">notifications_active</mat-icon> Push Notification Hub
        </h2>
        <div class="flex gap-2 bg-app-bg border border-app-border p-1 rounded-lg shrink-0">
          <button (click)="activeTab.set('monitor')" [class]="activeTab() === 'monitor' ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 font-bold' : 'text-app-muted hover:text-app-text border border-transparent'" class="px-4 py-1.5 rounded-md text-xs transition-all cursor-pointer">
            Monitor & Send
          </button>
          <button (click)="activeTab.set('config')" [class]="activeTab() === 'config' ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 font-bold' : 'text-app-muted hover:text-app-text border border-transparent'" class="px-4 py-1.5 rounded-md text-xs transition-all cursor-pointer">
            Configuration
          </button>
        </div>
      </div>

      <!-- Tab: Monitor & Send -->
      @if (activeTab() === 'monitor') {
        <div class="space-y-6">
          <!-- Stats Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-app-card border border-app-border rounded-xl p-5 shadow-sm">
              <div class="text-[10px] font-bold text-app-muted uppercase tracking-wider mb-1">Active Subscribers</div>
              <div class="text-2xl font-bold text-app-text mt-2 font-mono">
                {{ metrics().totalSubscribers ?? 0 }}
              </div>
              <div class="text-xs text-app-muted mt-1">
                From {{ metrics().totalDevices ?? 0 }} registered tokens
              </div>
            </div>
            <div class="bg-app-card border border-app-border rounded-xl p-5 shadow-sm">
              <div class="text-[10px] font-bold text-app-muted uppercase tracking-wider mb-1">Delivered Today</div>
              <div class="text-2xl font-bold text-emerald-400 mt-2 font-mono">
                {{ metrics().sentToday ?? 0 }}
              </div>
              <div class="text-xs text-app-muted mt-1">
                Month: {{ metrics().sentThisMonth ?? 0 }} total
              </div>
            </div>
            <div class="bg-app-card border border-app-border rounded-xl p-5 shadow-sm">
              <div class="text-[10px] font-bold text-app-muted uppercase tracking-wider mb-1">Delivery Success Rate</div>
              <div class="text-2xl font-bold text-indigo-400 mt-2 font-mono">
                {{ metrics().successRate ?? 100 }}%
              </div>
              <div class="text-xs text-app-muted mt-1">
                Failures: {{ metrics().failureRate ?? 0 }}%
              </div>
            </div>
            <div class="bg-app-card border border-app-border rounded-xl p-5 shadow-sm">
              <div class="text-[10px] font-bold text-app-muted uppercase tracking-wider mb-1">Billing Estimate</div>
              <div class="text-2xl font-bold text-amber-400 mt-2 font-mono">
                {{ billingDetails()?.totalAmount ? '₹' + billingDetails().totalAmount : '₹0.00' }}
              </div>
              <div class="text-xs text-app-muted mt-1">
                {{ billingDetails()?.isWithinFreeQuota ? 'Within free quota' : 'Billable active usage' }}
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Manual Trigger Form -->
            <div class="lg:col-span-1 bg-app-card border border-app-border rounded-xl p-6 flex flex-col justify-between shadow-sm">
              <div>
                <h3 class="text-md font-bold text-app-text mb-4 flex items-center gap-2">
                  <mat-icon class="text-indigo-400">send</mat-icon> Manual Notification Trigger
                </h3>
                <p class="text-xs text-app-muted mb-4">
                  Deploy a live push notification instantly to one of your active subscriber devices or standard test tokens.
                </p>

                <div class="space-y-4">
                  <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Target Subscriber Token</label>
                    <select [(ngModel)]="triggerPayload.token" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-lg text-xs text-app-text outline-none cursor-pointer">
                      <option value="" disabled>-- Select Active Device Token --</option>
                      @for (sub of subscribers(); track sub.id) {
                        <option [value]="sub.token">
                          {{ sub.browser || 'Browser' }} ({{ sub.os || 'Unknown OS' }}) - {{ sub.token.substring(0, 15) }}...
                        </option>
                      }
                      @if (subscribers().length === 0) {
                        <option value="" disabled>No active subscribers registered</option>
                      }
                    </select>
                  </div>

                  <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Or Input Manual Token</label>
                    <input type="text" [(ngModel)]="triggerPayload.manualToken" placeholder="fcm_token_..." class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-lg text-xs text-app-text font-mono focus:border-indigo-500/50 outline-none">
                  </div>

                  <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Notification Title</label>
                    <input type="text" [(ngModel)]="triggerPayload.title" placeholder="New Release Available!" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-lg text-xs text-app-text font-semibold focus:border-indigo-500/50 outline-none">
                  </div>

                  <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Notification Body</label>
                    <textarea rows="3" [(ngModel)]="triggerPayload.body" placeholder="Check out the new features and services catalog..." class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-lg text-xs text-app-text focus:border-indigo-500/50 outline-none"></textarea>
                  </div>

                  <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Image URL (Optional)</label>
                    <input type="text" [(ngModel)]="triggerPayload.image" placeholder="https://..." class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-lg text-xs text-app-text focus:border-indigo-500/50 outline-none">
                  </div>

                  <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Click Destination URL (Optional)</label>
                    <input type="text" [(ngModel)]="triggerPayload.url" placeholder="https://..." class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-lg text-xs text-app-text focus:border-indigo-500/50 outline-none">
                  </div>
                </div>
              </div>

              <div class="pt-6">
                <button (click)="sendManualNotification()" [disabled]="isSendingNotification() || (!triggerPayload.token && !triggerPayload.manualToken) || !triggerPayload.title || !triggerPayload.body" class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-app-text rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border border-indigo-500 shadow-md">
                  @if (isSendingNotification()) {
                    <mat-icon class="!w-3.5 !h-3.5 !text-[14px] animate-spin">sync</mat-icon>
                  }
                  {{ isSendingNotification() ? 'Sending notification...' : 'Deliver Notification' }}
                </button>
              </div>
            </div>

            <!-- Logs list -->
            <div class="lg:col-span-2 bg-app-card border border-app-border rounded-xl flex flex-col overflow-hidden shadow-sm">
              <div class="p-5 border-b border-app-border flex items-center justify-between">
                <h3 class="text-md font-bold text-app-text flex items-center gap-2">
                  <mat-icon class="text-indigo-400">history</mat-icon> Live Delivery Logs
                </h3>
                <button (click)="loadLogs()" class="flex items-center justify-center p-1.5 rounded-lg bg-app-bg hover:bg-app-card border border-app-border text-app-muted hover:text-app-text transition">
                  <mat-icon class="!w-4 !h-4 !text-[16px]">refresh</mat-icon>
                </button>
              </div>

              <div class="flex-grow overflow-x-auto custom-scrollbar">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="bg-app-bg border-b border-app-border text-[10px] uppercase tracking-widest text-app-muted">
                      <th class="p-4 font-semibold">Sent Time</th>
                      <th class="p-4 font-semibold">Notification</th>
                      <th class="p-4 font-semibold">Type</th>
                      <th class="p-4 font-semibold">Status</th>
                      <th class="p-4 font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-app-border text-xs">
                    @for (log of logs(); track log.id) {
                      <tr class="hover:bg-app-bg/30 transition-colors">
                        <td class="p-4 whitespace-nowrap text-app-muted font-mono">{{ log.sent_time | date:'MMM d, h:mm a' }}</td>
                        <td class="p-4">
                          <div class="font-bold text-app-text">{{ log.title }}</div>
                          <div class="text-[11px] text-app-muted mt-0.5 truncate max-w-[200px]" [title]="log.body">{{ log.body }}</div>
                        </td>
                        <td class="p-4">
                          <span class="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 capitalize">{{ log.notification_type }}</span>
                        </td>
                        <td class="p-4">
                          <span [class]="log.delivery_status === 'delivered' || log.delivery_status === 'sent' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'" class="px-1.5 py-0.5 rounded text-[10px] font-bold border capitalize">
                            {{ log.delivery_status }}
                          </span>
                        </td>
                        <td class="p-4 text-app-muted italic">
                          {{ log.failure_reason || 'Successfully routed' }}
                        </td>
                      </tr>
                    }
                    @if (logs().length === 0) {
                      <tr>
                        <td colspan="5" class="p-8 text-center text-app-muted">No notification logs recorded for this app.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Tab: Config -->
      @if (activeTab() === 'config') {
        <div class="bg-app-card border border-app-border rounded-xl p-6 space-y-6 shadow-sm">
          <div>
            <h3 class="text-md font-bold text-app-text flex items-center gap-2">
              <mat-icon class="text-indigo-400">tune</mat-icon> Billing & Limit Configurations
            </h3>
            <p class="text-xs text-app-muted mt-1">
              Customize the push notification service configurations for this application, including monthly limits, charging rates, and pricing parameters.
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label class="flex items-center justify-between p-4 rounded-xl border border-app-border bg-app-bg hover:bg-app-card cursor-pointer transition select-none">
              <div>
                <span class="text-sm font-semibold text-app-text block">Enable Push Notifications</span>
                <span class="text-xs text-app-muted">Allow push campaign routing and analytics triggers.</span>
              </div>
              <input type="checkbox" [(ngModel)]="configModel.enabled" class="rounded bg-app-card border-app-border text-indigo-500 focus:ring-0 w-4 h-4 cursor-pointer">
            </label>

            <label class="flex items-center justify-between p-4 rounded-xl border border-app-border bg-app-bg hover:bg-app-card cursor-pointer transition select-none">
              <div>
                <span class="text-sm font-semibold text-app-text block">Free Tier Monthly Quota</span>
                <span class="text-xs text-app-muted">Enable standard free tier notification allocation.</span>
              </div>
              <input type="checkbox" [(ngModel)]="configModel.free_quota_enabled" class="rounded bg-app-card border-app-border text-indigo-500 focus:ring-0 w-4 h-4 cursor-pointer">
            </label>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-app-border">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Free Notification Limit</label>
              <input type="number" [(ngModel)]="configModel.free_notifications" [disabled]="!configModel.free_quota_enabled" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text focus:border-indigo-500/50 outline-none transition-all font-mono">
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Rate per 1,000 Alerts</label>
              <input type="number" step="0.01" [(ngModel)]="configModel.price_per_1000" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text focus:border-indigo-500/50 outline-none transition-all font-mono">
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Monthly Service Charge</label>
              <input type="number" [(ngModel)]="configModel.platform_service_charge" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text focus:border-indigo-500/50 outline-none transition-all font-mono">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-app-border">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Preferred Currency</label>
              <select [(ngModel)]="configModel.currency" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text outline-none cursor-pointer">
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">GST Tax Percentage</label>
              <input type="number" [(ngModel)]="configModel.gst_percentage" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text focus:border-indigo-500/50 outline-none transition-all font-mono">
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Billing Frequency</label>
              <select [(ngModel)]="configModel.billing_frequency" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text outline-none cursor-pointer">
                <option value="monthly">Monthly Billing</option>
                <option value="yearly">Yearly Billing</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end pt-6 border-t border-app-border">
            <button (click)="saveConfiguration()" [disabled]="isSavingConfig()" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-app-text rounded-lg text-sm font-bold transition flex items-center gap-2 cursor-pointer border border-indigo-500 shadow-md">
              @if (isSavingConfig()) {
                <mat-icon class="!w-4 !h-4 !text-[16px] animate-spin">sync</mat-icon>
              }
              Save Configuration Settings
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class ProjectPushNotificationsComponent implements OnInit {
  project = input.required<ProjectData>();

  private monitorService = inject(FirebaseMonitorService);
  private store = inject(AdminStoreService);
  private cdr = inject(ChangeDetectorRef);

  activeTab = signal<'monitor' | 'config'>('monitor');
  
  // State Signals
  metrics = signal<any>({});
  configModel = {
    enabled: true,
    free_quota_enabled: true,
    free_notifications: 10000,
    price_per_1000: 0.50,
    platform_service_charge: 10.00,
    gst_percentage: 18.00,
    currency: 'INR',
    billing_frequency: 'monthly'
  };
  billingDetails = signal<any>(null);
  logs = signal<any[]>([]);
  subscribers = signal<any[]>([]);

  triggerPayload = {
    token: '',
    manualToken: '',
    title: '',
    body: '',
    image: '',
    url: ''
  };

  isSavingConfig = signal(false);
  isSendingNotification = signal(false);

  ngOnInit() {
    this.loadAllData();
  }

  loadAllData() {
    const appId = this.project().id;

    // Load details (metrics + settings)
    this.monitorService.getApplicationDetails(appId).subscribe({
      next: (res) => {
        if (res.metrics) this.metrics.set(res.metrics);
        if (res.settings) {
          this.configModel = {
            enabled: res.settings.enabled ?? true,
            free_quota_enabled: res.settings.free_quota_enabled ?? true,
            free_notifications: res.settings.free_notifications ?? 10000,
            price_per_1000: Number(res.settings.price_per_1000 ?? 0.50),
            platform_service_charge: Number(res.settings.platform_service_charge ?? 10.0),
            gst_percentage: Number(res.settings.gst_percentage ?? 18.0),
            currency: res.settings.currency || 'INR',
            billing_frequency: res.settings.billing_frequency || 'monthly'
          };
        }
        this.cdr.markForCheck();
      }
    });

    // Load billing metrics estimate
    this.monitorService.getBilling().subscribe({
      next: (res) => {
        if (res.breakdowns) {
          const matched = res.breakdowns.find((b: any) => b.appId === appId);
          if (matched && matched.calculation) {
            this.billingDetails.set(matched.calculation);
          }
        }
        this.cdr.markForCheck();
      }
    });

    // Load subscribers/tokens
    this.monitorService.getSubscribers({ appId }).subscribe({
      next: (res) => {
        if (res.subscribers) {
          this.subscribers.set(res.subscribers);
        }
        this.cdr.markForCheck();
      }
    });

    // Load logs
    this.loadLogs();
  }

  loadLogs() {
    const appId = this.project().id;
    this.monitorService.getLogs({ appId }).subscribe({
      next: (res) => {
        this.logs.set(res || []);
        this.cdr.markForCheck();
      }
    });
  }

  saveConfiguration() {
    this.isSavingConfig.set(true);
    const appId = this.project().id;
    this.monitorService.saveConfiguration(appId, this.configModel).subscribe({
      next: (res) => {
        this.isSavingConfig.set(false);
        this.store.showToast('Push Notification configurations saved successfully!', 'success');
        this.loadAllData();
      },
      error: (err) => {
        this.isSavingConfig.set(false);
        this.store.showToast(err.error?.error || err.message || 'Failed to save configuration settings.', 'error');
        this.cdr.markForCheck();
      }
    });
  }

  sendManualNotification() {
    const targetToken = this.triggerPayload.manualToken.trim() || this.triggerPayload.token;
    if (!targetToken) {
      this.store.showToast('Please select or specify a target token first.', 'error');
      return;
    }

    this.isSendingNotification.set(true);
    const appId = this.project().id;
    
    const payload = {
      appId,
      token: targetToken,
      title: this.triggerPayload.title,
      body: this.triggerPayload.body,
      image: this.triggerPayload.image || undefined,
      url: this.triggerPayload.url || undefined
    };

    this.monitorService.testNotification(payload).subscribe({
      next: (res) => {
        this.isSendingNotification.set(false);
        this.store.showToast('Push Notification delivered successfully!', 'success');
        
        // Reset payload title and body
        this.triggerPayload.title = '';
        this.triggerPayload.body = '';
        this.triggerPayload.image = '';
        this.triggerPayload.url = '';

        this.loadAllData();
      },
      error: (err) => {
        this.isSendingNotification.set(false);
        this.store.showToast(err.error?.error || err.message || 'Failed to trigger notification.', 'error');
        this.loadAllData();
      }
    });
  }
}
