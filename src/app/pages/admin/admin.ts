import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AdminMasterService, AdminApp } from '../../services/admin-master.service';
import { AdminStoreService } from '../../services/admin-store.service';
import { AjrAdminAppCard, AjrRateConfig } from './admin-components';
import { UiConfigService } from '../../services/ui-config.service';
import { HeroSliderConfigComponent } from './hero-slider-config/hero-slider-config';
import { ApiService } from '../../services/api.service';
import { AdminBillingComponent } from './billing/billing.component';

@Component({
  selector: 'app-admin-master',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatIconModule, AjrAdminAppCard, AjrRateConfig, HeroSliderConfigComponent, AdminBillingComponent],
  template: `
    <div class="min-h-screen bg-app-bg font-sans pb-20 text-app-text fade-in">
      
      <!-- Top Global Header representing Master Control -->
      <header class="bg-app-card border-b border-app-border py-6 px-4 sm:px-6 lg:px-8 shadow-sm">
        <div class="max-w-[1500px] mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
           <div>
             <h1 class="text-3xl font-black text-app-text flex items-center gap-3">
                <mat-icon class="text-indigo-600 !w-[32px] !h-[32px] !text-[32px]">admin_panel_settings</mat-icon>
                Master Control Panel
             </h1>
             <p class="text-app-muted font-medium mt-1 pl-[44px]">Brain of the Digital HUB Platform.</p>
           </div>
           
           <!-- System Status Overview -->
           <div class="flex items-center justify-between w-full md:w-auto gap-6 bg-app-bg border border-app-border rounded-2xl px-5 py-3">
              <div class="flex flex-col flex-1 items-center md:items-start">
                 <span class="text-[10px] items-center gap-1.5 uppercase font-bold text-app-muted tracking-wider flex">
                    <mat-icon class="!w-[12px] !h-[12px] !text-[12px]">dns</mat-icon> Global Apps
                 </span>
                 <span class="text-xl font-black text-app-text">{{ adminService.apps().length }} Active</span>
              </div>
              <div class="w-px h-8 bg-app-border"></div>
              <div class="flex flex-col flex-1 items-center md:items-start">
                 <span class="text-[10px] items-center gap-1.5 uppercase font-bold text-app-muted tracking-wider flex">
                    <mat-icon class="!w-[12px] !h-[12px] !text-[12px]">data_usage</mat-icon> API Volume
                 </span>
                 <span class="text-xl font-black text-indigo-500">{{ adminService.staticAnalytics().totalRequests | number }}</span>
              </div>
           </div>
        </div>
      </header>

      <!-- Welcome Tour Guide Alert Box -->
      @if (showTour()) {
        <div class="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div class="bg-gradient-to-r from-indigo-900/60 to-purple-900/40 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div class="relative z-10 space-y-1">
              <div class="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <mat-icon class="!w-4 !h-4 !text-[16px] animate-bounce">auto_awesome</mat-icon>
                Interactive Console Walkthrough (Step {{ currentTourStep() + 1 }} of {{ tourSteps.length }})
              </div>
              <h3 class="text-lg font-black text-app-text">{{ tourSteps[currentTourStep()].title }}</h3>
              <p class="text-sm text-indigo-200/80 max-w-3xl leading-relaxed">{{ tourSteps[currentTourStep()].description }}</p>
            </div>
            
            <div class="shrink-0 flex items-center gap-3 relative z-10">
              @if (currentTourStep() < tourSteps.length - 1) {
                <button (click)="nextTourStep()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-app-text rounded-xl text-xs font-bold transition-all cursor-pointer">
                  Next Step
                </button>
              } @else {
                <button (click)="dismissTour()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-app-text rounded-xl text-xs font-bold transition-all cursor-pointer">
                  Complete Tour
                </button>
              }
              <button (click)="dismissTour()" class="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-app-muted rounded-xl text-xs font-bold transition-all cursor-pointer border border-app-border">
                Skip
              </button>
            </div>
            <div class="absolute right-0 bottom-0 top-0 w-1/3 bg-radial-gradient from-indigo-500/10 to-transparent pointer-events-none"></div>
          </div>
        </div>
      }

      <!-- Main Layout -->
      <main class="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex flex-col lg:flex-row gap-8 relative">
        
        <!-- Left Sidebar Main Navigation for Admin -->
        <aside class="w-full lg:w-64 shrink-0 animate-in duration-300">
           <div class="bg-app-card border border-app-border rounded-xl lg:rounded-2xl p-3 lg:p-4 shadow-sm top-16 lg:top-24 sticky z-20">
             <!-- Desktop Navigation Sidebar -->
             <nav class="hidden lg:flex lg:flex-col lg:space-y-1">
               <button (click)="activeSection.set('applications')" [class]="activeSection() === 'applications' ? 'bg-indigo-50/20 text-indigo-500 font-bold border border-indigo-500/10' : 'text-app-text hover:bg-app-bg hover:text-indigo-400 border border-transparent'" class="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left">
                  <span class="flex items-center gap-2"><mat-icon class="!w-[18px] !h-[18px] !text-[18px]">apps</mat-icon> Applications</span>
                  @if(adminService.apps().length > 0) {
                     <span class="bg-app-bg text-[10px] md:text-xs px-2 py-0.5 rounded shadow-sm border border-app-border">{{ adminService.apps().length }}</span>
                  }
               </button>
               <button (click)="activeSection.set('config')" [class]="activeSection() === 'config' ? 'bg-indigo-50/20 text-indigo-500 font-bold border border-indigo-500/10' : 'text-app-text hover:bg-app-bg hover:text-indigo-400 border border-transparent'" class="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all text-left">
                  <mat-icon class="!w-[18px] !h-[18px] !text-[18px]">settings</mat-icon> Global Config
               </button>
               <button (click)="activeSection.set('ratelimit')" [class]="activeSection() === 'ratelimit' ? 'bg-indigo-50/20 text-indigo-500 font-bold border border-indigo-500/10' : 'text-app-text hover:bg-app-bg hover:text-indigo-400 border border-transparent'" class="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all text-left">
                  <mat-icon class="!w-[18px] !h-[18px] !text-[18px]">security</mat-icon> Engine & Limits
               </button>
               <button (click)="activeSection.set('comms')" [class]="activeSection() === 'comms' ? 'bg-indigo-50/20 text-indigo-500 font-bold border border-indigo-500/10' : 'text-app-text hover:bg-app-bg hover:text-indigo-400 border border-transparent'" class="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all text-left">
                  <mat-icon class="!w-[18px] !h-[18px] !text-[18px]">contact_phone</mat-icon> WhatsApp & Email Setup
               </button>
               <button (click)="activeSection.set('billing')" [class]="activeSection() === 'billing' ? 'bg-indigo-50/20 text-indigo-500 font-bold border border-indigo-500/10' : 'text-app-text hover:bg-app-bg hover:text-indigo-400 border border-transparent'" class="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all text-left">
                  <mat-icon class="!w-[18px] !h-[18px] !text-[18px]">receipt_long</mat-icon> Automated Billing
               </button>
               <button (click)="activeSection.set('services')" [class]="activeSection() === 'services' ? 'bg-indigo-50/20 text-indigo-500 font-bold border border-indigo-500/10' : 'text-app-text hover:bg-app-bg hover:text-indigo-400 border border-transparent'" class="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all text-left">
                  <mat-icon class="!w-[18px] !h-[18px] !text-[18px]">cloud_done</mat-icon> Service Status Monitor
               </button>
               <button (click)="activeSection.set('analytics')" [class]="activeSection() === 'analytics' ? 'bg-indigo-50/20 text-indigo-500 font-bold border border-indigo-500/10' : 'text-app-text hover:bg-app-bg hover:text-indigo-400 border border-transparent'" class="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all text-left">
                  <mat-icon class="!w-[18px] !h-[18px] !text-[18px]">insights</mat-icon> Telemetry & Stats
               </button>
               
               <div class="hidden md:block h-px bg-app-border my-2"></div>
               
               <button (click)="onSystemCoreClick()" class="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-cyan-600 hover:bg-cyan-500/10 transition-all text-left border border-dashed border-cyan-500/40 shadow-xs">
                  <mat-icon class="!w-[18px] !h-[18px] !text-[18px] text-cyan-500 animate-pulse">dns</mat-icon> System Core Monitor ⭐
               </button>
               <button (click)="router.navigate(['/admin/marketplace-config'])" class="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-amber-500 hover:bg-amber-500/10 transition-all text-left border border-dashed border-amber-500/40 mt-2 shadow-xs">
                  <mat-icon class="!w-[18px] !h-[18px] !text-[18px] text-amber-500">storefront</mat-icon> Marketplace Config ⭐
               </button>
               <button (click)="router.navigate(['/admin/customers'])" class="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-indigo-400 hover:bg-indigo-500/10 transition-all text-left border border-dashed border-indigo-500/30 mt-2 shadow-xs cursor-pointer">
                  <mat-icon class="!w-[18px] !h-[18px] !text-[18px] text-indigo-400">group</mat-icon> Customers Registry ⭐
               </button>
               <button (click)="router.navigate(['/admin/documentation'])" class="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-indigo-400 hover:bg-indigo-500/10 transition-all text-left border border-dashed border-indigo-500/30 mt-2 shadow-xs cursor-pointer">
                  <mat-icon class="!w-[18px] !h-[18px] !text-[18px] text-indigo-400">menu_book</mat-icon> Manage Docs ⭐
               </button>
               <button (click)="activeSection.set('heroslider')" [class]="activeSection() === 'heroslider' ? 'bg-indigo-50/20 text-indigo-400 font-bold border border-indigo-500/10' : 'text-app-text hover:bg-app-bg hover:text-indigo-400 border border-transparent'" class="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all text-left border border-dashed border-indigo-500/30 mt-2 cursor-pointer">
                  <mat-icon class="!w-[18px] !h-[18px] !text-[18px] text-indigo-400">slideshow</mat-icon> Website Hero Slider ⭐
               </button>
               <button (click)="activeSection.set('growth')" [class]="activeSection() === 'growth' ? 'bg-indigo-50/20 text-emerald-400 font-bold border border-indigo-500/10' : 'text-app-text hover:bg-app-bg hover:text-emerald-400 border border-transparent'" class="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all text-left border border-dashed border-emerald-500/30 mt-2 cursor-pointer">
                  <mat-icon class="!w-[18px] !h-[18px] !text-[18px] text-emerald-400">trending_up</mat-icon> Growth & A/B Test ⭐
               </button>
             </nav>

             <!-- Mobile Navigation Trigger and Floating Menu -->
             <div class="lg:hidden relative w-full">
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

                <!-- Floating Dropdown list -->
                @if (isMobileMenuOpen()) {
                   <div class="absolute left-0 right-0 mt-1.5 bg-app-card border border-app-border rounded-xl shadow-xl z-30 p-1.5 max-h-[60vh] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                      <div class="flex flex-col gap-0.5">
                         <button (click)="activeSection.set('applications'); isMobileMenuOpen.set(false)" [class]="activeSection() === 'applications' ? 'bg-indigo-50/20 text-indigo-500 font-bold border border-indigo-500/10' : 'text-app-text hover:bg-app-bg hover:text-indigo-400 border border-transparent'" class="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left">
                            <span class="flex items-center gap-2"><mat-icon class="!w-[16px] !h-[16px] !text-[16px]">apps</mat-icon> Applications</span>
                            @if(adminService.apps().length > 0) {
                               <span class="bg-app-bg text-[10px] px-1.5 py-0.5 rounded border border-app-border">{{ adminService.apps().length }}</span>
                            }
                         </button>
                         <button (click)="activeSection.set('config'); isMobileMenuOpen.set(false)" [class]="activeSection() === 'config' ? 'bg-indigo-50/20 text-indigo-500 font-bold border border-indigo-500/10' : 'text-app-text hover:bg-app-bg hover:text-indigo-400 border border-transparent'" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left">
                            <mat-icon class="!w-[16px] !h-[16px] !text-[16px]">settings</mat-icon> Global Config
                         </button>
                         <button (click)="activeSection.set('ratelimit'); isMobileMenuOpen.set(false)" [class]="activeSection() === 'ratelimit' ? 'bg-indigo-50/20 text-indigo-500 font-bold border border-indigo-500/10' : 'text-app-text hover:bg-app-bg hover:text-indigo-400 border border-transparent'" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left">
                            <mat-icon class="!w-[16px] !h-[16px] !text-[16px]">security</mat-icon> Engine & Limits
                         </button>
                         <button (click)="activeSection.set('comms'); isMobileMenuOpen.set(false)" [class]="activeSection() === 'comms' ? 'bg-indigo-50/20 text-indigo-500 font-bold border border-indigo-500/10' : 'text-app-text hover:bg-app-bg hover:text-indigo-400 border border-transparent'" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left">
                            <mat-icon class="!w-[16px] !h-[16px] !text-[16px]">contact_phone</mat-icon> WhatsApp Setup
                         </button>
                         <button (click)="activeSection.set('billing'); isMobileMenuOpen.set(false)" [class]="activeSection() === 'billing' ? 'bg-indigo-50/20 text-indigo-500 font-bold border border-indigo-500/10' : 'text-app-text hover:bg-app-bg hover:text-indigo-400 border border-transparent'" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left">
                            <mat-icon class="!w-[16px] !h-[16px] !text-[16px]">receipt_long</mat-icon> Automated Billing
                         </button>
                         <button (click)="activeSection.set('services'); isMobileMenuOpen.set(false)" [class]="activeSection() === 'services' ? 'bg-indigo-50/20 text-indigo-500 font-bold border border-indigo-500/10' : 'text-app-text hover:bg-app-bg hover:text-indigo-400 border border-transparent'" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left">
                            <mat-icon class="!w-[16px] !h-[16px] !text-[16px]">cloud_done</mat-icon> Service Status Monitor
                         </button>
                         <button (click)="activeSection.set('analytics'); isMobileMenuOpen.set(false)" [class]="activeSection() === 'analytics' ? 'bg-indigo-50/20 text-indigo-500 font-bold border border-indigo-500/10' : 'text-app-text hover:bg-app-bg hover:text-indigo-400 border border-transparent'" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left">
                            <mat-icon class="!w-[16px] !h-[16px] !text-[16px]">insights</mat-icon> Telemetry & Stats
                         </button>
                         
                         <div class="h-px bg-app-border my-1"></div>
                         
                         <button (click)="onSystemCoreClick(); isMobileMenuOpen.set(false)" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-cyan-600 hover:bg-cyan-500/10 transition-all text-left border border-dashed border-cyan-500/40">
                            <mat-icon class="!w-[16px] !h-[16px] !text-[16px] text-cyan-500">dns</mat-icon> System Core Monitor ⭐
                         </button>
                         <button (click)="router.navigate(['/admin/marketplace-config']); isMobileMenuOpen.set(false)" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-amber-500 hover:bg-amber-500/10 transition-all text-left border border-dashed border-amber-500/40">
                            <mat-icon class="!w-[16px] !h-[16px] !text-[16px] text-amber-500">storefront</mat-icon> Marketplace Config ⭐
                         </button>
                         <button (click)="router.navigate(['/admin/customers']); isMobileMenuOpen.set(false)" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-indigo-400 hover:bg-indigo-500/10 transition-all text-left border border-dashed border-indigo-500/30">
                            <mat-icon class="!w-[16px] !h-[16px] !text-[16px] text-indigo-400">group</mat-icon> Customers Registry ⭐
                         </button>
                         <button (click)="router.navigate(['/admin/documentation']); isMobileMenuOpen.set(false)" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-indigo-400 hover:bg-indigo-500/10 transition-all text-left border border-dashed border-indigo-500/30">
                            <mat-icon class="!w-[16px] !h-[16px] !text-[16px] text-indigo-400">menu_book</mat-icon> Manage Docs ⭐
                         </button>
                         <button (click)="activeSection.set('heroslider'); isMobileMenuOpen.set(false)" [class]="activeSection() === 'heroslider' ? 'bg-indigo-50/20 text-indigo-400 font-bold border border-indigo-500/10' : 'text-app-text hover:bg-app-bg hover:text-indigo-400 border border-transparent'" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left border border-dashed border-indigo-500/30 cursor-pointer">
                            <mat-icon class="!w-[16px] !h-[16px] !text-[16px] text-indigo-400">slideshow</mat-icon> Hero Slider ⭐
                         </button>
                         <button (click)="activeSection.set('growth'); isMobileMenuOpen.set(false)" [class]="activeSection() === 'growth' ? 'bg-indigo-50/20 text-emerald-400 font-bold border border-emerald-500/10' : 'text-app-text hover:bg-app-bg hover:text-emerald-400 border border-transparent'" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left border border-dashed border-emerald-500/30 cursor-pointer">
                            <mat-icon class="!w-[16px] !h-[16px] !text-[16px] text-emerald-400">trending_up</mat-icon> Growth & A/B Test ⭐
                         </button>
                      </div>
                   </div>
                }
             </div>
             
             <div class="hidden lg:block mt-6 pt-4 border-t border-app-border">
                <div class="bg-indigo-600 border border-indigo-500/30 text-app-text rounded-xl p-4 shadow-lg shadow-indigo-600/20 flex flex-col gap-1">
                   <div class="flex items-center gap-2 font-bold text-sm">
                      <div class="w-2 h-2 rounded-full bg-emerald-400"></div>
                      Control Core Active
                   </div>
                   <p class="text-[10px] text-indigo-100 font-mono select-all">SYSTEM_ONLINE</p>
                </div>
             </div>
           </div>
        </aside>

        <!-- Right Content Area -->
        <div class="flex-grow font-sans">
            <!-- Hero Slider Config Component -->
            @if (activeSection() === 'heroslider') {
               <div class="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <app-hero-slider-config></app-hero-slider-config>
               </div>
            }
           
           <!-- Applications View -->
           @if (activeSection() === 'applications') {
              <div class="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div class="flex justify-between items-center mb-6">
                     <h2 class="text-2xl font-bold text-app-text">Managed Applications</h2>
                     <button (click)="showProvisionForm.set(!showProvisionForm())" class="bg-indigo-600 text-app-text px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:scale-105 transition-transform flex items-center gap-2 cursor-pointer">
                        <mat-icon class="!w-[18px] !h-[18px] !text-[18px]">{{ showProvisionForm() ? 'close' : 'add' }}</mat-icon>
                        {{ showProvisionForm() ? 'Cancel Provision' : 'Provision App' }}
                     </button>
                  </div>

                  <!-- Provisioning Form Container -->
                  @if (showProvisionForm()) {
                    <div class="bg-app-card border border-app-border rounded-2xl p-6 mb-8 shadow-lg animate-in slide-in-from-top-3 duration-300">
                       <h3 class="text-sm font-bold uppercase tracking-wider text-indigo-400 mb-4 flex items-center gap-2">
                         <mat-icon>add_box</mat-icon> Setup New Application Instance
                       </h3>
                       <form (ngSubmit)="provisionApplication()" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                           <label class="block text-xs text-app-muted uppercase font-semibold mb-1">Application Name</label>
                           <input type="text" [(ngModel)]="newApp.name" name="name" required class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-sm outline-none focus:ring-1 focus:ring-indigo-500" placeholder="e.g. Acme Billing Portal">
                         </div>
                         <div>
                           <label class="block text-xs text-app-muted uppercase font-semibold mb-1">Routing Domain</label>
                           <input type="text" [(ngModel)]="newApp.domain" name="domain" required class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-sm outline-none focus:ring-1 focus:ring-indigo-500 font-mono" placeholder="e.g. acme.ajrdev.com">
                         </div>
                         <div>
                           <label class="block text-xs text-app-muted uppercase font-semibold mb-1">Compute Plan</label>
                           <select [(ngModel)]="newApp.plan" name="plan" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-sm outline-none cursor-pointer">
                             <option value="Lite">Lite (Free)</option>
                             <option value="Standard">Standard (Pay As Go)</option>
                             <option value="Pro">Pro Plan (High Speed)</option>
                             <option value="Enterprise">Enterprise Node (Dedicated)</option>
                           </select>
                         </div>
                         <div>
                           <label class="block text-xs text-app-muted uppercase font-semibold mb-1">Target Environment</label>
                           <select [(ngModel)]="newApp.environment" name="environment" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-sm outline-none cursor-pointer">
                             <option value="Production">Production Edge (Global)</option>
                             <option value="Staging">Staging (Internal)</option>
                             <option value="Sandbox">Sandbox (Test)</option>
                           </select>
                         </div>
                          
                          <!-- Firebase Integration Optional Fields -->
                          <div class="col-span-full border-t border-app-border pt-4 mt-2">
                            <span class="block text-xs font-bold uppercase tracking-wider text-orange-500 mb-2 flex items-center gap-1.5">
                              <mat-icon class="!w-4 !h-4 !text-[16px]">sync</mat-icon> Firebase Integration (Optional)
                            </span>
                            <p class="text-[11px] text-app-muted mb-4">Provide Firebase config parameters if you want to enable NOC Telemetry, Real-time Logs and Storage monitoring for this application.</p>
                          </div>
                          
                          <div>
                            <label class="block text-xs text-app-muted uppercase font-semibold mb-1">Firebase Project ID</label>
                            <input type="text" [(ngModel)]="newApp.firebase_project_id" name="firebase_project_id" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-sm outline-none focus:ring-1 focus:ring-orange-500 font-mono" placeholder="e.g. acme-billing">
                          </div>
                          <div>
                            <label class="block text-xs text-app-muted uppercase font-semibold mb-1">Firebase API Key</label>
                            <input type="password" [(ngModel)]="newApp.firebase_api_key" name="firebase_api_key" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-sm outline-none focus:ring-1 focus:ring-orange-500 font-mono" placeholder="e.g. AIzaSy...">
                          </div>
                          <div>
                            <label class="block text-xs text-app-muted uppercase font-semibold mb-1">Firebase Auth Domain</label>
                            <input type="text" [(ngModel)]="newApp.firebase_auth_domain" name="firebase_auth_domain" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-sm outline-none focus:ring-1 focus:ring-orange-500 font-mono" placeholder="e.g. acme-billing.firebaseapp.com">
                          </div>
                          <div>
                            <label class="block text-xs text-app-muted uppercase font-semibold mb-1">Firebase Storage Bucket</label>
                            <input type="text" [(ngModel)]="newApp.firebase_storage_bucket" name="firebase_storage_bucket" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-sm outline-none focus:ring-1 focus:ring-orange-500 font-mono" placeholder="e.g. acme-billing.firebasestorage.app">
                          </div>
                          <div class="col-span-full">
                            <label class="block text-xs text-app-muted uppercase font-semibold mb-1">Firebase App ID (Web App)</label>
                            <input type="text" [(ngModel)]="newApp.firebase_app_id" name="firebase_app_id" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-sm outline-none focus:ring-1 focus:ring-orange-500 font-mono" placeholder="e.g. 1:1234567890:web:abcdef123456">
                          </div>

                          <div class="col-span-full flex justify-end gap-3 pt-4 border-t border-app-border mt-4">
                            <button type="button" (click)="showProvisionForm.set(false)" class="px-4 py-2 bg-transparent text-app-muted text-xs font-semibold rounded-xl hover:text-app-text transition-colors">Discard</button>
                            <button type="submit" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-app-text rounded-xl text-xs font-bold transition-all shadow-md">Deploy App Node</button>
                          </div>
                       </form>
                    </div>
                  }

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                     @for (app of adminService.apps(); track app.id) {
                        <ajr-admin-app-card [app]="app" (selectApp)="onAppClick($event)"></ajr-admin-app-card>
                     }
                  </div>
              </div>
           }

           <!-- Global Config View -->
           @if (activeSection() === 'config') {
              <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-2xl">
                 <h2 class="text-2xl font-bold text-app-text mb-6 flex items-center gap-2 text-indigo-600"><mat-icon>settings</mat-icon> Platform Configuration</h2>
                 
                 <div class="bg-app-card border border-app-border rounded-2xl p-6 shadow-sm space-y-6">
                    <div>
                       <label for="in-master-name" class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Platform Master Name</label>
                       <input id="in-master-name" type="text" [(ngModel)]="localWebsiteConfig.siteName" class="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-md font-semibold text-app-text outline-none focus:ring-2 focus:ring-indigo-500">
                    </div>
                    
                    <div>
                       <div class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Platform Theme Engine</div>
                       <div class="flex flex-wrap gap-4">
                          <button id="btn-theme-light" (click)="setLocalTheme('light')" class="flex-1 min-w-[120px] px-4 py-3 border-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer" [class.border-indigo-600]="localWebsiteConfig.theme === 'light'" [class.text-indigo-600]="localWebsiteConfig.theme === 'light'" [class.bg-indigo-50/10]="localWebsiteConfig.theme === 'light'" [class.border-app-border]="localWebsiteConfig.theme !== 'light'">
                             <mat-icon>light_mode</mat-icon> Light
                          </button>
                          <button id="btn-theme-dark" (click)="setLocalTheme('dark')" class="flex-1 min-w-[120px] px-4 py-3 border-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer" [class.border-cyan-500]="localWebsiteConfig.theme === 'dark'" [class.text-cyan-400]="localWebsiteConfig.theme === 'dark'" [class.bg-app-bg]="localWebsiteConfig.theme === 'dark'" [class.border-app-border]="localWebsiteConfig.theme !== 'dark'">
                             <mat-icon>dark_mode</mat-icon> Dark
                          </button>
                       </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-app-border">
                       <div>
                          <div class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Animations (Motion)</div>
                          <button type="button" (click)="toggleLocalAnimations()" [class]="animationsEnabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-app-bg text-app-muted border-app-border'" class="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black uppercase border transition-all cursor-pointer">
                             <mat-icon>{{ animationsEnabled ? 'blur_on' : 'blur_off' }}</mat-icon>
                             {{ animationsEnabled ? 'ON (FLUID)' : 'OFF (STATIC)' }}
                          </button>
                       </div>
                       <div>
                          <div class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Layout Density</div>
                          <div class="flex gap-2">
                             <button type="button" (click)="layoutDensity = 'comfortable'" [class]="layoutDensity === 'comfortable' ? 'border-indigo-500 text-indigo-500 bg-indigo-500/10' : 'border-app-border text-app-text bg-transparent' " class="flex-1 py-2.5 rounded-xl text-xs flex justify-center border transition-all cursor-pointer font-bold">Comfortable</button>
                             <button type="button" (click)="layoutDensity = 'compact'" [class]="layoutDensity === 'compact' ? 'border-indigo-500 text-indigo-500 bg-indigo-500/10' : 'border-app-border text-app-text bg-transparent' " class="flex-1 py-1.5 rounded-xl text-xs flex justify-center border transition-all cursor-pointer font-bold">Compact</button>
                          </div>
                       </div>
                    </div>

                    <div class="pt-6 border-t border-app-border">
                       <div class="flex items-center justify-between p-4 rounded-xl border border-rose-500/30 bg-rose-500/5">
                            <div>
                               <span class="text-sm font-bold text-rose-500 block">System Maintenance Mode</span>
                               <span class="text-xs text-rose-500/80 mt-0.5">Disconnects all public traffic. Admin only.</span>
                            </div>
                            <div class="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                               <input id="in-maint-mode" type="checkbox" [(ngModel)]="localWebsiteConfig.globalFeatures.maintenanceMode" class="toggle-checkbox absolute block w-5 h-5 rounded-full bg-app-card border-4 appearance-none cursor-pointer border-rose-200 focus:outline-none top-0 left-0 transition-transform duration-200 ease-in-out" [class.translate-x-5]="localWebsiteConfig.globalFeatures.maintenanceMode" [class.border-rose-500]="localWebsiteConfig.globalFeatures.maintenanceMode" [class.bg-rose-500]="localWebsiteConfig.globalFeatures.maintenanceMode"/>
                               <div class="toggle-label block overflow-hidden h-5 rounded-full bg-app-card cursor-pointer transition-colors duration-200 ease-in-out" [class.bg-rose-500/30]="localWebsiteConfig.globalFeatures.maintenanceMode"></div>
                            </div>
                       </div>
                    </div>

                    <div class="flex justify-end pt-4 border-t border-app-border">
                      <button (click)="saveWebsiteConfig()" class="bg-indigo-600 hover:bg-indigo-500 text-app-text px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg transition-transform cursor-pointer">
                        Commit Configurations
                      </button>
                    </div>
                 </div>
              </div>
           }

           <!-- Rate Limit View -->
           @if (activeSection() === 'ratelimit') {
              <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-2xl">
                 <ajr-rate-config [config]="adminService.rateLimiter()"></ajr-rate-config>
              </div>
           }

           <!-- Billing View -->
           @if (activeSection() === 'billing') {
              <div class="animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <app-admin-billing></app-admin-billing>
              </div>
           }

           <!-- Service Status Monitor View -->
           @if (activeSection() === 'services') {
             <div class="animate-in fade-in slide-in-from-bottom-2 duration-300">
               <h2 class="text-2xl font-bold text-app-text mb-6 flex items-center gap-2 text-indigo-600">
                 <mat-icon>cloud_done</mat-icon> Service Status Monitor
               </h2>
               
               <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                 @for (srv of servicesList(); track srv.id) {
                   <div class="bg-app-card border border-app-border rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[160px]">
                     <div class="flex justify-between items-start">
                       <div>
                         <h3 class="text-lg font-bold text-app-text flex items-center gap-2">{{ srv.name }}</h3>
                         <p class="text-xs text-app-muted mt-1 leading-relaxed">{{ srv.description }}</p>
                       </div>
                       
                       <span class="px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border font-mono tracking-wider flex items-center gap-1.5"
                         [ngClass]="srv.status === 'running' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'">
                         <span class="w-1.5 h-1.5 rounded-full" [ngClass]="srv.status === 'running' ? 'bg-emerald-400' : 'bg-rose-400'"></span>
                         {{ srv.status === 'running' ? 'ONLINE' : 'DOWN' }}
                       </span>
                     </div>
                     
                     <div class="mt-4 pt-4 border-t border-app-border flex justify-between items-center">
                       <span class="text-xs font-mono text-app-muted">Metrics: <strong class="text-app-text font-bold">{{ srv.metrics }}</strong></span>
                       <button (click)="toggleServiceState(srv.id)" class="px-4 py-1.5 bg-app-bg hover:bg-app-card border border-app-border rounded-xl text-xs font-bold transition-all cursor-pointer">
                         {{ srv.status === 'running' ? 'Stop Node' : 'Start Node' }}
                       </button>
                     </div>
                   </div>
                 }
               </div>
             </div>
           }

           <!-- WhatsApp & Email Setup View -->
           @if (activeSection() === 'comms') {
             <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-2xl">
               <h2 class="text-2xl font-bold text-app-text mb-6 flex items-center gap-2 text-indigo-600">
                 <mat-icon>contact_phone</mat-icon> WhatsApp & Email Setup
               </h2>
               
               @if (commsConfig()) {
                 <div class="space-y-6">
                   <!-- Keys & Host config -->
                   <div class="bg-app-card border border-app-border rounded-2xl p-6 shadow-sm space-y-4">
                     <h3 class="text-xs font-bold text-indigo-400 uppercase tracking-wider">Gateway Configuration</h3>
                     
                     <div class="grid grid-cols-1 gap-4">
                       <div>
                         <label class="block text-xs text-app-muted uppercase font-semibold mb-1.5">WhatsApp API Key</label>
                         <input type="text" [(ngModel)]="commsConfig().whatsappApiKey" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-sm outline-none focus:ring-1 focus:ring-indigo-500 font-mono">
                       </div>
                       
                       <div>
                         <label class="block text-xs text-app-muted uppercase font-semibold mb-1.5">Email Provider API Key (SendGrid)</label>
                         <input type="text" [(ngModel)]="commsConfig().emailApiKey" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-sm outline-none focus:ring-1 focus:ring-indigo-500 font-mono">
                       </div>
                       
                       <div class="grid grid-cols-3 gap-3">
                         <div class="col-span-2">
                           <label class="block text-xs text-app-muted uppercase font-semibold mb-1.5">SMTP Host</label>
                           <input type="text" [(ngModel)]="commsConfig().smtpHost" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-sm outline-none focus:ring-1 focus:ring-indigo-500 font-mono">
                         </div>
                         <div>
                           <label class="block text-xs text-app-muted uppercase font-semibold mb-1.5">SMTP Port</label>
                           <input type="number" [(ngModel)]="commsConfig().smtpPort" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-sm outline-none focus:ring-1 focus:ring-indigo-500 font-mono">
                         </div>
                       </div>
                     </div>
                   </div>

                   <!-- Live Usage Telemetry -->
                   <div class="bg-app-card border border-app-border rounded-2xl p-6 shadow-sm">
                     <h3 class="text-xs font-bold text-pink-400 uppercase tracking-wider mb-4">Delivery Telemetry</h3>
                     
                     <div class="grid grid-cols-2 gap-4">
                       <div class="bg-app-bg border border-app-border rounded-xl p-4 text-center">
                         <span class="text-[10px] text-app-muted uppercase font-bold tracking-wider">WhatsApp Sent</span>
                         <p class="text-xl font-mono font-black text-indigo-400 mt-1">{{ commsConfig().whatsappUsageCount }} messages</p>
                         <span class="text-[9px] text-rose-500 mt-0.5 block font-semibold">{{ commsConfig().whatsappFailureCount }} failures</span>
                       </div>
                       <div class="bg-app-bg border border-app-border rounded-xl p-4 text-center">
                         <span class="text-[10px] text-app-muted uppercase font-bold tracking-wider">Emails Sent</span>
                         <p class="text-xl font-mono font-black text-pink-400 mt-1">{{ commsConfig().emailUsageCount }} mails</p>
                         <span class="text-[9px] text-rose-500 mt-0.5 block font-semibold">{{ commsConfig().emailFailureCount }} failures</span>
                       </div>
                     </div>
                   </div>

                   <div class="flex justify-end">
                     <button (click)="saveCommsConfig()" [disabled]="isSavingComms()" class="bg-indigo-600 hover:bg-indigo-500 text-app-text px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg transition-transform cursor-pointer disabled:opacity-50">
                       {{ isSavingComms() ? 'Saving...' : 'Commit Gateway Keys' }}
                     </button>
                   </div>
                 </div>
               } @else {
                 <div class="flex justify-center py-12">
                   <div class="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
                 </div>
               }
             </div>
           }

           <!-- Analytics View -->
           @if (activeSection() === 'analytics') {
              <div class="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h2 class="text-2xl font-bold text-app-text mb-6 flex items-center gap-2 text-indigo-600"><mat-icon>insights</mat-icon> Master Telemetry Insight</h2>
                  
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                     <div class="bg-app-card border border-app-border rounded-2xl p-6 shadow-sm">
                        <div class="text-xs uppercase font-bold text-app-muted tracking-wider mb-2">Total Requests</div>
                        <div class="text-3xl font-black text-app-text">{{ telemetryData()?.totalRequests | number }}</div>
                     </div>
                     <div class="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 shadow-sm">
                        <div class="text-xs uppercase font-bold text-app-muted tracking-wider mb-2">Active Users</div>
                        <div class="text-3xl font-black text-emerald-400">{{ telemetryData()?.activeUsers | number }}</div>
                     </div>
                     <div class="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6 shadow-sm">
                        <div class="text-xs uppercase font-bold text-app-muted tracking-wider mb-2">Estimated Revenue (₹)</div>
                        <div class="text-3xl font-black text-indigo-400">₹{{ (telemetryData()?.revenue || 0) | number }}</div>
                     </div>
                  </div>

                  <!-- Charts Layout -->
                  <div class="bg-app-card border border-app-border rounded-2xl p-6 shadow-sm">
                     <h3 class="text-sm font-bold text-app-text mb-6">Hourly Edge Request Distribution</h3>
                     <div class="h-64 flex items-end justify-between gap-2 px-2 border-b border-app-border pb-2">
                        @for (day of adminService.staticAnalytics().apiUsage; track day.date) {
                           <div class="flex-1 flex flex-col items-center gap-2 group">
                              <div class="w-full bg-indigo-500/20 rounded-t-lg transition-all group-hover:bg-indigo-600 relative flex items-end justify-center" [style.height.%]="(day.requests / 25000) * 100">
                                 <span class="absolute -top-7 text-[10px] font-bold text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity bg-app-card px-2 py-1 rounded shadow-sm border border-indigo-500/30 font-mono">{{ day.requests }}</span>
                              </div>
                              <span class="text-xs font-bold text-app-muted">{{ day.date }}</span>
                           </div>
                        }
                     </div>
                  </div>
               </div>
            }
 
            <!-- Growth Telemetry View -->
            @if (activeSection() === 'growth') {
               <div class="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                     <div>
                        <h2 class="text-2xl font-bold text-app-text flex items-center gap-2 text-indigo-600">
                           <mat-icon>trending_up</mat-icon> Growth & Conversion Optimizer
                        </h2>
                        <p class="text-app-muted text-xs mt-1">Configure split tests, override live telemetry, and deploy conversion triggers.</p>
                     </div>
                     <button (click)="saveGrowthConfig()" [disabled]="isSavingGrowth() || !growthConfig()" class="bg-indigo-600 text-app-text hover:bg-indigo-500 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-600/20 hover:scale-102 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50">
                        <mat-icon>{{ isSavingGrowth() ? 'hourglass_empty' : 'bolt' }}</mat-icon>
                        {{ isSavingGrowth() ? 'Saving...' : 'Deploy Configurations' }}
                     </button>
                  </div>

                  @if (growthConfig()) {
                     <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        
                        <!-- Configuration Form -->
                        <div class="lg:col-span-8 space-y-6">
                           
                           <!-- A/B Testing Panel -->
                           <div class="bg-app-card border border-app-border rounded-2xl p-6 shadow-sm space-y-6">
                              <h3 class="text-xs font-bold text-app-text border-b border-app-border pb-3 uppercase tracking-wider flex items-center gap-2">
                                 <mat-icon class="text-indigo-600 !w-[16px] !h-[16px] !text-[16px]">call_split</mat-icon> A/B Hero Split-Testing
                              </h3>
                              
                              <div>
                                 <label class="block text-[10px] font-bold uppercase tracking-wider text-app-muted mb-2">Active Hero Target</label>
                                 <select [(ngModel)]="growthConfig().activeHeroVersion" class="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm font-semibold text-app-text outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value="A">Force Version A (Features)</option>
                                    <option value="B">Force Version B (Productivity)</option>
                                    <option value="AB">A/B Split-Testing Mode</option>
                                 </select>
                              </div>

                              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-app-border">
                                 
                                 <!-- A Panel -->
                                 <div class="space-y-4">
                                    <h4 class="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                                       <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> Version A (Features)
                                    </h4>
                                    <div>
                                       <label class="block text-[9px] font-bold uppercase text-app-muted mb-1">Subtitle</label>
                                       <input type="text" [(ngModel)]="growthConfig().heroSubTitleA" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs font-semibold text-app-text outline-none focus:ring-2 focus:ring-indigo-500">
                                    </div>
                                    <div>
                                       <label class="block text-[9px] font-bold uppercase text-app-muted mb-1">Title</label>
                                       <input type="text" [(ngModel)]="growthConfig().heroTitleA" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs font-semibold text-app-text outline-none focus:ring-2 focus:ring-indigo-500">
                                    </div>
                                    <div>
                                       <label class="block text-[9px] font-bold uppercase text-app-muted mb-1">CTA Text</label>
                                       <input type="text" [(ngModel)]="growthConfig().heroCtaA" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs font-semibold text-app-text outline-none focus:ring-2 focus:ring-indigo-500">
                                    </div>
                                 </div>

                                 <!-- B Panel -->
                                 <div class="space-y-4 border-t md:border-t-0 md:border-l border-app-border md:pl-6">
                                    <h4 class="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                                       <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> Version B (Productivity)
                                    </h4>
                                    <div>
                                       <label class="block text-[9px] font-bold uppercase text-app-muted mb-1">Subtitle</label>
                                       <input type="text" [(ngModel)]="growthConfig().heroSubTitleB" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs font-semibold text-app-text outline-none focus:ring-2 focus:ring-indigo-500">
                                    </div>
                                    <div>
                                       <label class="block text-[9px] font-bold uppercase text-app-muted mb-1">Title</label>
                                       <input type="text" [(ngModel)]="growthConfig().heroTitleB" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs font-semibold text-app-text outline-none focus:ring-2 focus:ring-indigo-500">
                                    </div>
                                    <div>
                                       <label class="block text-[9px] font-bold uppercase text-app-muted mb-1">CTA Text</label>
                                       <input type="text" [(ngModel)]="growthConfig().heroCtaB" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs font-semibold text-app-text outline-none focus:ring-2 focus:ring-indigo-500">
                                    </div>
                                 </div>

                              </div>
                           </div>

                           <!-- Psychological Conversion Triggers -->
                           <div class="bg-app-card border border-app-border rounded-2xl p-6 shadow-sm space-y-6">
                              <h3 class="text-xs font-bold text-app-text border-b border-app-border pb-3 uppercase tracking-wider flex items-center gap-2">
                                 <mat-icon class="text-pink-500 !w-[16px] !h-[16px] !text-[16px]">psychology</mat-icon> Psychological Triggers
                              </h3>

                              <!-- FOMO Ticker -->
                              <div class="space-y-2">
                                 <div class="flex items-center justify-between">
                                    <span class="text-xs font-bold text-app-text">FOMO (Real-time Viewers Ticker)</span>
                                    <label class="relative inline-flex items-center cursor-pointer select-none">
                                       <input type="checkbox" [(ngModel)]="growthConfig().fomoEnabled" class="sr-only peer">
                                       <div class="w-9 h-5 bg-app-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                 </div>
                                 @if (growthConfig().fomoEnabled) {
                                    <input type="text" [(ngModel)]="growthConfig().fomoMessage" placeholder="FOMO text..." class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs font-semibold text-app-text outline-none focus:ring-2 focus:ring-indigo-500">
                                 }
                              </div>

                              <!-- Countdown clock -->
                              <div class="border-t border-app-border pt-4 space-y-2">
                                 <div class="flex items-center justify-between">
                                    <span class="text-xs font-bold text-app-text">Urgency Countdown Offer</span>
                                    <label class="relative inline-flex items-center cursor-pointer select-none">
                                       <input type="checkbox" [(ngModel)]="growthConfig().countdownEnabled" class="sr-only peer">
                                       <div class="w-9 h-5 bg-app-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                 </div>
                                 @if (growthConfig().countdownEnabled) {
                                    <div>
                                       <label class="block text-[9px] font-bold uppercase text-app-muted mb-1">Countdown Expiry Date (ISO Format)</label>
                                       <input type="text" [(ngModel)]="growthConfig().countdownEndTime" placeholder="e.g. 2026-06-30T00:00:00.000Z" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs font-semibold text-app-text outline-none focus:ring-2 focus:ring-indigo-500 font-mono">
                                    </div>
                                 }
                              </div>

                              <!-- Social Proof -->
                              <div class="border-t border-app-border pt-4 space-y-2">
                                 <div class="flex items-center justify-between">
                                    <span class="text-xs font-bold text-app-text">Social Proof Strip</span>
                                    <label class="relative inline-flex items-center cursor-pointer select-none">
                                       <input type="checkbox" [(ngModel)]="growthConfig().socialProofEnabled" class="sr-only peer">
                                       <div class="w-9 h-5 bg-app-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                 </div>
                                 @if (growthConfig().socialProofEnabled) {
                                    <input type="text" [(ngModel)]="growthConfig().socialProofMessage" placeholder="Social proof banner message..." class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs font-semibold text-app-text outline-none focus:ring-2 focus:ring-indigo-500">
                                 }
                              </div>
                           </div>

                           <!-- Analytics Metrics Injection -->
                           <div class="bg-app-card border border-app-border rounded-2xl p-6 shadow-sm space-y-6">
                              <h3 class="text-xs font-bold text-app-text border-b border-app-border pb-3 uppercase tracking-wider flex items-center gap-2">
                                 <mat-icon class="text-emerald-500 !w-[16px] !h-[16px] !text-[16px]">analytics</mat-icon> Analytics Metrics Overrides
                              </h3>
                              <p class="text-[10px] text-app-muted mt-[-12px]">These simulated values are injected dynamically on the landing page hero and public metrics panel.</p>

                              <div class="grid grid-cols-2 gap-4">
                                 <div>
                                    <label class="block text-[9px] font-bold uppercase text-app-muted mb-1">Active Users</label>
                                    <input type="number" [(ngModel)]="growthConfig().activeUsersOverride" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs font-semibold text-app-text outline-none focus:ring-2 focus:ring-indigo-500 font-mono">
                                 </div>
                                 <div>
                                    <label class="block text-[9px] font-bold uppercase text-app-muted mb-1">Daily API Calls</label>
                                    <input type="number" [(ngModel)]="growthConfig().apiCallsOverride" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs font-semibold text-app-text outline-none focus:ring-2 focus:ring-indigo-500 font-mono">
                                 </div>
                                 <div>
                                    <label class="block text-[9px] font-bold uppercase text-app-muted mb-1">Simulated Revenue (₹)</label>
                                    <input type="number" [(ngModel)]="growthConfig().revenueOverride" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs font-semibold text-app-text outline-none focus:ring-2 focus:ring-indigo-500 font-mono">
                                 </div>
                                 <div>
                                    <label class="block text-[9px] font-bold uppercase text-app-muted mb-1">Apps Deployed</label>
                                    <input type="number" [(ngModel)]="growthConfig().appsDeployedOverride" class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs font-semibold text-app-text outline-none focus:ring-2 focus:ring-indigo-500 font-mono">
                                 </div>
                              </div>
                           </div>

                        </div>

                        <!-- Telemetry Comparison Sidebar -->
                        <div class="lg:col-span-4 space-y-6">
                           <div class="bg-app-card border border-app-border rounded-2xl p-6 shadow-sm space-y-6 sticky top-24">
                              <h3 class="text-xs font-bold text-app-text border-b border-app-border pb-3 uppercase tracking-wider flex items-center gap-2">
                                 <mat-icon class="text-amber-500 !w-[16px] !h-[16px] !text-[16px]">insights</mat-icon> Split Test Telemetry
                              </h3>

                              <!-- Version A stats -->
                              <div class="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-xl space-y-2">
                                 <div class="flex justify-between items-center text-xs font-bold uppercase text-indigo-400">
                                    <span>Version A</span>
                                    @if (growthConfig().viewsA && (growthConfig().conversionsA/growthConfig().viewsA >= growthConfig().conversionsB/(growthConfig().viewsB || 1))) {
                                       <span class="bg-emerald-500/10 text-emerald-400 text-[8px] px-2 py-0.5 rounded border border-emerald-400/20 font-mono">WINNING</span>
                                    }
                                 </div>
                                 <div class="grid grid-cols-3 gap-2 text-center pt-2">
                                    <div>
                                       <span class="text-[8px] font-mono text-app-muted block uppercase">Views</span>
                                       <span class="text-xs font-bold text-app-text font-mono">{{ growthConfig().viewsA || 0 }}</span>
                                    </div>
                                    <div>
                                       <span class="text-[8px] font-mono text-app-muted block uppercase">Convs</span>
                                       <span class="text-xs font-bold text-app-text font-mono">{{ growthConfig().conversionsA || 0 }}</span>
                                    </div>
                                    <div>
                                       <span class="text-[8px] font-mono text-app-muted block uppercase">Rate</span>
                                       <span class="text-xs font-bold text-indigo-400 font-mono">{{ getConversionRate(growthConfig().conversionsA, growthConfig().viewsA) }}</span>
                                    </div>
                                 </div>
                              </div>

                              <!-- Version B stats -->
                              <div class="bg-cyan-500/5 border border-cyan-500/10 p-4 rounded-xl space-y-2">
                                 <div class="flex justify-between items-center text-xs font-bold uppercase text-cyan-400">
                                    <span>Version B</span>
                                    @if (growthConfig().viewsB && (growthConfig().conversionsB/growthConfig().viewsB > growthConfig().conversionsA/(growthConfig().viewsA || 1))) {
                                       <span class="bg-emerald-500/10 text-emerald-400 text-[8px] px-2 py-0.5 rounded border border-emerald-400/20 font-mono">WINNING</span>
                                    }
                                 </div>
                                 <div class="grid grid-cols-3 gap-2 text-center pt-2">
                                    <div>
                                       <span class="text-[8px] font-mono text-app-muted block uppercase">Views</span>
                                       <span class="text-xs font-bold text-app-text font-mono">{{ growthConfig().viewsB || 0 }}</span>
                                    </div>
                                    <div>
                                       <span class="text-[8px] font-mono text-app-muted block uppercase">Convs</span>
                                       <span class="text-xs font-bold text-app-text font-mono">{{ growthConfig().conversionsB || 0 }}</span>
                                    </div>
                                    <div>
                                       <span class="text-[8px] font-mono text-app-muted block uppercase">Rate</span>
                                       <span class="text-xs font-bold text-cyan-400 font-mono">{{ getConversionRate(growthConfig().conversionsB, growthConfig().viewsB) }}</span>
                                    </div>
                                 </div>
                              </div>

                              <button (click)="loadGrowthConfig()" class="w-full py-2.5 bg-app-bg hover:bg-app-bg/85 border border-app-border rounded-xl text-[10px] font-bold uppercase text-app-text transition-all cursor-pointer">
                                 Refresh Live Telemetry
                              </button>

                           </div>
                        </div>

                     </div>
                  } @else {
                     <div class="flex justify-center py-12">
                        <div class="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
                     </div>
                  }
               </div>
            }
 
         </div>
       </main>

       <!-- Toast Notification rendered from Store Service -->
       @if (store.toast().visible) {
         <div id="toast-wrapper" class="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 font-sans bg-app-bg/95 text-app-text border-app-border">
           <mat-icon class="!w-5 !h-5 !text-[20px] shrink-0" 
                     [class]="store.toast().type === 'success' ? 'text-emerald-400' : store.toast().type === 'error' ? 'text-rose-400' : 'text-amber-400'">
             {{ store.toast().type === 'success' ? 'check_circle' : store.toast().type === 'error' ? 'error' : 'info' }}
           </mat-icon>
           <span class="text-sm font-medium">{{ store.toast().message }}</span>
         </div>
       }
     </div>
   `
})
export class AdminComponent implements OnInit {
  adminService = inject(AdminMasterService);
  store = inject(AdminStoreService);
  router = inject(Router);
  uiConfig = inject(UiConfigService);
  apiService = inject(ApiService);
  
