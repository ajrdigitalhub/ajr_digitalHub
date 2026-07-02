import { Component, ChangeDetectionStrategy, input, inject, signal, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ProjectData } from '../../../services/project-detail.service';
import { ApiService } from '../../../services/api.service';
import { AdminStoreService } from '../../../services/admin-store.service';
import { environment } from '../../../../environments/environment';

interface Deployment {
  id: string;
  version: string;
  status: 'deploying' | 'success' | 'failed' | 'pending' | string;
  commit_id: string;
  branch: string;
  deployed_by: string;
  logs: string;
  progress: number;
  started_at: string;
  finished_at?: string;
  created_at: string;
}

interface LogLine {
  line: string;
  color: 'muted' | 'green' | 'indigo' | 'red' | string;
  progress?: number;
  done?: boolean;
}

@Component({
  selector: 'app-project-deployments',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-4xl space-y-6">
      <!-- Header -->
      <div class="flex justify-between items-center bg-app-bg border border-app-border p-5 rounded-2xl">
        <div>
          <h2 class="text-2xl font-bold text-app-text flex items-center gap-2">
            <mat-icon class="text-indigo-400">cloud_upload</mat-icon> Artifact Deployment Pipeline
          </h2>
          <p class="text-xs text-app-muted mt-1">Continuous integration & real-time server cluster builds.</p>
        </div>
        <button (click)="triggerDeploy()" [disabled]="isDeploying()"
          class="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-app-text px-5 py-2.5 rounded-lg text-sm font-bold shadow-md transition flex items-center gap-2">
          @if (isDeploying()) {
            <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          } @else {
            <mat-icon class="!w-4 !h-4 !text-[16px]">file_upload</mat-icon>
          }
          {{ isDeploying() ? 'Deploying...' : 'Manual Deploy' }}
        </button>
      </div>

      <!-- Deployments List -->
      <div class="space-y-4">
        @if (isLoading()) {
          @for (i of [1,2,3]; track i) {
            <div class="h-20 bg-app-bg border border-app-border rounded-xl animate-pulse"></div>
          }
        } @else if (deployments().length === 0) {
          <div class="p-10 text-center text-app-muted bg-app-bg border border-dashed border-app-border rounded-xl">
            <mat-icon class="!w-10 !h-10 !text-[40px] opacity-20 mb-2">rocket_launch</mat-icon>
            <div class="text-sm">No deployments yet. Click "Manual Deploy" to start.</div>
          </div>
        } @else {
          @for (dep of deployments(); track dep.id) {
            <div class="p-5 border border-app-border rounded-xl bg-app-bg flex items-center justify-between hover:bg-app-card/50 transition cursor-pointer shadow-sm relative overflow-hidden group">
              <!-- Status stripe -->
              @if (dep.status === 'deploying') {
                <div class="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 animate-pulse"></div>
              } @else if (dep.status === 'success') {
                <div class="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
              } @else {
                <div class="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 opacity-50"></div>
              }
              
              <div class="pl-2">
                <div class="flex items-center gap-3 mb-1.5">
                  <span class="font-mono font-bold text-app-text text-lg tracking-tight">{{ dep.version }}</span>
                  <span class="text-xs bg-app-bg px-2.5 py-0.5 rounded text-app-muted border border-app-border tabular-nums">
                    {{ dep.created_at | date:'MMM d, h:mm a' }}
                  </span>
                </div>
                <div class="text-xs text-app-muted mt-1">
                  {{ dep.branch }} branch • Commit 
                  <span class="font-mono text-app-muted bg-app-bg px-1 rounded border border-app-border">{{ dep.commit_id }}</span>
                  @if (dep.deployed_by) {
                    • by <span class="text-indigo-400">{{ dep.deployed_by }}</span>
                  }
                </div>
                @if (dep.status === 'deploying') {
                  <div class="mt-3">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-[10px] text-amber-400 font-mono">{{ dep.progress || 0 }}%</span>
                      <span class="text-[10px] text-app-muted font-mono">Building...</span>
                    </div>
                    <div class="w-64 h-1.5 bg-app-bg rounded-full overflow-hidden border border-app-border shadow-inner">
                      <div class="h-full bg-gradient-to-r from-amber-400 to-indigo-500 transition-all duration-500 animate-pulse"
                           [style.width.%]="dep.progress || 10"></div>
                    </div>
                  </div>
                }
              </div>
              
              <div class="flex items-center gap-3">
                <span class="text-[10px] uppercase font-bold tracking-widest mr-4"
                      [ngClass]="{
                        'text-emerald-400': dep.status === 'success',
                        'text-amber-400': dep.status === 'deploying',
                        'text-rose-400': dep.status === 'failed'
                      }">{{ dep.status }}</span>
                <button (click)="viewLogs(dep)" 
                  class="px-3 py-1.5 bg-app-bg border border-app-border text-app-text rounded text-xs font-bold hover:bg-app-card transition shadow-sm">
                  View Logs
                </button>
              </div>
            </div>
          }
        }
      </div>

      <!-- Real-time Log Terminal -->
      @if (activeDeployment()) {
        <div class="bg-[#0a0a0f] border border-app-border rounded-xl p-5 shadow-lg space-y-3 font-mono text-xs text-app-text animate-in slide-in-from-bottom duration-250">
          <div class="flex items-center justify-between border-b border-app-border pb-2.5">
            <span class="font-bold flex items-center gap-2">
              <div class="w-2 h-2 rounded-full" [class]="isDeploying() ? 'bg-amber-400 animate-pulse' : 'bg-indigo-500'"></div>
              logs: {{ activeDeployment()?.version }}
            </span>
            <button (click)="closeTerminal()" class="text-app-muted hover:text-app-text transition">
              <mat-icon class="!w-4 !h-4 !text-[16px]">close</mat-icon>
            </button>
          </div>
          <div class="h-52 overflow-y-auto space-y-0.5 custom-scrollbar bg-black/20 p-3 rounded border border-app-border/50 leading-relaxed tabular-nums" id="deploy-log-terminal">
            @for (line of logLines(); track $index) {
              <div [class]="getLineClass(line.color)">{{ line.line }}</div>
            }
            @if (isDeploying()) {
              <div class="text-app-muted animate-pulse">▌</div>
            } @else if (logLines().length === 0) {
              <span class="text-app-muted">Fetching logs...</span>
            }
          </div>
        </div>
      }

      <style>
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.15); border-radius: 10px; }
      </style>
    </div>
  `
})
export class ProjectDeploymentsComponent implements OnInit, OnDestroy {
  project = input.required<ProjectData>();
  apiService = inject(ApiService);
  store = inject(AdminStoreService);
  cdr = inject(ChangeDetectorRef);

  deployments = signal<Deployment[]>([]);
  isLoading = signal(true);
  isDeploying = signal(false);
  activeDeployment = signal<Deployment | null>(null);
  logLines = signal<LogLine[]>([]);

  private logSse?: EventSource;
  private depSse?: EventSource;

  ngOnInit() {
    this.loadDeployments();
    this.startDeploymentStream();
  }

  ngOnDestroy() {
    this.logSse?.close();
    this.depSse?.close();
  }

  loadDeployments() {
    const id = this.project().id;
    this.apiService.get<Deployment[]>(`/api/admin/apps/${id}/deployments`).subscribe({
      next: (data) => {
        this.deployments.set(Array.isArray(data) ? data : []);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  startDeploymentStream() {
    const id = this.project().id;
    const baseUrl = environment.apiUrl || 'http://localhost:3000';
    this.depSse = new EventSource(`${baseUrl}/api/admin/apps/${id}/deployments/live-stream`);

    this.depSse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'heartbeat') return;

        // Update deployment in list
        this.deployments.update(deps => {
          const idx = deps.findIndex(d => d.id === data.deploymentId);
          if (idx >= 0) {
            const updated = [...deps];
            updated[idx] = { ...updated[idx], status: data.status, progress: data.progress };
            return updated;
          }
          return deps;
        });

        // Update isDeploying signal
        const isAnyDeploying = this.deployments().some(d => d.status === 'deploying');
        this.isDeploying.set(isAnyDeploying);

        // Reload if a deployment just completed
        if (data.status === 'success' || data.status === 'failed') {
          this.loadDeployments();
        }

        this.cdr.markForCheck();
      } catch (_) {}
    };
  }

  triggerDeploy() {
    const id = this.project().id;
    this.isDeploying.set(true);
    this.logLines.set([]);

    this.apiService.post<{ success: boolean; deploymentId: string; version: string; commitId: string }>(
      `/api/admin/apps/${id}/deployments/trigger`, {}
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.store.showToast(`Deployment ${res.version} initiated`, 'success');
          // Add optimistic entry
          const optimistic: Deployment = {
            id: res.deploymentId,
            version: res.version,
            status: 'deploying',
            commit_id: res.commitId,
            branch: 'main',
            deployed_by: 'Admin',
            logs: '',
            progress: 0,
            started_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          };
          this.deployments.update(deps => [optimistic, ...deps]);
          this.activeDeployment.set(optimistic);
          this.cdr.markForCheck();
          this.streamDeploymentLogs(id, res.deploymentId);
        }
      },
      error: () => {
        this.isDeploying.set(false);
        this.store.showToast('Deployment trigger failed', 'error');
        this.cdr.markForCheck();
      }
    });
  }

  viewLogs(dep: Deployment) {
    this.activeDeployment.set(dep);
    this.logLines.set([]);
    this.cdr.markForCheck();
    this.streamDeploymentLogs(this.project().id, dep.id);
  }

  closeTerminal() {
    this.activeDeployment.set(null);
    this.logLines.set([]);
    this.logSse?.close();
    this.cdr.markForCheck();
  }

  streamDeploymentLogs(appId: string, depId: string) {
    this.logSse?.close();
    const baseUrl = environment.apiUrl || 'http://localhost:3000';
    this.logSse = new EventSource(`${baseUrl}/api/admin/apps/${appId}/deployments/${depId}/logs`);

    this.logSse.onmessage = (event) => {
      try {
        const data: LogLine = JSON.parse(event.data);
        if (data.line) {
          this.logLines.update(lines => [...lines, data]);
          this.cdr.markForCheck();
          // Auto-scroll terminal
          setTimeout(() => {
            const el = document.getElementById('deploy-log-terminal');
            if (el) el.scrollTop = el.scrollHeight;
          }, 50);
        }
        if (data.done) {
          this.isDeploying.set(false);
          this.cdr.markForCheck();
        }
        if (data.progress !== undefined) {
          this.deployments.update(deps => deps.map(d =>
            d.id === depId ? { ...d, progress: data.progress! } : d
          ));
        }
      } catch (_) {}
    };
  }

  getLineClass(color: string): string {
    const map: Record<string, string> = {
      'green': 'text-emerald-400',
      'indigo': 'text-indigo-400',
      'red': 'text-rose-400',
      'muted': 'text-app-muted'
    };
    return map[color] || 'text-app-muted';
  }
}
