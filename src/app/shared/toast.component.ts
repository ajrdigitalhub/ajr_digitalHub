import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ToastService, ToastMessage } from '../services/toast.service';

@Component({
  selector: 'app-global-toast',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div id="toast-container" class="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-80 sm:w-96 max-w-full pointer-events-none">
      @for (toast of toastService.toasts(); track toast.id) {
        <div 
          class="toast-item pointer-events-auto flex gap-3.5 p-4 rounded-xl border backdrop-blur-md shadow-xl overflow-hidden relative transition-all duration-350 cursor-pointer hover:translate-x-1"
          [ngClass]="getThemeClasses(toast.type)"
          (click)="toastService.remove(toast.id)"
          role="alert"
        >
          <!-- Accent blur glow -->
          <div class="absolute -inset-10 opacity-15 filter blur-xl -z-10 bg-current"></div>

          <!-- Progress Bar at bottom -->
          <div 
            class="absolute bottom-0 left-0 h-[3px]"
            [ngClass]="getProgressBarClasses(toast.type)"
            [style.animationDuration]="toast.duration + 'ms'"
            style="animation-name: slide-progress; animation-timing-function: linear; animation-fill-mode: forwards;"
          ></div>

          <!-- Icon based on type -->
          <div class="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 dark:bg-black/20" [ngClass]="getIconContainerClasses(toast.type)">
            <mat-icon>{{ getIconName(toast.type) }}</mat-icon>
          </div>

          <!-- Content Message -->
          <div class="flex-grow flex flex-col justify-center min-w-0 pr-2">
            <span class="text-xs uppercase font-bold tracking-wider opacity-60 mb-0.5">{{ getTitlePrefix(toast.type) }}</span>
            <p class="text-sm font-semibold leading-relaxed tracking-tight break-words text-slate-800 dark:text-slate-100">
              {{ toast.message }}
            </p>
          </div>

          <!-- Quick close button -->
          <button 
            (click)="$event.stopPropagation(); toastService.remove(toast.id)" 
            class="shrink-0 hover:scale-110 active:scale-90 transition-transform w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/10"
            aria-label="Close notification"
          >
            <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">close</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-item {
      animation: slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes slide-in {
      from {
        opacity: 0;
        transform: translateY(1.5rem) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes slide-progress {
      from {
        width: 100%;
      }
      to {
        width: 0%;
      }
    }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);

  getIconName(type: 'success' | 'error' | 'warning' | 'info'): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info_outline';
    }
  }

  getTitlePrefix(type: 'success' | 'error' | 'warning' | 'info'): string {
    switch (type) {
      case 'success': return 'Success';
      case 'error': return 'System Alert';
      case 'warning': return 'Warning';
      case 'info': return 'Information';
    }
  }

  getThemeClasses(type: 'success' | 'error' | 'warning' | 'info'): string {
    switch (type) {
      case 'success': 
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/20';
      case 'error': 
        return 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300 dark:bg-rose-950/20';
      case 'warning': 
        return 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300 dark:bg-amber-950/20';
      case 'info': 
        return 'bg-indigo-500/10 border-indigo-500/30 text-indigo-800 dark:text-indigo-300 dark:bg-indigo-950/20';
    }
  }

  getProgressBarClasses(type: 'success' | 'error' | 'warning' | 'info'): string {
    switch (type) {
      case 'success': return 'bg-emerald-500/80';
      case 'error': return 'bg-rose-500/80';
      case 'warning': return 'bg-amber-500/80';
      case 'info': return 'bg-indigo-500/80';
    }
  }

  getIconContainerClasses(type: 'success' | 'error' | 'warning' | 'info'): string {
    switch (type) {
      case 'success': return 'text-emerald-500';
      case 'error': return 'text-rose-500';
      case 'warning': return 'text-amber-500';
      case 'info': return 'text-indigo-500';
    }
  }
}