  activeSection = signal<'applications' | 'config' | 'ratelimit' | 'analytics' | 'heroslider' | 'growth' | 'comms' | 'services' | 'billing'>('applications');
  isMobileMenuOpen = signal(false);

  getActiveSectionIcon(): string {
    const section = this.activeSection();
    switch (section) {
      case 'applications': return 'apps';
      case 'config': return 'settings';
      case 'ratelimit': return 'security';
      case 'comms': return 'contact_phone';
      case 'billing': return 'receipt_long';
      case 'services': return 'cloud_done';
      case 'analytics': return 'insights';
      case 'heroslider': return 'slideshow';
      case 'growth': return 'trending_up';
      default: return 'menu';
    }
  }

  getActiveSectionLabel(): string {
    const section = this.activeSection();
    switch (section) {
      case 'applications': return 'Applications';
      case 'config': return 'Global Config';
      case 'ratelimit': return 'Engine & Limits';
      case 'comms': return 'WhatsApp & Email Setup';
      case 'billing': return 'Automated Billing';
      case 'services': return 'Service Status Monitor';
      case 'analytics': return 'Telemetry & Stats';
      case 'heroslider': return 'Website Hero Slider';
      case 'growth': return 'Growth & A/B Test';
      default: return 'Menu';
    }
  }
  
