import { Component, ChangeDetectionStrategy, input, output, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { ProjectData } from '../../../services/project-detail.service';
import { AdminStoreService } from '../../../services/admin-store.service';
import { ApiService } from '../../../services/api.service';
import { ButtonLoaderDirective } from '../../../shared/button-loader.directive';

@Component({
  selector: 'app-project-config',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatIconModule, ButtonLoaderDirective],
  template: `
    <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-3xl space-y-6">
      <h2 class="text-2xl font-bold text-app-text flex items-center gap-2">
        <mat-icon class="text-indigo-400">settings</mat-icon> Core Configuration
      </h2>
      
      <div class="bg-app-bg border border-app-border rounded-xl p-6 space-y-6">
         <div>
            <label for="p-detail-name" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Application Name</label>
            <input id="p-detail-name" type="text" [(ngModel)]="model.name" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text font-semibold focus:border-indigo-500/50 outline-none transition-all">
         </div>
         <div>
            <label for="p-detail-domain" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Routing Domain</label>
            <input id="p-detail-domain" type="text" [(ngModel)]="model.domain" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-emerald-400 focus:border-indigo-500/50 outline-none transition-all font-mono">
         </div>
         
         <div class="pt-6 border-t border-app-border">
            <div class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-4">Feature Toggles</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
               <label for="chk-marketplace" class="flex items-center justify-between p-3 rounded-lg border border-app-border bg-app-bg hover:bg-app-card cursor-pointer transition">
                  <span class="text-sm font-semibold text-app-text">Marketplace Plugin</span>
                  <input id="chk-marketplace" type="checkbox" [(ngModel)]="model.features.marketplace" class="rounded bg-app-card border-slate-600 text-indigo-500 focus:ring-0 w-4 h-4 cursor-pointer">
               </label>
               <label for="chk-services" class="flex items-center justify-between p-3 rounded-lg border border-app-border bg-app-bg hover:bg-app-card cursor-pointer transition">
                  <span class="text-sm font-semibold text-app-text">Services Directory</span>
                  <input id="chk-services" type="checkbox" [(ngModel)]="model.features.services" class="rounded bg-app-card border-slate-600 text-indigo-500 focus:ring-0 w-4 h-4 cursor-pointer">
               </label>
            </div>
         </div>
      </div>
      
      <div class="flex justify-between items-center mt-6">
         <div class="text-app-muted text-xs">
            Last updated recently.
         </div>
         <button (click)="onSave()" [appButtonLoader]="store.isLoading()" class="bg-indigo-500 hover:bg-indigo-400 text-app-text px-6 py-2 rounded-lg font-bold text-sm transition">
            Save Changes
         </button>
      </div>

      <!-- Firebase Integration Section -->
      <div class="bg-app-bg border border-app-border rounded-xl p-6 space-y-6">
         <h3 class="text-sm font-bold text-app-text flex items-center gap-2">
            <mat-icon class="text-orange-500">sync</mat-icon> Firebase Integration Configuration
         </h3>
         <p class="text-xs text-app-muted">
            Connect this application to its corresponding Firebase project. Dynamic logs, live-streams, and usage counters are routed privately via backend secure APIs.
         </p>
         
         <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
               <label for="fb-project-id" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Project ID</label>
               <input id="fb-project-id" type="text" [(ngModel)]="firebaseModel.projectId" placeholder="e.g. acme-billing-portal" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text focus:border-orange-500/50 outline-none transition-all font-mono">
            </div>
            <div>
               <label for="fb-api-key" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">API Key</label>
               <input id="fb-api-key" type="password" [(ngModel)]="firebaseModel.apiKey" placeholder="AIzaSy..." class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text focus:border-orange-500/50 outline-none transition-all font-mono">
            </div>
         </div>

         <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
               <label for="fb-auth-domain" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Auth Domain</label>
               <input id="fb-auth-domain" type="text" [(ngModel)]="firebaseModel.authDomain" placeholder="e.g. acme-billing-portal.firebaseapp.com" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text focus:border-orange-500/50 outline-none transition-all font-mono">
            </div>
            <div>
               <label for="fb-storage-bucket" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Storage Bucket</label>
               <input id="fb-storage-bucket" type="text" [(ngModel)]="firebaseModel.storageBucket" placeholder="e.g. acme-billing-portal.firebasestorage.app" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text focus:border-orange-500/50 outline-none transition-all font-mono">
            </div>
         </div>

         <div>
            <label for="fb-app-id" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">App ID (Web Application)</label>
            <input id="fb-app-id" type="text" [(ngModel)]="firebaseModel.appId" placeholder="e.g. 1:1234567890:web:abcdef123456" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text focus:border-orange-500/50 outline-none transition-all font-mono">
         </div>

         <div>
            <label for="fb-client-email" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Service Account Client Email</label>
            <input id="fb-client-email" type="text" [(ngModel)]="firebaseModel.client_email" placeholder="firebase-adminsdk-...@...iam.gserviceaccount.com" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text focus:border-orange-500/50 outline-none transition-all font-mono">
         </div>

         <div>
            <label for="fb-private-key" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Service Account Private Key</label>
            <textarea id="fb-private-key" rows="6" [(ngModel)]="firebaseModel.private_key" placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text focus:border-orange-500/50 outline-none transition-all font-mono"></textarea>
         </div>

         <div class="flex gap-4 pt-4 border-t border-app-border">
            <button (click)="onSaveFirebaseConfig()" [appButtonLoader]="isSavingFirebase()" [disabled]="!firebaseModel.projectId || !firebaseModel.apiKey" class="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-app-text rounded-lg text-sm font-bold transition flex items-center gap-2 cursor-pointer border border-orange-500 disabled:opacity-50">
               Save Config
            </button>
            <button (click)="onTestFirebaseConnection()" [disabled]="!firebaseModel.projectId || !firebaseModel.apiKey || isTestingConnection()" class="px-5 py-2.5 bg-app-bg hover:bg-app-card text-app-text border border-app-border rounded-lg text-sm font-bold transition flex items-center gap-2 cursor-pointer">
               <span *ngIf="isTestingConnection()" class="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></span>
               Test Connection
            </button>
         </div>
      </div>

      <!-- WhatsApp Integration Section -->
      <div class="bg-app-bg border border-app-border rounded-xl p-6 space-y-6">
         <h3 class="text-sm font-bold text-app-text flex items-center gap-2">
            <mat-icon class="text-emerald-500">chat</mat-icon> WhatsApp Business API Configuration
         </h3>
         <p class="text-xs text-app-muted">
            Configure the Meta WhatsApp Business Account credentials to enable live messaging templates, analytics, and billing reports.
         </p>
         
         <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
               <label for="wa-phone-id" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Phone Number ID</label>
               <input id="wa-phone-id" type="text" [(ngModel)]="whatsappModel.phoneNumber" placeholder="e.g. 102837482937482" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text focus:border-emerald-500/50 outline-none transition-all font-mono">
            </div>
            <div>
               <label for="wa-waba-id" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">WhatsApp Business Account (WABA) ID</label>
               <input id="wa-waba-id" type="text" [(ngModel)]="whatsappModel.wabaId" placeholder="e.g. 982738492019283" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text focus:border-emerald-500/50 outline-none transition-all font-mono">
            </div>
         </div>

         <div>
            <label for="wa-api-key" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Permanent Access Token (API Token)</label>
            <input id="wa-api-key" type="password" [(ngModel)]="whatsappModel.apiKey" placeholder="EAAG..." class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text focus:border-emerald-500/50 outline-none transition-all font-mono">
         </div>

         <div>
            <label for="wa-enabled" class="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-app-border bg-app-bg hover:bg-app-card transition select-none">
               <input id="wa-enabled" type="checkbox" [(ngModel)]="whatsappModel.enabled" class="rounded bg-app-card border-slate-600 text-emerald-500 focus:ring-0 w-4 h-4 cursor-pointer">
               <div>
                  <span class="text-sm font-semibold text-app-text block">Enable WhatsApp Gateway</span>
                  <span class="text-xs text-app-muted">Activate communications router to deliver templates live.</span>
               </div>
            </label>
         </div>

         <div class="flex gap-4 pt-4 border-t border-app-border">
            <button (click)="onSaveWhatsappConfig()" [appButtonLoader]="isSavingWhatsapp()" [disabled]="!whatsappModel.phoneNumber || !whatsappModel.apiKey || !whatsappModel.wabaId" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-app-text rounded-lg text-sm font-bold transition flex items-center gap-2 cursor-pointer border border-emerald-500 disabled:opacity-50">
               Save Config
            </button>
         </div>
      </div>

      <!-- Danger Zone -->
      <div class="bg-rose-500/5 border border-rose-500/20 rounded-xl p-6 mt-8 space-y-4">
         <h3 class="text-sm font-bold text-rose-400 flex items-center gap-2">
            <mat-icon>warning</mat-icon> Danger Zone
         </h3>
         <p class="text-xs text-app-muted">
            Deleting this application will permanently remove all deployment states, keys, logs, and database mappings on this cluster.
         </p>
         <div class="flex">
            <button (click)="onDelete()" class="px-4 py-2 bg-rose-600 hover:bg-rose-750 text-app-text rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
               <mat-icon class="!w-4 !h-4 !text-[16px]">delete_forever</mat-icon>
               Destroy Application Instance
            </button>
         </div>
      </div>
    </div>
  `
})
export class ProjectConfigComponent implements OnInit {
  store = inject(AdminStoreService);
  router = inject(Router);
  apiService = inject(ApiService);
  project = input.required<ProjectData>();
  save = output<Partial<ProjectData>>();

