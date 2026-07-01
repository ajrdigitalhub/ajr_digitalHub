import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from './services/auth.service';
import { IdleService } from './services/idle.service';
import { HeaderComponent } from './shared/header.component';
import { PwaInstallPromptComponent } from './shared/pwa-install-prompt';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatIconModule, HeaderComponent, PwaInstallPromptComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Global Header -->
    @if (shouldShowHeader()) {
      <app-header></app-header>
    }

    <!-- Main router outlet -->
    <router-outlet></router-outlet>

    <!-- Custom PWA Install Prompt Bottom Sheet -->
    <app-pwa-install-prompt></app-pwa-install-prompt>

    <!-- Global Floating Countdown in Top Right Corner in the last 1 minute -->
    @if (idle.showWarningModal() && auth.isAuthenticated()) {
      <div id="session-countdown-pill" class="fixed top-4 right-4 z-50 flex items-center gap-2 bg-rose-600 text-white font-mono text-sm px-4 py-2.5 rounded-full shadow-lg border border-rose-500 animate-pulse">
        <mat-icon class="text-white text-base">timer</mat-icon>
        <span>Session expires in {{ idle.countdownStr() }}</span>
      </div>

      <!-- Warning Modal Overlay (At 9 minutes) -->
      <div id="session-warning-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 text-center">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-4">
            <mat-icon class="text-3xl h-8 w-8">warning_amber</mat-icon>
          </div>
          <h3 class="text-xl font-semibold text-slate-900 mb-2">Session Expiring</h3>
          <p class="text-sm text-slate-500 mb-6 leading-relaxed">
            Your secure session has been idle for 9 minutes and is about to expire. Would you like to continue working?
          </p>
          
          <!-- Large countdown circle visualization -->
          <div class="flex items-center justify-center gap-2 mb-6 font-mono text-4xl font-bold text-rose-600">
            {{ idle.countdownStr() }}
          </div>

          <div class="flex flex-col gap-2sm:flex-row sm:gap-3 justify-end">
            <button 
              id="btn-session-continue"
              (click)="idle.continueSession()"
              class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm transition-all text-sm cursor-pointer"
            >
              <mat-icon class="text-sm">refresh</mat-icon>
              Keep Me Logged In
            </button>
            <button 
              id="btn-session-logout"
              (click)="idle.logoutNow()"
              class="w-full sm:w-auto mt-2 sm:mt-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all text-sm cursor-pointer"
            >
              <mat-icon class="text-sm">logout</mat-icon>
              Logout Now
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class App {
  auth = inject(AuthService);
  idle = inject(IdleService);
  router = inject(Router);

  shouldShowHeader(): boolean {
    const url = this.router.url;
    if (url.includes('/dashboard')) {
      return false;
    }
    // Hide header only for public form paths (e.g. /form/:id) or login paths if desired
    if (url.includes('/form/') && !url.includes('/dashboard/forms')) {
      return false;
    }
    return true;
  }
}
