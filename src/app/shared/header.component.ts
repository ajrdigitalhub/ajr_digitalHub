import { Component, ChangeDetectionStrategy, inject, computed, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../services/auth.service';
import { ThemeService, AppTheme } from '../services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <header class="glass sticky top-0 z-50 w-full backdrop-blur-md select-none border-t-0 border-x-0 border-b border-app-border transition-colors duration-300">
      <div class="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        <!-- Logo Branding -->
        <a routerLink="/" class="flex items-center gap-2.5 group cursor-pointer focus:outline-none">
          <img src="/logo.png" alt="AJR Digital Hub Logo" class="h-8 w-8 sm:h-10 sm:w-10 object-contain group-hover:scale-105 transition-all drop-shadow-md" />
          <div class="flex flex-col">
            <span class="text-xs sm:text-sm font-black text-app-text uppercase tracking-wider font-display">AJR Digital Hub</span>
            <span class="text-[7px] sm:text-[9px] font-mono text-secondary font-bold uppercase tracking-widest leading-none">Enterprise Cluster</span>
          </div>
        </a>

        <!-- Main Desktop Navigation -->
        <nav class="hidden lg:flex items-center gap-1.5 bg-app-bg/50 p-1 rounded-xl border border-app-border">
          <a 
            routerLink="/home" 
            routerLinkActive="bg-app-card text-app-text font-bold shadow-sm"
            class="px-4 py-2 text-xs font-semibold text-app-muted hover:text-app-text rounded-lg transition-all"
          >
            Home
          </a>
          <a 
            routerLink="/marketplace" 
            routerLinkActive="bg-app-card text-app-text font-bold shadow-sm"
            class="px-4 py-2 text-xs font-semibold text-app-muted hover:text-app-text rounded-lg transition-all"
          >
            Asset Matrix
          </a>
          <a 
            routerLink="/services" 
            routerLinkActive="bg-app-card text-app-text font-bold shadow-sm"
            class="px-4 py-2 text-xs font-semibold text-app-muted hover:text-app-text rounded-lg transition-all"
          >
            Core Services
          </a>

          <!-- Marketing SaaS Dropdown -->
          <div class="relative group">
            <button class="px-4 py-2 text-xs font-semibold text-app-muted hover:text-app-text rounded-lg transition-all flex items-center gap-1 focus:outline-none">
              Marketing Suite
              <mat-icon class="text-xs w-3 h-3 leading-none transition-transform group-hover:rotate-180">keyboard_arrow_down</mat-icon>
            </button>
            <div class="absolute left-0 mt-1 w-56 bg-app-card border border-app-border rounded-xl shadow-xl p-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 z-50">
              <a routerLink="/dashboard/crm" class="flex items-center gap-2 p-2 rounded-lg text-[11px] text-app-muted hover:text-app-text hover:bg-app-bg transition-colors">
                <mat-icon class="text-xs">storefront</mat-icon>
                <span>Sales CRM & Leads</span>
              </a>
              <a routerLink="/dashboard/whatsapp" class="flex items-center gap-2 p-2 rounded-lg text-[11px] text-app-muted hover:text-app-text hover:bg-app-bg transition-colors">
                <mat-icon class="text-xs">sms</mat-icon>
                <span>WhatsApp Business</span>
              </a>
              <a routerLink="/dashboard/google-ads" class="flex items-center gap-2 p-2 rounded-lg text-[11px] text-app-muted hover:text-app-text hover:bg-app-bg transition-colors">
                <mat-icon class="text-xs">ads_click</mat-icon>
                <span>Google Ads Center</span>
              </a>
              <a routerLink="/dashboard/meta-ads" class="flex items-center gap-2 p-2 rounded-lg text-[11px] text-app-muted hover:text-app-text hover:bg-app-bg transition-colors">
                <mat-icon class="text-xs">campaign</mat-icon>
                <span>Meta Ads Manager</span>
              </a>
              <a routerLink="/dashboard/workflow" class="flex items-center gap-2 p-2 rounded-lg text-[11px] text-app-muted hover:text-app-text hover:bg-app-bg transition-colors">
                <mat-icon class="text-xs">alt_route</mat-icon>
                <span>Automation Builder</span>
              </a>
              <a routerLink="/dashboard/ai-assistant" class="flex items-center gap-2 p-2 rounded-lg text-[11px] text-app-muted hover:text-app-text hover:bg-app-bg transition-colors">
                <mat-icon class="text-xs">auto_awesome</mat-icon>
                <span>Gemini AI Assistant</span>
              </a>
              <a routerLink="/dashboard/analytics" class="flex items-center gap-2 p-2 rounded-lg text-[11px] text-app-muted hover:text-app-text hover:bg-app-bg transition-colors">
                <mat-icon class="text-xs">insights</mat-icon>
                <span>Analytics & Billing</span>
              </a>
            </div>
          </div>

          <a 
            routerLink="/invoice-builder" 
            routerLinkActive="bg-app-card text-app-text font-bold shadow-sm"
            class="px-4 py-2 text-xs font-semibold text-app-muted hover:text-app-text rounded-lg transition-all"
          >
            Invoice Builder
          </a>
          @if (isAuthenticated()) {
            <a 
              routerLink="/dashboard" 
              routerLinkActive="bg-app-card text-app-text font-bold shadow-sm"
              class="px-4 py-2 text-xs font-semibold text-app-muted hover:text-app-text rounded-lg transition-all"
            >
              Dashboard
            </a>
          }
        </nav>

        <!-- Right Side: Auth / Actions -->
        <div class="flex items-center gap-3">
          <!-- Active cluster indicator -->
          <div class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider">
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
            Node Online
          </div>

          <!-- Divider -->
          <span class="hidden sm:block h-5 w-px bg-app-border"></span>
          
          <!-- Theme Toggle -->
          <button (click)="toggleTheme()" class="hidden sm:flex text-app-muted hover:text-app-text bg-app-card/50 hover:bg-app-card p-2 rounded-xl transition-all border border-app-border items-center justify-center cursor-pointer" [title]="'Current Theme: ' + themeService.currentTheme()">
            <mat-icon *ngIf="themeService.currentTheme() === 'dark'" class="!text-[20px] !w-[20px] !h-[20px]">dark_mode</mat-icon>
            <mat-icon *ngIf="themeService.currentTheme() === 'light'" class="!text-[20px] !w-[20px] !h-[20px]">light_mode</mat-icon>
            <mat-icon *ngIf="themeService.currentTheme() === 'neon'" class="!text-[20px] !w-[20px] !h-[20px] text-pink-500">flare</mat-icon>
          </button>

          <!-- Session Controls -->
          @if (isAuthenticated()) {
            <div class="flex items-center gap-2">
              <div class="hidden lg:flex flex-col text-right pr-1">
                <span class="text-[9px] text-app-muted">Authenticated Session</span>
                <span class="text-xs font-bold text-app-text truncate max-w-[120px]" [title]="userEmail()">
                  {{ userEmail() }}
                </span>
              </div>
              <button 
                routerLink="/dashboard"
                class="bg-app-card hover:bg-app-bg text-app-text p-2 sm:px-3 sm:py-2 rounded-xl transition-all border border-app-border flex items-center gap-1 text-xs font-bold group cursor-pointer"
              >
                <mat-icon class="!text-[16px] !w-[16px] !h-[16px] text-secondary">dashboard</mat-icon>
                <span class="hidden sm:inline">DASH_SYS</span>
              </button>
              <button 
                (click)="onLogout()"
                class="bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-app-text p-2 sm:px-3 sm:py-2 rounded-xl transition-all border border-rose-500/20 hover:border-transparent flex items-center gap-1 text-xs font-bold group cursor-pointer"
                title="Sign Out"
              >
                <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">logout</mat-icon>
                <span class="hidden sm:inline">OUT</span>
              </button>
            </div>
          } @else {
            <button 
              routerLink="/login"
              class="relative group overflow-hidden bg-primary hover:bg-accent text-app-text px-3 sm:px-5 h-10 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center gap-1.5 sm:gap-2 text-xs tracking-wider uppercase cursor-pointer"
            >
              <!-- Hover reflection -->
              <div class="absolute inset-0 w-1/2 h-full bg-white/15 skew-x-[-25deg] -translate-x-full group-hover:animate-shine"></div>
              
              <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">lock_open</mat-icon>
              <span class="hidden sm:inline">LOCKPOINT LOGIN</span>
              <span class="inline sm:hidden">LOGIN</span>
            </button>
          }

          <!-- Mobile Hamburger Trigger Button (Three lines) -->
          <button (click)="isMobileMenuOpen.set(!isMobileMenuOpen())" class="lg:hidden text-app-muted hover:text-app-text bg-app-card/50 hover:bg-app-card p-2 rounded-xl transition-all border border-app-border flex items-center justify-center cursor-pointer" aria-label="Toggle Navigation">
            <mat-icon class="!text-[20px] !w-[20px] !h-[20px]">{{ isMobileMenuOpen() ? 'close' : 'menu' }}</mat-icon>
          </button>
        </div>

      </div>
    </header>

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
      <div class="flex items-center justify-between p-4 border-b border-app-border bg-app-card">
        <div class="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" class="h-8 w-8 object-contain" />
          <span class="text-xs font-black text-app-text uppercase tracking-wider font-display">AJR Digital Hub</span>
        </div>
        <button (click)="isMobileMenuOpen.set(false)" class="text-app-muted hover:text-app-text p-1 cursor-pointer">
          <mat-icon class="!text-[20px] !w-[20px] !h-[20px]">close</mat-icon>
        </button>
      </div>

      <!-- Drawer Links List -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-app-card">
        <div class="flex flex-col gap-1">
          <a 
            routerLink="/home" 
            routerLinkActive="bg-indigo-500/10 text-indigo-500 font-bold border border-indigo-500/20 shadow-sm"
            [routerLinkActiveOptions]="{exact: true}"
            (click)="isMobileMenuOpen.set(false)"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-app-text hover:text-indigo-400 transition-all text-left"
          >
            <mat-icon class="!w-[16px] !h-[16px] !text-[16px] text-indigo-400">home</mat-icon>
            Home
          </a>
          <a 
            routerLink="/marketplace" 
            routerLinkActive="bg-indigo-500/10 text-indigo-500 font-bold border border-indigo-500/20 shadow-sm"
            (click)="isMobileMenuOpen.set(false)"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-app-text hover:text-indigo-400 transition-all text-left"
          >
            <mat-icon class="!w-[16px] !h-[16px] !text-[16px] text-indigo-400">grid_view</mat-icon>
            Asset Matrix
          </a>
          <a 
            routerLink="/services" 
            routerLinkActive="bg-indigo-500/10 text-indigo-500 font-bold border border-indigo-500/20 shadow-sm"
            (click)="isMobileMenuOpen.set(false)"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-app-text hover:text-indigo-400 transition-all text-left"
          >
            <mat-icon class="!w-[16px] !h-[16px] !text-[16px] text-indigo-400">cloud_done</mat-icon>
            Core Services
          </a>
          
          <!-- Mobile Marketing SaaS Links -->
          <div class="px-3 py-2.5 border border-app-border my-2 bg-app-bg/30 rounded-xl">
            <span class="text-[9px] font-bold text-app-muted uppercase tracking-wider block mb-2">Marketing SaaS</span>
            <div class="grid grid-cols-2 gap-2">
              <a routerLink="/dashboard/crm" (click)="isMobileMenuOpen.set(false)" class="text-[10px] text-app-text hover:text-indigo-400 py-1 flex items-center gap-1 font-semibold"><mat-icon class="!text-[12px] !w-3 !h-3 text-indigo-400">storefront</mat-icon> CRM Hub</a>
              <a routerLink="/dashboard/whatsapp" (click)="isMobileMenuOpen.set(false)" class="text-[10px] text-app-text hover:text-indigo-400 py-1 flex items-center gap-1 font-semibold"><mat-icon class="!text-[12px] !w-3 !h-3 text-indigo-400">sms</mat-icon> WhatsApp</a>
              <a routerLink="/dashboard/google-ads" (click)="isMobileMenuOpen.set(false)" class="text-[10px] text-app-text hover:text-indigo-400 py-1 flex items-center gap-1 font-semibold"><mat-icon class="!text-[12px] !w-3 !h-3 text-indigo-400">ads_click</mat-icon> Google Ads</a>
              <a routerLink="/dashboard/meta-ads" (click)="isMobileMenuOpen.set(false)" class="text-[10px] text-app-text hover:text-indigo-400 py-1 flex items-center gap-1 font-semibold"><mat-icon class="!text-[12px] !w-3 !h-3 text-indigo-400">campaign</mat-icon> Meta Ads</a>
            </div>
          </div>
          
          <a 
            routerLink="/invoice-builder" 
            routerLinkActive="bg-indigo-500/10 text-indigo-500 font-bold border border-indigo-500/20 shadow-sm"
            (click)="isMobileMenuOpen.set(false)"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-app-text hover:text-indigo-400 transition-all text-left"
          >
            <mat-icon class="!w-[16px] !h-[16px] !text-[16px] text-indigo-400">receipt_long</mat-icon>
            Invoice Builder
          </a>
          @if (isAuthenticated()) {
            <a 
              routerLink="/dashboard" 
              routerLinkActive="bg-indigo-500/10 text-indigo-500 font-bold border border-indigo-500/20 shadow-sm"
              (click)="isMobileMenuOpen.set(false)"
              class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-app-text hover:text-indigo-400 transition-all text-left"
            >
              <mat-icon class="!w-[16px] !h-[16px] !text-[16px] text-indigo-400">dashboard</mat-icon>
              Dashboard
            </a>
          }
        </div>
      </div>

      <!-- Drawer Footer -->
      <div class="p-4 border-t border-app-border bg-app-bg/50 shrink-0 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-[10px] text-app-text font-bold uppercase">Appearance</span>
          <button (click)="toggleTheme()" class="text-xs text-indigo-400 font-bold flex items-center gap-1 cursor-pointer">
            <mat-icon class="!text-[14px] !w-3.5 !h-3.5">dark_mode</mat-icon> Switch Theme
          </button>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-[9px] font-mono text-emerald-500 font-bold uppercase tracking-wider">Node Status: Online</span>
          <span class="text-[9px] font-mono text-app-muted">v1.0.0</span>
        </div>
      </div>
    </div>
  `
})
export class HeaderComponent {
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  private router = inject(Router);

  isAuthenticated = computed(() => this.authService.isAuthenticated());
  userEmail = computed(() => this.authService.currentUser()?.email || 'Active Node');
  isMobileMenuOpen = signal(false);

  @HostListener('window:keydown.escape')
  handleEscape() {
    if (this.isMobileMenuOpen()) {
      this.isMobileMenuOpen.set(false);
    }
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/home']);
  }
  
  toggleTheme() {
    const current = this.themeService.currentTheme();
    let next: AppTheme = 'dark';
    if (current === 'dark') next = 'light';
    else if (current === 'light') next = 'neon';
    this.themeService.setTheme(next);
  }
}

