import { Component, ChangeDetectionStrategy, input, inject, signal, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { ProjectData } from '../../../services/project-detail.service';
import { ApiService } from '../../../services/api.service';
import { AdminStoreService } from '../../../services/admin-store.service';

interface SmartInsights {
  insight: string;
  totalHits: number;
  avgLatency: number;
  errorCount: number;
  errorRate: number;
  failedLogins: number;
  suspiciousIps: number;
  criticalEvents: number;
  lastDeployment: { version: string; status: string; created_at: string } | null;
  firebaseActiveUsers: number;
  firebaseStatus: string;
}

@Component({
  selector: 'app-project-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-5xl space-y-6 pb-12">
      <h2 class="text-2xl font-bold text-app-text tracking-tight flex items-center gap-2">
         <mat-icon class="text-indigo-500">grid_view</mat-icon> Smart Insights & Overview
      </h2>
      
      <!-- AI Insights Panel -->
      <div class="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-5 flex items-start gap-4 relative overflow-hidden">
        <div class="absolute -right-6 -top-6 opacity-5 text-indigo-500">
          <mat-icon class="!w-32 !h-32 !text-[128px]">auto_awesome</mat-icon>
        </div>
        <div class="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
          <mat-icon class="text-indigo-400">auto_awesome</mat-icon>
        </div>
        <div class="flex-grow">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="text-sm font-bold text-indigo-300">System Activity Insight</h3>
            @if (isLoading()) {
              <div class="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
            }
          </div>
          <p class="text-sm text-indigo-200/80 mt-1">
            {{ isLoading() ? 'Analyzing system metrics...' : insights().insight }}
          </p>
        </div>
      </div>
  
      <!-- Quick Metrics Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <!-- Card 1: Status -->
        <div class="bg-app-bg border border-app-border rounded-xl p-3 sm:p-4 md:p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div class="text-[9px] md:text-xs font-bold text-app-muted uppercase tracking-wider mb-0.5 md:mb-1">Status</div>
            <div class="flex items-center gap-1.5 mt-1 md:mt-2">
               <div class="w-2 h-2 rounded-full shrink-0" [ngClass]="{'bg-emerald-400': project().status === 'live', 'bg-amber-400 animate-pulse': project().status === 'deploying', 'bg-rose-400': project().status === 'failed'}"></div>
               <span class="text-sm sm:text-base md:text-lg font-bold text-app-text uppercase truncate">{{ project().status }}</span>
            </div>
          </div>
          <div class="text-[9px] md:text-[10px] text-app-muted mt-2 font-mono flex items-center gap-1 truncate" *ngIf="project().firebase_config">
             <span class="w-1 h-1 rounded-full bg-emerald-500 animate-ping shrink-0"></span> <span class="truncate">Fb: ACTIVE</span>
          </div>
        </div>

        <!-- Card 2: Combined Traffic -->
        <div class="bg-app-bg border border-app-border rounded-xl p-3 sm:p-4 md:p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div class="text-[9px] md:text-xs font-bold text-app-muted uppercase tracking-wider mb-0.5 md:mb-1">Traffic (1h)</div>
            <div class="text-sm sm:text-base md:text-lg font-bold text-indigo-400 mt-1 md:mt-2 font-mono truncate">
              @if (isLoading()) {
                <span class="inline-block w-12 h-4 bg-app-card rounded animate-pulse"></span>
              } @else {
                {{ insights().totalHits | number }} <span class="text-[10px] text-app-muted font-sans font-medium uppercase">Reqs</span>
              }
            </div>
          </div>
          <div class="text-[9px] md:text-[10px] text-app-muted mt-2 font-mono truncate" *ngIf="project().firebase_config">
            Users: {{ insights().firebaseActiveUsers }}
          </div>
        </div>

        <!-- Card 3: Combined Errors -->
        <div class="bg-app-bg border border-app-border rounded-xl p-3 sm:p-4 md:p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div class="text-[9px] md:text-xs font-bold text-app-muted uppercase tracking-wider mb-0.5 md:mb-1">Issues (1h)</div>
            <div class="text-sm sm:text-base md:text-lg font-mono font-bold mt-1 md:mt-2 truncate"
                 [class]="insights().errorCount > 0 ? 'text-rose-400' : 'text-emerald-400'">
              @if (isLoading()) {
                <span class="inline-block w-16 h-4 bg-app-card rounded animate-pulse"></span>
              } @else {
                {{ insights().errorCount }} <span class="text-[10px] text-app-muted font-sans font-medium uppercase">Errors</span>
              }
            </div>
          </div>
          <div class="text-[9px] md:text-[10px] text-app-muted mt-2 font-mono truncate" *ngIf="project().firebase_config">
            Warns: {{ insights().criticalEvents }}
          </div>
        </div>

        <!-- Card 4: Domain URL -->
        <div class="bg-app-bg border border-app-border rounded-xl p-3 sm:p-4 md:p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div class="text-[9px] md:text-xs font-bold text-app-muted uppercase tracking-wider mb-0.5 md:mb-1">Routing Domain</div>
            <div class="text-xs font-mono text-emerald-400 truncate mt-1 md:mt-2" [title]="project().domain">{{ project().domain }}</div>
          </div>
          <div class="text-[9px] md:text-[10px] text-indigo-400 truncate mt-2 font-mono" *ngIf="project().firebase_config">
            fb: {{ project().firebase_config?.projectId }}
          </div>
        </div>
      </div>

      <!-- Pricing & Cost Estimation Card -->
      <div class="bg-app-card border border-app-border rounded-2xl p-5 md:p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden animate-in fade-in duration-300">
         <div class="absolute -right-10 -bottom-10 opacity-5 text-indigo-500">
           <mat-icon class="!w-40 !h-40 !text-[160px]">credit_card</mat-icon>
         </div>
         <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
               <mat-icon class="text-indigo-400">payments</mat-icon>
            </div>
            <div>
              <h3 class="text-base font-bold text-app-text">App Billing &amp; Pricing Overview</h3>
              <p class="text-xs text-app-muted mt-0.5">Realtime estimated cost summary for Firebase &amp; WhatsApp Cloud resources.</p>
            </div>
         </div>
         
         <div class="flex items-center gap-6 md:gap-8 flex-wrap justify-end w-full md:w-auto z-10">
            <!-- Firebase Billing -->
            <div class="flex flex-col text-right">
              <span class="text-[9px] font-bold text-app-muted uppercase tracking-wider">Firebase Billing</span>
              <span class="text-base font-bold text-orange-400 mt-1 font-mono">
                ₹{{ getFirebaseCost() | number:'1.2-2' }}
              </span>
              <span class="text-[9px] text-app-muted mt-0.5" *ngIf="project().firebase_config">Base + usage tier</span>
              <span class="text-[9px] text-app-muted mt-0.5" *ngIf="!project().firebase_config">NOT INTEGRATED</span>
            </div>
            
            <div class="h-8 w-px bg-app-border/60 hidden sm:block"></div>
            
            <!-- WhatsApp Billing -->
            <div class="flex flex-col text-right">
              <span class="text-[9px] font-bold text-app-muted uppercase tracking-wider">WhatsApp API Billing</span>
              <span class="text-base font-bold text-indigo-400 mt-1 font-mono">
                ₹{{ getWhatsAppCost() | number:'1.2-2' }}
              </span>
              <span class="text-[9px] text-app-muted mt-0.5">From live templates</span>
            </div>
            
            <div class="h-8 w-px bg-app-border/60 hidden sm:block"></div>
            
            <!-- Total Cost -->
            <div class="flex flex-col text-right bg-indigo-500/5 px-4 py-2 rounded-xl border border-indigo-500/15">
              <span class="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Total Monthly Cost</span>
              <span class="text-lg font-black text-amber-500 mt-1 font-mono">
                ₹{{ getTotalCost() | number:'1.2-2' }}
              </span>
              <span class="text-[9px] text-app-muted mt-0.5">Estimated Spend</span>
            </div>
         </div>
      </div>
 
      <!-- Security & Deployment Quick-View -->
      @if (!isLoading() && (insights().failedLogins > 0 || insights().lastDeployment)) {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Security quick view -->
          @if (insights().failedLogins > 0 || insights().suspiciousIps > 0) {
            <div class="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 flex items-start gap-3">
              <mat-icon class="text-rose-400 shrink-0 mt-0.5">security</mat-icon>
              <div>
                <div class="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">Security Alerts (24h)</div>
                <div class="text-sm text-app-text">
                  <span class="font-bold text-rose-300">{{ insights().failedLogins }}</span> failed logins,
                  <span class="font-bold text-amber-300">{{ insights().suspiciousIps }}</span> suspicious IPs
                </div>
                <div class="text-[10px] text-app-muted mt-1">Go to Security Center for details.</div>
              </div>
            </div>
          }
 
          <!-- Deployment quick view -->
          @if (insights().lastDeployment) {
            <div class="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 flex items-start gap-3">
              <mat-icon class="text-indigo-400 shrink-0 mt-0.5">rocket_launch</mat-icon>
              <div>
                <div class="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Last Deployment</div>
                <div class="text-sm text-app-text">
                  <span class="font-mono font-bold">{{ insights().lastDeployment?.version }}</span>
                  <span class="ml-2" [class]="insights().lastDeployment?.status === 'success' ? 'text-emerald-400' : 'text-amber-400'">
                    {{ insights().lastDeployment?.status | uppercase }}
                  </span>
                </div>
                <div class="text-[10px] text-app-muted mt-1">{{ insights().lastDeployment?.created_at | date:'MMM d, h:mm a' }}</div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Quick Notify (One-Click Alerts) -->
      <div class="glass p-6 rounded-2xl border border-app-border space-y-4 animate-in fade-in duration-300">
         <div class="flex items-center gap-3 border-b border-app-border pb-3">
            <div class="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
               <mat-icon class="text-indigo-400">notifications_active</mat-icon>
            </div>
            <div>
               <h3 class="text-sm font-bold text-app-text">Quick Notify (One-Click Alerts)</h3>
               <p class="text-xs text-app-muted mt-0.5">Instantly dispatch system template notifications to this project's client.</p>
            </div>
         </div>
         
         <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <button (click)="triggerQuickAlert('Payment Reminder')" [disabled]="isSendingAlert()" class="flex flex-col items-center justify-center p-3 rounded-xl border border-app-border bg-app-bg/50 hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all cursor-pointer group text-center h-[90px]">
               <mat-icon class="text-amber-500 group-hover:scale-110 transition-transform">payment</mat-icon>
               <span class="text-[10px] font-bold text-app-text mt-2">Payment</span>
            </button>

            <button (click)="triggerQuickAlert('Invoice Ready')" [disabled]="isSendingAlert()" class="flex flex-col items-center justify-center p-3 rounded-xl border border-app-border bg-app-bg/50 hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all cursor-pointer group text-center h-[90px]">
               <mat-icon class="text-emerald-500 group-hover:scale-110 transition-transform">receipt_long</mat-icon>
               <span class="text-[10px] font-bold text-app-text mt-2">Invoice Ready</span>
            </button>

            <button (click)="triggerQuickAlert('Project Update')" [disabled]="isSendingAlert()" class="flex flex-col items-center justify-center p-3 rounded-xl border border-app-border bg-app-bg/50 hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all cursor-pointer group text-center h-[90px]">
               <mat-icon class="text-indigo-400 group-hover:scale-110 transition-transform">browser_updated</mat-icon>
               <span class="text-[10px] font-bold text-app-text mt-2">Project Update</span>
            </button>

            <button (click)="triggerQuickAlert('Maintenance')" [disabled]="isSendingAlert()" class="flex flex-col items-center justify-center p-3 rounded-xl border border-app-border bg-app-bg/50 hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all cursor-pointer group text-center h-[90px]">
               <mat-icon class="text-rose-500 group-hover:scale-110 transition-transform">build</mat-icon>
               <span class="text-[10px] font-bold text-app-text mt-2">Maintenance</span>
            </button>

            <button (click)="triggerQuickAlert('Subscription Renewal')" [disabled]="isSendingAlert()" class="flex flex-col items-center justify-center p-3 rounded-xl border border-app-border bg-app-bg/50 hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all cursor-pointer group text-center h-[90px]">
               <mat-icon class="text-pink-500 group-hover:scale-110 transition-transform">sync</mat-icon>
               <span class="text-[10px] font-bold text-app-text mt-2">Renewal</span>
            </button>

            <button (click)="openCustomNotification()" class="flex flex-col items-center justify-center p-3 rounded-xl border border-app-border bg-app-bg/50 hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all cursor-pointer group text-center h-[90px]">
               <mat-icon class="text-sky-500 group-hover:scale-110 transition-transform">message</mat-icon>
               <span class="text-[10px] font-bold text-app-text mt-2">Custom</span>
            </button>
         </div>
      </div>
    </div>
  `
})
export class ProjectOverviewComponent implements OnInit {
  project = input.required<ProjectData>();
  apiService = inject(ApiService);
  cdr = inject(ChangeDetectorRef);
  router = inject(Router);
  store = inject(AdminStoreService);
 
  isLoading = signal(true);
  isSendingAlert = signal(false);

  getFirebaseCost(): number {
    const hasFirebase = !!this.project().firebase_config;
    if (!hasFirebase) return 0;
    const base = this.project().plan === 'Enterprise' ? 149.00 : 45.00;
    const usage = Math.round((this.project().apiUsage || 0) * 0.045 * 100) / 100;
    return Math.round((base + usage) * 100) / 100;
  }

  getWhatsAppCost(): number {
    return Math.round((this.project().apiUsage || 0) * 0.10038 * 100) / 100;
  }

  getTotalCost(): number {
    return Math.round((this.getFirebaseCost() + this.getWhatsAppCost()) * 100) / 100;
  }

  insights = signal<SmartInsights>({
    insight: 'Loading system metrics...',
    totalHits: 0,
    avgLatency: 0,
    errorCount: 0,
    errorRate: 0,
    failedLogins: 0,
    suspiciousIps: 0,
    criticalEvents: 0,
    lastDeployment: null,
    firebaseActiveUsers: 0,
    firebaseStatus: 'UNKNOWN'
  });

  ngOnInit() {
    const id = this.project().id;
    this.apiService.get<SmartInsights>(`/api/admin/apps/${id}/smart-insights`).subscribe({
      next: (data) => {
        this.insights.set(data);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  triggerQuickAlert(alertType: string) {
    this.isSendingAlert.set(true);
    const projectId = this.project().id;
    this.apiService.post<any>('/notifications/quick-send', { projectId, alertType }).subscribe({
      next: (res) => {
        this.isSendingAlert.set(false);
        this.store.showToast(`${alertType} notification successfully dispatched!`, 'success');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isSendingAlert.set(false);
        this.store.showToast(`Dispatch failed: ${err.error?.error || err.message}`, 'error');
        this.cdr.markForCheck();
      }
    });
  }

  openCustomNotification() {
    const projectId = this.project().id;
    this.router.navigate(['/admin/notification-center'], { queryParams: { projectId } });
  }

  // Keep legacy methods for backward compatibility
  getLocalErrorCount(): number {
    return this.insights().errorCount;
  }

  getFirebaseWarningCount(): number {
    return this.insights().criticalEvents;
  }
}
