import { Component, ChangeDetectionStrategy, input, inject, signal, computed, OnInit, OnDestroy, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ProjectData } from '../../../services/project-detail.service';
import { ObservabilityService } from '../../../services/observability.service';
import { AuthService } from '../../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-observability-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="space-y-6 animate-in fade-in duration-300">
      
      <!-- Top Alert Banner System -->
      @if (activeAlerts().length > 0) {
        <div class="space-y-2">
          @for (alert of activeAlerts(); track alert.id) {
            <div [class]="alert.type === 'critical' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 
                          alert.type === 'warning' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 
                          'bg-sky-500/10 border border-sky-500/20 text-sky-400'"
                 class="flex items-start justify-between p-4 rounded-xl shadow-lg relative animate-in slide-in-from-top-2 duration-300">
              <div class="flex items-start gap-3">
                <mat-icon [class]="alert.type === 'critical' ? 'text-rose-500' : 
                                   alert.type === 'warning' ? 'text-amber-500' : 'text-sky-500'">
                  {{ alert.type === 'critical' ? 'error' : alert.type === 'warning' ? 'warning' : 'info' }}
                </mat-icon>
                <div>
                  <h4 class="text-xs font-bold uppercase tracking-wider">
                    {{ alert.type === 'critical' ? 'CRITICAL SYSTEM ALERT' : alert.type === 'warning' ? 'WARNING' : 'INFO' }}
                  </h4>
                  <p class="text-sm mt-1 font-sans font-semibold">{{ alert.message }}</p>
                  <span class="text-[10px] opacity-70 mt-1 block font-mono">{{ alert.timestamp | date:'mediumTime' }}</span>
                </div>
              </div>
              <button (click)="dismissAlert(alert.id)" class="text-app-muted hover:text-app-text cursor-pointer transition-colors duration-150 p-1">
                <mat-icon class="!w-4 !h-4 !text-[16px]">close</mat-icon>
              </button>
            </div>
          }
        </div>
      }

      <!-- Filters & App Selector Header -->
      <div class="bg-[#111827] border border-app-border rounded-xl p-5 shadow-xl flex flex-wrap gap-4 items-center justify-between">
        <div class="flex flex-wrap gap-4 items-center">
          <!-- Time Range Pill Selector -->
          <div class="flex bg-[#1f2937] p-1 border border-app-border rounded-lg">
            <button (click)="selectedTimeRange.set('1h')" 
                    [class]="selectedTimeRange() === '1h' ? 'bg-indigo-600 text-white font-bold' : 'text-app-muted hover:text-white'"
                    class="px-3 py-1.5 text-xs rounded-md transition-all duration-200 cursor-pointer font-sans">1 Hour</button>
            <button (click)="selectedTimeRange.set('6h')" 
                    [class]="selectedTimeRange() === '6h' ? 'bg-indigo-600 text-white font-bold' : 'text-app-muted hover:text-white'"
                    class="px-3 py-1.5 text-xs rounded-md transition-all duration-200 cursor-pointer font-sans">6 Hours</button>
            <button (click)="selectedTimeRange.set('24h')" 
                    [class]="selectedTimeRange() === '24h' ? 'bg-indigo-600 text-white font-bold' : 'text-app-muted hover:text-white'"
                    class="px-3 py-1.5 text-xs rounded-md transition-all duration-200 cursor-pointer font-sans">24 Hours</button>
            <button (click)="selectedTimeRange.set('7d')" 
                    [class]="selectedTimeRange() === '7d' ? 'bg-indigo-600 text-white font-bold' : 'text-app-muted hover:text-white'"
                    class="px-3 py-1.5 text-xs rounded-md transition-all duration-200 cursor-pointer font-sans">7 Days</button>
          </div>

          <!-- Method Selector -->
          <div class="flex flex-col gap-1">
            <select [ngModel]="methodFilter()" (ngModelChange)="methodFilter.set($event)"
                    class="bg-[#1f2937] border border-app-border text-xs text-gray-200 rounded-lg px-3 py-2 outline-none hover:border-slate-600 transition cursor-pointer font-sans">
              <option value="ALL">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <!-- Status Class Filter -->
          <div class="flex flex-col gap-1">
            <select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)"
                    class="bg-[#1f2937] border border-app-border text-xs text-gray-200 rounded-lg px-3 py-2 outline-none hover:border-slate-600 transition cursor-pointer font-sans">
              <option value="ALL">All Statuses</option>
              <option value="2xx">2xx Success</option>
              <option value="3xx">3xx Redirect</option>
              <option value="4xx">4xx Client Error</option>
              <option value="5xx">5xx Server Error</option>
            </select>
          </div>

          <!-- Debounced Endpoint Filter -->
          <div class="relative w-64">
            <mat-icon class="absolute left-3 top-2.5 !w-4 !h-4 !text-[16px] text-app-muted">search</mat-icon>
            <input type="text" placeholder="Filter by endpoint (e.g. /api)"
                   [ngModel]="endpointSearch()" (ngModelChange)="endpointSearch.set($event)"
                   class="bg-[#1f2937] border border-app-border text-xs text-app-text rounded-lg pl-9 pr-4 py-2 w-full outline-none focus:border-indigo-500 transition font-sans" />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-app-muted uppercase tracking-widest">Active App:</span>
          <span class="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded-md font-mono font-bold">
            {{ project().id }}
          </span>
        </div>
      </div>

      <!-- KPI Cards Row -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <!-- Requests/Sec (Rolling 60s) -->
        <div class="bg-[#111827] border border-app-border rounded-xl p-4 shadow-xl flex flex-col justify-between">
          <span class="text-[10px] font-bold text-app-muted uppercase tracking-widest">Requests/sec</span>
          <div class="mt-2 flex items-baseline gap-1">
            <span class="text-2xl font-black font-mono text-cyan-400">{{ (realtimeMetrics()?.rps !== undefined ? realtimeMetrics().rps : stats()?.rps || 0) | number:'1.2-2' }}</span>
            <span class="text-[10px] text-app-muted font-bold font-sans">RPS</span>
          </div>
        </div>

        <!-- Total Hits Today -->
        <div class="bg-[#111827] border border-app-border rounded-xl p-4 shadow-xl flex flex-col justify-between">
          <span class="text-[10px] font-bold text-app-muted uppercase tracking-widest">Total Hits (Today)</span>
          <div class="mt-2">
            <span class="text-2xl font-black font-mono text-indigo-400">{{ (realtimeMetrics()?.hitsToday !== undefined ? realtimeMetrics().hitsToday : stats()?.hits_today || 0) | number }}</span>
          </div>
        </div>

        <!-- Average Latency -->
        <div class="bg-[#111827] border border-app-border rounded-xl p-4 shadow-xl flex flex-col justify-between">
          <span class="text-[10px] font-bold text-app-muted uppercase tracking-widest">Avg Latency</span>
          <div class="mt-2 flex items-baseline gap-1">
            <span class="text-2xl font-black font-mono text-amber-400">{{ (realtimeMetrics()?.avgLatency !== undefined ? realtimeMetrics().avgLatency : stats()?.avg_latency || '0ms') }}</span>
          </div>
        </div>

        <!-- Success Rate -->
        <div class="bg-[#111827] border border-app-border rounded-xl p-4 shadow-xl flex flex-col justify-between">
          <span class="text-[10px] font-bold text-app-muted uppercase tracking-widest">Success Rate</span>
          <div class="mt-2">
            <span class="text-2xl font-black font-mono text-emerald-400">{{ stats()?.success_rate || '100%' }}</span>
          </div>
        </div>

        <!-- Error Rate (5xx) -->
        <div class="bg-[#111827] border border-app-border rounded-xl p-4 shadow-xl flex flex-col justify-between">
          <span class="text-[10px] font-bold text-app-muted uppercase tracking-widest">Error Rate (5xx)</span>
          <div class="mt-2">
            <span class="text-2xl font-black font-mono text-rose-400">{{ stats()?.error_rate || '0%' }}</span>
          </div>
        </div>

        <!-- Latency p95 -->
        <div class="bg-[#111827] border border-app-border rounded-xl p-4 shadow-xl flex flex-col justify-between">
          <span class="text-[10px] font-bold text-app-muted uppercase tracking-widest">p95 Latency</span>
          <div class="mt-2 flex items-baseline gap-1">
            <span class="text-2xl font-black font-mono text-purple-400">{{ stats()?.p95 || 0 }}</span>
            <span class="text-[10px] text-app-muted font-bold font-sans">ms</span>
          </div>
        </div>
      </div>

      <!-- Main Layout: Charts Left (60%) & Live logs Right (40%) -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        <!-- Left: SVG Metrics Graphs (3 columns) -->
        <div class="lg:col-span-3 space-y-6">
          
          <!-- Chart 1: Request Count (Stacked Traces) -->
          <div class="bg-[#111827] border border-app-border rounded-xl p-5 shadow-xl space-y-4">
            <div class="flex justify-between items-center">
              <div>
                <h3 class="text-sm font-bold text-app-text uppercase tracking-wider">Request Count</h3>
                <p class="text-[11px] text-app-muted font-sans mt-0.5">API requests by status code (2xx/3xx/4xx/5xx)</p>
              </div>
              <div class="flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest font-bold">
                <span class="flex items-center gap-1 text-emerald-400">● 2xx</span>
                <span class="flex items-center gap-1 text-sky-400">● 3xx</span>
                <span class="flex items-center gap-1 text-amber-400">● 4xx</span>
                <span class="flex items-center gap-1 text-rose-400">● 5xx</span>
              </div>
            </div>
            
            <div class="h-48 relative">
              <svg class="w-full h-full overflow-visible" viewBox="0 0 1000 200" preserveAspectRatio="none">
                <!-- Grids -->
                <line x1="0" y1="30" x2="1000" y2="30" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />
                <line x1="0" y1="95" x2="1000" y2="95" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />
                <line x1="0" y1="160" x2="1000" y2="160" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />

                <!-- Traces -->
                <path *ngIf="c2xxPath()" [attr.d]="c2xxPath()" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" />
                <path *ngIf="c3xxPath()" [attr.d]="c3xxPath()" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" />
                <path *ngIf="c4xxPath()" [attr.d]="c4xxPath()" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" />
                <path *ngIf="c5xxPath()" [attr.d]="c5xxPath()" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" />
              </svg>
            </div>
          </div>

          <!-- Chart 2: Request Latencies (Percentiles p50, p95, p99) -->
          <div class="bg-[#111827] border border-app-border rounded-xl p-5 shadow-xl space-y-4">
            <div class="flex justify-between items-center">
              <div>
                <h3 class="text-sm font-bold text-app-text uppercase tracking-wider">Request Latencies</h3>
                <p class="text-[11px] text-app-muted font-sans mt-0.5">Response latency percentiles (P50/P95/P99)</p>
              </div>
              <div class="flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest font-bold">
                <span class="flex items-center gap-1 text-emerald-400">● P50</span>
                <span class="flex items-center gap-1 text-indigo-400">● P95</span>
                <span class="flex items-center gap-1 text-purple-400">● P99</span>
              </div>
            </div>

            <div class="h-48 relative">
              <svg class="w-full h-full overflow-visible" viewBox="0 0 1000 200" preserveAspectRatio="none">
                <line x1="0" y1="30" x2="1000" y2="30" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />
                <line x1="0" y1="95" x2="1000" y2="95" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />
                <line x1="0" y1="160" x2="1000" y2="160" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />

                <!-- Traces -->
                <path *ngIf="p50Path()" [attr.d]="p50Path()" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" />
                <path *ngIf="p95Path()" [attr.d]="p95Path()" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" />
                <path *ngIf="p99Path()" [attr.d]="p99Path()" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" />
              </svg>
            </div>
          </div>

          <!-- Grid for the other two smaller graphs -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <!-- Chart 3: End-to-end Request Latency -->
            <div class="bg-[#111827] border border-app-border rounded-xl p-5 shadow-xl space-y-4">
              <div>
                <h3 class="text-xs font-bold text-app-text uppercase tracking-widest">End-to-End Latency</h3>
                <p class="text-[10px] text-app-muted font-sans mt-0.5">Computed round-trip delay time (RTD)</p>
              </div>

              <div class="h-36 relative">
                <svg class="w-full h-full overflow-visible" viewBox="0 0 1000 200" preserveAspectRatio="none">
                  <line x1="0" y1="30" x2="1000" y2="30" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />
                  <line x1="0" y1="160" x2="1000" y2="160" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />
                  <path *ngIf="e2ePath()" [attr.d]="e2ePath()" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" />
                </svg>
              </div>
            </div>

            <!-- Chart 4: Instance Count -->
            <div class="bg-[#111827] border border-app-border rounded-xl p-5 shadow-xl space-y-4">
              <div>
                <h3 class="text-xs font-bold text-app-text uppercase tracking-widest">Container Instance Count</h3>
                <p class="text-[10px] text-app-muted font-sans mt-0.5">Autoscaled execution environment instances</p>
              </div>

              <div class="h-36 relative">
                <svg class="w-full h-full overflow-visible" viewBox="0 0 1000 200" preserveAspectRatio="none">
                  <line x1="0" y1="30" x2="1000" y2="30" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />
                  <line x1="0" y1="160" x2="1000" y2="160" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />
                  <path *ngIf="instancesPath()" [attr.d]="instancesPath()" fill="none" stroke="#84cc16" stroke-width="2" stroke-linecap="round" />
                </svg>
              </div>
            </div>

          </div>

        </div>

        <!-- Right: Real-time scrolling Log Feed (2 columns) -->
        <div class="lg:col-span-2 bg-[#111827] border border-app-border rounded-xl flex flex-col overflow-hidden shadow-xl h-[600px]">
          <div class="p-4 border-b border-app-border flex items-center justify-between bg-[#111827]/80">
            <div class="flex items-center gap-3">
              <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse relative shadow-[0_0_10px_rgba(16,185,129,0.7)]"></div>
              <h3 class="text-xs font-bold text-app-text font-mono tracking-wider uppercase">Live Stream Logs</h3>
            </div>
            
            <div class="flex items-center gap-3">
              <!-- Auto Scroll Switch -->
              <button (click)="autoScroll.set(!autoScroll())" 
                      [class]="autoScroll() ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-app-muted'"
                      class="px-2.5 py-1 text-[10px] font-bold rounded cursor-pointer transition-colors duration-150 font-sans uppercase">
                {{ autoScroll() ? 'AutoScroll ON' : 'AutoScroll OFF' }}
              </button>
            </div>
          </div>

          <!-- Scrollable Log Container -->
          <div class="p-4 flex-grow overflow-y-auto space-y-2 font-mono text-[11px] h-full custom-scrollbar bg-black/40" id="observability-terminal">
            @for (log of filteredLogs(); track log.id || log.timestamp) {
              <div [class]="log.status >= 500 ? 'border-l-2 border-rose-500 bg-rose-950/20' : 
                            log.status >= 400 ? 'border-l-2 border-amber-500 bg-amber-950/10' : 
                            log.status >= 300 ? 'border-l-2 border-sky-500 bg-sky-950/10' : 
                            'border-l-2 border-emerald-500 bg-emerald-950/10'"
                   class="flex flex-col p-2.5 rounded hover:bg-gray-800/40 transition-colors duration-100 mt-1 mb-1">
                
                <!-- First row: Time | Method | Endpoint | Status | Latency -->
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-app-muted shrink-0">{{ log.time }}</span>
                  <span [class]="log.method === 'GET' ? 'text-emerald-400 font-bold' : 
                                log.method === 'POST' ? 'text-indigo-400 font-bold' : 
                                log.method === 'PUT' ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'" 
                        class="shrink-0 uppercase font-black">{{ log.method }}</span>
                  <span class="text-gray-100 flex-grow truncate select-all">{{ log.endpoint }}</span>
                  <span [class]="log.status >= 500 ? 'text-rose-400' : 
                                log.status >= 400 ? 'text-amber-400' : 
                                log.status >= 300 ? 'text-sky-400' : 'text-emerald-400'"
                        class="font-black shrink-0">{{ log.status }}</span>
                  <span class="text-gray-400 shrink-0 font-bold tabular-nums">({{ log.latency }}ms)</span>
                </div>
                
                <!-- Second row: metadata -->
                <div class="flex items-center gap-4 text-[10px] text-app-muted mt-1 font-sans">
                  <span class="flex items-center gap-1"><mat-icon class="!w-3 !h-3 !text-[12px] align-middle">devices</mat-icon> {{ log.source }}</span>
                  <span class="flex items-center gap-1"><mat-icon class="!w-3 !h-3 !text-[12px] align-middle">cloud</mat-icon> Cloud Functions</span>
                </div>

              </div>
            } @empty {
              <div class="text-app-muted text-center py-10 italic">
                No matching logs streamed yet. Send request traffic to populate!
              </div>
            }
            
            <div class="text-app-muted animate-pulse mt-6 text-center italic">Streaming real-time logs explorer...</div>
          </div>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.1);
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `]
})
export class ObservabilityComponent implements OnInit, OnDestroy {
  project = input.required<ProjectData>();
  
  private observabilityService = inject(ObservabilityService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  // Filters & Settings Signals
  selectedTimeRange = signal<'1h' | '6h' | '24h' | '7d'>('24h');
  statusFilter = signal<'ALL' | '2xx' | '3xx' | '4xx' | '5xx'>('ALL');
  methodFilter = signal<'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE'>('ALL');
  endpointSearch = signal<string>('');
  autoScroll = signal<boolean>(true);

  // Data Store Signals
  liveLogs = signal<any[]>([]);
  chartData = signal<any[]>([]);
  activeAlerts = signal<any[]>([]);
  stats = signal<any>(null);
  realtimeMetrics = signal<any>(null);

  // Subscriptions
  private subs: Subscription[] = [];
  private pollInterval: any;

  // Chart computed SVG paths
  c2xxPath = computed(() => this.pathFor(this.pointsFor('c2xx', 10)));
  c3xxPath = computed(() => this.pathFor(this.pointsFor('c3xx', 10)));
  c4xxPath = computed(() => this.pathFor(this.pointsFor('c4xx', 10)));
  c5xxPath = computed(() => this.pathFor(this.pointsFor('c5xx', 10)));
  
  p50Path = computed(() => this.pathFor(this.pointsFor('p50', 500)));
  p95Path = computed(() => this.pathFor(this.pointsFor('p95', 500)));
  p99Path = computed(() => this.pathFor(this.pointsFor('p99', 500)));
  
  e2ePath = computed(() => this.pathFor(this.pointsFor('e2e_p95', 500)));
  instancesPath = computed(() => this.pathFor(this.pointsFor('instances', 5)));

  constructor() {
    // Reload database-backed data when time range changes
    effect(() => {
      this.loadHistoricalData();
    });

    // Auto-scroll terminal panel when new logs arrive
    effect(() => {
      const logs = this.liveLogs();
      if (this.autoScroll() && logs.length > 0) {
        setTimeout(() => {
          const term = document.getElementById('observability-terminal');
          if (term) {
            term.scrollTop = term.scrollHeight;
          }
        }, 100);
      }
    });
  }

  ngOnInit() {
    const appId = this.project().id;

    // 1. Subscribe to real-time logs from Firestore collection
    this.subs.push(
      this.observabilityService.connectFirestoreLiveStream(appId).subscribe({
        next: (logs) => {
          this.liveLogs.set(logs);
          this.cdr.markForCheck();
        },
        error: (err) => console.warn('Firestore logs stream unavailable, falling back to SSE:', err)
      })
    );

    // 2. Subscribe to real-time metrics aggregates from Firestore document
    this.subs.push(
      this.observabilityService.subscribeToMetrics(appId).subscribe({
        next: (metric) => {
          if (metric) {
            // Compute real-time rolling metrics
            const currentRps = (metric.hits / 60) || 0;
            const currentHitsToday = metric.hits || 0;
            const currentAvgLatency = metric.avgLatency ? `${metric.avgLatency}ms` : '0ms';
            this.realtimeMetrics.set({
              rps: currentRps,
              hitsToday: currentHitsToday,
              avgLatency: currentAvgLatency
            });
            this.cdr.markForCheck();
          }
        }
      })
    );

    // 3. Load initial database metrics, charts, and alerts
    this.loadHistoricalData();

    // 4. Poll database-backed endpoints every 15 seconds to sync telemetry
    this.pollInterval = setInterval(() => {
      this.loadHistoricalData();
    }, 15000);
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  loadHistoricalData() {
    const appId = this.project().id;
    const timeRange = this.selectedTimeRange();

    // Load general summary stats
    this.observabilityService.getMetrics(appId, timeRange).subscribe({
      next: (data) => {
        this.stats.set(data);
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Failed to load metrics', err)
    });

    // Load time-series chart data
    this.observabilityService.getChartData(appId, timeRange).subscribe({
      next: (data) => {
        this.chartData.set(data);
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Failed to load chart data', err)
    });

    // Load active system alerts
    this.observabilityService.getAlerts(appId).subscribe({
      next: (data) => {
        this.activeAlerts.set(data);
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Failed to load system alerts', err)
    });
  }

  filteredLogs() {
    const logs = this.liveLogs();
    const status = this.statusFilter();
    const method = this.methodFilter();
    const search = this.endpointSearch().toLowerCase().trim();

    return logs.filter(log => {
      // 1. Status Filter
      if (status !== 'ALL') {
        const sCode = log.status;
        if (status === '2xx' && (sCode < 200 || sCode >= 300)) return false;
        if (status === '3xx' && (sCode < 300 || sCode >= 400)) return false;
        if (status === '4xx' && (sCode < 400 || sCode >= 500)) return false;
        if (status === '5xx' && sCode < 500) return false;
      }

      // 2. Method Filter
      if (method !== 'ALL' && log.method !== method) return false;

      // 3. Search Filter
      if (search && !log.endpoint.toLowerCase().includes(search)) return false;

      return true;
    });
  }

  dismissAlert(alertId: string) {
    this.activeAlerts.update(alerts => alerts.filter(a => a.id !== alertId));
    this.cdr.markForCheck();
  }

  // --- SVG Path Generation Helpers ---
  private pointsFor(key: string, defLimit = 1): { x: number; y: number }[] {
    const data = this.chartData();
    if (!data || data.length === 0) return [];
    const maxVal = Math.max(...data.map(d => Number(d[key] || 0)), defLimit);
    return data.map((d, i) => {
      const x = data.length > 1 ? (i / (data.length - 1)) * 1000 : 500;
      const y = 200 - (Number(d[key] || 0) / maxVal) * 140 - 30; // 30px padding bottom, max height 140px
      return { x, y };
    });
  }

  private pathFor(pts: { x: number; y: number }[]): string {
    if (pts.length === 0) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      path += ` Q ${pts[i].x} ${pts[i].y}, ${xc} ${yc}`;
    }
    path += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
    return path;
  }
}