  model!: {
    name: string;
    domain: string;
    features: {
      marketplace: boolean;
      services: boolean;
      analytics: boolean;
    }
  };

  firebaseModel = {
    projectId: '',
    apiKey: '',
    authDomain: '',
    storageBucket: '',
    appId: '',
    measurementId: '',
    client_email: '',
    private_key: ''
  };

  whatsappModel = {
    phoneNumber: '',
    wabaId: '',
    apiKey: '',
    enabled: false
  };

  isTestingConnection = signal(false);
  isSavingFirebase = signal(false);
  isSavingWhatsapp = signal(false);

  ngOnInit() {
    const p = this.project();
    this.model = {
      name: p.name,
      domain: p.domain,
      features: {
        marketplace: p.features?.marketplace ?? true,
        services: p.features?.services ?? true,
        analytics: p.features?.analytics ?? true
      }
    };

    if (p.firebase_config) {
      this.firebaseModel = {
        projectId: p.firebase_config.projectId || '',
        apiKey: p.firebase_config.apiKey || '',
        authDomain: p.firebase_config.authDomain || '',
        storageBucket: p.firebase_config.storageBucket || '',
        appId: p.firebase_config.appId || '',
        measurementId: p.firebase_config.measurementId || '',
        client_email: p.firebase_config.serviceAccount?.client_email || '',
        private_key: p.firebase_config.serviceAccount?.private_key || ''
      };
    }

    if (p.whatsapp) {
      this.whatsappModel = {
        phoneNumber: p.whatsapp.phone_number || '',
        wabaId: p.whatsapp.waba_id || '',
        apiKey: p.whatsapp.api_key || '',
        enabled: p.whatsapp.enabled ?? false
      };
    }
  }

