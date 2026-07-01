import { Component, ChangeDetectionStrategy, inject, signal, HostListener, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { TopNavComponent } from '../shared/top-nav.component';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, TopNavComponent, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-app-bg text-app-text flex flex-col">
      <!-- High Density Top Navigation Mega Menu -->
      <app-top-nav></app-top-nav>

      <!-- Main Workspace Panel -->
      <div class="flex-1 flex flex-col min-w-0">
        <!-- Content Shell -->
        <main class="flex-1 overflow-y-auto p-6 md:p-8">
          <router-outlet></router-outlet>
        </main>
      </div>

      <!-- Command Palette Dialog (Ctrl + K) -->
      @if (showPalette()) {
        <div class="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" (click)="showPalette.set(false)">
          <div class="bg-app-card border border-app-border rounded-3xl shadow-2xl w-full max-w-xl p-5 overflow-hidden" (click)="$event.stopPropagation()">
            <div class="flex items-center gap-3 border-b border-app-border pb-3">
              <mat-icon class="text-indigo-400">search</mat-icon>
              <input type="text" placeholder="Type a command or search marketing modules..." (input)="onSearch($event)"
                     class="bg-transparent border-none outline-none text-sm text-app-text w-full placeholder:text-app-muted" autofocus>
              <button (click)="showPalette.set(false)" class="text-xs text-app-muted hover:text-app-text">ESC</button>
            </div>
            
            <div class="mt-3 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
              @if (filteredCommands().length === 0) {
                <div class="p-6 text-center text-xs text-app-muted">No commands or modules matched your query</div>
              } @else {
                @for (item of filteredCommands(); track item.route) {
                  <button (click)="navigateCommand(item.route)" class="w-full text-left p-3 hover:bg-indigo-500/10 rounded-2xl flex items-center gap-3 transition-colors group">
                    <mat-icon class="text-app-muted group-hover:text-indigo-400">{{ item.icon }}</mat-icon>
                    <div>
                      <h4 class="text-xs font-bold text-app-text">{{ item.label }}</h4>
                      <p class="text-[10px] text-app-muted">{{ item.desc }}</p>
                    </div>
                  </button>
                }
              }
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class Dashboard {
  authService = inject(AuthService);
  private router = inject(Router);

  showPalette = signal(false);
  searchQuery = signal('');

  commands = [
    { label: 'Deals & Sales Pipeline', desc: 'Interact with CRM deals and qualified leads', icon: 'view_kanban', route: '/dashboard/crm' },
    { label: 'WhatsApp Marketing Campaigns', desc: 'Launch bulk campaigns and check Meta approval status', icon: 'sms', route: '/dashboard/whatsapp' },
    { label: 'Google Ads campaigns', desc: 'Modify search campaigns, budgets, and impressions', icon: 'ads_click', route: '/dashboard/google-ads' },
    { label: 'Meta Campaigns Manager', desc: 'Analyze Facebook reach, spend, and conversion events', icon: 'campaign', route: '/dashboard/meta-ads' },
    { label: 'AI Copywriter Copilot', desc: 'Instantly generate ad copy and titles using Gemini AI', icon: 'auto_awesome', route: '/dashboard/ai-assistant' },
    { label: 'Automation Visual Workflows', desc: 'Build visual triggers and actions workflows', icon: 'alt_route', route: '/dashboard/workflow' },
    { label: 'Landing Page Builder', desc: 'Design landing pages and setup domains', icon: 'web', route: '/dashboard/landing-builder' },
    { label: 'Marketing Analytics', desc: 'Overview of ad spend metrics, GA4 statistics, ROI', icon: 'insights', route: '/dashboard/analytics' },
    { label: 'Billing Configuration', desc: 'Review subscription packages and GST invoices', icon: 'receipt', route: '/dashboard/billing' },
    { label: 'Application Integrations', desc: 'Configure GA4, Meta pixels, and credentials keys', icon: 'extension', route: '/dashboard/settings' },
  ];

  filteredCommands = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.commands;
    return this.commands.filter(c => c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q));
  });

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.showPalette.set(!this.showPalette());
    }
  }

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('open-command-palette', () => {
        this.showPalette.set(true);
      });
    }
  }

  onSearch(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  navigateCommand(route: string) {
    this.showPalette.set(false);
    this.router.navigate([route]);
  }
}

