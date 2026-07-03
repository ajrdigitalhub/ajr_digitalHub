import { Component, ChangeDetectionStrategy, inject, signal, OnInit, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { ProjectDetailService, ProjectData } from '../../../services/project-detail.service';
import { AdminCloudService } from '../../../services/admin-cloud.service';
import { AdminStoreService } from '../../../services/admin-store.service';

import { ProjectOverviewComponent } from './overview';
import { ProjectConfigComponent } from './config';
import { ProjectPoliciesComponent } from './policies';
import { ProjectApiMonitorComponent } from './api-monitor';
import { ProjectDatabaseComponent } from './database';
import { ProjectServicesComponent } from './services';
import { ProjectDeploymentsComponent } from './deployments';
import { ProjectIntegrationsComponent } from './integrations';
import { ProjectSecurityComponent } from './security-center';
import { WhatsAppBillingComponent } from './whatsapp-billing';
import { ProjectPushNotificationsComponent } from './push-notifications';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    RouterLink,
    ProjectOverviewComponent,
    ProjectConfigComponent,
    ProjectPoliciesComponent,
    ProjectApiMonitorComponent,
    ProjectDatabaseComponent,
    ProjectServicesComponent,
    ProjectDeploymentsComponent,
    ProjectIntegrationsComponent,
    ProjectSecurityComponent,
    WhatsAppBillingComponent,
    ProjectPushNotificationsComponent
  ],
   template: `
    <div class="min-h-screen bg-app-bg font-sans pb-20 fade-in text-app-text flex flex-col">
      
      <!-- Top Navigation Header -->
      <header class="bg-app-card border-b border-app-border py-3 px-6 shadow-sm sticky top-0 z-20 shrink-0">
        <div class="max-w-[1500px] mx-auto flex items-center justify-between">
           <div class="flex items-center gap-4">
              <a routerLink="/admin" class="text-app-muted hover:text-app-text transition flex items-center justify-center p-1.5 rounded bg-app-bg/50 hover:bg-app-bg" title="Back to Admin Console">
                 <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">arrow_back</mat-icon>
              </a>
              <div class="h-5 w-px bg-app-border"></div>
              @if (projectService.isLoading()) {
                 <div class="w-32 h-6 bg-app-bg animate-pulse rounded"></div>
              } @else {
                 @if (projectService.currentProject(); as currentApp) {
                    <div class="flex flex-col app-switcher-container relative">
                       <!-- Breadcrumb: Admin → Applications → Project Name -->
                       <nav class="flex items-center gap-1.5 text-[10px] font-medium text-app-muted tracking-wide mb-0.5">
                          <a routerLink="/admin" class="hover:text-indigo-500 transition-colors duration-150">Admin</a>
                          <span class="text-app-muted">/</span>
                          <span class="text-app-muted">Applications</span>
                          <span class="text-app-muted">/</span>
                          <span class="text-indigo-500 font-semibold">{{ currentApp.name }}</span>
                       </nav>
                       
                       <div class="relative">
                          <button (click)="isAppSwitchOpen.set(!isAppSwitchOpen())" class="text-sm md:text-base font-bold text-app-text tracking-tight flex items-center gap-2 hover:bg-app-bg/60 px-2 py-1 -mx-2 rounded-lg transition-colors select-none cursor-pointer">
                             <span>{{ currentApp.name }}</span>
                             <span class="px-1.5 py-0.5 rounded text-[9px] bg-app-bg text-app-muted font-mono tracking-wider border border-app-border">
                                {{ currentApp.environment }}
                             </span>
                             <mat-icon class="!w-4 !h-4 !text-[16px] text-app-muted transition-transform duration-200" [class.rotate-180]="isAppSwitchOpen()">
                                expand_more
                             </mat-icon>
                          </button>
                          
                          <!-- Dropdown Overlay -->
                          @if (isAppSwitchOpen()) {
                             <div class="glass absolute left-0 mt-2 w-64 border border-app-border rounded-xl shadow-xl z-50 p-2 text-app-text transition-all duration-150 animate-in fade-in slide-in-from-top-2">
                                <div class="text-[9px] uppercase font-bold text-app-muted tracking-wider mb-1.5 px-3">Switch Application</div>
                                <div class="space-y-0.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                                   @for (app of store.apps(); track app.id) {
                                      <button 
                                        (click)="router.navigate(['/admin/apps', app.id]); isAppSwitchOpen.set(false)"
                                        [class]="app.id === currentApp.id 
                                          ? 'bg-indigo-500/10 text-indigo-500 font-bold border border-indigo-500/20 shadow-sm' 
                                          : 'text-app-text hover:bg-app-bg hover:text-indigo-400 border border-transparent'" 
                                        class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all text-left cursor-pointer">
                                        <div class="flex items-center gap-2 truncate">
                                           <span class="w-1.5 h-1.5 rounded-full" [ngClass]="app.status === 'live' ? 'bg-emerald-400' : app.status === 'deploying' ? 'bg-amber-400' : 'bg-rose-400'"></span>
                                           <span class="truncate font-semibold">{{ app.name }}</span>
                                        </div>
                                        <span class="text-[9px] font-mono text-app-muted px-1.5 py-0.5 bg-app-bg/50 rounded border border-app-border shrink-0">{{ app.environment }}</span>
                                      </button>
                                   }
                                </div>
                             </div>
                          }
                       </div>
                    </div>
                 }
              }
           </div>
           
           <div class="flex items-center gap-4">
              <!-- Command Palette Hint -->
              <div class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-app-bg border border-app-border text-app-muted text-xs font-mono">
                <mat-icon class="!w-14 !h-14 !text-[14px]">search</mat-icon>
                <span>Search settings...</span>
                <span class="flex items-center gap-0.5 bg-app-card text-app-text px-1.5 rounded py-0.5">Ctrl K</span>
              </div>
              <button (click)="onSaveConfig()" class="bg-indigo-600 hover:bg-indigo-500 text-app-text px-4 py-1.5 rounded-md text-sm font-bold shadow-md transition-all border border-indigo-400/50">
                 Quick Deploy
              </button>
           </div>
        </div>
      </header>

      <!-- Main Two-Column Layout -->
      <main class="max-w-[1500px] mx-auto w-full flex-grow flex flex-col lg:flex-row lg:h-[calc(100vh-65px)] lg:overflow-hidden">
        
        <!-- Left Sidebar Project Navigation -->
        <aside class="hidden lg:block w-64 border-r border-app-border bg-app-card/40 shrink-0 overflow-y-auto custom-scrollbar">
           <nav class="p-4 space-y-6">
              @for (group of navGroups; track group.group) {
                 <div>
                    <h3 class="text-[10px] font-bold text-app-muted uppercase tracking-widest mb-2 px-3">{{ group.group }}</h3>
                    <div class="space-y-0.5">
                       @for (tab of group.items; track tab.id) {
                          <button 
                            (click)="activeSection.set(tab.id)"
                            [class]="activeSection() === tab.id 
                              ? 'bg-indigo-500/10 text-indigo-500 font-bold border border-indigo-500/20 shadow-sm' 
                              : 'text-app-muted hover:bg-app-bg hover:text-app-text border border-transparent'" 
                            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all text-left">
                            <mat-icon class="!w-[18px] !h-[18px] !text-[18px]">{{ tab.icon }}</mat-icon>
                            {{ tab.label }}
                          </button>
                       }
                    </div>
                 </div>
              }
           </nav>
        </aside>

         <!-- Mobile Navigation Bar -->
         <div class="lg:hidden w-full px-4 py-2.5 shrink-0 bg-app-card border-b border-app-border z-30 animate-in duration-300 relative">
            <!-- Mobile Active Selection Indicator -->
            <div (click)="isMobileMenuOpen.set(!isMobileMenuOpen())" class="flex items-center justify-between w-full pl-4 pr-1.5 py-1.5 bg-app-bg border border-app-border rounded-xl cursor-pointer hover:bg-app-bg/85 transition-all select-none shadow-xs">
               <span class="flex items-center gap-2 font-bold text-xs text-indigo-400">
                  <mat-icon class="!w-[16px] !h-[16px] !text-[16px]">{{ getActiveSectionIcon() }}</mat-icon>
                  {{ getActiveSectionLabel() }}
               </span>
               <button class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-app-bg/50 text-app-muted hover:text-app-text transition-colors">
                  <mat-icon class="!w-[18px] !h-[18px] !text-[18px]">{{ isMobileMenuOpen() ? 'close' : 'menu' }}</mat-icon>
               </button>
            </div>

            <!-- Floating Dropdown Options -->
            @if (isMobileMenuOpen()) {
               <div class="absolute left-4 right-4 mt-1 bg-app-card border border-app-border rounded-xl shadow-xl z-50 p-2.5 max-h-[60vh] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                  @for (group of navGroups; track group.group) {
                     <div class="mt-3 first:mt-0">
                        <div class="text-[9px] uppercase font-bold text-app-muted tracking-wider mb-1.5 px-3">{{ group.group }}</div>
                        <div class="space-y-0.5">
                           @for (tab of group.items; track tab.id) {
                              <button 
                                (click)="activeSection.set(tab.id); isMobileMenuOpen.set(false)"
                                [class]="activeSection() === tab.id 
                                  ? 'bg-indigo-50/20 text-indigo-500 font-bold border border-indigo-500/20 shadow-sm' 
                                  : 'text-app-muted hover:bg-app-bg hover:text-app-text border border-transparent'" 
                                class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all text-left">
                                <mat-icon class="!w-[16px] !h-[16px] !text-[16px]">{{ tab.icon }}</mat-icon>
                                {{ tab.label }}
                              </button>
                           }
                        </div>
                     </div>
                  }
               </div>
            }
         </div>

        <!-- Right Content Area -->
        <div class="flex-grow p-6 lg:p-10 overflow-y-auto scroll-smooth bg-app-bg custom-scrollbar relative">
           @if (projectService.isLoading()) {
              <div class="flex items-center justify-center h-full">
                 <div class="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
           } @else if (projectService.currentProject(); as project) {
              
              @switch (activeSection()) {
                  @case ('overview') {
                     <app-project-overview [project]="project"></app-project-overview>
                  }
                 @case ('overview_legacy') {
                    <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-5xl">
                       <h2 class="text-2xl font-bold text-app-text mb-6">Smart Insights & Overview</h2>
                       
                       <!-- AI Insights -->
                       <div class="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-5 mb-8 flex items-start gap-4">
                          <div class="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                             <mat-icon class="text-indigo-400">auto_awesome</mat-icon>
                          </div>
                          <div>
                             <h3 class="text-sm font-bold text-indigo-400">System Activity Insight</h3>
                             <p class="text-sm text-app-text mt-1">
                                API traffic to <strong class="text-indigo-500">/api/checkout</strong> has increased by 35% in the last hour. 
                                Database connection pools automatically scaled to accommodate load. No anomalies detected.
                             </p>
                          </div>
                       </div>

                       <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                          <div class="bg-app-card border border-app-border rounded-xl p-5 shadow-sm">
                             <div class="text-xs font-bold text-app-muted uppercase tracking-wider mb-1">Status</div>
                             <div class="flex items-center gap-2 mt-2">
                                <div class="w-2.5 h-2.5 rounded-full" [ngClass]="{'bg-emerald-400': project.status === 'live', 'bg-amber-400 animate-pulse': project.status === 'deploying', 'bg-rose-400': project.status === 'failed'}"></div>
                                <span class="text-lg font-bold text-app-text uppercase">{{ project.status }}</span>
                             </div>
                          </div>
                          <div class="bg-app-card border border-app-border rounded-xl p-5 shadow-sm">
                             <div class="text-xs font-bold text-app-muted uppercase tracking-wider mb-1">Assigned Plan</div>
                             <div class="text-lg font-bold text-indigo-400 mt-2">{{ project.plan }} Compute</div>
                          </div>
                          <div class="bg-app-card border border-app-border rounded-xl p-5 shadow-sm">
                             <div class="text-xs font-bold text-app-muted uppercase tracking-wider mb-1">API Usage (7D)</div>
                             <div class="text-lg font-mono font-bold text-app-text mt-2">{{ project.apiUsage | number }} reqs</div>
                          </div>
                          <div class="bg-app-card border border-app-border rounded-xl p-5 shadow-sm">
                             <div class="text-xs font-bold text-app-muted uppercase tracking-wider mb-1">Routing Domain</div>
                             <div class="text-sm font-mono text-emerald-400 truncate mt-2">{{ project.domain }}</div>
                          </div>
                       </div>
                    </div>
                 }

                 @case ('config') {
                     <app-project-config [project]="project" (save)="onSaveSub($event)"></app-project-config>
                  }
                  @case ('services') {
                     <app-project-services [project]="project"></app-project-services>
                  }
                  @case ('config_legacy') {
                    <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-3xl">
                       <h2 class="text-2xl font-bold text-app-text mb-6">Core Configuration</h2>
                       <div class="bg-app-card border border-app-border rounded-xl p-6 space-y-6">
                          <div>
                             <label for="p-detail-name" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Application Name</label>
                             <input id="p-detail-name" type="text" [(ngModel)]="editData.name" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text font-semibold focus:border-indigo-500/50 outline-none transition-all">
                          </div>
                          <div>
                             <label for="p-detail-domain" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Routing Domain</label>
                             <input id="p-detail-domain" type="text" [(ngModel)]="editData.domain" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-emerald-400 focus:border-indigo-500/50 outline-none transition-all font-mono">
                          </div>
                          
                          <div class="pt-6 border-t border-app-border">
                             <div class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-4">Feature Toggles</div>
                             <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label for="chk-marketplace" class="flex items-center justify-between p-3 rounded-lg border border-app-border bg-app-bg hover:bg-app-card cursor-pointer transition">
                                   <span class="text-sm font-semibold text-app-text">Marketplace Plugin</span>
                                   <input id="chk-marketplace" type="checkbox" [(ngModel)]="editData.features.marketplace" class="rounded bg-app-card border-app-border text-indigo-500 focus:ring-0 w-4 h-4 cursor-pointer">
                                </label>
                                <label for="chk-services" class="flex items-center justify-between p-3 rounded-lg border border-app-border bg-app-bg hover:bg-app-card cursor-pointer transition">
                                   <span class="text-sm font-semibold text-app-text">Services Directory</span>
                                   <input id="chk-services" type="checkbox" [(ngModel)]="editData.features.services" class="rounded bg-app-card border-app-border text-indigo-500 focus:ring-0 w-4 h-4 cursor-pointer">
                                </label>
                             </div>
                          </div>
                       </div>
                       <div class="mt-6 flex justify-end">
                          <button (click)="onSaveConfig()" class="bg-indigo-600 hover:bg-indigo-500 text-app-text px-6 py-2 rounded-lg font-bold text-sm transition">Save Changes</button>
                       </div>
                    </div>
                 }

                 @case ('billing') {
                    <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-4xl">
                       <h2 class="text-2xl font-bold text-app-text mb-6">Billing & Usage Insights</h2>
                       
                       @if (editData.billing) {
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                             <!-- Spend Estimate -->
                             <div class="bg-app-card border border-app-border rounded-xl p-6">
                                <h3 class="text-sm font-bold text-app-muted uppercase tracking-wider mb-2">Estimated Monthly Spend</h3>
                                <div class="text-4xl font-black text-app-text">{{ editData.billing.estimatedSpend >= 0 ? '₹' + (editData.billing.estimatedSpend | number:'1.2-2') : 'Data not available' }}</div>
                                <div class="text-sm text-app-muted mt-1">Based on current usage trends</div>
                                
                                <div class="mt-6 pt-6 border-t border-app-border flex items-center justify-between">
                                   <span class="text-sm text-app-muted">Current Plan Date Spend</span>
                                   <span class="text-sm font-bold text-app-text">{{ editData.billing.currentSpend >= 0 ? '₹' + (editData.billing.currentSpend | number:'1.2-2') : 'Data not available' }}</span>
                                </div>

                                <div class="mt-4 pt-4 border-t border-app-border/40 grid grid-cols-2 gap-4 text-xs">
                                   <div class="flex justify-between items-center">
                                      <span class="text-app-muted">Firebase Billing:</span>
                                      <span class="font-bold text-orange-400 font-mono">{{ getFirebaseCost() >= 0 ? '₹' + (getFirebaseCost() | number:'1.2-2') : 'Data not available' }}</span>
                                   </div>
                                   <div class="flex justify-between items-center">
                                      <span class="text-app-muted">WhatsApp Billing:</span>
                                      <span class="font-bold text-indigo-400 font-mono">{{ getWhatsAppCost() >= 0 ? '₹' + (getWhatsAppCost() | number:'1.2-2') : 'Data not available' }}</span>
                                   </div>
                                </div>
                             </div>

                             <!-- Plan Details -->
                             <div class="bg-app-card border border-app-border rounded-xl p-6 relative overflow-hidden flex flex-col justify-between">
                                <div class="absolute top-0 right-0 p-4 opacity-10 text-app-muted">
                                   <mat-icon class="!w-24 !h-24 !text-[96px]">domain</mat-icon>
                                </div>
                                <div>
                                   <h3 class="text-sm font-bold text-app-muted uppercase tracking-wider mb-2">Current Plan</h3>
                                   <div class="text-2xl font-bold text-indigo-400">{{ editData.billing.plan }}</div>
                                </div>
                                <div class="mt-6 flex">
                                   <button class="px-4 py-2 bg-app-bg border border-app-border text-app-text rounded-lg text-sm font-bold transition hover:bg-app-card">Manage Subscription</button>
                                </div>
                             </div>
                          </div>

                          <div class="bg-app-card border border-app-border rounded-xl p-6">
                             <h3 class="text-lg font-bold text-app-text mb-6">Resource Allocation</h3>
                             
                             <div class="space-y-6">
                                <div>
                                   <div class="flex justify-between items-end mb-2">
                                      <div>
                                         <div class="text-sm font-bold text-app-text">API Requests</div>
                                         <div class="text-xs text-app-muted">Monthly quota</div>
                                      </div>
                                      <div class="text-sm font-mono font-bold text-app-text">
                                         {{ editData.billing.apiCalls | number }} / {{ editData.billing.apiLimit | number }}
                                      </div>
                                   </div>
                                   <div class="w-full h-2 bg-app-bg rounded-full overflow-hidden border border-app-border relative shadow-inner">
                                      <div class="h-full bg-indigo-500" [style.width.%]="(editData.billing.apiCalls / editData.billing.apiLimit) * 100"></div>
                                   </div>
                                </div>

                                <div>
                                   <div class="flex justify-between items-end mb-2">
                                      <div>
                                         <div class="text-sm font-bold text-app-text">Database Storage</div>
                                         <div class="text-xs text-app-muted">Managed Postgres cluster</div>
                                      </div>
                                      <div class="text-sm font-mono font-bold text-app-text">
                                         {{ editData.billing.storageGb }}GB / {{ editData.billing.storageLimit }}GB
                                      </div>
                                   </div>
                                   <div class="w-full h-2 bg-app-bg rounded-full overflow-hidden border border-app-border relative shadow-inner">
                                      <div class="h-full bg-amber-500" [style.width.%]="(editData.billing.storageGb / editData.billing.storageLimit) * 100"></div>
                                   </div>
                                </div>
                             </div>
                          </div>
                       }
                    </div>
                 }

                 @case ('users') {
                    <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-5xl">
                       <div class="flex items-center justify-between mb-6">
                          <h2 class="text-2xl font-bold text-app-text">Users & Roles</h2>
                          <button class="bg-indigo-600 hover:bg-indigo-500 text-app-text px-4 py-2 rounded-lg text-sm font-bold shadow-md transition flex items-center gap-2">
                             <mat-icon class="!w-4 !h-4 !text-[16px]">person_add</mat-icon> Invite User
                          </button>
                       </div>

                       <div class="bg-app-card border border-app-border rounded-xl overflow-hidden shadow-sm">
                          <table class="w-full text-left border-collapse">
                             <thead>
                                <tr class="bg-app-bg border-b border-app-border text-xs uppercase tracking-widest text-app-muted">
                                   <th class="p-4 font-semibold">User</th>
                                   <th class="p-4 font-semibold">Role</th>
                                   <th class="p-4 font-semibold">Status</th>
                                   <th class="p-4 font-semibold text-right border-r border-app-border">Last Active</th>
                                   <th class="p-4 font-semibold text-center w-16"></th>
                                </tr>
                             </thead>
                             <tbody class="divide-y divide-app-border">
                                @for (user of editData.users; track user.id) {
                                   <tr class="hover:bg-app-bg/50 transition-colors">
                                      <td class="p-4">
                                         <div class="text-sm font-bold text-app-text">{{ user.name }}</div>
                                         <div class="text-xs text-app-muted mt-0.5">{{ user.email }}</div>
                                      </td>
                                      <td class="p-4">
                                         <span class="px-2 py-1 rounded text-[10px] font-bold border"
                                           [ngClass]="{
                                              'bg-purple-500/10 text-purple-400 border-purple-500/30': user.role === 'Owner',
                                              'bg-sky-500/10 text-sky-400 border-sky-500/30': user.role === 'Admin',
                                              'bg-app-bg text-app-muted border-app-border': user.role === 'Developer'
                                           }">{{ user.role }}</span>
                                      </td>
                                      <td class="p-4">
                                         <div class="flex items-center gap-1.5 text-xs">
                                            <span class="w-1.5 h-1.5 rounded-full" [ngClass]="user.status === 'Active' ? 'bg-emerald-400' : 'bg-amber-400'"></span>
                                            <span [ngClass]="user.status === 'Active' ? 'text-emerald-400' : 'text-amber-400'">{{ user.status }}</span>
                                         </div>
                                      </td>
                                      <td class="p-4 text-xs tabular-nums text-app-muted text-right border-r border-app-border">{{ user.lastActive | date:'MMM d, h:mm a' }}</td>
                                      <td class="p-4 text-center">
                                         <button class="text-app-muted hover:text-app-text transition">
                                            <mat-icon class="!w-[18px] !h-[18px] !text-[18px]">more_vert</mat-icon>
                                         </button>
                                      </td>
                                   </tr>
                                }
                                @if (!editData.users || editData.users.length === 0) {
                                   <tr>
                                      <td colspan="5" class="p-8 text-center text-app-muted">No users found for this project.</td>
                                   </tr>
                                }
                             </tbody>
                          </table>
                       </div>
                    </div>
                 }

                 @case ('apikeys') {
                    <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-5xl">
                       <div class="flex items-center justify-between mb-6">
                          <h2 class="text-2xl font-bold text-app-text">API Keys</h2>
                          <button class="bg-indigo-600 hover:bg-indigo-500 text-app-text px-4 py-2 rounded-lg text-sm font-bold shadow-md transition flex items-center gap-2">
                             <mat-icon class="!w-4 !h-4 !text-[16px]">key</mat-icon> Generate Key
                          </button>
                       </div>

                       <div class="bg-app-card border border-app-border rounded-xl overflow-hidden shadow-sm">
                          <table class="w-full text-left border-collapse">
                             <thead>
                                <tr class="bg-app-bg border-b border-app-border text-xs uppercase tracking-widest text-app-muted">
                                   <th class="p-4 font-semibold">Name & Key</th>
                                   <th class="p-4 font-semibold">Permissions</th>
                                   <th class="p-4 font-semibold">Created</th>
                                   <th class="p-4 font-semibold text-right">Last Used</th>
                                   <th class="p-4 font-semibold text-center w-24">Actions</th>
                                </tr>
                             </thead>
                             <tbody class="divide-y divide-app-border">
                                @for (key of editData.apiKeys; track key.id) {
                                   <tr class="hover:bg-app-bg/50 transition-colors group">
                                      <td class="p-4">
                                         <div class="text-sm font-bold text-app-text">{{ key.name }}</div>
                                         <div class="text-xs font-mono text-app-muted mt-1 flex items-center gap-2">
                                            <span class="bg-app-bg px-1.5 border border-app-border rounded py-0.5">{{ key.keyPrefix }}</span>
                                            <button class="text-app-muted hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition"><mat-icon class="!w-3 !h-3 !text-[12px]">content_copy</mat-icon></button>
                                         </div>
                                      </td>
                                      <td class="p-4">
                                         <div class="flex flex-wrap gap-1.5">
                                            @for (p of key.permissions; track p) {
                                               <span class="px-1.5 py-0.5 rounded text-[9px] uppercase bg-app-card border border-app-border text-app-text tracking-wider font-bold shadow-sm">{{ p }}</span>
                                            }
                                         </div>
                                      </td>
                                      <td class="p-4 text-xs tabular-nums text-app-muted">{{ key.created | date:'MMM d, y' }}</td>
                                      <td class="p-4 text-xs tabular-nums text-app-muted text-right">{{ key.lastUsed | date:'MMM d, h:mm a' }}</td>
                                      <td class="p-4 text-center">
                                         <button class="px-3 py-1 bg-app-bg border border-app-border text-[10px] uppercase tracking-wider rounded font-bold text-rose-500 hover:text-rose-400 hover:border-rose-500/30 transition">Revoke</button>
                                      </td>
                                   </tr>
                                }
                                @if (!editData.apiKeys || editData.apiKeys.length === 0) {
                                   <tr>
                                      <td colspan="5" class="p-8 text-center text-app-muted">No API keys found.</td>
                                   </tr>
                                }
                             </tbody>
                          </table>
                       </div>
                    </div>
                 }

                 @case ('policies') {
                     <app-project-policies [project]="project" (save)="onSaveSub($event)"></app-project-policies>
                  }
                  @case ('policies_legacy') {
                    <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-5xl">
                       <h2 class="text-2xl font-bold text-app-text mb-6">Advanced Policy Engine</h2>
                       
                       <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                          <!-- API Policies -->
                          <div class="bg-app-card border border-app-border rounded-xl flex flex-col shadow-sm">
                             <div class="p-5 border-b border-app-border flex items-center justify-between">
                                <h3 class="text-lg font-bold text-app-text flex items-center gap-2"><mat-icon class="text-indigo-400">gavel</mat-icon> Global Rate Limits</h3>
                             </div>
                             <div class="p-5 space-y-5 flex-grow">
                                <div>
                                   <label for="p-policy-rpm" class="block text-xs text-app-muted mb-1">Max RPM (Requests per min)</label>
                                   <input id="p-policy-rpm" type="number" [(ngModel)]="editData.policies.api.rpmLimit" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded text-app-text font-mono text-sm outline-none focus:border-indigo-500">
                                </div>
                                <div>
                                   <label for="p-policy-origins" class="block text-xs text-app-muted mb-1">Allowed Origins (CORS)</label>
                                   <input id="p-policy-origins" type="text" [(ngModel)]="editData.policies.api.allowedOrigins" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded text-app-text font-mono text-sm outline-none focus:border-indigo-500">
                                </div>
                             </div>
                          </div>

                          <!-- Security -->
                          <div class="bg-app-card border border-app-border rounded-xl flex flex-col shadow-sm">
                             <div class="p-5 border-b border-app-border flex items-center justify-between">
                                <h3 class="text-lg font-bold text-app-text flex items-center gap-2"><mat-icon class="text-amber-400">shield</mat-icon> Identity & Access</h3>
                             </div>
                             <div class="p-5 space-y-5 flex-grow">
                                <label for="chk-enforce-auth" class="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-app-border bg-app-bg hover:bg-app-card transition">
                                   <input id="chk-enforce-auth" type="checkbox" [(ngModel)]="editData.policies.security.authRequired" class="rounded bg-app-card border-app-border text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer">
                                   <span class="text-sm font-semibold text-app-text">Enforce Strict Authorization Header</span>
                                </label>
                                <div class="grid grid-cols-2 gap-4">
                                   <div>
                                      <label for="p-policy-expiry" class="block text-xs text-app-muted mb-1">Token Expiry (Min)</label>
                                      <input id="p-policy-expiry" type="number" [(ngModel)]="editData.policies.security.tokenExpiryMinutes" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded text-app-text font-mono text-sm outline-none focus:border-amber-500">
                                   </div>
                                   <div>
                                      <label for="p-policy-sessions" class="block text-xs text-app-muted mb-1">Max Sessions</label>
                                      <input id="p-policy-sessions" type="number" [(ngModel)]="editData.policies.security.sessionLimits" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded text-app-text font-mono text-sm outline-none focus:border-amber-500">
                                   </div>
                                </div>
                                <div>
                                   <label for="p-policy-geo" class="block text-xs text-app-muted mb-1">Geo Restrictions</label>
                                   <select id="p-policy-geo" [(ngModel)]="editData.policies.security.geoRestrictions" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded text-app-text text-sm outline-none focus:border-amber-500">
                                      <option value="None">None (Global Access)</option>
                                      <option value="Internal">Internal Network Only</option>
                                      <option value="US_EU">US / EU Only</option>
                                   </select>
                                </div>
                             </div>
                          </div>
                       </div>

                       <!-- Custom Rules Builder Visual -->
                       <div class="bg-app-card border border-app-border rounded-xl p-6 shadow-sm">
                          <div class="flex items-center justify-between mb-6">
                             <h3 class="text-lg font-bold text-app-text">Endpoint Routing Rules</h3>
                             <button class="text-xs bg-app-bg px-3 py-1.5 rounded border border-app-border text-app-text font-bold hover:bg-app-card transition">Add Route Rule</button>
                          </div>
                          <div class="space-y-3">
                             @for (rule of editData.policies.api.endpointLimits; track rule.endpoint) {
                                <div class="flex items-center gap-3 p-4 bg-app-bg border border-app-border rounded-lg shadow-inner">
                                   <div class="px-2 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] uppercase font-bold rounded">IF route</div>
                                   <span class="font-mono text-sm text-emerald-400 bg-emerald-500/10 px-2 rounded">{{ rule.endpoint }}</span>
                                   <div class="px-2 py-1 bg-amber-500/10 text-amber-400 text-[10px] uppercase font-bold rounded ml-4">THEN limit RPM to</div>
                                   <input [id]="'in-rule-rpm-' + rule.endpoint" type="number" [(ngModel)]="rule.maxRpm" class="w-20 px-2 py-1 bg-app-card border border-app-border rounded text-app-text font-mono text-sm text-center outline-none focus:border-amber-500">
                                   <button class="ml-auto flex items-center justify-center w-8 h-8 rounded-full hover:bg-rose-500/10 text-app-muted hover:text-rose-400 transition"><mat-icon class="!w-4 !h-4 !text-[16px]">close</mat-icon></button>
                                </div>
                             }
                             @if (!editData.policies.api.endpointLimits || editData.policies.api.endpointLimits.length === 0) {
                                <div class="p-6 text-center text-app-muted text-sm border border-dashed border-app-border rounded-lg">No custom routing rules defined. Global limits apply.</div>
                             }
                          </div>
                       </div>

                       <div class="mt-8 flex justify-end">
                          <button (click)="onSaveConfig()" class="bg-indigo-600 text-app-text px-6 py-2.5 rounded-lg font-bold text-sm transition hover:bg-indigo-500 shadow-md">Compile & Apply Policies</button>
                       </div>
                    </div>
                 }

                 @case ('security') {
                     <app-project-security [project]="project"></app-project-security>
                  }

                  @case ('whatsapp_billing') {
                     <app-whatsapp-billing [project]="project"></app-whatsapp-billing>
                  }

                  @case ('push_notifications') {
                     <app-project-push-notifications [project]="project"></app-project-push-notifications>
                  }

                 @case ('analytics') {
                     <app-project-api-monitor [project]="project"></app-project-api-monitor>
                  }
                  @case ('analytics_legacy') {
                    <div class="animate-in fade-in slide-in-from-bottom-2 duration-300">
                       <h2 class="text-2xl font-bold text-app-text mb-6">Analytics & Live Connection Stream</h2>
                       <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[600px]">
                          
                          <!-- Endpoint Analysis -->
                          <div class="col-span-2 bg-app-bg border border-app-border rounded-xl flex flex-col overflow-hidden shadow-sm">
                             <div class="p-4 border-b border-app-border bg-app-bg/80">
                                <h3 class="text-xs font-bold text-app-text uppercase tracking-widest">Routing Analysis</h3>
                             </div>
                             <div class="flex-grow overflow-y-auto custom-scrollbar">
                                <table class="w-full text-left">
                                   <thead class="bg-app-bg sticky top-0 border-b border-app-border shadow-sm z-10">
                                      <tr class="text-[9px] uppercase tracking-widest text-app-muted">
                                         <th class="px-4 py-3">Route Endpoint</th>
                                         <th class="px-4 py-3 text-right">Hits</th>
                                         <th class="px-4 py-3 text-right">Latency</th>
                                      </tr>
                                   </thead>
                                   <tbody class="divide-y divide-slate-800/50">
                                      @for (ep of cloudService.state().apiEndpoints; track ep.id) {
                                         <tr class="hover:bg-app-card/30 transition-colors">
                                            <td class="px-4 py-3 text-xs font-mono text-app-text">{{ ep.endpoint }}</td>
                                            <td class="px-4 py-3 text-xs font-mono text-app-muted text-right">{{ ep.hits | number }}</td>
                                            <td class="px-4 py-3 text-xs font-mono text-right flex items-center justify-end gap-2">
                                               <span [ngClass]="{'text-amber-400': ep.status === 'Slow', 'text-app-muted': ep.status !== 'Slow'}">{{ ep.avg }}ms</span>
                                            </td>
                                         </tr>
                                      }
                                   </tbody>
                                </table>
                             </div>
                          </div>

                          <!-- Live Stream Console -->
                          <div class="col-span-3 bg-app-bg border border-app-border rounded-xl flex flex-col overflow-hidden shadow-sm">
                             <div class="p-4 border-b border-app-border flex items-center justify-between bg-app-bg">
                                <div class="flex items-center gap-3">
                                   <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse relative shadow-[0_0_10px_rgba(16,185,129,0.7)]"></div>
                                   <h3 class="text-xs font-bold text-app-text font-mono tracking-wider uppercase">Live Connection Feed</h3>
                                </div>
                                <select class="bg-app-bg border border-app-border text-xs text-app-muted rounded px-3 py-1.5 outline-none hover:border-slate-600 transition">
                                   <option>All Connections</option>
                                   <option>Errors Only</option>
                                </select>
                             </div>
                             <div class="p-5 flex-grow overflow-y-auto space-y-2 font-mono text-[12px] h-full custom-scrollbar" id="stream-console">
                                <div class="flex items-start gap-4 opacity-50 hover:bg-app-bg/50 p-1 -mx-1 rounded">
                                   <span class="text-app-muted">10:45:00</span>
                                   <span class="text-emerald-400 w-10">GET</span>
                                   <span class="text-app-muted">/api/health</span>
                                   <span class="text-emerald-500/70 ml-auto">200 OK (12ms)</span>
                                </div>
                                <div class="flex items-start gap-4 opacity-70 hover:bg-app-bg/50 p-1 -mx-1 rounded">
                                   <span class="text-app-muted">10:45:02</span>
                                   <span class="text-indigo-400 w-10">POST</span>
                                   <span class="text-app-muted">/api/users</span>
                                   <span class="text-emerald-500/70 ml-auto">201 created (45ms)</span>
                                </div>
                                <div class="flex items-start gap-4 opacity-80 hover:bg-app-bg/50 p-1 -mx-1 rounded">
                                   <span class="text-app-muted">10:45:05</span>
                                   <span class="text-amber-400 w-10">PUT</span>
                                   <span class="text-app-muted">/api/config</span>
                                   <span class="text-emerald-500/70 ml-auto">200 OK (120ms)</span>
                                </div>
                                <div class="flex items-start gap-4 border border-rose-500/20 bg-rose-500/5 p-2 rounded -mx-1 mt-2 mb-2">
                                   <span class="text-rose-500 w-16">10:45:10</span>
                                   <span class="text-rose-400 font-bold w-10">ERR</span>
                                   <div class="flex-grow">
                                       <span class="text-rose-300">/api/checkout</span>
                                       <div class="text-rose-400/80 mt-1">500 Internal Server Error • Rate limit exceeded (limit=100)</div>
                                   </div>
                                </div>
                                <div class="flex items-start gap-4 hover:bg-app-bg/50 p-1 -mx-1 rounded">
                                   <span class="text-app-muted">10:45:12</span>
                                   <span class="text-emerald-400 w-10">GET</span>
                                   <span class="text-app-muted">/api/products</span>
                                   <span class="text-emerald-500/70 ml-auto">200 OK (22ms)</span>
                                </div>
                                <div class="text-app-muted animate-pulse mt-6 text-center italic">Waiting for events...</div>
                             </div>
                          </div>

                       </div>
                    </div>
                 }

                 @case ('database') {
                     <app-project-database [project]="project"></app-project-database>
                  }
                  @case ('database_legacy') {
                    <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-5xl">
                       <h2 class="text-2xl font-bold text-app-text mb-6">Database Management & Backups</h2>
                       <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                          <!-- Config -->
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
                                  <button class="w-full py-2.5 bg-app-bg hover:bg-app-card text-app-text border border-app-border rounded-lg text-sm font-bold transition shadow-sm">Simulate Test Connection</button>
                               </div>
                            </div>
                          </div>
                          
                          <!-- Scale -->
                          <div class="bg-app-bg border border-app-border rounded-xl p-6 flex flex-col justify-center items-center text-center shadow-sm">
                              <div class="font-mono text-6xl font-black text-indigo-400 mb-2 drop-shadow-md">{{ cloudService.state().dbConfig.queryLoad }}%</div>
                              <div class="text-xs font-bold text-app-muted uppercase tracking-widest mt-1">Current Cluster Load</div>
                              <div class="mt-6 text-xs text-app-text flex items-center justify-center gap-4 bg-app-bg px-5 py-2.5 rounded-full border border-app-border shadow-inner">
                                 <span class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-slate-600"></div>Connections: <strong class="text-app-text">{{ cloudService.state().dbConfig.activeConnections }}</strong></span>
                                 <span class="w-px h-3 bg-slate-700"></span>
                                 <span class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-emerald-500"></div>Health: <strong class="text-emerald-400">Excellent</strong></span>
                              </div>
                          </div>
                       </div>

                       <div class="bg-app-bg border border-app-border rounded-xl p-0 shadow-sm overflow-hidden">
                          <div class="px-6 py-4 flex items-center justify-between border-b border-app-border bg-app-bg">
                             <h3 class="text-sm font-bold text-app-text uppercase tracking-widest">Snapshot Backups</h3>
                             <button class="px-4 py-1.5 bg-app-bg border border-app-border text-app-text rounded text-xs font-bold hover:bg-app-card transition">Take Manual Backup</button>
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
                                @for (backup of editData.backups; track backup.id) {
                                   <tr class="hover:bg-app-card/30 transition-colors">
                                      <td class="p-4 text-sm text-app-text font-mono">{{ backup.date | date:'medium' }}</td>
                                      <td class="p-4 text-xs text-app-muted">pg_dump (gzip)</td>
                                      <td class="p-4 text-sm text-app-muted font-mono text-right">{{ backup.sizeMb }} MB</td>
                                      <td class="p-4 text-center">
                                         <span class="px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Available</span>
                                      </td>
                                      <td class="p-4 text-right border-l border-app-border">
                                         <button class="text-xs font-bold text-indigo-400 hover:text-indigo-300 mr-4 transition">Restore</button>
                                         <button class="text-xs font-bold text-app-muted hover:text-app-text transition">Download</button>
                                      </td>
                                   </tr>
                                }
                                @if (!editData.backups || editData.backups.length === 0) {
                                   <tr><td colspan="5" class="p-8 text-center text-app-muted">No backups found.</td></tr>
                                }
                             </tbody>
                          </table>
                       </div>
                    </div>
                 }

                 @case ('deployments') {
                     <app-project-deployments [project]="project"></app-project-deployments>
                  }
                  @case ('deployments_legacy') {
                    <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-4xl">
                       <div class="flex items-center justify-between mb-6">
                          <h2 class="text-2xl font-bold text-app-text">Artifact Deployment Pipeline</h2>
                          <button class="bg-indigo-500 hover:bg-indigo-400 text-app-text px-5 py-2.5 rounded-lg text-sm font-bold shadow-md transition flex items-center gap-2">
                             <mat-icon class="!w-4 !h-4 !text-[16px]">file_upload</mat-icon> Manual Deploy
                          </button>
                       </div>
                       <div class="space-y-4">
                          @for (dep of cloudService.state().deployments; track dep.id) {
                             <div class="p-5 border border-app-border rounded-xl bg-app-bg flex items-center justify-between hover:bg-app-card/50 transition cursor-pointer shadow-sm relative overflow-hidden group">
                                @if (dep.status === 'Deploying') {
                                   <div class="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 animate-pulse"></div>
                                } @else if (dep.status === 'Success') {
                                   <div class="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                                } @else {
                                   <div class="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 opacity-50"></div>
                                }
                                <div class="pl-2">
                                   <div class="flex items-center gap-3 mb-1.5">
                                      <span class="font-mono font-bold text-app-text text-lg tracking-tight">{{ dep.version }}</span>
                                      <span class="text-xs bg-app-bg px-2.5 py-0.5 rounded text-app-muted border border-app-border tabular-nums">{{ dep.time | date:'MMM d, h:mm a' }}</span>
                                   </div>
                                   <div class="text-xs text-app-muted mt-1">Source: Main branch • Commit <span class="font-mono text-app-muted bg-app-bg px-1 rounded border border-app-border">8f3a2c</span></div>
                                   @if (dep.status === 'Deploying') {
                                      <div class="mt-4">
                                         <div class="w-64 h-1.5 bg-app-bg rounded-full overflow-hidden border border-app-border shadow-inner">
                                            <div class="h-full bg-indigo-500 animate-pulse transition-all" [style.width.%]="dep.progress"></div>
                                         </div>
                                      </div>
                                   }
                                </div>
                                <div class="flex items-center gap-3">
                                   <span class="text-[10px] uppercase font-bold tracking-widest mr-4"
                                         [ngClass]="{
                                           'text-emerald-400': dep.status === 'Success',
                                           'text-amber-400': dep.status === 'Deploying',
                                           'text-rose-400': dep.status === 'Failed'
                                         }">{{ dep.status }}</span>
                                   <button class="px-3 py-1.5 bg-app-bg border border-app-border text-app-text rounded text-xs font-bold hover:bg-app-card transition shadow-sm">View Logs</button>
                                   @if (dep.status === 'Success') {
                                      <button class="text-app-muted hover:text-app-text transition w-5 flex justify-center"><mat-icon class="!w-[18px] !h-[18px] !text-[18px]">more_vert</mat-icon></button>
                                   }
                                </div>
                             </div>
                          }
                       </div>
                    </div>
                 }

                 @case ('workflows') {
                    <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-5xl">
                       <div class="flex items-center justify-between mb-8">
                          <h2 class="text-2xl font-bold text-app-text">Alerts & Automation Workflows</h2>
                          <button class="bg-indigo-500 hover:bg-indigo-400 text-app-text px-4 py-2 rounded-lg text-sm font-bold shadow-md transition flex items-center gap-2">
                             <mat-icon class="!w-4 !h-4 !text-[16px]">add</mat-icon> Create Trigger
                          </button>
                       </div>

                       <div class="bg-app-bg border border-app-border rounded-xl overflow-hidden mb-10 shadow-sm">
                          <table class="w-full text-left">
                             <thead class="bg-app-bg border-b border-app-border text-[10px] uppercase tracking-widest text-app-muted">
                                <tr>
                                   <th class="p-4">Active Alert Rules</th>
                                   <th class="p-4">Conditions</th>
                                   <th class="p-4">Action Pipeline</th>
                                   <th class="p-4 text-center">Status</th>
                                </tr>
                             </thead>
                             <tbody class="divide-y divide-slate-800">
                                @for (alert of editData.alerts; track alert.id) {
                                   <tr class="hover:bg-app-card/30 transition-colors">
                                      <td class="p-4 text-sm font-bold text-app-text">{{ alert.name }}</td>
                                      <td class="p-4 text-xs font-mono text-amber-500/90">{{ alert.condition }}</td>
                                      <td class="p-4">
                                         <span class="px-2 py-1 bg-app-bg border border-app-border text-app-text text-xs rounded shadow-sm">{{ alert.action }}</span>
                                      </td>
                                      <td class="p-4 text-center">
                                         <label [for]="'chk-alert-' + alert.id" class="relative inline-flex items-center cursor-pointer">
                                            <input [id]="'chk-alert-' + alert.id" type="checkbox" [(ngModel)]="alert.enabled" class="sr-only peer">
                                            <div class="w-9 h-5 bg-app-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-app-card after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                                         </label>
                                      </td>
                                   </tr>
                                }
                                @if (!editData.alerts || editData.alerts.length === 0) {
                                   <tr><td colspan="4" class="p-8 text-center text-app-muted">No active alerts configured.</td></tr>
                                }
                             </tbody>
                          </table>
                       </div>

                       <!-- Workflow Visual Placeholder -->
                       <div class="bg-app-bg border border-app-border rounded-xl p-10 border-dashed flex flex-col items-center justify-center text-center">
                          <div class="w-16 h-16 bg-app-bg rounded-full flex items-center justify-center border border-app-border mb-5 shadow-sm">
                             <mat-icon class="text-indigo-400 !w-8 !h-8 !text-[32px]">account_tree</mat-icon>
                          </div>
                          <h3 class="text-lg font-bold text-app-text mb-2">Visual Automation Builder</h3>
                          <p class="text-sm text-app-muted max-w-md mx-auto mb-6">Create complex if/then pipelines. For example: Trigger a serverless function when a specific database row is written.</p>
                          <button class="bg-app-card text-app-text px-6 py-2.5 rounded-lg font-bold text-sm transition hover:text-app-text hover:bg-app-bg shadow border border-app-border">Open Builder Canvas</button>
                       </div>
                    </div>
                 }

                 @case ('integrations') {
                     <app-project-integrations [project]="project"></app-project-integrations>
                  }
                  @case ('integrations_legacy') {
                    <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10 max-w-5xl">
                        <h2 class="text-2xl font-bold text-app-text mb-8">Extensions & Service Integrations</h2>
                        
                        <h3 class="text-xs font-bold text-app-muted uppercase tracking-widest mb-4">Installed Plugins</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                           @for (plugin of editData.plugins; track plugin.id) {
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
                                    <input [id]="'chk-plugin-' + plugin.id" type="checkbox" [(ngModel)]="plugin.enabled" class="sr-only peer">
                                    <div class="w-9 h-5 bg-app-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-app-card after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                                 </label>
                              </div>
                           }
                        </div>

                        <h3 class="text-xs font-bold text-app-muted uppercase tracking-widest mb-4">Core Communications Services</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <!-- WhatsApp -->
                           <div class="bg-app-bg border border-app-border rounded-xl flex flex-col shadow-sm">
                              <div class="p-5 border-b border-app-border flex items-center justify-between">
                                 <h3 class="text-lg font-bold text-app-text flex items-center gap-2"><mat-icon class="text-emerald-500">chat</mat-icon> WhatsApp Gateway</h3>
                                 <label for="chk-wa-enabled" class="relative inline-flex items-center cursor-pointer">
                                    <input id="chk-wa-enabled" type="checkbox" [(ngModel)]="cloudService.state().whatsapp.enabled" class="sr-only peer">
                                    <div class="w-9 h-5 bg-app-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-app-card after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                                 </label>
                              </div>
                              <div class="p-5 space-y-4 flex-grow transition-opacity" [class.opacity-40]="!cloudService.state().whatsapp.enabled">
                                 <div>
                                    <label for="p-wa-token" class="block text-xs text-app-muted mb-1">Access Token</label>
                                    <input id="p-wa-token" type="password" [(ngModel)]="cloudService.state().whatsapp.token" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded text-app-text font-mono text-sm outline-none focus:border-emerald-500/50">
                                 </div>
                                 <div>
                                    <label for="p-wa-phone" class="block text-xs text-app-muted mb-1">Phone Number ID</label>
                                    <input id="p-wa-phone" type="text" [(ngModel)]="cloudService.state().whatsapp.phoneId" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded text-app-text font-mono text-sm outline-none focus:border-emerald-500/50">
                                 </div>
                              </div>
                           </div>

                           <!-- Email -->
                           <div class="bg-app-bg border border-app-border rounded-xl flex flex-col shadow-sm">
                              <div class="p-5 border-b border-app-border flex items-center justify-between">
                                 <h3 class="text-lg font-bold text-app-text flex items-center gap-2"><mat-icon class="text-indigo-400">mail</mat-icon> SMTP Relay</h3>
                                 <label for="chk-email-enabled" class="relative inline-flex items-center cursor-pointer">
                                    <input id="chk-email-enabled" type="checkbox" [(ngModel)]="cloudService.state().email.enabled" class="sr-only peer">
                                    <div class="w-9 h-5 bg-app-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-app-card after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500 shadow-inner"></div>
                                 </label>
                              </div>
                              <div class="p-5 space-y-4 flex-grow transition-opacity" [class.opacity-40]="!cloudService.state().email.enabled">
                                 <div>
                                    <label for="p-smtp-host" class="block text-xs text-app-muted mb-1">SMTP Host</label>
                                    <input id="p-smtp-host" type="text" [(ngModel)]="cloudService.state().email.host" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded text-app-text font-mono text-sm outline-none focus:border-indigo-500/50">
                                 </div>
                                 <div class="flex gap-4">
                                    <div class="w-full">
                                       <label for="p-smtp-user" class="block text-xs text-app-muted mb-1">Username</label>
                                       <input id="p-smtp-user" type="text" [(ngModel)]="cloudService.state().email.username" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded text-app-text font-mono text-sm outline-none focus:border-indigo-500/50">
                                    </div>
                                    <div class="w-24 shrink-0">
                                       <label for="p-smtp-port" class="block text-xs text-app-muted mb-1">Port</label>
                                       <input id="p-smtp-port" type="number" [(ngModel)]="cloudService.state().email.port" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded text-app-text font-mono text-sm outline-none focus:border-indigo-500/50">
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                 }

                 @case ('audit') {
                    <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-6xl pb-10">
                       <div class="flex items-center justify-between mb-6">
                          <h2 class="text-2xl font-bold text-app-text">System Audit Trail</h2>
                          <div class="flex gap-3">
                             <button class="bg-app-bg border border-app-border hover:bg-app-card text-app-text px-4 py-2 rounded-lg text-sm transition flex items-center gap-2 shadow-sm font-bold">
                                <mat-icon class="!w-4 !h-4 !text-[16px]">filter_list</mat-icon> Filter Results
                             </button>
                             <button class="bg-indigo-500 hover:bg-indigo-400 border border-indigo-400 text-app-text px-4 py-2 rounded-lg text-sm transition shadow-sm font-bold">Export CSV</button>
                          </div>
                       </div>

                       <div class="bg-app-bg border border-app-border rounded-xl overflow-hidden shadow-sm">
                          <table class="w-full text-left border-collapse">
                             <thead>
                                <tr class="bg-app-bg border-b border-app-border text-[10px] uppercase tracking-widest text-app-muted">
                                   <th class="p-4 font-semibold">Timestamp</th>
                                   <th class="p-4 font-semibold">Actor / User</th>
                                   <th class="p-4 font-semibold">Action Performed</th>
                                   <th class="p-4 font-semibold">Affected Resource</th>
                                   <th class="p-4 font-semibold text-right border-l border-app-border">Source IP</th>
                                </tr>
                             </thead>
                             <tbody class="divide-y divide-slate-800">
                                @for (log of editData.auditLogs; track log.id) {
                                   <tr class="hover:bg-app-card/30 transition-colors">
                                      <td class="p-4 text-xs tabular-nums text-app-muted font-mono">{{ log.timestamp | date:'MMM d, y, h:mm:ss a' }}</td>
                                      <td class="p-4 text-xs font-bold" [ngClass]="log.user === 'System' ? 'text-indigo-400' : 'text-app-text'">
                                         <div class="flex items-center gap-2">
                                            <div class="w-5 h-5 rounded bg-app-bg border border-app-border flex items-center justify-center">
                                               <mat-icon class="!w-3 !h-3 !text-[12px] opacity-70">{{ log.user === 'System' ? 'smart_toy' : 'person' }}</mat-icon>
                                            </div>
                                            {{ log.user }}
                                         </div>
                                      </td>
                                      <td class="p-4 text-sm text-app-text">{{ log.action }}</td>
                                      <td class="p-4">
                                         <span class="text-[10px] font-mono text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 uppercase">{{ log.resource }}</span>
                                      </td>
                                      <td class="p-4 text-xs font-mono text-app-muted text-right border-l border-app-border">{{ log.ip }}</td>
                                   </tr>
                                }
                                @if (!editData.auditLogs || editData.auditLogs.length === 0) {
                                   <tr><td colspan="5" class="p-8 text-center text-app-muted">No events recorded.</td></tr>
                                }
                             </tbody>
                          </table>
                       </div>
                    </div>
                 }
              }
           } @else {
              <div class="flex items-center justify-center h-full text-app-muted flex-col gap-4">
                 <mat-icon class="!w-16 !h-16 !text-[64px] opacity-20">inventory_2</mat-icon>
                 Project Not Found
              </div>
           }
        </div>
      </main>

      <!-- Toast Notification rendered from Store Service -->
      @if (store.toast().visible) {
        <div id="toast-wrapper-detail" class="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 font-sans bg-app-bg/95 text-app-text border-app-border">
          <mat-icon class="!w-5 !h-5 !text-[20px] shrink-0" 
                    [class]="store.toast().type === 'success' ? 'text-emerald-400' : store.toast().type === 'error' ? 'text-rose-400' : 'text-amber-400'">
            {{ store.toast().type === 'success' ? 'check_circle' : store.toast().type === 'error' ? 'error' : 'info' }}
          </mat-icon>
          <span class="text-sm font-medium">{{ store.toast().message }}</span>
        </div>
      }
      
      <style>
         .custom-scrollbar::-webkit-scrollbar {
             width: 6px;
         }
         .custom-scrollbar::-webkit-scrollbar-track {
             background: transparent; 
         }
         .custom-scrollbar::-webkit-scrollbar-thumb {
             background: rgba(148, 163, 184, 0.2); 
             border-radius: 10px;
         }
         .custom-scrollbar::-webkit-scrollbar-thumb:hover {
             background: rgba(148, 163, 184, 0.4); 
         }
      </style>
    </div>
  `
})
export class ProjectDetailComponent implements OnInit {
  projectService = inject(ProjectDetailService);
  cloudService = inject(AdminCloudService); 
  store = inject(AdminStoreService);
  route = inject(ActivatedRoute);
  router = inject(Router);

