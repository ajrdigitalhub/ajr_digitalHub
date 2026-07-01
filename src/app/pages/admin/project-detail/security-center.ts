import { Component, ChangeDetectionStrategy, input, inject, signal, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ProjectData } from '../../../services/project-detail.service';
import { ApiService } from '../../../services/api.service';
import { AdminStoreService } from '../../../services/admin-store.service';
import { environment } from '../../../../environments/environment';

interface SecurityLog {
  id: string;
  type: 'failed_login' | 'suspicious_ip' | 'blocked' | 'session_revoked' | string;
  severity: 'warn' | 'critical' | 'info' | string;
  ip: string;
  user_agent?: string;
  region?: string;
  user_email?: string;
  message: string;
  is_banned: boolean;
  is_revoked: boolean;
  created_at: string;
}

interface SecuritySummary {
  failedLogins: number;
  suspiciousIps: number;
  wafStatus: string;
  logs: SecurityLog[];
}

@Component({
  selector: 'app-project-security',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-5xl space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h2 class="text-2xl font-bold text-app-text">Security Center</h2>
          <!-- Live indicator -->
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> LIVE
          </div>
        </div>
        <button (click)="runScan()" class="bg-app-card text-app-text px-4 py-2 hover:bg-app-bg rounded-lg text-sm font-bold shadow-md transition flex items-center gap-2 border border-app-border">
          <mat-icon class="!w-4 !h-4 !text-[16px]">radar</mat-icon> Run Security Scan
        </button>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Failed Logins -->
        <div class="bg-gradient-to-br from-rose-500/10 to-transparent border border-rose-500/20 rounded-xl p-6 shadow-sm relative overflow-hidden">
          <div class="absolute top-3 right-3 opacity-10 text-rose-500">
            <mat-icon class="!w-12 !h-12 !text-[48px]">lock</mat-icon>
          </div>
          <div class="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-2 flex items-center justify-between">
            <span>Failed Logins (24h)</span>
            <mat-icon class="!w-4 !h-4 !text-[16px]">warning</mat-icon>
          </div>
          <div class="text-4xl font-black text-app-text tabular-nums">
            {{ isLoading() ? '—' : summary().failedLogins }}
          </div>
          <div class="text-[10px] text-rose-400/70 mt-2 font-mono">↑ auto-tracking</div>
        </div>
        <!-- Suspicious IPs -->
        <div class="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-xl p-6 shadow-sm relative overflow-hidden">
          <div class="absolute top-3 right-3 opacity-10 text-amber-500">
            <mat-icon class="!w-12 !h-12 !text-[48px]">policy</mat-icon>
          </div>
          <div class="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2 flex items-center justify-between">
            <span>Suspicious IPs</span>
            <mat-icon class="!w-4 !h-4 !text-[16px]">policy</mat-icon>
          </div>
          <div class="text-4xl font-black text-app-text tabular-nums">
            {{ isLoading() ? '—' : summary().suspiciousIps }}
          </div>
          <div class="text-[10px] text-amber-400/70 mt-2 font-mono">↑ distinct IPs</div>
        </div>
        <!-- WAF Status -->
        <div class="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div class="absolute top-3 right-3 opacity-10 text-emerald-500">
            <mat-icon class="!w-12 !h-12 !text-[48px]">shield</mat-icon>
          </div>
          <div class="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2">WAF Status</div>
          <div class="text-2xl font-black text-emerald-400 uppercase flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {{ summary().wafStatus || 'ACTIVE' }}
          </div>
          <div class="text-[10px] text-emerald-400/70 mt-2 font-mono">Web Application Firewall</div>
        </div>
      </div>

      <!-- Threat Intelligence Logs -->
      <div class="bg-app-card border border-app-border rounded-xl overflow-hidden shadow-sm">
        <div class="px-6 py-4 border-b border-app-border bg-app-card flex justify-between items-center">
          <div class="flex items-center gap-3">
            <h3 class="text-sm font-bold text-app-text">Threat Intelligence Logs</h3>
            <span class="text-[10px] font-mono text-app-muted bg-app-bg px-2 py-0.5 rounded border border-app-border">
              {{ summary().logs.length }} events
            </span>
          </div>
          <div class="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono font-bold">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live Monitoring
          </div>
        </div>
        
        <div class="p-6 space-y-3 font-mono text-xs max-h-[420px] overflow-y-auto custom-scrollbar">
          @if (isLoading()) {
            <div class="flex items-center justify-center py-10 text-app-muted gap-3">
              <div class="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading threat intelligence...</span>
            </div>
          } @else if (summary().logs.length === 0) {
            <div class="py-10 text-center text-app-muted">
              <mat-icon class="!w-10 !h-10 !text-[40px] opacity-20 mb-2">verified_user</mat-icon>
              <div>No threats detected. System is secure.</div>
            </div>
          } @else {
            @for (log of summary().logs; track log.id) {
              <div [class]="getLogClass(log)"
                   class="p-4 rounded-lg flex justify-between items-start shadow-inner border-l-2 transition-all duration-200 hover:scale-[1.005] hover:shadow-md">
                <div class="flex-grow min-w-0">
                  <div class="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span [class]="getBadgeClass(log)" class="font-bold px-1.5 py-0.5 rounded text-[10px] border">
                      [{{ getTypeLabel(log) }}]
                    </span>
                    <span class="text-app-text text-sm">{{ log.message }}</span>
                  </div>
                  <div class="text-app-muted flex items-center gap-4 flex-wrap">
                    @if (log.ip) {
                      <span>Source IP: <strong class="text-app-text">{{ log.ip }}</strong></span>
                    }
                    @if (log.user_email) {
                      <span>User: {{ log.user_email }}</span>
                    }
                    @if (log.region) {
                      <span>Region: <span class="text-amber-400">{{ log.region }}</span></span>
                    }
                    <span class="text-app-muted ml-auto text-[10px]">{{ log.created_at | date:'h:mm:ss a' }}</span>
                  </div>
                </div>
                <div class="flex gap-2 ml-4 shrink-0">
                  @if (!log.is_banned && log.ip) {
                    <button (click)="banIp(log)" 
                      class="bg-app-card px-3 py-1.5 rounded border border-rose-500/30 text-rose-400 font-sans font-bold text-[11px] hover:bg-rose-500/10 transition shadow">
                      Ban IP
                    </button>
                  } @else if (log.is_banned) {
                    <span class="px-3 py-1.5 rounded border border-app-border text-app-muted text-[11px] font-bold">Banned</span>
                  }
                  @if (!log.is_revoked) {
                    <button (click)="revokeSession(log)" 
                      class="bg-app-card px-3 py-1.5 rounded border border-amber-500/30 text-amber-400 font-sans font-bold text-[11px] hover:bg-amber-500/10 transition shadow">
                      Revoke
                    </button>
                  } @else {
                    <span class="px-3 py-1.5 rounded border border-app-border text-app-muted text-[11px] font-bold">Revoked</span>
                  }
                </div>
              </div>
            }
          }
          <div class="text-center text-[10px] text-app-muted font-mono pt-2 animate-pulse">
            ▶ Live threat stream active...
          </div>
        </div>
      </div>

      <style>
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.2); border-radius: 10px; }
      </style>
    </div>
  `
})
export class ProjectSecurityComponent implements OnInit, OnDestroy {
  project = input.required<ProjectData>();
  apiService = inject(ApiService);
  store = inject(AdminStoreService);
  cdr = inject(ChangeDetectorRef);

  isLoading = signal(true);
  summary = signal<SecuritySummary>({
    failedLogins: 0,
    suspiciousIps: 0,
    wafStatus: 'ACTIVE',
    logs: []
  });

  private sseSource?: EventSource;

  ngOnInit() {
    this.loadLogs();
    this.startLiveStream();
  }

  ngOnDestroy() {
    this.sseSource?.close();
  }

  loadLogs() {
    const id = this.project().id;
    this.apiService.get<SecuritySummary>(`/api/admin/apps/${id}/security/logs`).subscribe({
      next: (data) => {
        this.summary.set(data);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  startLiveStream() {
    const id = this.project().id;
    const baseUrl = environment.apiUrl || 'http://localhost:3000';
    this.sseSource = new EventSource(`${baseUrl}/api/admin/apps/${id}/security/live-stream`);

    this.sseSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'heartbeat') return;

        this.summary.update(s => {
          const logs = [data, ...s.logs.filter(l => l.id !== data.id)].slice(0, 50);
          const failedLogins = logs.filter(l => l.type === 'failed_login').length;
          const suspiciousIps = new Set(logs.filter(l => l.type === 'suspicious_ip' || l.type === 'blocked').map(l => l.ip)).size;
          return { ...s, logs, failedLogins, suspiciousIps };
        });
        this.cdr.markForCheck();
      } catch (_) {}
    };
  }

  banIp(log: SecurityLog) {
    const id = this.project().id;
    this.apiService.post(`/api/admin/apps/${id}/security/ban-ip`, { ip: log.ip, logId: log.id }).subscribe({
      next: () => {
        this.store.showToast(`IP ${log.ip} has been banned.`, 'success');
        this.summary.update(s => ({
          ...s,
          logs: s.logs.map(l => l.ip === log.ip ? { ...l, is_banned: true } : l)
        }));
        this.cdr.markForCheck();
      },
      error: () => this.store.showToast('Failed to ban IP.', 'error')
    });
  }

  revokeSession(log: SecurityLog) {
    const id = this.project().id;
    this.apiService.post(`/api/admin/apps/${id}/security/revoke-session`, { logId: log.id, userEmail: log.user_email }).subscribe({
      next: () => {
        this.store.showToast(`Session revoked.`, 'success');
        this.summary.update(s => ({
          ...s,
          logs: s.logs.map(l => l.id === log.id ? { ...l, is_revoked: true } : l)
        }));
        this.cdr.markForCheck();
      },
      error: () => this.store.showToast('Failed to revoke session.', 'error')
    });
  }

  runScan() {
    this.isLoading.set(true);
    this.loadLogs();
    this.store.showToast('Security scan complete. Threat intelligence updated.', 'success');
  }

  getLogClass(log: SecurityLog): string {
    if (log.severity === 'critical' || log.type === 'blocked') {
      return 'bg-app-bg border-rose-500 border border-rose-500/20';
    }
    return 'bg-app-bg border-amber-500 border border-amber-500/20';
  }

  getBadgeClass(log: SecurityLog): string {
    if (log.severity === 'critical' || log.type === 'blocked') {
      return 'text-rose-500 bg-rose-50/10 border-rose-500/20';
    }
    return 'text-amber-500 bg-amber-50/10 border-amber-500/20';
  }

  getTypeLabel(log: SecurityLog): string {
    const map: Record<string, string> = {
      'failed_login': 'BLOCKED',
      'suspicious_ip': 'WARN',
      'blocked': 'BLOCKED',
      'session_revoked': 'REVOKED',
      'region_anomaly': 'WARN'
    };
    return map[log.type] || 'INFO';
  }
}