  onSave() {
    this.store.updateProject(this.project().id, this.model).subscribe();
    this.save.emit(this.model);
  }

  onSaveFirebaseConfig() {
    this.isSavingFirebase.set(true);
    const appId = this.project().id;
    const payload = {
      projectId: this.firebaseModel.projectId,
      apiKey: this.firebaseModel.apiKey,
      authDomain: this.firebaseModel.authDomain,
      storageBucket: this.firebaseModel.storageBucket,
      appId: this.firebaseModel.appId,
      measurementId: this.firebaseModel.measurementId,
      serviceAccount: {
        client_email: this.firebaseModel.client_email,
        private_key: this.firebaseModel.private_key
      }
    };
    this.apiService.post<any>(`/admin/apps/${appId}/firebase-config`, payload).subscribe({
      next: () => {
        this.store.showToast('Firebase integration configured successfully!', 'success');
        this.isSavingFirebase.set(false);
        this.store.loadProject(appId);
      },
      error: (err) => {
        this.store.showToast('Failed to save config: ' + (err.error?.error || err.message), 'error');
        this.isSavingFirebase.set(false);
      }
    });
  }

  onSaveWhatsappConfig() {
    this.isSavingWhatsapp.set(true);
    const appId = this.project().id;
    const payload = {
      phone_number: this.whatsappModel.phoneNumber,
      waba_id: this.whatsappModel.wabaId,
      api_key: this.whatsappModel.apiKey,
      enabled: this.whatsappModel.enabled
    };
    this.apiService.post<any>(`/admin/apps/${appId}/whatsapp-config`, payload).subscribe({
      next: () => {
        this.store.showToast('WhatsApp Business API configured successfully!', 'success');
        this.isSavingWhatsapp.set(false);
        this.store.loadProject(appId);
      },
      error: (err) => {
        this.store.showToast('Failed to save config: ' + (err.error?.error || err.message), 'error');
        this.isSavingWhatsapp.set(false);
      }
    });
  }

  onTestFirebaseConnection() {
    this.isTestingConnection.set(true);
    const appId = this.project().id;
    const payload = {
      projectId: this.firebaseModel.projectId,
      apiKey: this.firebaseModel.apiKey,
      authDomain: this.firebaseModel.authDomain,
      storageBucket: this.firebaseModel.storageBucket,
      appId: this.firebaseModel.appId,
      serviceAccount: {
        client_email: this.firebaseModel.client_email,
        private_key: this.firebaseModel.private_key
      }
    };
    this.apiService.post<any>(`/admin/apps/${appId}/firebase/test-connection`, payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.store.showToast('Connection verified! Credentials are valid.', 'success');
        } else {
          this.store.showToast('Verification failed: Invalid API Key or Project ID.', 'error');
        }
        this.isTestingConnection.set(false);
      },
      error: (err) => {
        this.store.showToast('Connection test failed: ' + (err.error?.error || err.message), 'error');
        this.isTestingConnection.set(false);
      }
    });
  }

  onDelete() {
    if (confirm(`Are you absolutely sure you want to destroy application '${this.project().name}'? This action is irreversible.`)) {
      this.store.deleteProject(this.project().id).subscribe({
        next: () => {
          this.router.navigate(['/admin']);
        }
      });
    }
  }
}
