import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { MatIconModule } from '@angular/material/icon';
import { TechBackground } from '../../shared/tech-ui';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, TechBackground],
  template: `
    <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 relative overflow-hidden bg-app-bg">
      <!-- High tech dynamic grid background -->
      <ajr-tech-background class="absolute inset-0 opacity-80"></ajr-tech-background>

      <!-- Decorative ambient glows in background -->
      <div class="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none animate-pulse"></div>
      <div class="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-pink-500/5 blur-3xl pointer-events-none animate-pulse duration-[6000ms]"></div>

      <div class="relative w-full max-w-lg bg-app-card/50 backdrop-blur-2xl border border-app-border rounded-3xl p-8 sm:p-10 shadow-2xl shadow-indigo-950/20 z-10 transition-all duration-500 hover:border-indigo-500/35 animate-in fade-in zoom-in-95 duration-500">
        
        <!-- Header Brand Info -->
        <div class="text-center mb-8 relative">
          <div class="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 mb-4 transition-all duration-300 hover:scale-105 hover:rotate-6">
            <mat-icon class="!text-[32px] !w-[32px] !h-[32px]">lock</mat-icon>
          </div>
          <h1 class="text-2xl sm:text-3xl font-black text-app-text tracking-tight uppercase">Lockpoint Access</h1>
          <p class="text-xs text-app-muted font-mono mt-2 tracking-wide uppercase">Cluster Entry Authorization Module</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-6">
          
          <!-- Email input -->
          <div class="space-y-2">
            <label class="block text-[10px] font-bold uppercase tracking-widest text-app-muted">Email Address</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <mat-icon class="text-app-muted text-[18px] w-[18px] h-[18px]">email</mat-icon>
              </div>
              <input 
                type="email" 
                formControlName="email"
                placeholder="admin@ajr.com"
                class="w-full bg-app-bg/80 text-app-text border border-app-border focus:border-indigo-500 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-medium placeholder-slate-600"
              >
            </div>
            @if (loginForm.get('email')?.invalid && loginForm.get('email')?.touched) {
              <p class="text-xs text-rose-400 font-medium">Please enter a valid email address.</p>
            }
          </div>

          <!-- Password input -->
          <div class="space-y-2">
            <label class="block text-[10px] font-bold uppercase tracking-widest text-app-muted">Password</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <mat-icon class="text-app-muted text-[18px] w-[18px] h-[18px]">key</mat-icon>
              </div>
              <input 
                [type]="showPassword() ? 'text' : 'password'" 
                formControlName="password"
                placeholder="••••••••"
                class="w-full bg-app-bg/80 text-app-text border border-app-border focus:border-indigo-500 rounded-xl pl-11 pr-11 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-medium placeholder-slate-600"
              >
              <button 
                type="button" 
                (click)="togglePasswordVisibility()" 
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-app-muted hover:text-indigo-400 transition-colors focus:outline-none"
              >
                <mat-icon class="text-[18px] w-[18px] h-[18px]">
                  {{ showPassword() ? 'visibility_off' : 'visibility' }}
                </mat-icon>
              </button>
            </div>
            @if (loginForm.get('password')?.invalid && loginForm.get('password')?.touched) {
              <p class="text-xs text-rose-400 font-medium">Password is required.</p>
            }
          </div>

          <!-- Form Actions / Submit -->
          <button 
            type="submit" 
            [disabled]="loginForm.invalid || isLoading()"
            class="relative w-full overflow-hidden bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.01] active:scale-[0.99] text-app-text rounded-xl py-3.5 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/30 flex items-center justify-center gap-2 mt-4"
          >
            <!-- Glowing line effect on hover -->
            <div class="absolute inset-x-0 bottom-0 h-[2px] bg-indigo-400 opacity-60"></div>

            @if (isLoading()) {
              <mat-icon class="animate-spin text-[18px] w-[18px] h-[18px]">loop</mat-icon>
              <span>Authenticating Session...</span>
            } @else {
              <span>Authenticate Port &rarr;</span>
            }
          </button>
        </form>

        <div class="mt-8 border-t border-app-border pt-6 text-center text-xs font-mono text-app-muted/80 leading-relaxed bg-app-bg/20 p-4 rounded-xl">
          <span class="text-indigo-400 font-bold uppercase tracking-wider block mb-1">Access Credentials</span>
          <div class="flex justify-center gap-4 text-[11px]">
            <div>Admin: <strong class="text-app-text">admin&#64;ajr.com</strong> / <span class="text-app-text">admin123</span></div>
            <div class="h-4 w-px bg-white/10"></div>
            <div>User: <strong class="text-app-text">user&#64;ajr.com</strong> / <span class="text-app-text">user123</span></div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  authService = inject(AuthService);
  toastService = inject(ToastService);
  router = inject(Router);
  fb = inject(FormBuilder);

  showPassword = signal(false);
  isLoading = signal(false);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    
    const { email, password } = this.loginForm.getRawValue();
    if (!email || !password) return;

    this.isLoading.set(true);
    try {
      const res = await this.authService.login(email, password);
      this.isLoading.set(false);
      this.toastService.success(`Welcome back! Session initialized.`);
      
      const redirected = localStorage.getItem('redirectAfterLogin');
      if (redirected) {
        localStorage.removeItem('redirectAfterLogin');
        this.router.navigateByUrl(redirected);
      } else if (res && res.user && res.user.role === 'admin') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/dashboard']);
      }
    } catch (err: any) {
      this.isLoading.set(false);
      this.toastService.error(err.message || 'Authentication failed. Check your credentials.');
    }
  }
}
