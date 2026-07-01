import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class IdleService {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Configuration (in seconds)
  private readonly IDLE_THRESHOLD = 9 * 60; // 9 minutes = 540s
  private readonly TOTAL_THRESHOLD = 10 * 60; // 10 minutes = 600s

  // State Signals
  secondsPassed = signal<number>(0);
  showWarningModal = signal<boolean>(false);

  // Derived state calculations
  secondsRemaining = computed(() => {
    return Math.max(0, this.TOTAL_THRESHOLD - this.secondsPassed());
  });

  countdownStr = computed(() => {
    const total = this.secondsRemaining();
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  private intervalId: any = null;

  constructor() {
    // Setup activity event listeners
    this.setupListeners();

    // Side effect to start/stop tracking based on Auth State
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.startTimer();
      } else {
        this.stopTimer();
      }
    });
  }

  private startTimer() {
    this.stopTimer();
    this.secondsPassed.set(0);
    this.showWarningModal.set(false);

    this.intervalId = setInterval(() => {
      this.secondsPassed.update(s => s + 1);
      const passed = this.secondsPassed();

      // At 9 minutes (remaining <= 60 seconds), trigger warning
      if (passed >= this.IDLE_THRESHOLD && passed < this.TOTAL_THRESHOLD) {
        this.showWarningModal.set(true);
      }

      // At 10 minutes, auto-logout
      if (passed >= this.TOTAL_THRESHOLD) {
        this.triggerAutoLogout();
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.secondsPassed.set(0);
    this.showWarningModal.set(false);
  }

  resetInactivity() {
    // Do not reset while modal is showing (user must click Continue explicitly)
    if (this.showWarningModal()) {
      return;
    }
    this.secondsPassed.set(0);
  }

  continueSession() {
    // Try to refresh token as requested: Continue -> refresh token
    this.authService.tryRefresh().then(success => {
      this.secondsPassed.set(0);
      this.showWarningModal.set(false);
    });
  }

  logoutNow() {
    this.showWarningModal.set(false);
    this.authService.logout();
  }

  private triggerAutoLogout() {
    this.stopTimer();
    this.authService.clearSession();
  }

  private setupListeners() {
    if (typeof window !== 'undefined') {
      const reset = () => this.resetInactivity();
      window.addEventListener('mousemove', reset);
      window.addEventListener('click', reset);
      window.addEventListener('keypress', reset);
    }
  }
}
