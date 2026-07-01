import { Component, ChangeDetectionStrategy, input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ProjectData } from '../../../services/project-detail.service';
import { AdminStoreService } from '../../../services/admin-store.service';

@Component({
  selector: 'app-project-services',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-5xl space-y-6">
      <div class="flex justify-between items-center">
         <div>
            <h2 class="text-2xl font-bold text-app-text flex items-center gap-2">
               <mat-icon class="text-indigo-500">hive</mat-icon> Provisioned SaaS Modules
            </h2>
            <p class="text-xs text-app-muted mt-1">Activate serverless addons and auxiliary computation networks.</p>
         </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
         @for (srv of addons(); track srv.id) {
            <div class="bg-app-bg border border-app-border rounded-xl p-5 flex flex-col justify-between hover:border-app-border transition">
               <div>
                  <div class="flex justify-between items-start mb-4">
                     <div class="w-10 h-10 rounded-lg bg-app-bg flex items-center justify-center border border-app-border text-indigo-400">
                        <mat-icon>{{ srv.icon }}</mat-icon>
                     </div>
                     <span class="px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider"
                           [class]="srv.status === 'Running' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-app-card text-app-muted'">
                       {{ srv.status }}
                     </span>
                  </div>
                  <h3 class="text-md font-bold text-app-text">{{ srv.name }}</h3>
                  <p class="text-xs text-app-muted mt-1.5 leading-relaxed">{{ srv.desc }}</p>
               </div>

               <div class="mt-6 pt-4 border-t border-slate-850 flex items-center justify-between">
                  <span class="text-xs text-app-muted font-mono">{{ srv.usage }}</span>
                  <button (click)="toggleAddon(srv)" 
                          [class]="srv.status === 'Running' ? 'bg-app-bg hover:bg-app-card border border-app-border text-rose-400 hover:text-rose-300' : 'bg-indigo-600 hover:bg-indigo-500 text-app-text'"
                          class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition">
                     {{ srv.status === 'Running' ? 'Deactivate' : 'Activate' }}
                  </button>
               </div>
            </div>
         }
      </div>
    </div>
  `
})
export class ProjectServicesComponent {
  project = input.required<ProjectData>();
  store = inject(AdminStoreService);

  addons = signal([
    { id: 'srv_1', name: 'Invoice PDF Engine', desc: 'Managed automated invoice compilation and PDF render triggers.', icon: 'picture_as_pdf', status: 'Running', usage: '28.4 GB/mo' },
    { id: 'srv_2', name: 'Dynamic Image Optimizer', desc: 'On-the-fly image scaling, edge optimization and WebP compression.', icon: 'image', status: 'Running', usage: '42.1K req/h' },
    { id: 'srv_3', name: 'WebSockets Event Broker', desc: 'Realtime event streaming hub for multi-agent interactive workflows.', icon: 'bolt', status: 'Stopped', usage: '0 connections' }
  ]);

  toggleAddon(srv: any) {
    const isNowStopped = srv.status === 'Running';
    srv.status = isNowStopped ? 'Stopped' : 'Running';
    srv.usage = isNowStopped ? '0 usage' : 'Ready';
    
    this.store.showToast(
      `Service '${srv.name}' has been ${isNowStopped ? 'deactivated' : 'activated'} successfully!`, 
      isNowStopped ? 'info' : 'success'
    );
  }
}