  // Growth control panel state
  growthConfig = signal<any>(null);
  isSavingGrowth = signal(false);

  // Application Control Center state
  showProvisionForm = signal(false);
  newApp = {
    name: '',
    domain: '',
    plan: 'Lite' as 'Lite' | 'Standard' | 'Pro' | 'Enterprise',
    environment: 'Production' as 'Production' | 'Staging' | 'Sandbox',
    firebase_project_id: '',
    firebase_api_key: '',
    firebase_auth_domain: '',
    firebase_storage_bucket: '',
    firebase_app_id: '',
    firebase_measurement_id: ''
  };

  // Global Config state
  localWebsiteConfig: any = { siteName: '', theme: 'dark', globalFeatures: { maintenanceMode: false } };
  animationsEnabled = true;
  layoutDensity = 'comfortable';

  // WhatsApp & Email Config state
  commsConfig = signal<any>(null);
  isSavingComms = signal(false);

  // Service Status state
  servicesList = signal<any[]>([]);
  isLoadingServices = signal(false);

  // Real-time telemetry overrides
  telemetryData = signal<any>(null);

  // Onboarding Tour Guide state
  showTour = signal(false);
  currentTourStep = signal(0);
  tourSteps = [
    { title: 'Welcome to Command Tower!', description: 'This central control panel manages all connected applications, marketplace configs, telemetry systems, and rate limiting policies from one unified hub.', target: 'header' },
    { title: 'Applications Control Hub', description: 'Under this tab you can provision new edge environments, configure feature plugins, rotate root keys, and delete deployments.', target: 'apps' },
    { title: 'Global Configurations', description: 'Configure site-wide preferences, maintenance switches, visual theme engines, and layout densities.', target: 'config' },
    { title: 'Communications Gateway', description: 'Deploy credentials and monitor deliverability for WhatsApp SMS alerts and transactional SMTP services.', target: 'comms' },
    { title: 'Telemetry Metrics', description: 'Analyze live edge request volumes, connection latency, error statistics, and simulated split testing results.', target: 'analytics' }
  ];

