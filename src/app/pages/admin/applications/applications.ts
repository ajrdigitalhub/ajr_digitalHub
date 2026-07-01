import { Component, ChangeDetectionStrategy, inject, signal, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminStoreService } from '../../../services/admin-store.service';
import { ApiService } from '../../../services/api.service';
import { AjrAdminAppCard } from '../admin-components';
import { AdminApp } from '../../../services/admin-master.service';
import { ButtonLoaderDirective } from '../../../shared/button-loader.directive';

@Component({
  selector: 'app-applications-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatIconModule, AjrAdminAppCard, ButtonLoaderDirective],
  template: `
    <div class="space-y-6">
      
      <!-- Top Bar Title & Button -->
      <div class="flex justify-between items-center bg-app-card dark:bg-app-bg border border-app-border  p-6 rounded-2xl shadow-sm">
        <div>
          <h2 class="text-xl font-bold text-app-text ">Managed Applications</h2>
          <p class="text-xs text-app-muted mt-1">Ecosystem-wide deployment status and core credentials.</p>
        </div>
        <button id="btn-provision-modal" (click)="isModalOpen.set(true)" class="bg-indigo-600 hover:bg-indigo-500 text-app-text px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition flex items-center gap-2">
          <mat-icon class="!w-[18px] !h-[18px] !text-[18px]">add</mat-icon> Provision App
        </button>
      </div>

      <!-- Apps Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        @if (isLoadingApps()) {
          <div class="col-span-2 text-center text-app-muted italic py-10">Loading applications...</div>
        } @else {
          @for (app of apps(); track app.id) {
            <ajr-admin-app-card [app]="app" (selectApp)="onAppSelected($event)"></ajr-admin-app-card>
          }
        }
      </div>

      <!-- Add Project Modal -->
      @if (isModalOpen()) {
        <div class="fixed inset-0 z-50 overflow-y-auto font-sans flex items-center justify-center p-4 bg-app-bg/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div class="bg-app-card dark:bg-app-bg border border-app-border  rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 class="text-lg font-bold text-app-text  mb-4">Provision New Application</h3>
            
            <form (ngSubmit)="onFormSubmit()" class="space-y-4">
              <div>
                <label for="new-app-name" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-1">App Name</label>
                <input id="new-app-name" type="text" [(ngModel)]="newApp.name" name="name" required class="w-full px-4 py-2 bg-app-bg dark:bg-app-card border border-app-border  rounded-xl text-sm text-app-text  outline-none focus:ring-2 focus:ring-indigo-500">
              </div>

              <div>
                <label for="new-app-domain" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-1">Domain URL</label>
                <input id="new-app-domain" type="text" [(ngModel)]="newApp.domain" name="domain" required class="w-full px-4 py-2 bg-app-bg dark:bg-app-card border border-app-border  rounded-xl text-sm text-app-text  outline-none focus:ring-2 focus:ring-indigo-500 font-mono">
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="new-app-env" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-1">Env</label>
                  <select id="new-app-env" [(ngModel)]="newApp.environment" name="environment" class="w-full px-4 py-2 bg-app-bg dark:bg-app-card border border-app-border  rounded-xl text-sm text-app-text  outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="Production">Production</option>
                    <option value="Staging">Staging</option>
                    <option value="Sandbox">Sandbox</option>
                  </select>
                </div>
                <div>
                  <label for="new-app-plan" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-1">Plan</label>
                  <select id="new-app-plan" [(ngModel)]="newApp.plan" name="plan" class="w-full px-4 py-2 bg-app-bg dark:bg-app-card border border-app-border  rounded-xl text-sm text-app-text  outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="Lite">Lite</option>
                    <option value="Standard">Standard</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <!-- Firebase Optional Configurations -->
              <div class="border-t border-app-border pt-4 mt-2">
                <span class="block text-xs font-bold uppercase tracking-wider text-orange-500 mb-2 flex items-center gap-1.5">
                  <mat-icon class="!w-4 !h-4 !text-[16px]">sync</mat-icon> Firebase Integration (Optional)
                </span>
              </div>

              <div>
                <label for="new-app-fb-project" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-1">Project ID</label>
                <input id="new-app-fb-project" type="text" [(ngModel)]="newApp.firebase_project_id" name="firebase_project_id" class="w-full px-4 py-2 bg-app-bg dark:bg-app-card border border-app-border rounded-xl text-sm text-app-text outline-none focus:ring-2 focus:ring-orange-500 font-mono">
              </div>

              <div>
                <label for="new-app-fb-key" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-1">API Key</label>
                <input id="new-app-fb-key" type="password" [(ngModel)]="newApp.firebase_api_key" name="firebase_api_key" class="w-full px-4 py-2 bg-app-bg dark:bg-app-card border border-app-border rounded-xl text-sm text-app-text outline-none focus:ring-2 focus:ring-orange-500 font-mono">
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="new-app-fb-domain" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-1">Auth Domain</label>
                  <input id="new-app-fb-domain" type="text" [(ngModel)]="newApp.firebase_auth_domain" name="firebase_auth_domain" class="w-full px-4 py-2 bg-app-bg dark:bg-app-card border border-app-border rounded-xl text-sm text-app-text outline-none focus:ring-2 focus:ring-orange-500 font-mono text-[11px]">
                </div>
                <div>
                  <label for="new-app-fb-bucket" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-1">Bucket</label>
                  <input id="new-app-fb-bucket" type="text" [(ngModel)]="newApp.firebase_storage_bucket" name="firebase_storage_bucket" class="w-full px-4 py-2 bg-app-bg dark:bg-app-card border border-app-border rounded-xl text-sm text-app-text outline-none focus:ring-2 focus:ring-orange-500 font-mono text-[11px]">
                </div>
              </div>

              <div>
                <label for="new-app-fb-id" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-1">App ID</label>
                <input id="new-app-fb-id" type="text" [(ngModel)]="newApp.firebase_app_id" name="firebase_app_id" class="w-full px-4 py-2 bg-app-bg dark:bg-app-card border border-app-border rounded-xl text-sm text-app-text outline-none focus:ring-2 focus:ring-orange-500 font-mono text-[11px]">
              </div>

              <div class="pt-4 flex justify-end gap-3 border-t border-app-border">
                <button type="button" (click)="isModalOpen.set(false)" class="px-4 py-2 border border-app-border  rounded-xl text-sm font-semibold text-app-muted dark:text-app-muted hover:bg-app-bg dark:hover:bg-app-card transition">
                  Cancel
                </button>
                <button id="btn-submit-app" type="submit" [disabled]="!newApp.name || !newApp.domain" [appButtonLoader]="store.isLoading()" class="px-5 py-2 bg-indigo-600 text-app-text rounded-xl text-sm font-bold hover:bg-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed">
                  Deploy Instance
                </button>
              </div>
            </form>
          </div>
        </div>
      }

    </div>
  `
})
export class ApplicationsListComponent implements OnInit {
  store = inject(AdminStoreService);
  apiService = inject(ApiService);
  appSelected = output<any>();
  isModalOpen = signal<boolean>(false);
  isLoadingApps = signal(true);
  isProvisioning = signal(false);
  apps = signal<any[]>([]);

