import { Component, input, output, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminApp, RateLimiterConfig, AdminMasterService } from '../../services/admin-master.service';
import { SystemCoreService } from '../../services/system-core.service';

// We will strictly use Tailwind for animations as per guidelines

@Component({
  selector: 'ajr-admin-tabs',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="flex border-b border-app-border">
      @for (tab of tabs(); track tab.id) {
        <button 
          (click)="activeTabChange.emit(tab.id)"
          class="px-6 py-4 text-sm font-semibold transition-all flex items-center gap-2 border-b-2"
          [class]="activeTab() === tab.id 
            ? 'text-indigo-600 border-indigo-600 bg-indigo-500/10' 
            : 'text-app-muted border-transparent hover:text-app-text hover:border-app-border'">
          <mat-icon class="!w-[18px] !h-[18px] !text-[18px]">{{ tab.icon }}</mat-icon>
          {{ tab.label }}
        </button>
      }
    </div>
  `
})
export class AjrAdminTabs {
  tabs = input<{id: string, label: string, icon: string}[]>([]);
  activeTab = input<string>('');
  activeTabChange = output<string>();
}

@Component({
  selector: 'ajr-deploy-status',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="inline-flex flex-col gap-0.5 md:gap-1 items-end">
      <div 
        class="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] md:text-[10px] font-bold border font-mono tracking-wider"
        [ngClass]="{
          'bg-emerald-500/10 text-emerald-400 border-emerald-500/30': status() === 'live',
          'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse': status() === 'deploying',
          'bg-rose-500/10 text-rose-400 border-rose-500/30': status() === 'failed'
        }">
        <div class="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full" 
          [ngClass]="{
            'bg-emerald-400': status() === 'live',
            'bg-amber-400': status() === 'deploying',
            'bg-rose-400': status() === 'failed'
          }"></div>
        <span class="uppercase">{{ status() }}</span>
      </div>
      @if (lastUpdated()) {
        <span class="text-[8px] sm:text-[9px] md:text-[10px] text-app-muted font-mono leading-none">Upd: {{ lastUpdated() | date:'HH:mm' }}</span>
      }
    </div>
  `
})
export class AjrDeployStatus {
  status = input<'live' | 'deploying' | 'failed'>('live');
  lastUpdated = input<string>('');
}

