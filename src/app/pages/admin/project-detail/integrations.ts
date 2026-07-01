import { Component, ChangeDetectionStrategy, input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ProjectData } from '../../../services/project-detail.service';
import { AdminCloudService } from '../../../services/admin-cloud.service';
import { AdminStoreService } from '../../../services/admin-store.service';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-project-integrations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10 max-w-5xl space-y-6">
        <h2 class="text-2xl font-bold text-app-text flex items-center gap-2">
           <mat-icon class="text-indigo-400">extension</mat-icon> Extensions & Service Integrations
        </h2>
        
        <h3 class="text-xs font-bold text-app-muted uppercase tracking-widest mb-4">Installed Plugins</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
           @for (plugin of project().plugins; track plugin.id) {
              <div class="bg-app-bg border border-app-border rounded-xl p-5 flex items-center justify-between shadow-sm">
                 <div class="flex gap-4 items-center">
                    <div class="w-12 h-12 bg-app-bg rounded-xl flex items-center justify-center border border-app-border shadow-inner">
                       <mat-icon class="text-indigo-400">extension</mat-icon>
                    </div>
                    <div>
                       <div class="text-sm font-bold text-app-text">{{ plugin.name }}</div>
                       <div class="text-xs text-app-muted mt-0.5">{{ plugin.type }} • <span class="text-emerald-400">{{ plugin.status }}</span></div>
                    </div>
                 </div>
                 <label [for]="'chk-plugin-' + plugin.id" class="relative inline-flex items-center cursor-pointer">
                    <input [id]="'chk-plugin-' + plugin.id" type="checkbox" [(ngModel)]="plugin.enabled" (change)="savePlugin(plugin)" class="sr-only peer">
                    <div class="w-9 h-5 bg-app-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-app-card after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                 </label>
              </div>
           }
        </div>

        <h3 class="text-xs font-bold text-app-muted uppercase tracking-widest mt-8 mb-4">Core Communications Services</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
           <!-- WhatsApp -->
           <div class="bg-app-bg border border-app-border rounded-xl flex flex-col shadow-sm">
              <div class="p-5 border-b border-app-border flex items-center justify-between">
                 <h3 class="text-lg font-bold text-app-text flex items-center gap-2">
                    <mat-icon class="text-emerald-500">chat</mat-icon> WhatsApp Gateway
                 </h3>
                 <label for="chk-wa-enabled" class="relative inline-flex items-center cursor-pointer">
                    <input id="chk-wa-enabled" type="checkbox" [(ngModel)]="cloudService.state().whatsapp.enabled" (change)="onGatewayToggle('WhatsApp', cloudService.state().whatsapp.enabled)" class="sr-only peer">
                    <div class="w-9 h-5 bg-app-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-app-card after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                 </label>
              </div>
              <div class="p-5 space-y-4 flex-grow transition-opacity" [class.opacity-40]="!cloudService.state().whatsapp.enabled">
                 <div>
                    <label for="p-wa-token" class="block text-xs text-app-muted mb-1">Access Token</label>
                    <input id="p-wa-token" type="password" [(ngModel)]="cloudService.state().whatsapp.token" [disabled]="!cloudService.state().whatsapp.enabled" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded text-app-text font-mono text-sm outline-none focus:border-emerald-500/50">
                 </div>
                 <div>
                    <label for="p-wa-phone" class="block text-xs text-app-muted mb-1">Phone Number ID</label>
                    <input id="p-wa-phone" type="text" [(ngModel)]="cloudService.state().whatsapp.phoneId" [disabled]="!cloudService.state().whatsapp.enabled" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded text-app-text font-mono text-sm outline-none focus:border-emerald-500/50">
                 </div>
                 <div class="pt-2">
                    <button (click)="saveWhatsappConfig()" [disabled]="!cloudService.state().whatsapp.enabled || isSavingWa()" class="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border border-emerald-500">
                       @if (isSavingWa()) {
                          <mat-icon class="!w-3 !h-3 !text-[12px] animate-spin">sync</mat-icon>
                       }
                       {{ isSavingWa() ? 'Saving WhatsApp Settings...' : 'Save WhatsApp Configuration' }}
                    </button>
                 </div>
              </div>
           </div>

           <!-- Email -->
           <div class="bg-app-bg border border-app-border rounded-xl flex flex-col shadow-sm">
              <div class="p-5 border-b border-app-border flex items-center justify-between">
                 <h3 class="text-lg font-bold text-app-text flex items-center gap-2">
                    <mat-icon class="text-indigo-400">mail</mat-icon> SMTP Relay
                 </h3>
                 <label for="chk-email-enabled" class="relative inline-flex items-center cursor-pointer">
                    <input id="chk-email-enabled" type="checkbox" [(ngModel)]="cloudService.state().email.enabled" (change)="onGatewayToggle('SMTP', cloudService.state().email.enabled)" class="sr-only peer">
                    <div class="w-9 h-5 bg-app-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-app-card after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500 shadow-inner"></div>
                 </label>
              </div>
              <div class="p-5 space-y-4 flex-grow transition-opacity" [class.opacity-40]="!cloudService.state().email.enabled">
                 <div>
                    <label for="p-smtp-host" class="block text-xs text-app-muted mb-1">SMTP Host</label>
                    <input id="p-smtp-host" type="text" [(ngModel)]="cloudService.state().email.host" [disabled]="!cloudService.state().email.enabled" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded text-app-text font-mono text-sm outline-none focus:border-indigo-500/50">
                 </div>
                 <div class="flex gap-4">
                    <div class="w-1/2">
                       <label for="p-smtp-user" class="block text-xs text-app-muted mb-1">Username</label>
                       <input id="p-smtp-user" type="text" [(ngModel)]="cloudService.state().email.username" [disabled]="!cloudService.state().email.enabled" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded text-app-text font-mono text-sm outline-none focus:border-indigo-500/50">
                    </div>
                    <div class="w-1/2">
                       <label for="p-smtp-pass" class="block text-xs text-app-muted mb-1">Password</label>
                       <input id="p-smtp-pass" type="password" [(ngModel)]="smtpPassword" [disabled]="!cloudService.state().email.enabled" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded text-app-text font-mono text-sm outline-none focus:border-indigo-500/50" placeholder="••••••••">
                    </div>
                 </div>
                 <div class="flex gap-4">
                    <div class="w-full">
                       <label for="p-smtp-port" class="block text-xs text-app-muted mb-1">Port</label>
                       <input id="p-smtp-port" type="number" [(ngModel)]="cloudService.state().email.port" [disabled]="!cloudService.state().email.enabled" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded text-app-text font-mono text-sm outline-none focus:border-indigo-500/50">
                    </div>
                 </div>
                 <div class="pt-2">
                    <button (click)="saveEmailConfig()" [disabled]="!cloudService.state().email.enabled || isSavingEmail()" class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border border-indigo-500">
                       @if (isSavingEmail()) {
                          <mat-icon class="!w-3 !h-3 !text-[12px] animate-spin">sync</mat-icon>
                       }
                       {{ isSavingEmail() ? 'Saving SMTP Settings...' : 'Save SMTP Configuration' }}
                    </button>
                 </div>
              </div>
           </div>
        </div>

        <h3 class="text-xs font-bold text-app-muted uppercase tracking-widest mt-8 mb-4">Enterprise Data Synchronization</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
           <!-- Firebase Firestore Sync -->
           <div class="bg-app-bg border border-app-border rounded-xl flex flex-col shadow-sm">
              <div class="p-5 border-b border-app-border flex items-center justify-between">
                 <h3 class="text-lg font-bold text-app-text flex items-center gap-2">
                    <mat-icon class="text-orange-500">sync</mat-icon> Firebase Firestore Sync
                 </h3>
                 <label for="chk-firebase-sync-enabled" class="relative inline-flex items-center cursor-pointer">
                    <input id="chk-firebase-sync-enabled" type="checkbox" [(ngModel)]="firebaseSyncEnabled" class="sr-only peer">
                    <div class="w-9 h-5 bg-app-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-app-card after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500 shadow-inner"></div>
                 </label>
              </div>
              <div class="p-5 space-y-4 flex-grow transition-opacity" [class.opacity-40]="!firebaseSyncEnabled">
                 <div>
                    <label for="p-firebase-collection" class="block text-xs text-app-muted mb-1">Target Firestore Collection</label>
                    <input id="p-firebase-collection" type="text" [(ngModel)]="firebaseCollection" [disabled]="!firebaseSyncEnabled" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded text-app-text font-mono text-sm outline-none focus:border-orange-500/50" placeholder="e.g. edge_apps">
                 </div>
                 <div class="pt-2">
                    <button (click)="triggerFirebaseSync()" [disabled]="!firebaseSyncEnabled || isSyncing()" class="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border border-orange-500">
                       @if (isSyncing()) {
                          <mat-icon class="!w-4 !h-4 !text-[16px] animate-spin">sync</mat-icon>
                       }
                       {{ isSyncing() ? 'Synchronizing Workspace...' : 'Sync Database to Firebase' }}
                    </button>
                 </div>
              </div>
           </div>
        </div>
    </div>
  `
})
export class ProjectIntegrationsComponent {
  project = input.required<ProjectData>();
  cloudService = inject(AdminCloudService);
  store = inject(AdminStoreService);
  api = inject(ApiService);

  firebaseSyncEnabled = false;
  firebaseCollection = 'edge_apps';
  isSyncing = signal(false);

  isSavingWa = signal(false);
  isSavingEmail = signal(false);
  smtpPassword = '';

  savePlugin(plugin: any) {
    this.store.showToast(`Plugin '${plugin.name}' status updated to ${plugin.enabled ? 'Enabled' : 'Disabled'}!`, 'info');
  }

  onGatewayToggle(gatewayType: string, isEnabled: boolean) {
    this.store.showToast(`Communications portal gateway for ${gatewayType} ${isEnabled ? 'opened' : 'closed'}!`, isEnabled ? 'success' : 'info');
    
    // Auto sync toggle state in DB
    const serviceType = gatewayType === 'WhatsApp' ? 'whatsapp' : 'email';
    this.api.post<any>(`/admin/apps/${this.project().id}/services/toggle`, { service: serviceType, enabled: isEnabled }).subscribe({
      next: () => {
        // Update local project model
        const currentProject = this.project();
        if (currentProject) {
          if (serviceType === 'whatsapp' && currentProject.whatsapp) {
            currentProject.whatsapp.enabled = isEnabled;
          } else if (serviceType === 'email' && currentProject.email) {
            currentProject.email.enabled = isEnabled;
          }
        }
      }
    });
  }

  saveWhatsappConfig() {
    this.isSavingWa.set(true);
    const wa = this.cloudService.state().whatsapp;
    const payload = {
      phone_number: wa.phoneId,
      api_key: wa.token,
      enabled: wa.enabled
    };
    
    this.api.post<any>(`/admin/apps/${this.project().id}/whatsapp-config`, payload).subscribe({
      next: (res) => {
        this.isSavingWa.set(false);
        this.store.showToast('WhatsApp gateway settings updated in database!', 'success');
        
        // Update local project model
        const currentProject = this.project();
        if (currentProject) {
          currentProject.whatsapp = {
            phone_number: payload.phone_number,
            api_key: payload.api_key,
            enabled: payload.enabled
          };
        }
      },
      error: (err) => {
        this.isSavingWa.set(false);
        this.store.showToast(err.error?.error || err.message || 'Failed to save WhatsApp config.', 'error');
      }
    });
  }

  saveEmailConfig() {
    this.isSavingEmail.set(true);
    const email = this.cloudService.state().email;
    const payload = {
      smtp_host: email.host,
      smtp_port: email.port,
      user: email.username,
      pass: this.smtpPassword || '',
      enabled: email.enabled
    };

    this.api.post<any>(`/admin/apps/${this.project().id}/email-config`, payload).subscribe({
      next: (res) => {
        this.isSavingEmail.set(false);
        this.store.showToast('SMTP Relay relay parameters saved to database!', 'success');
        
        // Update local project model
        const currentProject = this.project();
        if (currentProject) {
          currentProject.email = {
            smtp_host: payload.smtp_host,
            smtp_port: payload.smtp_port,
            user: payload.user,
            pass: payload.pass,
            enabled: payload.enabled
          };
        }
      },
      error: (err) => {
        this.isSavingEmail.set(false);
        this.store.showToast(err.error?.error || err.message || 'Failed to save SMTP relay settings.', 'error');
      }
    });
  }

  triggerFirebaseSync() {
    this.isSyncing.set(true);
    this.api.post<any>(`/admin/apps/${this.project().id}/firebase-sync`, { collectionName: this.firebaseCollection }).subscribe({
      next: (res: any) => {
        this.isSyncing.set(false);
        this.store.showToast(res.message || 'Firebase Live synchronization complete!', 'success');
      },
      error: (err: any) => {
        this.isSyncing.set(false);
        this.store.showToast(err.error?.error || err.message || 'Failed to sync with Firebase gateway.', 'error');
      }
    });
  }
}