  constructor() {
    if (typeof window !== 'undefined') {
      this.showTour.set(localStorage.getItem('admin-tour-done') !== 'true');
    }
  }

  ngOnInit() {
    if (typeof window !== 'undefined') {
      this.loadGrowthConfig();
      this.loadServices();
      this.loadCommsConfig();
      this.loadTelemetry();
    }

    // Map store signals to component state
    const config = this.adminService.websiteConfig();
    this.localWebsiteConfig = JSON.parse(JSON.stringify(config));
    this.animationsEnabled = this.uiConfig.animationsEnabled();
    this.layoutDensity = this.uiConfig.layoutDensity();
  }

  // Tour Guide navigation
  nextTourStep() {
    this.currentTourStep.update(s => s + 1);
  }

  dismissTour() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin-tour-done', 'true');
    }
    this.showTour.set(false);
  }

  // Provision New App
  provisionApplication() {
    if (!this.newApp.name || !this.newApp.domain) return;
    const payload = {
      name: this.newApp.name,
      domain: this.newApp.domain,
      environment: this.newApp.environment,
      plan: this.newApp.plan,
      firebase_project_id: this.newApp.firebase_project_id,
      firebase_api_key: this.newApp.firebase_api_key,
      firebase_auth_domain: this.newApp.firebase_auth_domain,
      firebase_storage_bucket: this.newApp.firebase_storage_bucket,
      firebase_app_id: this.newApp.firebase_app_id,
      firebase_measurement_id: this.newApp.firebase_measurement_id,
      billing: {
        plan: `${this.newApp.plan} Plan`,
        currentSpend: 0,
        estimatedSpend: this.newApp.plan === 'Enterprise' ? 2000 : (this.newApp.plan === 'Pro' ? 299 : 0),
        apiCalls: 0,
        apiLimit: this.newApp.plan === 'Enterprise' ? 1000000 : (this.newApp.plan === 'Pro' ? 100000 : 10000),
        storageGb: 0,
        storageLimit: this.newApp.plan === 'Enterprise' ? 200 : (this.newApp.plan === 'Pro' ? 50 : 10)
      }
    };
    this.store.addProject(payload);
    this.showProvisionForm.set(false);
    this.newApp = {
      name: '',
      domain: '',
      plan: 'Lite',
      environment: 'Production',
      firebase_project_id: '',
      firebase_api_key: '',
      firebase_auth_domain: '',
      firebase_storage_bucket: '',
      firebase_app_id: '',
      firebase_measurement_id: ''
    };
  }

  // Global Config actions
  setLocalTheme(theme: 'light' | 'dark') {
    this.localWebsiteConfig.theme = theme;
    this.uiConfig.themeService.setTheme(theme === 'dark' ? 'dark' : 'light');
  }

  toggleLocalAnimations() {
    this.animationsEnabled = !this.animationsEnabled;
    this.uiConfig.toggleAnimations();
  }

  saveWebsiteConfig() {
    this.uiConfig.setDensity(this.layoutDensity as any);
    this.store.updateWebsiteConfig(this.localWebsiteConfig).subscribe(() => {
      this.store.showToast('Global website preferences saved!', 'success');
    });
  }

  // Load and Toggle Services
  loadServices() {
    this.isLoadingServices.set(true);
    this.apiService.get<any[]>('/admin/services').subscribe({
      next: (srv) => {
        this.servicesList.set(srv);
        this.isLoadingServices.set(false);
      },
      error: (err) => {
        this.isLoadingServices.set(false);
        console.error('Failed to load services:', err);
      }
    });
  }

  toggleServiceState(id: string) {
    this.apiService.post<any>('/admin/services/toggle', { id }).subscribe({
      next: () => {
        this.loadServices();
        this.store.showToast('Microservice state updated!', 'success');
      },
      error: (err) => {
        this.store.showToast('Service state toggle failed: ' + (err.error?.message || err.message), 'error');
      }
    });
  }

  // WhatsApp & Email Gateway config
  loadCommsConfig() {
    this.apiService.get<any>('/settings/comms_config').subscribe({
      next: (res: any) => {
        this.commsConfig.set(res?.data || res);
      },
      error: (err) => console.error('Failed to load comms config:', err)
    });
  }

  saveCommsConfig() {
    if (!this.commsConfig()) return;
    this.isSavingComms.set(true);
    this.apiService.put<any>('/admin/settings/comms_config', this.commsConfig()).subscribe({
      next: () => {
        this.isSavingComms.set(false);
        this.store.showToast('Communications Gateway settings committed!', 'success');
      },
      error: (err) => {
        this.isSavingComms.set(false);
        this.store.showToast('Commit failed: ' + (err.error?.message || 'Unknown error'), 'error');
      }
    });
  }

  // Real-time telemetry
  loadTelemetry() {
    this.apiService.get<any>('/admin/analytics').subscribe({
      next: (res) => {
        this.telemetryData.set(res);
      },
      error: (err) => console.error('Failed to load stats:', err)
    });
  }

  // Growth control actions
  loadGrowthConfig() {
    this.apiService.get<any>('/settings/growth_config').subscribe({
      next: (res: any) => {
        this.growthConfig.set(res?.data || res);
      },
      error: (err) => console.error('Failed to load growth config:', err)
    });
  }

  saveGrowthConfig() {
    if (!this.growthConfig()) return;
    this.isSavingGrowth.set(true);
    this.apiService.put<any>('/admin/settings/growth_config', this.growthConfig()).subscribe({
      next: () => {
        this.isSavingGrowth.set(false);
        this.store.showToast('Growth & split-testing policies deployed!', 'success');
        this.loadTelemetry(); // Refresh overrides in telemetry cards
      },
      error: (err) => {
        this.isSavingGrowth.set(false);
        this.store.showToast('Deploy failed: ' + (err.error?.message || err.error?.error || 'Unknown error'), 'error');
      }
    });
  }

  getConversionRate(conversions: number, views: number): string {
    if (!views) return '0.00%';
    return ((conversions / views) * 100).toFixed(2) + '%';
  }

  onAppClick(app: AdminApp) {
    this.router.navigate(['/admin/apps', app.id]);
  }

  onSystemCoreClick() {
    this.router.navigate(['/admin/system-core']);
  }
}