@Component({
  selector: 'ajr-admin-app-card',
  standalone: true,
  imports: [CommonModule, MatIconModule, AjrDeployStatus],
  template: `
    <div 
      class="bg-app-card backdrop-blur-xl border border-app-border hover:border-indigo-500/60 rounded-2xl p-5 shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 cursor-pointer group flex flex-col h-full relative overflow-hidden"
      role="button"
      tabindex="0"
      (click)="selectApp.emit(app())"
      (keydown.enter)="selectApp.emit(app())">
      
      <!-- Top Glowing Effect -->
      <div class="absolute -right-16 -top-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-500"></div>
      
      <div class="flex justify-between items-start mb-4 gap-3 z-10">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <h3 class="text-base sm:text-lg font-bold text-app-text tracking-tight group-hover:text-indigo-400 transition-colors">
              {{ app().name }}
            </h3>
            <span class="px-1.5 py-0.5 rounded-md text-[9px] bg-app-bg text-indigo-400 font-mono font-bold tracking-wider border border-indigo-500/20">
              {{ app().environment }}
            </span>
          </div>
          <p class="text-xs text-app-muted font-mono flex items-center gap-1 truncate">
            <mat-icon class="!text-[12px] !w-[12px] !h-[12px] text-app-muted shrink-0">link</mat-icon>
            <span class="truncate hover:underline text-app-muted/80">{{ app().domain }}</span>
          </p>
        </div>
        <ajr-deploy-status [status]="app().status" [lastUpdated]="app().lastUpdated" class="shrink-0"></ajr-deploy-status>
      </div>

      <!-- Realtime Billing Overview Section -->
      <div class="bg-app-bg/40 border border-app-border/80 rounded-xl p-3.5 my-3 space-y-3 z-10">
        <div class="flex justify-between items-center text-[10px] font-bold text-app-muted uppercase tracking-wider">
          <span>Realtime Resource Billing</span>
          <span class="text-indigo-400 font-mono">ESTIMATED</span>
        </div>
        
        <div class="grid grid-cols-3 gap-2">
          <!-- Firebase resource -->
          <div class="bg-app-card/60 border border-app-border/50 rounded-lg p-2 flex flex-col justify-between items-center text-center">
            <div class="flex items-center gap-1 text-[8px] font-bold text-app-muted uppercase tracking-wider">
              <span class="w-1.5 h-1.5 rounded-full bg-orange-400"></span> Firebase
            </div>
            <span class="text-xs sm:text-sm font-black text-orange-400 mt-1.5 font-mono">
              ₹{{ getFirebaseCost(app()) | number:'1.2-2' }}
            </span>
          </div>
          
          <!-- WhatsApp API resource -->
          <div class="bg-app-card/60 border border-app-border/50 rounded-lg p-2 flex flex-col justify-between items-center text-center">
            <div class="flex items-center gap-1 text-[8px] font-bold text-app-muted uppercase tracking-wider">
              <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> WhatsApp
            </div>
            <span class="text-xs sm:text-sm font-black text-indigo-400 mt-1.5 font-mono">
              ₹{{ getWhatsAppCost(app()) | number:'1.2-2' }}
            </span>
          </div>
          
          <!-- Total spend -->
          <div class="bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-2 flex flex-col justify-between items-center text-center">
            <span class="text-[8px] font-bold text-indigo-400 uppercase tracking-wider">Total</span>
            <span class="text-xs sm:text-sm font-black text-amber-500 mt-1.5 font-mono">
              ₹{{ getTotalCost(app()) | number:'1.2-2' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Footer Detail Stats -->
      <div class="mt-auto pt-3 border-t border-app-border flex items-center justify-between gap-3 text-xs z-10">
        <div class="flex items-center gap-1.5 text-app-muted">
          <mat-icon class="!w-4 !h-4 !text-[16px] text-indigo-400">cloud</mat-icon>
          <span class="font-semibold text-app-text">{{ app().plan || 'Pro' }} Plan</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1 font-mono text-app-muted">
            <mat-icon class="!w-4 !h-4 !text-[16px] text-cyan-500">speed</mat-icon>
            <span>Hits: <strong class="text-app-text font-bold">{{ getApiHitsPerMin() | number:'1.1-1' }}K/m</strong></span>
          </div>
          <div class="flex items-center gap-1.5 font-mono text-app-muted">
            <mat-icon class="!w-4 !h-4 !text-[16px] text-emerald-400">bar_chart</mat-icon>
            <span>Volume: <strong class="text-app-text font-bold">{{ app().apiUsage | number }}</strong> <span class="text-[10px]">reqs</span></span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AjrAdminAppCard {
  app = input.required<any>(); // changed from AdminApp to any to easily check config properties
  selectApp = output<any>();

  private systemCore = inject(SystemCoreService);

  getApiHitsPerMin(): number {
    const telemetry = this.systemCore.appTelemetryMap()[this.app().id];
    return telemetry ? telemetry.apiHitsPerMin : 0;
  }

  getFirebaseCost(app: any): number {
    if (app.firebaseBilling && app.firebaseBilling.totalCost !== undefined && app.firebaseBilling.totalCost !== null) {
      return app.firebaseBilling.totalCost;
    }
    if (app.cached_metrics?.billingCost?.totalCost !== undefined && app.cached_metrics?.billingCost?.totalCost !== null) {
      return app.cached_metrics.billingCost.totalCost;
    }
    return 0;
  }

  getWhatsAppCost(app: any): number {
    if (app.waSummary && app.waSummary.estimatedCost !== undefined && app.waSummary.estimatedCost !== null) {
      return app.waSummary.estimatedCost;
    }
    return 0;
  }

  getTotalCost(app: any): number {
    return Math.round((this.getFirebaseCost(app) + this.getWhatsAppCost(app)) * 100) / 100;
  }
}

@Component({
  selector: 'ajr-app-config-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    @if (app()) {
      <div class="bg-app-card rounded-l-xl border-l border-app-border shadow-2xl overflow-hidden flex flex-col h-full w-[450px]">
        <!-- Header -->
        <div class="bg-app-bg p-6 border-b border-app-border flex items-start justify-between">
          <div>
            <h2 class="text-xl font-bold text-app-text flex items-center gap-2"><mat-icon class="text-indigo-400 !text-[20px] !w-[20px] !h-[20px]">tune</mat-icon> App Configuration</h2>
            <p class="text-xs text-app-muted font-medium mt-1 font-mono break-all">{{ app()!.id }}</p>
          </div>
          <button (click)="closePanel.emit()" class="text-app-muted hover:text-app-text bg-app-card hover:bg-app-bg border border-app-border rounded-full w-8 h-8 flex items-center justify-center transition">
            <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">close</mat-icon>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 overflow-y-auto flex-grow space-y-6">
          
          <!-- Environment & Basic Info -->
          <div class="space-y-4">
            <div>
              <label for="comp-app-name" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-1.5">Application Name</label>
              <input id="comp-app-name" type="text" [(ngModel)]="editData.name" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text font-semibold focus:border-indigo-500/50 outline-none transition-all">
            </div>
            <div>
              <label for="comp-app-domain" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-1.5 flex items-center justify-between">
                 Routing Domain <mat-icon class="!text-[14px] !w-[14px] !h-[14px] text-app-muted">dns</mat-icon>
              </label>
              <input id="comp-app-domain" type="text" [(ngModel)]="editData.domain" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-emerald-400 focus:border-indigo-500/50 outline-none transition-all font-mono">
            </div>
            <div>
              <label for="comp-app-env" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-1.5">Target Environment</label>
              <select id="comp-app-env" [(ngModel)]="editData.environment" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text focus:border-indigo-500/50 outline-none transition-all hover:border-app-border cursor-pointer">
                <option value="Production">Production Edge (Global)</option>
                <option value="Staging">Staging (Internal)</option>
              </select>
            </div>
          </div>

          <!-- Feature Toggles -->
          <div class="border-t border-app-border pt-6">
            <h3 class="text-xs font-bold text-app-muted mb-4 uppercase tracking-wider flex items-center gap-2"><mat-icon class="!text-[16px] !w-[16px] !h-[16px]">extension</mat-icon> Provisioned Modules</h3>
            <div class="space-y-3">
              @for (feature of featuresList; track feature) {
                <label class="flex items-center justify-between p-3 rounded-lg border border-app-border bg-app-bg hover:bg-app-card cursor-pointer transition-colors">
                  <div class="flex items-center gap-3">
                    <mat-icon [ngClass]="editData.features[feature] ? 'text-indigo-400' : 'text-app-muted'" class="!text-[18px] !w-[18px] !h-[18px]">
                      {{ feature === 'marketplace' ? 'store' : feature === 'services' ? 'build' : 'insights' }}
                    </mat-icon>
                    <span class="text-sm font-semibold whitespace-nowrap" [ngClass]="editData.features[feature] ? 'text-app-text' : 'text-app-muted'">{{ (feature | titlecase) }} Engine</span>
                  </div>
                  <div class="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input type="checkbox" [(ngModel)]="editData.features[feature]" class="toggle-checkbox absolute block w-5 h-5 rounded-full bg-app-card border-4 appearance-none cursor-pointer border-app-border focus:outline-none focus:ring-0 top-0 left-0 transition-transform duration-200 ease-in-out" [class.translate-x-5]="editData.features[feature]" [class.border-indigo-500]="editData.features[feature]" [class.bg-indigo-500]="editData.features[feature]"/>
                    <div class="toggle-label block overflow-hidden h-5 rounded-full bg-app-card cursor-pointer transition-colors duration-200 ease-in-out" [class.bg-indigo-500/30]="editData.features[feature]"></div>
                  </div>
                </label>
              }
            </div>
          </div>

          <!-- API Keys -->
          <div class="border-t border-app-border pt-6 pb-4">
             <h3 class="text-xs font-bold text-app-muted mb-4 uppercase tracking-wider flex items-center gap-2"><mat-icon class="!text-[16px] !w-[16px] !h-[16px]">security</mat-icon> Secret Key</h3>
             <div class="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                <label for="comp-app-key" class="block text-[10px] font-bold uppercase tracking-wider text-amber-500/80 mb-2">Platform Root Key</label>
                <div class="flex items-center gap-2">
                  <input id="comp-app-key" type="text" readonly [value]="app()?.apiKey" class="w-full px-3 py-2 bg-app-bg border border-amber-500/20 rounded-md text-sm text-app-muted font-mono outline-none">
                  <button (click)="onRegenerateKey()" [disabled]="isRegenerating()" class="px-4 py-2 bg-app-card hover:bg-app-bg border border-app-border disabled:opacity-50 text-app-text rounded-md text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5">
                    @if (isRegenerating()) {
                       <mat-icon class="!w-[14px] !h-[14px] !text-[14px] animate-spin">autorenew</mat-icon>
                    } @else {
                       <mat-icon class="!w-[14px] !h-[14px] !text-[14px]">refresh</mat-icon> Roll
                    }
                  </button>
                </div>
                <p class="text-[10px] text-amber-500/60 mt-2">Rolling the key invalidates all active CLI sessions instantly.</p>
             </div>
          </div>

        </div>

        <!-- Footer Actions -->
        <div class="p-5 border-t border-app-border bg-app-bg/80 flex justify-end gap-3 backdrop-blur-md">
          <button (click)="closePanel.emit()" class="px-5 py-2.5 rounded-lg text-sm font-bold text-app-muted hover:text-app-text transition-colors">Discard</button>
          <button (click)="onSave()" [disabled]="isSaving()" class="px-6 py-2.5 rounded-lg text-sm font-bold bg-indigo-500 text-app-text hover:bg-indigo-400 disabled:opacity-70 transition-all flex items-center gap-2 border border-indigo-400/50 shadow-lg">
            @if (isSaving()) {
               <div class="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
               Applying...
            } @else {
               <mat-icon class="!w-[18px] !h-[18px] !text-[18px]">check</mat-icon> Apply Setup
            }
          </button>
        </div>
      </div>
    }
  `
})
export class AjrAppConfigPanel {
  app = input<AdminApp | null>(null);
  closePanel = output<void>();
  
