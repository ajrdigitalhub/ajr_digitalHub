import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AdminStoreService } from '../../../services/admin-store.service';

@Component({
  selector: 'app-admin-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <header class="bg-app-card dark:bg-app-bg border-b border-app-border  h-16 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
      <div class="flex items-center gap-3">
        <h1 class="text-md font-bold text-app-text  tracking-tight flex items-center gap-2">
          Platform Admin Panel
        </h1>
        <span class="px-2 py-0.5 rounded-full text-[9px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-mono font-bold border border-indigo-100 dark:border-indigo-900/40">
          SECURE BRIDGE
        </span>
      </div>

      <!-- Quick Metrics Ribbon -->
      <div class="flex items-center gap-6 text-xs font-semibold text-app-muted dark:text-app-muted">
        <div class="flex items-center gap-1.5 bg-app-bg dark:bg-app-card/40 px-2.5 py-1.5 rounded-lg border border-app-border ">
          <mat-icon class="!w-4 !h-4 !text-[16px] text-indigo-500">apps</mat-icon>
          Total Apps: <strong class="text-app-text  font-mono">{{ totalApps() }}</strong>
        </div>
        <div class="flex items-center gap-1.5 bg-app-bg dark:bg-app-card/40 px-2.5 py-1.5 rounded-lg border border-app-border ">
          <mat-icon class="!w-4 !h-4 !text-[16px] text-emerald-500">insights</mat-icon>
          Total Edge Requests: <strong class="text-app-text  font-mono">{{ edgeRequests() | number }}</strong>
        </div>
        <div class="flex items-center gap-1.5 bg-app-bg dark:bg-app-card/40 px-2.5 py-1.5 rounded-lg border border-app-border ">
          <mat-icon class="!w-4 !h-4 !text-[16px] text-rose-500">error_outline</mat-icon>
          Errors: <strong class="text-rose-600 dark:text-rose-400 font-mono">{{ errorsCount() | number }}</strong>
        </div>
      </div>
    </header>
  `
})
export class AdminHeaderComponent {
  store = inject(AdminStoreService);

  totalApps = computed(() => this.store.apps().length);
  edgeRequests = computed(() => this.store.staticAnalytics().totalRequests);
  errorsCount = computed(() => this.store.staticAnalytics().errors);
}
