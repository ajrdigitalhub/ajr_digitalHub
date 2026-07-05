import { Component, ChangeDetectionStrategy, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../services/auth.service';
import { ThemeService } from '../services/theme.service';
import { NotificationManagerService } from '../services/notification-manager.service';

@Component({
  selector: 'app-top-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <nav class="glass sticky top-0 z-50 w-full backdrop-blur-md select-none border-b border-app-border transition-colors duration-300">
      <div class="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        <!-- Left: Logo & Workspace Switcher -->
        <div class="flex items-center gap-6">
          <a routerLink="/dashboard" class="flex items-center gap-2 group cursor-pointer">
            <div class="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-app-text">
              <mat-icon class="text-sm w-4 h-4 leading-none">hub</mat-icon>
            </div>
            <div class="flex flex-col">
              <span class="text-xs font-black text-app-text uppercase tracking-wider font-display">AJR HUB</span>
              <span class="text-[8px] font-mono text-indigo-400 font-bold uppercase tracking-widest leading-none">Enterprise</span>
            </div>
          </a>

          <!-- Workspace Switcher (Tenancy Context) -->
          <div class="relative hidden sm:block">
            <select (change)="onWorkspaceChange($event)" class="bg-app-card hover:bg-app-bg border border-app-border text-xs font-semibold text-app-text rounded-xl py-1.5 pl-3 pr-8 outline-none cursor-pointer appearance-none transition-all">
              <option value="ws-primary">Acme Marketing Workspace</option>
              <option value="ws-staging">Tesla Staging Suite</option>
              <option value="ws-demo">Personal sandbox Sandbox</option>
            </select>
            <div class="absolute inset-y-0 right-2 flex items-center pointer-events-none text-app-muted">
              <mat-icon class="text-xs w-4 h-4 leading-none">unfold_more</mat-icon>
            </div>
          </div>
        </div>

        <!-- Center: Modern SaaS Navigation Links (Desktop) -->
        <div class="hidden lg:flex items-center gap-1">
          <!-- Dashboard link -->
          <a routerLink="/dashboard" routerLinkActive="bg-indigo-500/10 text-indigo-400" [routerLinkActiveOptions]="{ exact: true }" class="px-3 py-2 text-xs font-bold text-app-muted hover:text-app-text rounded-lg transition-all">
            Dashboard
          </a>

          <!-- Digital Marketing Mega Menu trigger -->
          <div class="relative group" (mouseenter)="openMenu('marketing')" (mouseleave)="closeMenu('marketing')">
            <button class="px-3 py-2 text-xs font-bold text-app-muted hover:text-app-text rounded-lg transition-all flex items-center gap-1 focus:outline-none">
              Digital Marketing
              <mat-icon class="text-xs w-3 h-3 leading-none transition-transform group-hover:rotate-180">keyboard_arrow_down</mat-icon>
            </button>

            <!-- Digital Marketing Mega Menu Panel -->
            <div class="absolute left-1/2 -translate-x-1/2 mt-1 w-[500px] bg-app-card border border-app-border rounded-2xl shadow-xl p-5 grid grid-cols-2 gap-4 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-250 backdrop-blur-lg bg-opacity-95">
              <a routerLink="/dashboard/whatsapp" class="flex gap-3 p-2.5 rounded-xl hover:bg-indigo-500/10 transition-colors group/item">
                <div class="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <mat-icon>sms</mat-icon>
                </div>
                <div>
                  <h4 class="text-xs font-bold text-app-text group-hover/item:text-indigo-400">WhatsApp Marketing</h4>
                  <p class="text-[10px] text-app-muted mt-0.5">Meta API templates, bulk campaigns, and reads tracking.</p>
                </div>
              </a>

              <a routerLink="/dashboard/google-ads" class="flex gap-3 p-2.5 rounded-xl hover:bg-indigo-500/10 transition-colors group/item">
                <div class="h-9 w-9 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center shrink-0">
                  <mat-icon>ads_click</mat-icon>
                </div>
                <div>
                  <h4 class="text-xs font-bold text-app-text group-hover/item:text-indigo-400">Google Ads</h4>
                  <p class="text-[10px] text-app-muted mt-0.5">Pause campaigns, keywords metric dashboard, budgets.</p>
                </div>
              </a>

              <a routerLink="/dashboard/meta-ads" class="flex gap-3 p-2.5 rounded-xl hover:bg-indigo-500/10 transition-colors group/item">
                <div class="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                  <mat-icon>campaign</mat-icon>
                </div>
                <div>
                  <h4 class="text-xs font-bold text-app-text group-hover/item:text-indigo-400">Meta Ads</h4>
                  <p class="text-[10px] text-app-muted mt-0.5">Facebook campaigns stats, ROAS metrics, budget controls.</p>
                </div>
              </a>

              <a routerLink="/dashboard/landing-builder" class="flex gap-3 p-2.5 rounded-xl hover:bg-indigo-500/10 transition-colors group/item">
                <div class="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                  <mat-icon>web</mat-icon>
                </div>
                <div>
                  <h4 class="text-xs font-bold text-app-text group-hover/item:text-indigo-400">Landing Page Builder</h4>
                  <p class="text-[10px] text-app-muted mt-0.5">Visual drag-and-drop landing designs, custom SEO.</p>
                </div>
              </a>

              <a routerLink="/dashboard/ai-assistant" class="flex gap-3 p-2.5 rounded-xl hover:bg-indigo-500/10 transition-colors group/item">
                <div class="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                  <mat-icon>auto_awesome</mat-icon>
                </div>
                <div>
                  <h4 class="text-xs font-bold text-app-text group-hover/item:text-indigo-400">AI Copywriter</h4>
                  <p class="text-[10px] text-app-muted mt-0.5">Generate Meta/Google ads copy and keywords with Gemini AI.</p>
                </div>
              </a>
            </div>
          </div>

          <!-- CRM Mega Menu trigger -->
          <div class="relative group" (mouseenter)="openMenu('crm')" (mouseleave)="closeMenu('crm')">
            <button class="px-3 py-2 text-xs font-bold text-app-muted hover:text-app-text rounded-lg transition-all flex items-center gap-1 focus:outline-none">
              CRM
              <mat-icon class="text-xs w-3 h-3 leading-none transition-transform group-hover:rotate-180">keyboard_arrow_down</mat-icon>
            </button>

            <!-- CRM Mega Menu Panel -->
            <div class="absolute left-1/2 -translate-x-1/2 mt-1 w-[460px] bg-app-card border border-app-border rounded-2xl shadow-xl p-4 grid grid-cols-2 gap-3 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-250 backdrop-blur-lg bg-opacity-95">
              <a routerLink="/dashboard/crm" class="flex gap-3 p-2.5 rounded-xl hover:bg-indigo-500/10 transition-colors group/item">
                <div class="h-9 w-9 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                  <mat-icon>view_kanban</mat-icon>
                </div>
                <div>
                  <h4 class="text-xs font-bold text-app-text group-hover/item:text-indigo-400">Deals & Pipeline</h4>
                  <p class="text-[10px] text-app-muted mt-0.5">Kanban stage transition tracker, sales targets forecast.</p>
                </div>
              </a>

              <a routerLink="/dashboard/crm" [queryParams]="{tab: 'leads'}" class="flex gap-3 p-2.5 rounded-xl hover:bg-indigo-500/10 transition-colors group/item">
                <div class="h-9 w-9 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
                  <mat-icon>groups</mat-icon>
                </div>
                <div>
                  <h4 class="text-xs font-bold text-app-text group-hover/item:text-indigo-400">Leads Capture</h4>
                  <p class="text-[10px] text-app-muted mt-0.5">Contacts list, assignment rules, score telemetry.</p>
                </div>
              </a>
            </div>
          </div>

          <!-- Other items -->
          <a routerLink="/dashboard/workflow" routerLinkActive="bg-indigo-500/10 text-indigo-400" class="px-3 py-2 text-xs font-bold text-app-muted hover:text-app-text rounded-lg transition-all">
            Automation
          </a>
          
          <a routerLink="/dashboard/analytics" routerLinkActive="bg-indigo-500/10 text-indigo-400" class="px-3 py-2 text-xs font-bold text-app-muted hover:text-app-text rounded-lg transition-all">
            Analytics
          </a>

          <a routerLink="/invoice-builder" class="px-3 py-2 text-xs font-bold text-app-muted hover:text-app-text rounded-lg transition-all">
            Invoicing
          </a>

          <a routerLink="/marketplace" class="px-3 py-2 text-xs font-bold text-app-muted hover:text-app-text rounded-lg transition-all">
            Marketplace
          </a>

          <a routerLink="/documentation" routerLinkActive="bg-indigo-500/10 text-indigo-400" class="px-3 py-2 text-xs font-bold text-app-muted hover:text-app-text rounded-lg transition-all">
            Documentation
          </a>

          <a routerLink="/dashboard/billing" routerLinkActive="bg-indigo-500/10 text-indigo-400" class="px-3 py-2 text-xs font-bold text-app-muted hover:text-app-text rounded-lg transition-all">
            Billing
          </a>

          <a routerLink="/dashboard/settings" routerLinkActive="bg-indigo-500/10 text-indigo-400" class="px-3 py-2 text-xs font-bold text-app-muted hover:text-app-text rounded-lg transition-all">
            Settings
          </a>
        </div>

        <!-- Right: Actions & User Details -->
        <div class="flex items-center gap-4">
          <!-- Command palette indicator -->
          <button (click)="openCommandPalette()" class="hidden md:flex items-center gap-2 px-3 py-1.5 bg-app-card border border-app-border hover:border-indigo-500/50 rounded-xl text-xs text-app-muted cursor-pointer transition-all">
            <mat-icon class="text-sm w-4 h-4 leading-none">search</mat-icon>
            <span>Search...</span>
            <kbd class="text-[10px] font-mono bg-app-bg px-1.5 py-0.5 rounded border border-app-border text-app-text">Ctrl + K</kbd>
          </button>

          <!-- Theme switcher -->
          <button (click)="toggleTheme()" class="h-9 w-9 rounded-xl border border-app-border hover:bg-app-card flex items-center justify-center text-app-muted hover:text-indigo-400 transition-all cursor-pointer">
            <mat-icon class="text-sm">light_mode</mat-icon>
          </button>

          <!-- Notifications trigger -->
          <div class="relative">
            <button (click)="showNotif.set(!showNotif())" class="h-9 w-9 rounded-xl border border-app-border hover:bg-app-card flex items-center justify-center text-app-muted hover:text-indigo-400 transition-all cursor-pointer relative">
              <mat-icon class="text-sm">notifications</mat-icon>
              @if (notifManager.unreadCount() > 0) {
                <div class="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-indigo-600 text-[8px] text-white flex items-center justify-center font-bold border border-app-bg animate-pulse shadow-sm">
                  {{ notifManager.unreadCount() }}
                </div>
              }
            </button>

            <!-- Notifications Dropdown -->
            @if (showNotif()) {
              <div class="absolute right-0 mt-2 w-80 bg-app-card border border-app-border rounded-2xl shadow-xl p-4 z-50 animate-in slide-in-from-top-2 duration-150">
                <div class="flex items-center justify-between pb-2 border-b border-app-border">
                  <h4 class="text-xs font-bold text-app-text">Notifications</h4>
                  @if (notifManager.unreadCount() > 0) {
                    <button (click)="markAllAsRead()" class="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer">
                      Mark all as read
                    </button>
                  }
                </div>
                <div class="mt-2 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  @if (notifManager.notifications().length === 0) {
                    <div class="py-6 text-center text-[10px] text-app-muted font-medium">
                      No notifications yet.
                    </div>
                  } @else {
                    @for (notif of notifManager.notifications(); track notif.id) {
                      <div (click)="onNotifClick(notif)" class="flex items-start gap-3 p-2 rounded-xl hover:bg-app-bg transition-colors cursor-pointer relative group">
                        <div class="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" [class.bg-indigo-500]="notif.read_status === 'unread'" [class.bg-transparent]="notif.read_status === 'read'"></div>
                        <div class="flex-1 min-w-0">
                          <p class="text-xs font-bold text-app-text group-hover:text-indigo-400 transition-colors truncate">{{ notif.title }}</p>
                          <p class="text-[10px] text-app-muted mt-0.5 line-clamp-2 leading-normal">{{ notif.body }}</p>
                          <span class="text-[8px] text-app-muted/60 mt-1 block font-mono">{{ formatTime(notif.created_at) }}</span>
                        </div>
                        <button (click)="deleteNotif($event, notif.id)" class="text-app-muted hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 p-0.5 absolute right-2 top-2" title="Delete">
                          <mat-icon class="!text-[12px] !w-3 !h-3">delete</mat-icon>
                        </button>
                      </div>
                    }
                  }
                </div>
              </div>
            }
          </div>

          <!-- User profile menu -->
          <div class="relative">
            <button (click)="showUser.set(!showUser())" class="flex items-center gap-2 h-9 px-2 rounded-xl border border-app-border hover:bg-app-card transition-all cursor-pointer">
              <div class="h-6 w-6 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                {{ authService.currentUser()?.email?.charAt(0)?.toUpperCase() || 'U' }}
              </div>
              <mat-icon class="text-xs w-3 h-3 leading-none text-app-muted">keyboard_arrow_down</mat-icon>
            </button>

            @if (showUser()) {
              <div class="absolute right-0 mt-2 w-52 bg-app-card border border-app-border rounded-2xl shadow-xl p-3 z-50 animate-in slide-in-from-top-2 duration-150">
                <div class="p-2 border-b border-app-border truncate">
                  <h4 class="text-xs font-bold text-app-text truncate">{{ authService.currentUser()?.email }}</h4>
                  <span class="text-[9px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 px-1 rounded">{{ authService.currentUser()?.role || 'user' }}</span>
                </div>
                <div class="mt-2 space-y-1">
                  @if (authService.currentUser()?.role === 'admin') {
                    <a routerLink="/admin" class="flex items-center gap-2 p-2 rounded-lg text-xs text-app-muted hover:text-app-text hover:bg-app-bg transition-colors">
                      <mat-icon class="text-xs">security</mat-icon>
                      Master Control
                    </a>
                  }
                  <button (click)="logout()" class="w-full text-left flex items-center gap-2 p-2 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer">
                    <mat-icon class="text-xs">logout</mat-icon>
                    Sign Out
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Mobile Hamburger Trigger Button -->
          <button (click)="isMobileMenuOpen.set(!isMobileMenuOpen())" class="lg:hidden text-app-muted hover:text-app-text bg-app-card/50 hover:bg-app-card p-2 rounded-xl transition-all border border-app-border flex items-center justify-center cursor-pointer" aria-label="Toggle Navigation">
            <mat-icon class="!text-[20px] !w-[20px] !h-[20px]">{{ isMobileMenuOpen() ? 'close' : 'menu' }}</mat-icon>
          </button>
        </div>

      </div>
    </nav>

    <!-- Mobile Slide Drawer Overlay Backdrop -->
    <div 
      class="drawer-backdrop lg:hidden"
      [class.active]="isMobileMenuOpen()"
      (click)="isMobileMenuOpen.set(false)"
    ></div>

    <!-- Mobile Slide Drawer Content Panel -->
    <div 
      class="drawer-content lg:hidden"
      [class.active]="isMobileMenuOpen()"
    >
      <!-- Drawer Header -->
      <div class="flex items-center justify-between p-4 border-b border-app-border bg-app-card bg-opacity-95">
        <div class="flex items-center gap-2">
          <div class="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-app-text">
            <mat-icon class="text-sm leading-none">hub</mat-icon>
          </div>
          <span class="text-xs font-black text-app-text uppercase tracking-wider font-display">AJR HUB</span>
        </div>
        <button (click)="isMobileMenuOpen.set(false)" class="text-app-muted hover:text-app-text p-1 cursor-pointer">
          <mat-icon class="!text-[20px] !w-[20px] !h-[20px]">close</mat-icon>
        </button>
      </div>

      <!-- Drawer Links List -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-app-card bg-opacity-95">
        <div class="flex flex-col gap-1">
          <a 
            routerLink="/dashboard" 
            routerLinkActive="bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 shadow-sm"
            [routerLinkActiveOptions]="{exact: true}"
            (click)="isMobileMenuOpen.set(false)"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-app-text hover:text-indigo-400 transition-all text-left"
          >
            <mat-icon class="!w-[16px] !h-[16px] !text-[16px] text-indigo-400">dashboard</mat-icon>
            Dashboard
          </a>

          <!-- Mobile Digital Marketing Section -->
          <div class="px-3 py-2.5 border border-app-border my-2 bg-app-bg/30 rounded-xl">
            <span class="text-[9px] font-bold text-app-muted uppercase tracking-wider block mb-2">Digital Marketing</span>
            <div class="grid grid-cols-2 gap-2">
              <a routerLink="/dashboard/whatsapp" (click)="isMobileMenuOpen.set(false)" class="text-[10px] text-app-text hover:text-indigo-400 py-1 flex items-center gap-1 font-semibold">
                <mat-icon class="!text-[12px] !w-3 !h-3 text-emerald-400">sms</mat-icon> WhatsApp
              </a>
              <a routerLink="/dashboard/google-ads" (click)="isMobileMenuOpen.set(false)" class="text-[10px] text-app-text hover:text-indigo-400 py-1 flex items-center gap-1 font-semibold">
                <mat-icon class="!text-[12px] !w-3 !h-3 text-yellow-400">ads_click</mat-icon> Google Ads
              </a>
              <a routerLink="/dashboard/meta-ads" (click)="isMobileMenuOpen.set(false)" class="text-[10px] text-app-text hover:text-indigo-400 py-1 flex items-center gap-1 font-semibold">
                <mat-icon class="!text-[12px] !w-3 !h-3 text-blue-400">campaign</mat-icon> Meta Ads
              </a>
              <a routerLink="/dashboard/landing-builder" (click)="isMobileMenuOpen.set(false)" class="text-[10px] text-app-text hover:text-indigo-400 py-1 flex items-center gap-1 font-semibold">
                <mat-icon class="!text-[12px] !w-3 !h-3 text-purple-400">web</mat-icon> Landing Builder
              </a>
              <a routerLink="/dashboard/ai-assistant" (click)="isMobileMenuOpen.set(false)" class="text-[10px] text-app-text hover:text-indigo-400 py-1 flex items-center gap-1 font-semibold">
                <mat-icon class="!text-[12px] !w-3 !h-3 text-indigo-400">auto_awesome</mat-icon> AI Writer
              </a>
            </div>
          </div>

          <!-- Mobile CRM Section -->
          <div class="px-3 py-2.5 border border-app-border mb-2 bg-app-bg/30 rounded-xl">
            <span class="text-[9px] font-bold text-app-muted uppercase tracking-wider block mb-2">CRM Hub</span>
            <div class="grid grid-cols-2 gap-2">
              <a routerLink="/dashboard/crm" (click)="isMobileMenuOpen.set(false)" class="text-[10px] text-app-text hover:text-indigo-400 py-1 flex items-center gap-1 font-semibold">
                <mat-icon class="!text-[12px] !w-3 !h-3 text-rose-400">view_kanban</mat-icon> Pipeline
              </a>
              <a routerLink="/dashboard/crm" [queryParams]="{tab: 'leads'}" (click)="isMobileMenuOpen.set(false)" class="text-[10px] text-app-text hover:text-indigo-400 py-1 flex items-center gap-1 font-semibold">
                <mat-icon class="!text-[12px] !w-3 !h-3 text-sky-400">groups</mat-icon> Leads
              </a>
            </div>
          </div>

          <a 
            routerLink="/dashboard/workflow" 
            routerLinkActive="bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 shadow-sm"
            (click)="isMobileMenuOpen.set(false)"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-app-text hover:text-indigo-400 transition-all text-left"
          >
            <mat-icon class="!w-[16px] !h-[16px] !text-[16px] text-indigo-400">alt_route</mat-icon>
            Automation
          </a>

          <a 
            routerLink="/dashboard/analytics" 
            routerLinkActive="bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 shadow-sm"
            (click)="isMobileMenuOpen.set(false)"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-app-text hover:text-indigo-400 transition-all text-left"
          >
            <mat-icon class="!w-[16px] !h-[16px] !text-[16px] text-indigo-400">insights</mat-icon>
            Analytics
          </a>

          <a 
            routerLink="/invoice-builder" 
            (click)="isMobileMenuOpen.set(false)"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-app-text hover:text-indigo-400 transition-all text-left"
          >
            <mat-icon class="!w-[16px] !h-[16px] !text-[16px] text-indigo-400">receipt_long</mat-icon>
            Invoicing
          </a>

          <a 
            routerLink="/marketplace" 
            (click)="isMobileMenuOpen.set(false)"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-app-text hover:text-indigo-400 transition-all text-left"
          >
            <mat-icon class="!w-[16px] !h-[16px] !text-[16px] text-indigo-400">store</mat-icon>
            Marketplace
          </a>

          <a 
            routerLink="/documentation" 
            routerLinkActive="bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 shadow-sm"
            (click)="isMobileMenuOpen.set(false)"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-app-text hover:text-indigo-400 transition-all text-left"
          >
            <mat-icon class="!w-[16px] !h-[16px] !text-[16px] text-indigo-400">description</mat-icon>
            Documentation
          </a>

          <a 
            routerLink="/dashboard/billing" 
            routerLinkActive="bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 shadow-sm"
            (click)="isMobileMenuOpen.set(false)"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-app-text hover:text-indigo-400 transition-all text-left"
          >
            <mat-icon class="!w-[16px] !h-[16px] !text-[16px] text-indigo-400">payment</mat-icon>
            Billing
          </a>

          <a 
            routerLink="/dashboard/settings" 
            routerLinkActive="bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 shadow-sm"
            (click)="isMobileMenuOpen.set(false)"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-app-text hover:text-indigo-400 transition-all text-left"
          >
            <mat-icon class="!w-[16px] !h-[16px] !text-[16px] text-indigo-400">settings</mat-icon>
            Settings
          </a>
        </div>
      </div>

      <!-- Drawer Footer -->
      <div class="p-4 border-t border-app-border bg-app-bg/50 shrink-0">
        <div class="flex items-center justify-between">
          <span class="text-[9px] font-mono text-emerald-500 font-bold uppercase tracking-wider">Node Status: Online</span>
          <span class="text-[9px] font-mono text-app-muted font-bold">v1.0.0</span>
        </div>
      </div>
    </div>
  `
})
export class TopNavComponent {
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  notifManager = inject(NotificationManagerService);
  private router = inject(Router);

  showNotif = signal(false);
  showUser = signal(false);
  isMobileMenuOpen = signal(false);

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  }

  markAllAsRead() {
    this.notifManager.backend.markAllRead().subscribe({
      next: () => this.notifManager.loadUserNotifications(),
      error: (err) => console.error('Failed to mark all notifications as read:', err)
    });
  }

  onNotifClick(notif: any) {
    if (notif.read_status === 'unread') {
      this.notifManager.backend.markRead([notif.id]).subscribe({
        next: () => this.notifManager.loadUserNotifications(),
        error: (err) => console.error('Failed to mark notification as read:', err)
      });
    }
    this.showNotif.set(false);
    if (notif.url) {
      this.router.navigateByUrl(notif.url);
    }
  }

  deleteNotif(event: Event, id: string) {
    event.stopPropagation();
    this.notifManager.backend.deleteNotification(id).subscribe({
      next: () => this.notifManager.loadUserNotifications(),
      error: (err) => console.error('Failed to delete notification:', err)
    });
  }

  @HostListener('window:keydown.escape')
  handleEscape() {
    if (this.isMobileMenuOpen()) {
      this.isMobileMenuOpen.set(false);
    }
  }

  openMenu(type: string) {}
  closeMenu(type: string) {}

  onWorkspaceChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    localStorage.setItem('tenant_workspace_id', val);
  }

  toggleTheme() {
    const curr = this.themeService.currentTheme();
    let next: 'dark' | 'light' | 'neon' = 'dark';
    if (curr === 'dark') next = 'light';
    else if (curr === 'light') next = 'neon';
    this.themeService.setTheme(next);
  }

  openCommandPalette() {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