  private adminService = inject(AdminMasterService);
  
  featuresList = ['marketplace', 'services', 'analytics'] as const;
  
  editData: Partial<AdminApp> & { features: Record<string, boolean> } = { features: { marketplace: false, services: false, analytics: false } };
  isSaving = signal(false);
  isRegenerating = signal(false);

  constructor() {
    effect(() => {
      const currentApp = this.app();
      if (currentApp) {
        // deep copy for editing
        this.editData = JSON.parse(JSON.stringify(currentApp));
      }
    });
  }

  onSave() {
    if (!this.app()) return;
    this.isSaving.set(true);
    this.adminService.updateAppConfig(this.app()!.id, this.editData).subscribe(() => {
      this.isSaving.set(false);
      this.closePanel.emit();
    });
  }

  onRegenerateKey() {
    if (!this.app()) return;
    this.isRegenerating.set(true);
    this.adminService.regenerateApiKey(this.app()!.id).subscribe(() => {
      this.isRegenerating.set(false);
      // Wait, the signal in service updates the app list, but editData needs the new key.
      // Since it's mock, we might not get it back instantly except via the signal.
      // Let's close panel to refresh.
      this.closePanel.emit();
    });
  }
}

@Component({
  selector: 'ajr-rate-config',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="bg-transparent border-none rounded-none p-0 shadow-none">
      <div class="flex items-center justify-between mb-8">
        <div>
           <h3 class="text-lg font-bold text-app-text flex items-center gap-2">
              <mat-icon class="text-indigo-500">speed</mat-icon> Edge Rate Engine
           </h3>
           <p class="text-sm text-app-muted mt-1">Configure global API thresholds to prevent abuse.</p>
        </div>
        
        <div class="flex items-center gap-3">
           <span [ngClass]="{
             'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20': config().status === 'safe',
             'bg-amber-500/10 text-amber-400 border border-amber-500/20': config().status === 'warning',
             'bg-rose-500/10 text-rose-400 border border-rose-500/20': config().status === 'critical'
           }" class="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded border flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full" [ngClass]="{
                 'bg-emerald-400': config().status === 'safe',
                 'bg-amber-400': config().status === 'warning',
                 'bg-rose-400': config().status === 'critical'
              }"></span>
              Status: {{ config().status }}
           </span>
           
           <div class="relative inline-block w-12 align-middle select-none transition duration-200 ease-in">
              <input type="checkbox" [(ngModel)]="localConfig.enabled" (change)="markChanged()" class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-app-card border-4 appearance-none cursor-pointer border-app-border focus:outline-none top-0 left-0 transition-transform duration-200 ease-in-out" [class.translate-x-6]="localConfig.enabled" [class.border-indigo-500]="localConfig.enabled" [class.bg-indigo-500]="localConfig.enabled"/>
              <div class="toggle-label block overflow-hidden h-6 rounded-full bg-app-card cursor-pointer transition-colors duration-200 ease-in-out" [class.bg-indigo-500/30]="localConfig.enabled"></div>
           </div>
        </div>
      </div>
      
       <div class="space-y-8" [class.opacity-50]="!localConfig.enabled" [class.pointer-events-none]="!localConfig.enabled">
        <div>
           <div class="flex justify-between items-end mb-2">
              <label for="range-rpm" class="text-sm font-bold text-app-text">Requests Per Minute (RPM)</label>
              <span class="font-mono text-xl font-black text-indigo-400">{{ localConfig.rpm | number }}</span>
           </div>
           <input id="range-rpm" type="range" min="100" max="10000" step="100" [(ngModel)]="localConfig.rpm" (change)="markChanged()" class="w-full h-2 bg-app-card rounded-lg appearance-none cursor-pointer accent-indigo-500">
        </div>
        
        <div>
           <div class="flex justify-between items-end mb-2">
              <label for="range-rph" class="text-sm font-bold text-app-text">Requests Per Hour (RPH)</label>
              <span class="font-mono text-xl font-black text-indigo-400">{{ localConfig.rph | number }}</span>
           </div>
           <input id="range-rph" type="range" min="5000" max="500000" step="5000" [(ngModel)]="localConfig.rph" (change)="markChanged()" class="w-full h-2 bg-app-card rounded-lg appearance-none cursor-pointer accent-indigo-500">
        </div>

        <div>
           <div class="flex justify-between items-end mb-2">
              <label for="range-burst" class="text-sm font-bold text-app-text">Burst Size</label>
              <span class="font-mono text-xl font-black text-app-text">{{ localConfig.burst }} <span class="text-xs text-app-muted font-sans font-medium uppercase tracking-wider">Reqs</span></span>
           </div>
           <input id="range-burst" type="range" min="50" max="1000" step="50" [(ngModel)]="localConfig.burst" (change)="markChanged()" class="w-full h-2 bg-app-card rounded-lg appearance-none cursor-pointer accent-slate-500">
        </div>
      </div>
      
      @if (hasChanges()) {
         <div class="mt-8 flex justify-end">
             <button (click)="saveConfig()" [disabled]="isSaving()" class="px-6 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-app-text font-bold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 border border-indigo-400/50">
                @if (isSaving()) {
                   <div class="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                   Deploying...
                } @else {
                   <mat-icon class="!w-[18px] !h-[18px] !text-[18px]">verified</mat-icon> Commit Policy
                }
             </button>
         </div>
      }
    </div>
  `
})
export class AjrRateConfig {
  config = input.required<RateLimiterConfig>();
  private service = inject(AdminMasterService);
  
  localConfig: Partial<RateLimiterConfig> = {};
  hasChanges = signal(false);
  isSaving = signal(false);

  constructor() {
    effect(() => {
      this.localConfig = JSON.parse(JSON.stringify(this.config()));
      this.hasChanges.set(false);
    });
  }

  markChanged() {
    this.hasChanges.set(true);
  }

  saveConfig() {
    this.isSaving.set(true);
    this.service.updateRateLimiter(this.localConfig as RateLimiterConfig).subscribe(() => {
      this.isSaving.set(false);
      this.hasChanges.set(false);
    });
  }
}