  isMobileMenuOpen = signal(false);
  isAppSwitchOpen = signal(false);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (this.isAppSwitchOpen() && !target.closest('.app-switcher-container')) {
      this.isAppSwitchOpen.set(false);
    }
  }

  getActiveSectionIcon(): string {
    const section = this.activeSection();
    for (const group of this.navGroups) {
      const item = group.items.find(i => i.id === section);
      if (item) return item.icon;
    }
    return 'menu';
  }

  getActiveSectionLabel(): string {
    const section = this.activeSection();
    for (const group of this.navGroups) {
      const item = group.items.find(i => i.id === section);
      if (item) return item.label;
    }
    return 'Menu';
  }

  navGroups = [
    {
      group: 'General',
      items: [
        { id: 'overview', label: 'Overview', icon: 'dashboard' },
        { id: 'config', label: 'Configuration', icon: 'tune' },
        { id: 'billing', label: 'Billing & Usage', icon: 'credit_card' },
        { id: 'services', label: 'Ecosystem Services', icon: 'dns' }
      ]
    },
    {
      group: 'Access & Security',
      items: [
        { id: 'users', label: 'Users & Roles', icon: 'people' },
        { id: 'apikeys', label: 'API Keys', icon: 'key' },
        { id: 'policies', label: 'Advanced Policies', icon: 'gavel' },
        { id: 'security', label: 'Security Center', icon: 'shield' }
      ]
    },
    {
      group: 'Monitoring & Ops',
      items: [
        { id: 'analytics', label: 'Analytics & Stream', icon: 'stream' },
        { id: 'whatsapp_billing', label: 'WhatsApp Billing', icon: 'chat' },
        { id: 'push_notifications', label: 'Push Notifications', icon: 'notifications_active' },
        { id: 'database', label: 'Database & Backups', icon: 'storage' },
        { id: 'deployments', label: 'Deployments', icon: 'rocket_launch' },
        { id: 'workflows', label: 'Alerts & Workflows', icon: 'account_tree' },
        { id: 'integrations', label: 'Extensions & Plugins', icon: 'extension' },
        { id: 'audit', label: 'System Audit Logs', icon: 'history' }
      ]
    }
  ];

  activeSection = signal<string>('overview');
  editData: ProjectData = {} as ProjectData;

  getFirebaseCost(): number {
    const p = this.projectService.currentProject();
    if (p && (p as any).firebaseBilling && (p as any).firebaseBilling.totalCost !== undefined && (p as any).firebaseBilling.totalCost !== null) {
      return (p as any).firebaseBilling.totalCost;
    }
    if (p && (p.cached_metrics as any)?.billingCost?.totalCost !== undefined && (p.cached_metrics as any)?.billingCost?.totalCost !== null) {
      return (p.cached_metrics as any).billingCost.totalCost;
    }
    return 0;
  }

  getWhatsAppCost(): number {
    const p = this.projectService.currentProject();
    if (p && (p as any).waSummary && (p as any).waSummary.estimatedCost !== undefined && (p as any).waSummary.estimatedCost !== null) {
      return (p as any).waSummary.estimatedCost;
    }
    return 0;
  }

  constructor() {
    effect(() => {
      const p = this.projectService.currentProject();
      if (p) {
        this.editData = JSON.parse(JSON.stringify(p)) as ProjectData;

        if (this.editData.billing) {
          const fbCost = this.getFirebaseCost();
          const waCost = this.getWhatsAppCost();
          this.editData.billing.currentSpend = fbCost + waCost;
          
          const waEstimate = (p as any).waSummary?.monthlyEstimate || waCost;
          this.editData.billing.estimatedSpend = fbCost + waEstimate;
        }
        
        // Sync database configurations to the cloudService state signal
        this.cloudService.state.update(s => ({
          ...s,
          whatsapp: {
            ...s.whatsapp,
            enabled: p.whatsapp?.enabled ?? false,
            token: p.whatsapp?.api_key || '',
            phoneId: p.whatsapp?.phone_number || ''
          },
          email: {
            ...s.email,
            enabled: p.email?.enabled ?? false,
            host: p.email?.smtp_host || '',
            username: p.email?.user || '',
            port: Number(p.email?.smtp_port || 587)
          }
        }));
      }
    });
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id && !id.includes('.')) {
        this.projectService.loadProject(id);
      }
    });
  }

  onSaveConfig() {
     const p = this.projectService.currentProject();
     if (p) {
        this.projectService.updateProject(p.id, this.editData).subscribe();
     }
  }

  onSaveSub(partial: Partial<ProjectData>) {
     const p = this.projectService.currentProject();
     if (p) {
        this.projectService.updateProject(p.id, partial).subscribe();
     }
  }
}
