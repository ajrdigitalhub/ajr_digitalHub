import { Component, ChangeDetectionStrategy, input, output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ProjectData } from '../../../services/project-detail.service';
import { AdminStoreService } from '../../../services/admin-store.service';
import { ButtonLoaderDirective } from '../../../shared/button-loader.directive';

@Component({
  selector: 'app-project-policies',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatIconModule, ButtonLoaderDirective],
  template: `
    <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-5xl space-y-6">
      <h2 class="text-2xl font-bold text-app-text flex items-center gap-2">
         <mat-icon class="text-indigo-400">gavel</mat-icon> Advanced Policy Engine
      </h2>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <!-- API Policies -->
         <div class="bg-app-bg border border-app-border rounded-xl flex flex-col shadow-sm">
            <div class="p-5 border-b border-app-border flex items-center justify-between">
               <h3 class="text-lg font-bold text-app-text flex items-center gap-2">
                  <mat-icon class="text-indigo-400">traffic</mat-icon> Global Rate Limits
               </h3>
            </div>
            <div class="p-5 space-y-5 flex-grow">
               <div>
                  <label for="p-policy-rpm" class="block text-xs text-app-muted mb-1">Max RPM (Requests per min)</label>
                  <input id="p-policy-rpm" type="number" [(ngModel)]="model.policies.api.rpmLimit" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded text-app-text font-mono text-sm outline-none focus:border-indigo-500">
               </div>
               <div>
                  <label for="p-policy-origins" class="block text-xs text-app-muted mb-1">Allowed Origins (CORS)</label>
                  <input id="p-policy-origins" type="text" [(ngModel)]="model.policies.api.allowedOrigins" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded text-app-text font-mono text-sm outline-none focus:border-indigo-500">
               </div>
            </div>
         </div>

         <!-- Security -->
         <div class="bg-app-bg border border-app-border rounded-xl flex flex-col shadow-sm">
            <div class="p-5 border-b border-app-border flex items-center justify-between">
               <h3 class="text-lg font-bold text-app-text flex items-center gap-2">
                  <mat-icon class="text-amber-400">shield</mat-icon> Identity & Access
               </h3>
            </div>
            <div class="p-5 space-y-5 flex-grow">
               <label for="p-chk-auth" class="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-app-border bg-app-bg hover:bg-app-bg transition">
                  <input id="p-chk-auth" type="checkbox" [(ngModel)]="model.policies.security.authRequired" class="rounded bg-app-card border-slate-600 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer">
                  <span class="text-sm font-semibold text-app-text">Enforce Strict Authorization Header</span>
               </label>
               <div class="grid grid-cols-2 gap-4">
                  <div>
                     <label for="p-policy-expiry" class="block text-xs text-app-muted mb-1">Token Expiry (Min)</label>
                     <input id="p-policy-expiry" type="number" [(ngModel)]="model.policies.security.tokenExpiryMinutes" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded text-app-text font-mono text-sm outline-none focus:border-amber-500">
                  </div>
                  <div>
                     <label for="p-policy-sessions" class="block text-xs text-app-muted mb-1">Max Sessions</label>
                     <input id="p-policy-sessions" type="number" [(ngModel)]="model.policies.security.sessionLimits" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded text-app-text font-mono text-sm outline-none focus:border-amber-500">
                  </div>
               </div>
               <div>
                  <label for="p-policy-geo" class="block text-xs text-app-muted mb-1">Geo Restrictions</label>
                  <select id="p-policy-geo" [(ngModel)]="model.policies.security.geoRestrictions" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded text-app-text text-sm outline-none focus:border-amber-500">
                     <option value="None">None (Global Access)</option>
                     <option value="Internal">Internal Network Only</option>
                     <option value="US_EU">US / EU Only</option>
                  </select>
               </div>
            </div>
         </div>
      </div>

      <!-- Route Rules Builder -->
      <div class="bg-app-bg border border-app-border rounded-xl p-6 shadow-sm">
         <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-app-text">Endpoint Routing Rules</h3>
            <button type="button" (click)="addRule()" class="text-xs bg-app-card hover:bg-app-bg px-3 py-1.5 rounded text-app-text font-bold transition">Add Route Rule</button>
         </div>
         <div class="space-y-3">
            @for (rule of model.policies.api.endpointLimits; track rule.endpoint; let idx = $index) {
               <div class="flex items-center gap-3 p-4 bg-app-bg border border-app-border rounded-lg shadow-inner">
                  <div class="px-2 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] uppercase font-bold rounded">IF route</div>
                  <input type="text" [(ngModel)]="rule.endpoint" class="px-2 py-1 bg-app-bg border border-app-border rounded text-emerald-400 font-mono text-xs w-48 outline-none focus:border-indigo-500">
                  <div class="px-2 py-1 bg-amber-500/10 text-amber-400 text-[10px] uppercase font-bold rounded">THEN limit RPM to</div>
                  <input type="number" [(ngModel)]="rule.maxRpm" class="w-24 px-2 py-1 bg-app-bg border border-app-border rounded text-app-text font-mono text-sm text-center outline-none focus:border-amber-500">
                  <button type="button" (click)="removeRule(idx)" class="ml-auto flex items-center justify-center w-8 h-8 rounded-full hover:bg-rose-500/10 text-app-muted hover:text-rose-400 transition">
                     <mat-icon class="!w-4 !h-4 !text-[16px]">close</mat-icon>
                  </button>
               </div>
            }
            @if (!model.policies.api.endpointLimits || model.policies.api.endpointLimits.length === 0) {
               <div class="p-6 text-center text-app-muted text-sm border border-dashed border-app-border rounded-lg">No custom routing rules defined. Global limits apply.</div>
            }
         </div>
      </div>

      <div class="flex justify-end pt-4">
         <button (click)="onSave()" [appButtonLoader]="store.isLoading()" class="bg-indigo-500 text-app-text px-6 py-2.5 rounded-lg font-bold text-sm transition hover:bg-indigo-400 shadow-md">
           Compile & Apply Policies
         </button>
      </div>
    </div>
  `
})
export class ProjectPoliciesComponent implements OnInit {
  store = inject(AdminStoreService);
  project = input.required<ProjectData>();
  save = output<Partial<ProjectData>>();

  model!: any;

  ngOnInit() {
    const p = this.project();
    this.model = JSON.parse(JSON.stringify({
      policies: p.policies || {
        api: { rpmLimit: 1000, allowedOrigins: '*', endpointLimits: [] },
        security: { authRequired: true, tokenExpiryMinutes: 60, sessionLimits: 5, geoRestrictions: 'None' }
      }
    }));
  }

  addRule() {
    if (!this.model.policies.api.endpointLimits) {
      this.model.policies.api.endpointLimits = [];
    }
    this.model.policies.api.endpointLimits.push({ endpoint: '/api/new-route', maxRpm: 120 });
  }

  removeRule(index: number) {
    this.model.policies.api.endpointLimits.splice(index, 1);
  }

  onSave() {
    this.store.updateProject(this.project().id, this.model).subscribe();
    this.save.emit(this.model);
  }
}
