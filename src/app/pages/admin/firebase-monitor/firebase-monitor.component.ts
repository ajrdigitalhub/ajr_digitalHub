import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { FirebaseMonitorService } from '../../../services/firebase-monitor.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-firebase-monitor',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="space-y-6 font-sans pb-10">
      
      <!-- Top Section -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-app-border/40 pb-5">
        <div>
          <h2 class="text-2xl font-bold text-app-text flex items-center gap-2">
            <mat-icon class="text-indigo-500 !w-8 !h-8 !text-[32px]">analytics</mat-icon> Firebase Push Monitor
          </h2>
          <p class="text-xs text-app-muted mt-1">Real-time Firebase Cloud Messaging usage, device subscriber mapping, logs, and billing calculations.</p>
        </div>

        <div class="flex items-center gap-3">
          <!-- Refresh controls -->
          <div class="flex items-center gap-1.5 bg-app-card border border-app-border rounded-xl px-3 py-1.5 text-xs">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="text-app-muted">Auto-Refresh:</span>
            <select [(ngModel)]="refreshInterval" (change)="setupAutoRefresh()" class="bg-transparent border-none outline-none text-app-text font-bold cursor-pointer text-xs">
              <option [value]="1">1 Min</option>
              <option [value]="5">5 Min</option>
              <option [value]="15">15 Min</option>
              <option [value]="0">Disabled</option>
            </select>
          </div>

          <button (click)="manualRefresh()" [disabled]="isLoading()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-app-text text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-lg border border-indigo-500/20">
            <mat-icon [class.animate-spin]="isLoading()" class="!w-4 !h-4 !text-[16px]">refresh</mat-icon>
            <span>REFRESH NOW</span>
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex flex-wrap border-b border-app-border/50">
        <button (click)="setTab('dashboard')" [class.border-indigo-500]="activeTab() === 'dashboard'" [class.text-indigo-400]="activeTab() === 'dashboard'" class="px-5 py-3 border-b-2 border-transparent font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer text-app-muted hover:text-app-text">Dashboard</button>
        <button (click)="setTab('applications')" [class.border-indigo-500]="activeTab() === 'applications'" [class.text-indigo-400]="activeTab() === 'applications'" class="px-5 py-3 border-b-2 border-transparent font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer text-app-muted hover:text-app-text">Applications</button>
        <button (click)="setTab('usage')" [class.border-indigo-500]="activeTab() === 'usage'" [class.text-indigo-400]="activeTab() === 'usage'" class="px-5 py-3 border-b-2 border-transparent font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer text-app-muted hover:text-app-text">Usage Trends</button>
        <button (click)="setTab('subscribers')" [class.border-indigo-500]="activeTab() === 'subscribers'" [class.text-indigo-400]="activeTab() === 'subscribers'" class="px-5 py-3 border-b-2 border-transparent font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer text-app-muted hover:text-app-text">Subscribers</button>
        <button (click)="setTab('billing')" [class.border-indigo-500]="activeTab() === 'billing'" [class.text-indigo-400]="activeTab() === 'billing'" class="px-5 py-3 border-b-2 border-transparent font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer text-app-muted hover:text-app-text">Cost & Billing</button>
        <button (click)="setTab('logs')" [class.border-indigo-500]="activeTab() === 'logs'" [class.text-indigo-400]="activeTab() === 'logs'" class="px-5 py-3 border-b-2 border-transparent font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer text-app-muted hover:text-app-text">Notification Logs</button>
        <button (click)="setTab('config')" [class.border-indigo-500]="activeTab() === 'config'" [class.text-indigo-400]="activeTab() === 'config'" class="px-5 py-3 border-b-2 border-transparent font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer text-app-muted hover:text-app-text">Billing Config</button>
        <button (click)="setTab('reports')" [class.border-indigo-500]="activeTab() === 'reports'" [class.text-indigo-400]="activeTab() === 'reports'" class="px-5 py-3 border-b-2 border-transparent font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer text-app-muted hover:text-app-text">Reports</button>
      </div>

      <!-- Tab 1: Dashboard -->
      @if (activeTab() === 'dashboard') {
        <div class="space-y-6 animate-in fade-in duration-200">
          
          <!-- KPI Cards Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            <div class="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-2 flex flex-col justify-between">
              <div>
                <span class="text-[10px] font-bold text-app-muted uppercase tracking-wider block">Total Applications</span>
                <span class="text-3xl font-black text-app-text block mt-1">{{ stats().totalApps }}</span>
              </div>
              <div class="text-[10px] text-indigo-400 font-semibold flex items-center gap-1 mt-2">
                <mat-icon class="!w-3 !h-3 !text-[12px]">settings_input_component</mat-icon> Active onboarded nodes
              </div>
            </div>

            <div class="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-2 flex flex-col justify-between">
              <div>
                <span class="text-[10px] font-bold text-app-muted uppercase tracking-wider block">Active Subscribers</span>
                <span class="text-3xl font-black text-app-text block mt-1">{{ stats().activeSubscribers }}</span>
              </div>
              <div class="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-2">
                <mat-icon class="!w-3 !h-3 !text-[12px]">check_circle</mat-icon> Total devices: {{ stats().totalDevices }}
              </div>
            </div>

            <div class="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-2 flex flex-col justify-between">
              <div>
                <span class="text-[10px] font-bold text-app-muted uppercase tracking-wider block">Today's Volumes</span>
                <span class="text-3xl font-black text-indigo-400 block mt-1">{{ stats().sentToday }}</span>
              </div>
              <div class="text-[10px] text-app-muted flex items-center justify-between mt-2 font-mono">
                <span class="text-emerald-400">✔ {{ stats().successToday }}</span>
                <span class="text-rose-400">✖ {{ stats().failedToday }}</span>
                <span class="text-amber-400">⌚ {{ stats().pendingToday }}</span>
              </div>
            </div>

            <div class="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-2 flex flex-col justify-between">
              <div>
                <span class="text-[10px] font-bold text-app-muted uppercase tracking-wider block">Monthly Success Rate</span>
                <span class="text-3xl font-black text-app-text block mt-1" [class.text-emerald-400]="stats().successRate >= 95" [class.text-amber-400]="stats().successRate < 95 && stats().successRate >= 80" [class.text-rose-400]="stats().successRate < 80">
                  {{ stats().successRate }}%
                </span>
              </div>
              <div class="text-[10px] text-app-muted mt-2 flex justify-between items-center">
                <span>Month: {{ stats().sentThisMonth }} pushes</span>
                <span class="font-bold text-indigo-400">Cost: {{ stats().estimatedMonthlyCost | currency:stats().currency || 'INR':'symbol':'1.2-2' }}</span>
              </div>
            </div>
            
          </div>

          <!-- Bottom: Primary Analytics Charts -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Left: Daily Delivery Success vs Failure Ring -->
            <div class="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[300px]">
              <div>
                <h3 class="text-xs font-black text-indigo-400 uppercase tracking-wider">Delivery Statistics</h3>
                <p class="text-[10px] text-app-muted mt-0.5">Ratio of successful pushes vs connection rejections.</p>
              </div>

              <div class="flex items-center justify-center py-4">
                <div class="relative w-36 h-36 flex items-center justify-center">
                  <!-- SVG Circle Pie -->
                  <svg viewBox="0 0 36 36" class="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#334155" stroke-width="3"></circle>
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" stroke-width="3" 
                            [attr.stroke-dasharray]="stats().successRate + ' ' + (100 - stats().successRate)"
                            stroke-dashoffset="0"></circle>
                  </svg>
                  <div class="absolute text-center">
                    <span class="text-2xl font-black text-app-text">{{ stats().successRate }}%</span>
                    <span class="block text-[8px] font-bold text-app-muted uppercase">SUCCESS</span>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2 text-center text-xs border-t border-app-border/40 pt-3">
                <div>
                  <span class="block text-emerald-400 font-bold font-mono">{{ stats().totalSuccess || 0 }}</span>
                  <span class="text-[9px] text-app-muted uppercase">DELIVERED</span>
                </div>
                <div>
                  <span class="block text-rose-400 font-bold font-mono">{{ stats().totalFailed || 0 }}</span>
                  <span class="text-[9px] text-app-muted uppercase">FAILED</span>
                </div>
              </div>
            </div>

            <!-- Middle: Daily Trends Chart -->
            <div class="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm flex flex-col justify-between lg:col-span-2 min-h-[300px]">
              <div>
                <h3 class="text-xs font-black text-indigo-400 uppercase tracking-wider">Daily Notification Volume</h3>
                <p class="text-[10px] text-app-muted mt-0.5">Push volume trends over the last 15 days.</p>
              </div>

              <!-- Bar graph representation -->
              <div class="flex items-end justify-between h-40 gap-2 px-2 pt-6">
                @for (day of charts().dailyTrend; track day.label) {
                  <div class="flex-1 flex flex-col items-center group relative cursor-pointer">
                    <!-- Tooltip -->
                    <div class="absolute bottom-full mb-1 bg-slate-950/95 border border-app-border text-[9px] text-white px-2 py-1 rounded shadow-xl hidden group-hover:block z-50 text-center font-mono w-20">
                      <div>Sent: {{ day.sent }}</div>
                      <div class="text-emerald-400">Ok: {{ day.success }}</div>
                    </div>
                    <!-- Stacked bar -->
                    <div class="w-full bg-slate-800 rounded-t-md overflow-hidden flex flex-col justify-end" style="height: 100px;">
                      <div class="bg-emerald-500 w-full transition-all duration-300" [style.height.%]="getPercent(day.success, day.sent)"></div>
                      <div class="bg-rose-500 w-full transition-all duration-300" [style.height.%]="getPercent(day.failed, day.sent)"></div>
                    </div>
                    <span class="text-[8px] font-mono text-app-muted mt-1.5 rotate-45 sm:rotate-0">{{ formatDateLabel(day.label) }}</span>
                  </div>
                } @empty {
                  <div class="w-full h-full flex items-center justify-center text-xs text-app-muted">No trend data recorded.</div>
                }
              </div>
              
              <div class="flex justify-center gap-4 text-[10px] border-t border-app-border/40 pt-3">
                <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 bg-emerald-500 rounded"></span> Success</span>
                <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 bg-rose-500 rounded"></span> Failure</span>
              </div>
            </div>
            
          </div>

          <!-- Top App Distributions and Status -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- App-wise distribution list -->
            <div class="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-4">
              <h3 class="text-xs font-black text-indigo-400 uppercase tracking-wider">Top Dispatching Nodes</h3>
              <div class="space-y-3">
                @for (app of charts().appWiseDistribution; track app.label) {
                  <div class="space-y-1">
                    <div class="flex justify-between text-xs">
                      <span class="font-bold text-app-text">{{ app.label }}</span>
                      <span class="font-mono text-app-muted font-bold">{{ app.value }} pushes</span>
                    </div>
                    <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div class="h-full bg-indigo-500 rounded-full" [style.width.%]="getDistributionPercent(app.value)"></div>
                    </div>
                  </div>
                } @empty {
                  <p class="text-xs text-app-muted py-4 text-center">No dispatches recorded.</p>
                }
              </div>
            </div>

            <!-- Platform Device Distribution -->
            <div class="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-4">
              <h3 class="text-xs font-black text-pink-400 uppercase tracking-wider">Subscriber Growth (Cumulative)</h3>
              <!-- Growth Line Visual -->
              <div class="h-32 flex items-end justify-between gap-1 pt-6 px-1">
                @for (pt of charts().subscriberGrowth; track pt.label) {
                  <div class="flex-1 flex flex-col items-center group relative cursor-pointer">
                    <div class="absolute bottom-full mb-1 bg-slate-950 border border-app-border text-[9px] text-white px-2 py-0.5 rounded shadow-xl hidden group-hover:block z-50 font-mono">
                      {{ pt.value }} subs
                    </div>
                    <div class="w-1.5 bg-pink-500 rounded-t transition-all duration-300" [style.height.%]="getGrowthPercent(pt.value)"></div>
                    <span class="text-[7px] text-app-muted font-mono mt-1 select-none">{{ formatDateLabel(pt.label) }}</span>
                  </div>
                } @empty {
                  <div class="w-full h-full flex items-center justify-center text-xs text-app-muted">No subscription growth logs.</div>
                }
              </div>
              <div class="text-[9px] text-app-muted text-center italic mt-2 border-t border-app-border/40 pt-2">
                Displays subscription count progression over the last 30 active days.
              </div>
            </div>
          </div>
          
        </div>
      }

      <!-- Tab 2: Applications -->
      @if (activeTab() === 'applications') {
        <div class="space-y-6 animate-in fade-in duration-200">
          @if (!selectedAppId()) {
            <!-- Application Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              @for (app of apps(); track app.id) {
                <div class="bg-app-card border border-app-border hover:border-indigo-500/50 rounded-2xl p-5 shadow-sm transition-all duration-300 flex flex-col justify-between gap-4">
                  <div class="space-y-2">
                    <div class="flex justify-between items-start">
                      <div>
                        <h3 class="text-sm font-bold text-app-text">{{ app.name }}</h3>
                        <p class="text-[10px] text-app-muted font-mono">{{ app.domain }}</p>
                      </div>
                      <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase border font-mono tracking-wider"
                            [class]="app.environment === 'Production' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : app.environment === 'Staging' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'">
                        {{ app.environment }}
                      </span>
                    </div>

                    <div class="grid grid-cols-2 gap-3 bg-app-bg/50 p-3 rounded-xl border border-app-border/40 text-center font-mono">
                      <div>
                        <span class="block text-[8px] text-app-muted uppercase">Devices</span>
                        <span class="text-sm font-bold text-app-text">{{ app.metrics.totalDevices }}</span>
                      </div>
                      <div>
                        <span class="block text-[8px] text-app-muted uppercase">Subscribers</span>
                        <span class="text-sm font-bold text-app-text">{{ app.metrics.totalSubscribers }}</span>
                      </div>
                    </div>

                    <div class="text-xs space-y-1.5 pt-2">
                      <div class="flex justify-between">
                        <span class="text-app-muted">Today's Pushes:</span>
                        <span class="font-bold text-app-text">{{ app.metrics.sentToday }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-app-muted">This Month:</span>
                        <span class="font-bold text-app-text">{{ app.metrics.sentThisMonth }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-app-muted">Delivery Success:</span>
                        <span class="font-bold text-emerald-400">{{ app.metrics.successRate }}%</span>
                      </div>
                    </div>
                  </div>

                  <div class="pt-3 border-t border-app-border/40 flex gap-2">
                    <button (click)="selectApp(app.id)" class="flex-1 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-[10px] font-black uppercase rounded-lg transition tracking-wider border border-indigo-500/10 cursor-pointer">
                      View Details
                    </button>
                  </div>
                </div>
              } @empty {
                <div class="col-span-full py-12 text-center text-app-muted">No applications onboarded yet.</div>
              }
            </div>
          } @else {
            <!-- Detailed Application View -->
            <div class="bg-app-card border border-app-border rounded-2xl p-6 shadow-sm space-y-6">
              <div class="flex justify-between items-center border-b border-app-border/40 pb-4">
                <button (click)="selectedAppId.set(null)" class="text-xs text-app-muted hover:text-indigo-400 flex items-center gap-1 font-bold cursor-pointer">
                  <mat-icon class="!w-4 !h-4 !text-[16px]">arrow_back</mat-icon> Back to Apps
                </button>
                <h3 class="text-lg font-bold text-app-text">{{ currentAppDetails()?.app?.name }} Analytics</h3>
              </div>

              <!-- KPI cards inside detailed view -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-app-bg border border-app-border rounded-xl p-4 text-center">
                  <span class="text-[9px] text-app-muted uppercase block font-bold">Total Devices</span>
                  <span class="text-xl font-black text-app-text mt-1 block font-mono">{{ currentAppDetails()?.metrics?.totalDevices }}</span>
                </div>
                <div class="bg-app-bg border border-app-border rounded-xl p-4 text-center">
                  <span class="text-[9px] text-app-muted uppercase block font-bold">Active Devices</span>
                  <span class="text-xl font-black text-emerald-400 mt-1 block font-mono">{{ currentAppDetails()?.metrics?.activeDevices }}</span>
                </div>
                <div class="bg-app-bg border border-app-border rounded-xl p-4 text-center">
                  <span class="text-[9px] text-app-muted uppercase block font-bold">Today's Pushes</span>
                  <span class="text-xl font-black text-indigo-400 mt-1 block font-mono">{{ currentAppDetails()?.metrics?.sentToday }}</span>
                </div>
                <div class="bg-app-bg border border-app-border rounded-xl p-4 text-center">
                  <span class="text-[9px] text-app-muted uppercase block font-bold">Success Rate</span>
                  <span class="text-xl font-black text-app-text mt-1 block font-mono" [class.text-emerald-400]="currentAppDetails()?.metrics?.successRate >= 95">
                    {{ currentAppDetails()?.metrics?.successRate }}%
                  </span>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-app-border/40">
                <!-- Config summaries -->
                <div class="space-y-4">
                  <h4 class="text-xs font-black text-indigo-400 uppercase tracking-widest">Metadata</h4>
                  <div class="bg-app-bg/50 p-4 rounded-xl border border-app-border/40 text-xs space-y-2 font-mono">
                    <div class="flex justify-between"><span class="text-app-muted">API Key:</span><span class="text-app-text truncate max-w-xs">{{ currentAppDetails()?.app?.api_key }}</span></div>
                    <div class="flex justify-between"><span class="text-app-muted">Domain:</span><span class="text-app-text">{{ currentAppDetails()?.app?.domain }}</span></div>
                    <div class="flex justify-between"><span class="text-app-muted">Environment:</span><span class="text-app-text">{{ currentAppDetails()?.app?.environment }}</span></div>
                    <div class="flex justify-between"><span class="text-app-muted">CPU Allocated:</span><span class="text-app-text">{{ currentAppDetails()?.app?.cpu_cores }} Cores</span></div>
                    <div class="flex justify-between"><span class="text-app-muted">Memory MB:</span><span class="text-app-text">{{ currentAppDetails()?.app?.memory_mb }} MB</span></div>
                  </div>
                </div>

                <!-- Action boxes -->
                <div class="space-y-4">
                  <h4 class="text-xs font-black text-pink-400 uppercase tracking-widest">Diagnostics</h4>
                  <div class="bg-app-bg/50 p-4 rounded-xl border border-app-border/40 space-y-3">
                    <p class="text-xs text-app-muted leading-relaxed">Trigger verification of all registered tokens for this app node against Google API servers.</p>
                    <button (click)="refreshAppTokens(currentAppDetails()?.app?.id)" class="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-app-text text-xs font-bold rounded-lg transition tracking-wide cursor-pointer flex items-center gap-1.5 border border-pink-500/20">
                      <mat-icon class="!w-4 !h-4 !text-[16px]">sync_alt</mat-icon> Bulk Refresh Device Tokens
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Tab 3: Usage Trends -->
      @if (activeTab() === 'usage') {
        <div class="space-y-6 animate-in fade-in duration-200 bg-app-card border border-app-border rounded-2xl p-6 shadow-sm">
          <div>
            <h3 class="text-xs font-black text-indigo-400 uppercase tracking-widest">Notification Types</h3>
            <p class="text-[10px] text-app-muted mt-0.5">Classification of notification purposes across transaction types.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            @for (t of charts().typeDistribution; track t.label) {
              <div class="bg-app-bg border border-app-border rounded-xl p-5 text-center flex flex-col justify-between min-h-[140px]">
                <span class="block text-xs uppercase font-bold text-app-muted tracking-wider">{{ t.label }}</span>
                <span class="block text-3xl font-black text-indigo-400 mt-2 font-mono">{{ t.value }}</span>
                <span class="block text-[10px] text-app-muted mt-2 block font-semibold">{{ getDistributionPercent(t.value) }}% of total</span>
              </div>
            } @empty {
              <div class="col-span-full text-center text-app-muted py-8">No distribution records found.</div>
            }
          </div>
        </div>
      }

      <!-- Tab 4: Subscribers -->
      @if (activeTab() === 'subscribers') {
        <div class="space-y-6 animate-in fade-in duration-200">
          
          <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <!-- Left Filter Panel -->
            <div class="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-4 h-fit">
              <h3 class="text-xs font-black text-indigo-400 uppercase tracking-widest">Search Filter</h3>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Search Keywords</label>
                  <input type="text" [(ngModel)]="subFilter.search" (input)="loadSubscribers()" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500" placeholder="Name, browser, OS...">
                </div>

                <div>
                  <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Application</label>
                  <select [(ngModel)]="subFilter.appId" (change)="loadSubscribers()" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none cursor-pointer">
                    <option value="">All Applications</option>
                    @for (app of apps(); track app.id) {
                      <option [value]="app.id">{{ app.name }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Platform</label>
                  <select [(ngModel)]="subFilter.platform" (change)="loadSubscribers()" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none cursor-pointer">
                    <option value="">All Platforms</option>
                    <option value="Web">Web Browsers</option>
                    <option value="Android">Android Native</option>
                    <option value="iOS">Apple iOS</option>
                  </select>
                </div>

                <div>
                  <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Status</label>
                  <select [(ngModel)]="subFilter.status" (change)="loadSubscribers()" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none cursor-pointer">
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="revoked">Revoked</option>
                  </select>
                </div>

                <button (click)="exportSubscribers()" class="w-full py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 text-[10px] font-black uppercase rounded-lg border border-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-1">
                  <mat-icon class="!w-4 !h-4 !text-[16px]">file_download</mat-icon> Export CSV List
                </button>
              </div>
            </div>

            <!-- Right Datatable -->
            <div class="lg:col-span-3 bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-4">
              <div class="flex justify-between items-center border-b border-app-border/40 pb-3">
                <h3 class="text-xs font-black text-indigo-400 uppercase tracking-widest">Active Device Registrations</h3>
                <span class="bg-app-bg text-[10px] px-2 py-0.5 rounded border border-app-border text-indigo-300 font-mono">{{ subscribers().length }} Loaded</span>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-app-border/60 text-[9px] uppercase tracking-wider text-app-muted">
                      <th class="py-3 pr-4 font-bold">User / Company</th>
                      <th class="py-3 px-4 font-bold">Node (App)</th>
                      <th class="py-3 px-4 font-bold">OS / Browser</th>
                      <th class="py-3 px-4 font-bold">Status</th>
                      <th class="py-3 px-4 font-bold">Last Online</th>
                      <th class="py-3 pl-4 font-bold text-right w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-app-border/40">
                    @for (s of subscribers(); track s.id) {
                      <tr class="hover:bg-app-card/30 transition-colors">
                        <td class="py-3 pr-4">
                          <span class="block font-bold text-app-text">{{ s.user_name || 'Standard Client' }}</span>
                          <span class="block text-[9px] text-app-muted mt-0.5">{{ s.customer_name || 'N/A' }}</span>
                        </td>
                        <td class="py-3 px-4 text-app-muted">{{ s.app_name }}</td>
                        <td class="py-3 px-4 text-app-text font-semibold flex items-center gap-1 mt-2.5">
                          <mat-icon class="!text-[12px] !w-3 !h-3 text-indigo-400">{{ s.platform === 'Web' ? 'language' : 'phone_iphone' }}</mat-icon>
                          <span>{{ s.os }} / {{ s.browser }}</span>
                        </td>
                        <td class="py-3 px-4">
                          <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase border font-mono tracking-wider"
                                [class]="s.token_status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : s.token_status === 'revoked' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'">
                            {{ s.token_status }}
                          </span>
                        </td>
                        <td class="py-3 px-4 text-app-muted font-mono text-[10px]">{{ s.last_active | date:'short' }}</td>
                        <td class="py-3 pl-4 text-right flex justify-end gap-1.5">
                          @if (s.token_status === 'active') {
                            <button (click)="disableSubNotifications(s.id)" title="Disable Pushes" class="p-1 hover:bg-slate-800 rounded text-amber-400 transition cursor-pointer">
                              <mat-icon class="!w-4 !h-4 !text-[16px]">notifications_off</mat-icon>
                            </button>
                            <button (click)="revokeSubToken(s.id)" title="Revoke Token" class="p-1 hover:bg-slate-800 rounded text-rose-400 transition cursor-pointer">
                              <mat-icon class="!w-4 !h-4 !text-[16px]">block</mat-icon>
                            </button>
                          } @else {
                            <button (click)="activateSubToken(s.id)" title="Re-activate Subscriber" class="p-1 hover:bg-slate-800 rounded text-emerald-400 transition cursor-pointer">
                              <mat-icon class="!w-4 !h-4 !text-[16px]">settings_backup_restore</mat-icon>
                            </button>
                          }
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="6" class="py-8 text-center text-app-muted font-mono">No matching subscribers registered in tables.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
        </div>
      }

      <!-- Tab 5: Billing -->
      @if (activeTab() === 'billing') {
        <div class="space-y-6 animate-in fade-in duration-200">
          
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Left: Cost Breakdowns -->
            <div class="lg:col-span-2 space-y-6">
              <div class="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-4">
                <h3 class="text-xs font-black text-indigo-400 uppercase tracking-widest">Active Billing Calculations</h3>
                
                <div class="space-y-4">
                  @for (b of billingData().breakdowns; track b.appId) {
                    <div class="bg-app-bg/50 border border-app-border/40 rounded-xl p-4 space-y-3 font-mono text-xs">
                      <div class="flex justify-between items-center border-b border-app-border/40 pb-2">
                        <span class="font-bold text-sm text-app-text font-sans">{{ b.appName }}</span>
                        <span class="text-[10px] text-app-muted">Customer: {{ b.customerName }}</span>
                      </div>

                      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 py-1 text-[11px] text-app-muted">
                        <div>Sent Today: <strong class="text-app-text font-bold">{{ b.calculation.totalSent }}</strong></div>
                        <div>Free Limit: <strong class="text-app-text font-bold">{{ b.calculation.freeQuotaLimit }}</strong></div>
                        <div>Billable: <strong class="text-app-text font-bold">{{ b.calculation.billableNotifications }}</strong></div>
                      </div>

                      <div class="flex justify-between items-center pt-2 border-t border-app-border/40">
                        @if (b.calculation.isWithinFreeQuota) {
                          <span class="px-2.5 py-0.5 rounded text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans font-black tracking-wider uppercase">Within Free Firebase Usage</span>
                        } @else {
                          <div class="text-[11px] space-y-0.5">
                            <div>Cost: {{ b.calculation.rawCost | currency:b.calculation.currency:'symbol':'1.2-2' }}</div>
                            <div>Platform: {{ b.calculation.platformCharge | currency:b.calculation.currency:'symbol':'1.2-2' }}</div>
                            <div>GST ({{ b.settings.gst_percentage }}%): {{ b.calculation.gstAmount | currency:b.calculation.currency:'symbol':'1.2-2' }}</div>
                          </div>
                        }
                        
                        <div class="text-right">
                          <span class="text-[9px] text-app-muted block uppercase font-bold font-sans">Total Estimated Charge</span>
                          <span class="text-base font-black text-indigo-400 mt-0.5 block font-mono">
                            {{ b.calculation.isWithinFreeQuota ? 'Within Quota' : (b.calculation.totalAmount | currency:b.calculation.currency:'symbol':'1.2-2') }}
                          </span>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Right: Billing History Logs -->
            <div class="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-4">
              <h3 class="text-xs font-black text-indigo-400 uppercase tracking-widest">Billing Statements History</h3>
              
              <div class="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                @for (h of billingData().history; track h.id) {
                  <div class="border border-app-border/40 bg-app-bg/30 rounded-xl p-3 space-y-2 text-xs font-mono">
                    <div class="flex justify-between">
                      <span class="font-bold text-app-text font-sans truncate max-w-xs">{{ h.app_name }}</span>
                      <span class="px-1.5 py-0.5 bg-slate-800 text-[8px] text-indigo-300 font-bold uppercase rounded">{{ h.status }}</span>
                    </div>
                    
                    <div class="text-[11px] text-app-muted space-y-0.5">
                      <div>Period: {{ h.billing_period_start | date:'shortDate' }} - {{ h.billing_period_end | date:'shortDate' }}</div>
                      <div>Pushes: {{ h.total_notifications_sent }}</div>
                    </div>

                    <div class="flex justify-between items-center border-t border-app-border/40 pt-1.5 mt-1 font-sans">
                      <span class="text-[9px] text-app-muted">Invoice Sum</span>
                      <strong class="text-indigo-400 font-mono font-bold">{{ h.total_amount | currency:h.currency:'symbol':'1.2-2' }}</strong>
                    </div>
                  </div>
                } @empty {
                  <p class="text-xs text-app-muted py-8 text-center font-mono">No historical billing invoices created.</p>
                }
              </div>
            </div>
            
          </div>
          
        </div>
      }

      <!-- Tab 6: Notification Logs -->
      @if (activeTab() === 'logs') {
        <div class="space-y-6 animate-in fade-in duration-200">
          
          <div class="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-4">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-app-border/40 pb-3">
              <h3 class="text-xs font-black text-indigo-400 uppercase tracking-widest">Real-time Push Dispatch Logs</h3>
              
              <!-- Logs filters -->
              <div class="flex flex-wrap gap-2 text-xs">
                <select [(ngModel)]="logFilter.appId" (change)="loadLogs()" class="px-2.5 py-1 bg-app-bg border border-app-border rounded-lg outline-none cursor-pointer text-xs">
                  <option value="">All Applications</option>
                  @for (app of apps(); track app.id) {
                    <option [value]="app.id">{{ app.name }}</option>
                  }
                </select>
                <select [(ngModel)]="logFilter.status" (change)="loadLogs()" class="px-2.5 py-1 bg-app-bg border border-app-border rounded-lg outline-none cursor-pointer text-xs">
                  <option value="">All Statuses</option>
                  <option value="delivered">Delivered</option>
                  <option value="sent">Sent</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-app-border/60 text-[9px] uppercase tracking-wider text-app-muted">
                    <th class="py-3 pr-4 font-bold">Log ID</th>
                    <th class="py-3 px-4 font-bold">Node (App)</th>
                    <th class="py-3 px-4 font-bold">Title / Details</th>
                    <th class="py-3 px-4 font-bold">Type</th>
                    <th class="py-3 px-4 font-bold text-center">Status</th>
                    <th class="py-3 pl-4 font-bold text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-app-border/40">
                  @for (log of logs(); track log.id) {
                    <tr class="hover:bg-app-card/30 transition-colors font-mono text-[11px]">
                      <td class="py-3 pr-4 text-app-muted max-w-[80px] truncate" [title]="log.id">{{ log.id }}</td>
                      <td class="py-3 px-4 text-app-text font-bold font-sans">{{ log.app_name }}</td>
                      <td class="py-3 px-4 font-sans">
                        <span class="block font-bold text-app-text">{{ log.title }}</span>
                        <span class="block text-[9px] text-app-muted mt-0.5 truncate max-w-xs">{{ log.body }}</span>
                      </td>
                      <td class="py-3 px-4 text-app-muted uppercase text-[9px]">{{ log.notification_type }}</td>
                      <td class="py-3 px-4 text-center">
                        <span class="inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase border tracking-wider font-sans"
                              [class]="log.delivery_status === 'delivered' || log.delivery_status === 'sent' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : log.delivery_status === 'failed' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'">
                          {{ log.delivery_status }}
                        </span>
                        @if (log.failure_reason) {
                          <span class="block text-[8px] text-rose-400 truncate max-w-[80px] mt-0.5" [title]="log.failure_reason">{{ log.failure_reason }}</span>
                        }
                      </td>
                      <td class="py-3 pl-4 text-right text-app-muted text-[10px]">{{ log.sent_time | date:'medium' }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="py-8 text-center text-app-muted">No push logs found in the database.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      }

      <!-- Tab 7: Billing Config -->
      @if (activeTab() === 'config') {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          
          <!-- Left Forms: Setting adjustments -->
          <div class="lg:col-span-2 bg-app-card border border-app-border rounded-2xl p-6 shadow-sm space-y-6">
            <div class="border-b border-app-border/40 pb-3 flex justify-between items-center">
              <div>
                <h3 class="text-xs font-black text-indigo-400 uppercase tracking-widest">Firebase Billing Policy Settings</h3>
                <p class="text-[10px] text-app-muted mt-0.5">Configure free inclusions, base costs per 1,000 requests, and service fees.</p>
              </div>

              <!-- Application Target selector -->
              <select [(ngModel)]="configAppId" (change)="onConfigAppChange()" class="px-2.5 py-1 bg-app-bg border border-app-border rounded-lg outline-none cursor-pointer text-xs">
                @for (app of apps(); track app.id) {
                  <option [value]="app.id">{{ app.name }}</option>
                }
              </select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex items-center justify-between p-3 rounded-xl border border-app-border/40 bg-app-bg/50">
                <div class="text-xs">
                  <span class="block font-bold text-app-text">Enable Quota Billing</span>
                  <span class="block text-[9px] text-app-muted mt-0.5">Charge for pushes exceeding limits</span>
                </div>
                <input type="checkbox" [(ngModel)]="configModel.enabled" class="rounded bg-app-card border-slate-600 text-indigo-500 w-4 h-4 cursor-pointer">
              </div>

              <div class="flex items-center justify-between p-3 rounded-xl border border-app-border/40 bg-app-bg/50">
                <div class="text-xs">
                  <span class="block font-bold text-app-text">Enable Free Quota Inclusion</span>
                  <span class="block text-[9px] text-app-muted mt-0.5">Include free notification tier</span>
                </div>
                <input type="checkbox" [(ngModel)]="configModel.free_quota_enabled" class="rounded bg-app-card border-slate-600 text-indigo-500 w-4 h-4 cursor-pointer">
              </div>

              <div>
                <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Free Notifications Included</label>
                <input type="number" [(ngModel)]="configModel.free_notifications" [disabled]="!configModel.free_quota_enabled" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
              </div>

              <div>
                <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Price Per 1,000 Overages</label>
                <input type="number" step="0.01" [(ngModel)]="configModel.price_per_1000" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
              </div>

              <div>
                <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Platform Service Charge (Fixed)</label>
                <input type="number" [(ngModel)]="configModel.platform_service_charge" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
              </div>

              <div>
                <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">GST/Tax Percentage (%)</label>
                <input type="number" [(ngModel)]="configModel.gst_percentage" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
              </div>

              <div>
                <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Billing Currency</label>
                <select [(ngModel)]="configModel.currency" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none cursor-pointer">
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>

              <div>
                <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Billing Cycle Frequency</label>
                <select [(ngModel)]="configModel.billing_frequency" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none cursor-pointer">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div class="pt-4 border-t border-app-border/40 flex justify-end">
              <button (click)="saveAppConfig()" [disabled]="isSaving()" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-app-text text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1 border border-indigo-500/20 shadow-lg">
                @if (isSaving()) {
                  <div class="w-3.5 h-3.5 border-2 border-app-text border-t-transparent rounded-full animate-spin"></div>
                  <span>SAVING...</span>
                } @else {
                  <mat-icon class="!w-4 !h-4 !text-[16px]">save</mat-icon>
                  <span>SAVE SETTINGS</span>
                }
              </button>
            </div>
          </div>

          <!-- Right Calculator: Live interactive cost estimator -->
          <div class="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 class="text-xs font-black text-pink-400 uppercase tracking-widest">Interactive Calculator Preview</h3>
            <p class="text-[10px] text-app-muted">Enter notification volume below to visualize immediate cost estimations.</p>

            <div class="space-y-4">
              <div>
                <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Estimated Push Volume</label>
                <input type="number" [(ngModel)]="calculatorVolume" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-pink-500 font-mono font-bold" placeholder="e.g. 50,000">
              </div>

              <!-- Output cards -->
              <div class="bg-app-bg/50 p-4 rounded-xl border border-app-border/40 font-mono text-xs space-y-2">
                <div class="flex justify-between">
                  <span class="text-app-muted">Total Volume:</span>
                  <span class="text-app-text font-bold">{{ calculatorVolume | number }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-app-muted">Free Tier Included:</span>
                  <span class="text-app-text font-bold">{{ configModel.free_quota_enabled ? (configModel.free_notifications | number) : 0 }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-app-muted">Billable Overage:</span>
                  <span class="text-app-text font-bold">{{ calculatedBillable | number }}</span>
                </div>
                
                <div class="border-t border-app-border/30 pt-2 flex justify-between">
                  <span class="text-app-muted">Overage Cost:</span>
                  <span class="text-app-text font-bold">{{ calculatedOverageCost | currency:configModel.currency:'symbol':'1.2-2' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-app-muted">Platform Fee:</span>
                  <span class="text-app-text font-bold">{{ configModel.platform_service_charge | currency:configModel.currency:'symbol':'1.2-2' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-app-muted">GST Tax ({{ configModel.gst_percentage }}%):</span>
                  <span class="text-app-text font-bold">{{ calculatedGst | currency:configModel.currency:'symbol':'1.2-2' }}</span>
                </div>

                <div class="border-t border-app-border/50 pt-2 flex justify-between items-center text-sm font-sans">
                  <span class="font-bold text-app-text">Estimated Sum</span>
                  <strong class="text-pink-400 font-mono font-black text-base">
                    {{ calculatorVolume <= (configModel.free_quota_enabled ? configModel.free_notifications : 0) && configModel.free_quota_enabled ? 'Within Free Usage' : (calculatedTotalSum | currency:configModel.currency:'symbol':'1.2-2') }}
                  </strong>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      }

      <!-- Tab 8: Reports -->
      @if (activeTab() === 'reports') {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          <!-- Left: Compiler -->
          <div class="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-4 h-fit">
            <h3 class="text-xs font-black text-indigo-400 uppercase tracking-widest">Compile New Statement</h3>
            
            <div class="space-y-4 text-xs">
              <div>
                <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Report Name</label>
                <input type="text" [(ngModel)]="newReportModel.name" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-bold" placeholder="e.g. Q3 Firebase Overage Report">
              </div>

              <div>
                <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Report Scope (Type)</label>
                <select [(ngModel)]="newReportModel.type" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none cursor-pointer">
                  <option value="daily">Daily Notification Report</option>
                  <option value="weekly">Weekly Summary Report</option>
                  <option value="monthly">Monthly Aggregate Report</option>
                  <option value="billing">Billing Breakdown Report</option>
                </select>
              </div>

              <div>
                <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Target Application</label>
                <select [(ngModel)]="newReportModel.appId" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs outline-none cursor-pointer">
                  <option value="">All Applications</option>
                  @for (app of apps(); track app.id) {
                    <option [value]="app.id">{{ app.name }}</option>
                  }
                </select>
              </div>

              <button (click)="compileReport()" [disabled]="!newReportModel.name || isCompiling()" class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-app-text text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 border border-indigo-500/20 shadow-lg">
                @if (isCompiling()) {
                  <div class="w-3.5 h-3.5 border-2 border-app-text border-t-transparent rounded-full animate-spin"></div>
                  <span>COMPILING...</span>
                } @else {
                  <mat-icon class="!w-4 !h-4 !text-[16px]">library_books</mat-icon>
                  <span>GENERATE REPORT</span>
                }
              </button>
            </div>
          </div>

          <!-- Right: Past compiled list -->
          <div class="lg:col-span-2 bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 class="text-xs font-black text-indigo-400 uppercase tracking-widest">Compiled Reports History</h3>
            
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-app-border/60 text-[9px] uppercase tracking-wider text-app-muted">
                    <th class="py-3 pr-4 font-bold">Report Details</th>
                    <th class="py-3 px-4 font-bold">Scope</th>
                    <th class="py-3 px-4 font-bold">Generated On</th>
                    <th class="py-3 pl-4 font-bold text-right w-36">Downloads</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-app-border/40">
                  @for (rep of reports(); track rep.id) {
                    <tr class="hover:bg-app-card/30 transition-colors">
                      <td class="py-3 pr-4">
                        <span class="block font-bold text-app-text">{{ rep.report_name }}</span>
                        <span class="block text-[9px] text-app-muted mt-0.5 uppercase">{{ rep.report_type }}</span>
                      </td>
                      <td class="py-3 px-4 text-app-muted">{{ rep.scope }}</td>
                      <td class="py-3 px-4 text-app-muted font-mono text-[10px]">{{ rep.created_at | date:'medium' }}</td>
                      <td class="py-3 pl-4 text-right flex justify-end gap-1">
                        <button (click)="downloadReportFile(rep.report_name, 'pdf')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-400 text-[10px] font-bold rounded cursor-pointer">PDF</button>
                        <button (click)="downloadReportFile(rep.report_name, 'csv')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[10px] font-bold rounded cursor-pointer">CSV</button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="4" class="py-8 text-center text-app-muted font-mono">No reports compiled yet.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class FirebaseMonitorComponent implements OnInit, OnDestroy {
  private service = inject(FirebaseMonitorService);

  activeTab = signal<string>('dashboard');
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isCompiling = signal<boolean>(false);

  // Data signals
  stats = signal<any>({
    totalApps: 0,
    totalDevices: 0,
    activeSubscribers: 0,
    sentToday: 0,
    successToday: 0,
    failedToday: 0,
    pendingToday: 0,
    sentThisMonth: 0,
    successRate: 100,
    estimatedMonthlyCost: 0,
    firebaseProjectStatus: 'Offline',
    currency: 'INR'
  });

  charts = signal<any>({
    dailyTrend: [],
    subscriberGrowth: [],
    appWiseDistribution: [],
    typeDistribution: []
  });

  apps = signal<any[]>([]);
  subscribers = signal<any[]>([]);
  subscriberDistribution = signal<any>({});
  billingData = signal<any>({ breakdowns: [], history: [] });
  logs = signal<any[]>([]);
  reports = signal<any[]>([]);

  // Detailed selected App
  selectedAppId = signal<string | null>(null);
  currentAppDetails = signal<any>(null);

  // Subscriptions & Refresh interval
  private sseSubscription?: Subscription;
  private autoRefreshTimer?: any;
  refreshInterval = 5; // Default every 5 minutes

  // Search/Filters states
  subFilter = { appId: '', search: '', platform: '', status: '' };
  logFilter = { appId: '', status: '' };

  // Configuration management state
  configAppId = '';
  configModel = {
    enabled: true,
    free_quota_enabled: true,
    free_notifications: 10000,
    price_per_1000: 0.50,
    platform_service_charge: 10.00,
    gst_percentage: 18.00,
    currency: 'INR',
    billing_frequency: 'monthly',
    threshold_alerts: []
  };

  // Cost calculator variables
  calculatorVolume = 25000;

  // New report form
  newReportModel = { name: '', type: 'monthly', appId: '' };

  // Calculator computed fields
  get calculatedBillable(): number {
    const free = this.configModel.free_quota_enabled ? this.configModel.free_notifications : 0;
    return Math.max(0, this.calculatorVolume - free);
  }

  get calculatedOverageCost(): number {
    return (this.calculatedBillable / 1000) * this.configModel.price_per_1000;
  }

  get calculatedGst(): number {
    const sub = this.calculatedOverageCost + this.configModel.platform_service_charge;
    return sub * (this.configModel.gst_percentage / 100);
  }

  get calculatedTotalSum(): number {
    return this.calculatedOverageCost + this.configModel.platform_service_charge + this.calculatedGst;
  }

  ngOnInit() {
    this.loadAllData();
    this.setupSSEConnection();
    this.setupAutoRefresh();
  }

  ngOnDestroy() {
    this.cleanupSSE();
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
    }
  }

  setTab(tabName: string) {
    this.activeTab.set(tabName);
    this.loadAllData();
  }

  loadAllData() {
    this.isLoading.set(true);

    this.service.getDashboardStats().subscribe({
      next: (res) => {
        this.stats.set(res.stats);
        this.charts.set(res.charts);
      },
      error: (err) => console.error('Dashboard stats fetch failed', err)
    });

    this.service.getApplications().subscribe({
      next: (res) => {
        this.apps.set(res);
        if (res.length > 0 && !this.configAppId) {
          this.configAppId = res[0].id;
          this.onConfigAppChange();
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Apps load failed', err);
        this.isLoading.set(false);
      }
    });

    this.loadSubscribers();
    this.loadLogs();
    this.loadBilling();
    this.loadReports();
  }

  loadSubscribers() {
    this.service.getSubscribers(this.subFilter).subscribe(res => {
      this.subscribers.set(res.subscribers || []);
      this.subscriberDistribution.set(res.distribution || {});
    });
  }

  loadLogs() {
    this.service.getLogs(this.logFilter).subscribe(res => {
      this.logs.set(res || []);
    });
  }

  loadBilling() {
    this.service.getBilling().subscribe(res => {
      this.billingData.set(res || { breakdowns: [], history: [] });
    });
  }

  loadReports() {
    this.service.getReports().subscribe(res => {
      this.reports.set(res || []);
    });
  }

  manualRefresh() {
    this.loadAllData();
    this.setupSSEConnection();
    alert('Real-time statistics refreshed successfully!');
  }

  setupSSEConnection() {
    this.cleanupSSE();
    
    this.sseSubscription = this.service.getRealtimeDashboardStats().subscribe({
      next: (freshStats) => {
        if (freshStats) {
          this.stats.set(freshStats);
        }
      },
      error: (err) => {
        console.warn('[SSE] Eventstream connection dropped, falling back to polling.', err);
      }
    });
  }

  cleanupSSE() {
    if (this.sseSubscription) {
      this.sseSubscription.unsubscribe();
    }
  }

  setupAutoRefresh() {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
    }

    if (this.refreshInterval > 0) {
      this.autoRefreshTimer = setInterval(() => {
        this.loadAllData();
      }, this.refreshInterval * 60 * 1000);
    }
  }

  selectApp(id: string) {
    this.selectedAppId.set(id);
    this.service.getApplicationDetails(id).subscribe(res => {
      this.currentAppDetails.set(res);
    });
  }

  refreshAppTokens(appId: string) {
    this.service.triggerRefreshTokens(appId).subscribe(() => {
      alert('Verification requests dispatched! Check logs in a few minutes.');
      this.loadAllData();
    });
  }

  // Subscriber operations
  revokeSubToken(tokenId: string) {
    if (confirm('Are you sure you want to revoke this registration token? Device will no longer receive pushes.')) {
      this.service.revokeToken(tokenId).subscribe(() => {
        alert('Token status marked as revoked.');
        this.loadSubscribers();
      });
    }
  }

  disableSubNotifications(tokenId: string) {
    this.service.disableNotifications(tokenId).subscribe(() => {
      alert('Notifications disabled for this device.');
      this.loadSubscribers();
    });
  }

  activateSubToken(tokenId: string) {
    this.service.refreshToken(tokenId).subscribe(() => {
      alert('Subscription marked as active.');
      this.loadSubscribers();
    });
  }

  exportSubscribers() {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'User,Customer/Company,App,OS,Browser,Platform,Status,Last Active\n';

    this.subscribers().forEach(s => {
      const row = `"${s.user_name}","${s.customer_name}","${s.app_name}","${s.os}","${s.browser}","${s.platform}","${s.token_status}","${s.last_active}"`;
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FCM_Subscribers_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Config tab helpers
  onConfigAppChange() {
    if (!this.configAppId) return;
    const matched = this.apps().find(a => a.id === this.configAppId);
    if (matched && matched.settings) {
      this.configModel = { ...matched.settings };
    }
  }

  saveAppConfig() {
    this.isSaving.set(true);
    this.service.saveConfiguration(this.configAppId, this.configModel).subscribe({
      next: () => {
        this.isSaving.set(false);
        alert('Billing rules configured successfully.');
        this.loadAllData();
      },
      error: (err) => {
        this.isSaving.set(false);
        alert('Failed to save settings: ' + err.message);
      }
    });
  }

  // Compile Reports tab helpers
  compileReport() {
    this.isCompiling.set(true);
    const filterObj = {
      appId: this.newReportModel.appId || null,
      app_name: this.newReportModel.appId ? this.apps().find(a => a.id === this.newReportModel.appId)?.name : 'All Applications'
    };

    this.service.createReport(this.newReportModel.name, this.newReportModel.type, filterObj).subscribe({
      next: () => {
        this.isCompiling.set(false);
        this.newReportModel.name = '';
        alert('Statement compiled! Available for downloads.');
        this.loadReports();
      },
      error: (err) => {
        this.isCompiling.set(false);
        alert('Failed compilation: ' + err.message);
      }
    });
  }

  downloadReportFile(reportName: string, format: 'pdf' | 'csv') {
    // Simulated report downloads
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Metric,Value\n';
    csvContent += `Report Name,${reportName}\n`;
    csvContent += `Generated On,${new Date().toISOString()}\n`;
    csvContent += `Active Subscribers,${this.stats().activeSubscribers}\n`;
    csvContent += `Total Device Registrations,${this.stats().totalDevices}\n`;
    csvContent += `Pushes Sent This Month,${this.stats().sentThisMonth}\n`;
    csvContent += `Success Delivery Rate,${this.stats().successRate}%\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${reportName.replace(/\s+/g, '_')}.${format}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Formatting utils
  formatDateLabel(label: string): string {
    if (!label) return '';
    const parts = label.split('-');
    if (parts.length < 3) return label;
    // Returns dd/mm
    return `${parts[2]}/${parts[1]}`;
  }

  getPercent(val: number, total: number): number {
    if (!total) return 0;
    return (val / total) * 100;
  }

  getDistributionPercent(val: number): number {
    const sum = this.charts().appWiseDistribution.reduce((acc: number, curr: any) => acc + parseInt(curr.value || '0', 10), 0) || 1;
    return parseFloat(((val / sum) * 100).toFixed(1));
  }

  getGrowthPercent(val: number): number {
    const max = Math.max(...this.charts().subscriberGrowth.map((g: any) => g.value), 1);
    return (val / max) * 100;
  }
}