  newApp = {
    name: '',
    domain: '',
    environment: 'Staging' as 'Production' | 'Staging' | 'Sandbox',
    plan: 'Standard' as 'Lite' | 'Standard' | 'Enterprise',
    firebase_project_id: '',
    firebase_api_key: '',
    firebase_auth_domain: '',
    firebase_storage_bucket: '',
    firebase_app_id: '',
    firebase_measurement_id: ''
  };

  ngOnInit() {
    this.loadApps();
  }

  loadApps() {
    this.isLoadingApps.set(true);
    this.apiService.get<any[]>('/admin/apps').subscribe({
      next: (res) => {
        const mapped = res.map((app: any) => ({
          ...app,
          firebase_config: app.firebase_config || null,
          billing: app.billing || { plan: app.plan || 'Pro Plan', currentSpend: 0, estimatedSpend: 0, apiCalls: 0, apiLimit: 100000, storageGb: 0, storageLimit: 50 }
        }));
        this.apps.set(mapped);
        this.isLoadingApps.set(false);

        // Fetch detailed real-time data for each app in parallel
        mapped.forEach((app: any) => {
          // 1. Fetch detail usage
           this.apiService.get<any>(`/admin/apps/${app.id}`).subscribe({
            next: (detail) => {
              this.apps.update(list => list.map(a => {
                if (a.id === app.id) {
                  return {
                    ...a,
                    ...detail,
                    apiUsage: detail.apiUsage || a.apiUsage || 0,
                    billing: detail.billing || a.billing,
                    firebase_config: detail.firebase_config || null
                  };
                }
                return a;
              }));

              if (detail.firebase_config && detail.firebase_config.projectId) {
                this.apiService.get<any>(`/admin/apps/${app.id}/firebase/billing`).subscribe({
                  next: (firebaseBilling) => {
                    this.apps.update(list => list.map(a => {
                      if (a.id === app.id) {
                        return { ...a, firebaseBilling };
                      }
                      return a;
                    }));
                  },
                  error: (err) => console.warn(`Could not fetch Firebase billing for list app ${app.id}`)
                });
              }
            }
          });

          // 2. Fetch WhatsApp realtime billing summary
          this.apiService.get<any>(`/api/admin/apps/${app.id}/whatsapp/realtime-summary?days=90`).subscribe({
            next: (waSummary) => {
              this.apps.update(list => list.map(a => {
                if (a.id === app.id) {
                  return { ...a, waSummary };
                }
                return a;
              }));
            }
          });
        });
      },
      error: (err) => {
        this.store.showToast('Failed to load apps', 'error');
        this.isLoadingApps.set(false);
      }
    });
  }

  onAppSelected(app: AdminApp) {
    this.appSelected.emit(app);
  }

  onFormSubmit() {
    if (this.newApp.name && this.newApp.domain) {
      this.isProvisioning.set(true);
      this.apiService.post<any>('/admin/apps/provision', this.newApp).subscribe({
        next: (res) => {
          this.store.showToast('Application successfully provisioned!', 'success');
          this.loadApps();
          // Reset & close
          this.newApp = {
            name: '',
            domain: '',
            environment: 'Staging',
            plan: 'Standard',
            firebase_project_id: '',
            firebase_api_key: '',
            firebase_auth_domain: '',
            firebase_storage_bucket: '',
            firebase_app_id: '',
            firebase_measurement_id: ''
          };
          this.isModalOpen.set(false);
          this.isProvisioning.set(false);
        },
        error: (err) => {
          this.store.showToast('Provisioning failed: ' + (err.error?.message || err.message), 'error');
          this.isProvisioning.set(false);
        }
      });
    }
  }
}
