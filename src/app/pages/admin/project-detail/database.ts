import { Component, ChangeDetectionStrategy, input, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ProjectData } from '../../../services/project-detail.service';
import { AdminCloudService } from '../../../services/admin-cloud.service';
import { AdminStoreService } from '../../../services/admin-store.service';
import { ButtonLoaderDirective } from '../../../shared/button-loader.directive';

@Component({
  selector: 'app-project-database',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatIconModule, ButtonLoaderDirective],
  template: `
    <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-5xl space-y-6">
      <h2 class="text-2xl font-bold text-app-text tracking-tight flex items-center gap-2">
         <mat-icon class="text-indigo-500">storage</mat-icon> Database Management & Backups
      </h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
         <!-- Topology Config -->
         <div class="bg-app-bg border border-app-border rounded-xl p-6 shadow-sm">
           <h3 class="text-sm font-bold text-app-text mb-4 uppercase tracking-wider">Connection Topology</h3>
           <div class="space-y-4">
              <div>
                 <label for="p-db-pool" class="block text-xs text-app-muted mb-1">Max Pool Size</label>
                 <input id="p-db-pool" type="number" [(ngModel)]="cloudService.state().dbConfig.poolSize" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded text-app-text font-mono text-sm outline-none focus:border-indigo-500">
              </div>
              <div>
                 <label for="p-db-timeout" class="block text-xs text-app-muted mb-1">Query Timeout (ms)</label>
                 <input id="p-db-timeout" type="number" [(ngModel)]="cloudService.state().dbConfig.timeout" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded text-app-text font-mono text-sm outline-none focus:border-indigo-500">
              </div>
              <div class="pt-2">
                <button (click)="testConnection()" [appButtonLoader]="isTesting()" class="w-full py-2.5 bg-app-bg hover:bg-app-card text-app-text border border-app-border rounded-lg text-sm font-bold transition shadow-sm">
                   Simulate Test Connection
                 </button>
              </div>
           </div>
         </div>
         
         <!-- Cluster Load -->
         <div class="bg-app-bg border border-app-border rounded-xl p-6 flex flex-col justify-center items-center text-center shadow-sm">
             <div class="font-mono text-6xl font-black text-indigo-400 mb-2 drop-shadow-md">
               {{ cloudService.state().dbConfig.queryLoad }}%
             </div>
             <div class="text-xs font-bold text-app-muted uppercase tracking-widest mt-1">Current Cluster Load</div>
             <div class="mt-6 text-xs text-app-text flex items-center justify-center gap-4 bg-app-bg px-5 py-2.5 rounded-full border border-app-border shadow-inner">
                <span class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full bg-slate-600"></div>
                  Connections: <strong class="text-app-text">{{ cloudService.state().dbConfig.activeConnections }}</strong>
                </span>
                <span class="w-px h-3 bg-slate-700"></span>
                <span class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                  Health: <strong class="text-emerald-400">Excellent</strong>
                </span>
             </div>
         </div>
      </div>

      <!-- Snapshot Backups -->
      <div class="bg-app-bg border border-app-border rounded-xl p-0 shadow-sm overflow-hidden">
         <div class="px-6 py-4 flex items-center justify-between border-b border-app-border bg-app-bg">
            <h3 class="text-sm font-bold text-app-text uppercase tracking-widest">Snapshot Backups</h3>
            <button (click)="takeBackup()" [appButtonLoader]="isBackingUp()" class="px-4 py-1.5 bg-app-bg border border-app-border text-app-text rounded text-xs font-bold hover:bg-app-card transition flex items-center justify-center gap-2">Take Manual Backup</button>
         </div>
         <table class="w-full text-left">
            <thead class="bg-app-bg border-b border-app-border text-[10px] uppercase tracking-widest text-app-muted">
               <tr>
                  <th class="p-4">Timestamp</th>
                  <th class="p-4">Format</th>
                  <th class="p-4 text-right">Size</th>
                  <th class="p-4 text-center">Status</th>
                  <th class="p-4 text-right border-l border-app-border">Actions</th>
               </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/50">
               @for (backup of backups(); track backup.id) {
                  <tr class="hover:bg-app-card/30 transition-colors">
                     <td class="p-4 text-sm text-app-text font-mono">{{ backup.date | date:'medium' }}</td>
                     <td class="p-4 text-xs text-app-muted">pg_dump (gzip)</td>
                     <td class="p-4 text-sm text-app-muted font-mono text-right">{{ backup.sizeMb }} MB</td>
                     <td class="p-4 text-center">
                        <span class="px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Available</span>
                     </td>
                     <td class="p-4 text-right border-l border-app-border">
                        <button (click)="restoreBackup(backup)" class="text-xs font-bold text-indigo-400 hover:text-indigo-300 mr-4 transition">Restore</button>
                        <button class="text-xs font-bold text-app-muted hover:text-app-text transition">Download</button>
                     </td>
                  </tr>
               }
               @if (backups().length === 0) {
                  <tr><td colspan="5" class="p-8 text-center text-app-muted">No backups found.</td></tr>
               }
            </tbody>
         </table>
      </div>
    </div>
  `
})
export class ProjectDatabaseComponent implements OnInit {
  project = input.required<ProjectData>();
  cloudService = inject(AdminCloudService);
  store = inject(AdminStoreService);

  backups = signal<any[]>([]);
  isTesting = signal(false);
  isBackingUp = signal(false);

  ngOnInit() {
    this.backups.set(this.project().backups || []);
  }

  testConnection() {
    this.isTesting.set(true);
    setTimeout(() => {
      this.isTesting.set(false);
      this.store.showToast('Database connection tested! Ping: 12ms (Success)', 'success');
    }, 1000);
  }

  takeBackup() {
    this.isBackingUp.set(true);
    const newBak = {
      id: 'bak_' + Date.now(),
      date: new Date().toISOString(),
      sizeMb: parseFloat((Math.random() * 100 + 40).toFixed(2))
    };
    this.store.showToast('Automatic database hot-dump initiated...', 'info');
    setTimeout(() => {
      this.backups.update((list: any[]) => [newBak, ...list]);
      this.isBackingUp.set(false);
      this.store.showToast('Manual database snapshot completed successfully!', 'success');
    }, 1500);
  }

  restoreBackup(backup: any) {
    this.store.showToast(`Restoring cluster snapshot from ${new Date(backup.date).toLocaleDateString()}...`, 'info');
    setTimeout(() => {
      this.store.showToast('Database cluster states restored successfully!', 'success');
    }, 1800);
  }
}
