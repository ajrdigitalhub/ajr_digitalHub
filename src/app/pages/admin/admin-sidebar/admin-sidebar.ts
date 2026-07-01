import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export type AdminSection = 'applications' | 'config' | 'ratelimit' | 'analytics';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <aside class="w-full md:w-64 border-r border-app-border  bg-app-bg dark:bg-app-bg shrink-0 flex flex-col h-full">
      
      <!-- App Brand Logo in Sidebar Header -->
      <div class="h-16 flex items-center px-6 border-b border-app-border  gap-3 shrink-0">
        <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-app-text shadow-md text-sm">
          AJR
        </div>
        <div class="flex flex-col">
          <span class="text-xs font-bold text-app-text dark:text-app-text uppercase tracking-wider">HUB Control</span>
          <span class="text-[9px] text-app-muted font-mono">v2.1.0-Admin</span>
        </div>
      </div>

      <!-- Navigation Links -->
      <nav class="p-4 space-y-1.5 flex-grow overflow-y-auto">
        @for (item of navItems; track item.id) {
          <button 
            [id]="'nav-link-' + item.id"
            (click)="onSelect(item.id)"
            [class]="activeSection() === item.id 
              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100 dark:border-indigo-900/30 shadow-sm' 
              : 'text-app-muted dark:text-app-muted hover:bg-app-bg dark:hover:bg-app-card/50 hover:text-app-text dark:hover:text-app-text border border-transparent'" 
            class="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm transition-all text-left">
            <mat-icon class="!w-5 !h-5 !text-[20px]" [class]="activeSection() === item.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-app-muted dark:text-app-muted'">
              {{ item.icon }}
            </mat-icon>
            {{ item.label }}
          </button>
        }
      </nav>

      <!-- System Status Guard -->
      <div class="p-4 border-t border-app-border  shrink-0">
        <div class="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-3 flex items-center gap-3">
          <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <div class="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">
            Agent Bridge Live
          </div>
        </div>
      </div>

    </aside>
  `
})
export class AdminSidebarComponent {
  activeSection = input.required<AdminSection>();
  sectionChanged = output<AdminSection>();

  navItems = [
    { id: 'applications' as const, label: 'Applications', icon: 'grid_view' },
    { id: 'config' as const, label: 'Platform Config', icon: 'settings' },
    { id: 'ratelimit' as const, label: 'Rate Limiter', icon: 'traffic' },
    { id: 'analytics' as const, label: 'Analytics Insights', icon: 'analytics' }
  ];

  onSelect(section: AdminSection) {
    this.sectionChanged.emit(section);
  }
}
