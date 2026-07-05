import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';

@Component({
  imports: [ReactiveFormsModule, MatIconModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-2 min-h-screen bg-app-bg text-app-text selection:bg-[#5B4BFF]/30 font-sans overflow-hidden">
      
      <!-- Left Side: Animated Constellation Network & Services (Dark Theme Backdrop with Variables) -->
      <div class="relative bg-gradient-to-br from-app-bg via-app-card/30 to-app-bg hidden lg:flex flex-col items-center justify-between py-12 px-8 border-r border-app-border">
        
        <!-- Glowing Ambient Lights -->
        <div class="absolute top-1/3 left-1/3 w-[350px] h-[350px] bg-[#5B4BFF]/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div class="absolute bottom-1/3 right-1/3 w-[350px] h-[350px] bg-[#00E5A8]/5 blur-[120px] rounded-full pointer-events-none"></div>

        <!-- Header -->
        <div class="z-10 text-center">
          <span class="tracking-[0.25em] text-[10px] uppercase font-bold text-[#00E5A8] font-mono">
            SECURE INTEGRATION NODE
          </span>
          <h2 class="text-xl font-bold text-app-text mt-2">Connect Your Digital Services</h2>
        </div>

        <!-- Floating Constellation / Services Network Diagram -->
        <div class="relative w-full max-w-md h-[280px] my-auto flex items-center justify-center">
          
          <!-- Constellation lines -->
          <svg class="absolute inset-0 w-full h-full opacity-40 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <style>
              @keyframes dashFlowLines {
                to {
                  stroke-dashoffset: -20;
                }
              }
              .flowing-path {
                stroke-dasharray: 6 3;
                animation: dashFlowLines 1.5s linear infinite;
              }
            </style>
            <!-- Paths from nodes to the center gate (approx center x=200, y=140) -->
            <path d="M 80 50 L 200 140" fill="none" stroke="#5B4BFF" stroke-width="1.5" class="flowing-path" />
            <path d="M 320 50 L 200 140" fill="none" stroke="#00E5A8" stroke-width="1.5" class="flowing-path" />
            <path d="M 80 230 L 200 140" fill="none" stroke="#ea580c" stroke-width="1.5" class="flowing-path" />
            <path d="M 320 230 L 200 140" fill="none" stroke="#00E5A8" stroke-width="1.5" class="flowing-path" />
            
            <circle cx="80" cy="50" r="3" fill="#5B4BFF" class="animate-ping" />
            <circle cx="320" cy="50" r="3" fill="#00E5A8" />
            <circle cx="80" cy="230" r="3" fill="#ea580c" />
            <circle cx="320" cy="230" r="3" fill="#00E5A8" class="animate-ping" />
          </svg>

          <!-- Centered Node -->
          <div class="absolute z-20 w-24 h-24 rounded-full bg-app-card/95 border-2 border-[#5B4BFF] shadow-[0_0_25px_rgba(91,75,255,0.4)] flex flex-col items-center justify-center p-3 text-center">
            <mat-icon class="text-[#00E5A8] !text-[20px] !w-5 !h-5 leading-none">lock_open</mat-icon>
            <span class="text-app-text text-[9px] uppercase font-bold tracking-widest mt-1">AJR Gate</span>
          </div>

          <!-- Floating Node 1: WhatsApp Gateway -->
          <div class="absolute left-2 top-2 w-28 bg-app-card border border-app-border shadow-lg rounded-xl p-2 text-center hover:scale-105 transition">
            <div class="text-[8px] font-bold text-emerald-400 font-mono uppercase">WhatsApp</div>
            <div class="text-[7px] text-app-muted">API Connected</div>
          </div>

          <!-- Floating Node 2: Firebase Storage -->
          <div class="absolute right-2 top-2 w-28 bg-app-card border border-app-border shadow-lg rounded-xl p-2 text-center hover:scale-105 transition">
            <div class="text-[8px] font-bold text-orange-400 font-mono uppercase">Firebase</div>
            <div class="text-[7px] text-app-muted">DB & Storage</div>
          </div>

          <!-- Floating Node 3: Billing Logs -->
          <div class="absolute left-2 bottom-2 w-28 bg-app-card border border-app-border shadow-lg rounded-xl p-2 text-center hover:scale-105 transition">
            <div class="text-[8px] font-bold text-[#5B4BFF] font-mono uppercase">Billing</div>
            <div class="text-[7px] text-app-muted">Auto Invoices</div>
          </div>

          <!-- Floating Node 4: AI Telemetry -->
          <div class="absolute right-2 bottom-2 w-28 bg-app-card border border-app-border shadow-lg rounded-xl p-2 text-center hover:scale-105 transition">
            <div class="text-[8px] font-bold text-[#00E5A8] font-mono uppercase">AI NOC</div>
            <div class="text-[7px] text-app-muted">Telemetry Sync</div>
          </div>

        </div>

        <!-- Flowing Process Workflow Steps Card -->
        <div class="w-full max-w-sm bg-app-card/50 border border-app-border rounded-3xl p-5 relative overflow-hidden group shadow-lg mb-8">
          <style>
            @keyframes stepLineFlow {
              0% {
                top: 0%;
                opacity: 0;
              }
              10% {
                opacity: 1;
              }
              90% {
                opacity: 1;
              }
              100% {
                top: 100%;
                opacity: 0;
              }
            }
            .animate-step-line-flow {
              animation: stepLineFlow 4s linear infinite;
            }
          </style>
          
          <div class="text-[9px] font-mono font-bold tracking-widest text-[#00E5A8] uppercase mb-4 text-center">
            GATEWAY ACCESS WORKFLOW
          </div>
          
          <div class="relative space-y-3.5 pl-6 text-[11px]">
            <!-- Flow line tracker -->
            <div class="absolute left-2.5 top-2.5 bottom-2.5 w-[1.5px] bg-gradient-to-b from-[#5B4BFF] via-[#00E5A8] to-[#5B4BFF]/10">
              <div class="absolute top-0 left-0 w-full h-6 bg-[#00E5A8] shadow-[0_0_8px_#00E5A8] rounded-full animate-step-line-flow"></div>
            </div>
            
            <!-- Step 1 -->
            <div class="flex flex-col gap-0.5 relative">
              <div class="absolute -left-[20px] top-0.5 w-3 h-3 rounded-full bg-app-bg border border-[#5B4BFF] flex items-center justify-center">
                <span class="text-[7px] font-mono font-bold text-[#5B4BFF]">1</span>
              </div>
              <h4 class="font-bold text-app-text uppercase tracking-wider text-[10px]">Tenant Authorization</h4>
              <p class="text-[9px] text-app-muted">Verifying instance administrator permissions</p>
            </div>

            <!-- Step 2 -->
            <div class="flex flex-col gap-0.5 relative">
              <div class="absolute -left-[20px] top-0.5 w-3 h-3 rounded-full bg-app-bg border border-[#00E5A8] flex items-center justify-center">
                <span class="text-[7px] font-mono font-bold text-[#00E5A8]">2</span>
              </div>
              <h4 class="font-bold text-app-text uppercase tracking-wider text-[10px]">GCP Node Handshake</h4>
              <p class="text-[9px] text-app-muted">Synchronizing monitoring endpoints for Firebase</p>
            </div>

            <!-- Step 3 -->
            <div class="flex flex-col gap-0.5 relative">
              <div class="absolute -left-[20px] top-0.5 w-3 h-3 rounded-full bg-app-bg border border-orange-500 flex items-center justify-center">
                <span class="text-[7px] font-mono font-bold text-orange-400">3</span>
              </div>
              <h4 class="font-bold text-app-text uppercase tracking-wider text-[10px]">Meta API Handshake</h4>
              <p class="text-[9px] text-app-muted">Confirming conversation logs status codes</p>
            </div>

          </div>
        </div>

        <!-- Footer -->
        <div class="z-10 text-center text-app-muted text-xs">
          <span>&copy; 2026 AJR Digital HUB &bull; SOC2 Type II Protected Workspace</span>
        </div>

      </div>

      <!-- Right Side: Glassmorphic Auth Form -->
      <div class="flex items-center justify-center p-8 sm:p-12 lg:p-20 bg-app-bg">
        <div class="w-full max-w-md space-y-8">
          
          <!-- Logo & Brand -->
          <div class="text-center">
            <div class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5B4BFF] to-[#00E5A8] shadow-lg text-[#050816] mb-4">
              <mat-icon class="!text-[22px] !w-[22px] !h-[22px] font-bold">shield</mat-icon>
            </div>
            <h2 class="text-2xl font-black tracking-wider text-app-text">
              {{ isLoginMode() ? 'Access Control Tower' : 'Register Service Tenant' }}
            </h2>
            <p class="text-xs text-app-muted mt-1.5 leading-relaxed">
              {{ isLoginMode() ? 'Sign in to access your unified SaaS environments.' : 'Setup a new administrator account for your SaaS instance.' }}
            </p>
          </div>

          <!-- Glass Card Container -->
          <div class="bg-app-card/75 backdrop-blur-xl border border-app-border rounded-3xl p-6 sm:p-8 shadow-2xl relative group">
            
            <!-- Border Glow -->
            <div class="absolute -inset-[1px] bg-gradient-to-br from-[#5B4BFF]/20 to-[#00E5A8]/20 rounded-3xl blur-[1px] -z-10"></div>

            <!-- Login / Signup Mode Tabs -->
            <div class="flex border-b border-app-border pb-4 mb-6">
              <button 
                (click)="isLoginMode.set(true)"
                class="flex-1 text-center font-bold pb-2 text-xs uppercase tracking-wider cursor-pointer transition"
                [class.text-[#00E5A8]]="isLoginMode()"
                [class.border-b-2]="isLoginMode()"
                [class.border-[#00E5A8]]="isLoginMode()"
                [class.text-app-muted]="!isLoginMode()"
              >
                Sign In
              </button>
              <button 
                (click)="isLoginMode.set(false)"
                class="flex-1 text-center font-bold pb-2 text-xs uppercase tracking-wider cursor-pointer transition"
                [class.text-[#00E5A8]]="!isLoginMode()"
                [class.border-b-2]="!isLoginMode()"
                [class.border-[#00E5A8]]="!isLoginMode()"
                [class.text-app-muted]="isLoginMode()"
              >
                Sign Up
              </button>
            </div>

            <!-- Alert Toast Message -->
            @if (toastMessage()) {
              <div class="mb-4 p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in"
                   [ngClass]="toastType() === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'">
                <mat-icon class="!text-[16px] !w-[16px] !h-[16px] leading-none">{{ toastType() === 'success' ? 'check_circle' : 'error' }}</mat-icon>
                <span>{{ toastMessage() }}</span>
              </div>
            }

            <!-- Form -->
            <form [formGroup]="authForm" (ngSubmit)="onSubmit()" class="space-y-5">
              
              <!-- Email -->
              <div>
                <label for="email" class="block text-[10px] font-mono font-bold uppercase tracking-wider text-app-muted mb-1">
                  Email Address
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-app-muted">
                    <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">mail</mat-icon>
                  </div>
                  <input 
                    id="email"
                    formControlName="email"
                    type="email"
                    required
                    class="block w-full pl-10 pr-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text placeholder-app-muted/50 outline-none focus:border-[#5B4BFF] focus:ring-1 focus:ring-[#5B4BFF] transition"
                    placeholder="admin@domain.com"
                  />
                </div>
                @if (f['email'].touched && f['email'].errors?.['required']) {
                  <p class="mt-1 text-xs text-rose-400 font-medium">Email is required</p>
                }
                @if (f['email'].touched && f['email'].errors?.['email']) {
                  <p class="mt-1 text-xs text-rose-400 font-medium">Invalid email format</p>
                }
              </div>

              <!-- Password -->
              <div>
                <label for="password" class="block text-[10px] font-mono font-bold uppercase tracking-wider text-app-muted mb-1">
                  Password
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-app-muted">
                    <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">lock</mat-icon>
                  </div>
                  <input 
                    id="password"
                    formControlName="password"
                    [type]="isPasswordVisible() ? 'text' : 'password'"
                    required
                    class="block w-full pl-10 pr-10 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text placeholder-app-muted/50 outline-none focus:border-[#5B4BFF] focus:ring-1 focus:ring-[#5B4BFF] transition font-mono"
                    placeholder="••••••••"
                  />
                  <button type="button" (click)="isPasswordVisible.set(!isPasswordVisible())" class="absolute inset-y-0 right-0 pr-3 flex items-center text-app-muted hover:text-app-text cursor-pointer">
                    <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">{{ isPasswordVisible() ? 'visibility' : 'visibility_off' }}</mat-icon>
                  </button>
                </div>
                @if (f['password'].touched && f['password'].errors?.['required']) {
                  <p class="mt-1 text-xs text-rose-400 font-medium">Password is required</p>
                }
                @if (f['password'].touched && f['password'].errors?.['minlength']) {
                  <p class="mt-1 text-xs text-rose-400 font-medium">Password must be at least 6 characters</p>
                }
              </div>

              <!-- Remember Me & Forgot Password -->
              <div class="flex items-center justify-between mt-2 select-none">
                <label class="inline-flex items-center gap-2 cursor-pointer text-xs text-app-muted">
                  <input 
                    type="checkbox" 
                    [checked]="rememberMe()" 
                    (change)="rememberMe.set(!rememberMe())" 
                    class="rounded border-app-border bg-app-bg text-[#5B4BFF] focus:ring-[#5B4BFF] h-4 w-4 transition cursor-pointer" 
                  />
                  <span>Remember Me</span>
                </label>
              
              </div>

              <!-- Role Selector (Signup Mode) -->
             

              <!-- Submit Button -->
              <button 
                id="btn-auth-submit"
                type="submit"
                [disabled]="authForm.invalid || isLoading()"
                class="w-full flex justify-center items-center gap-2 py-3 px-4 bg-gradient-to-r from-[#5B4BFF] to-[#00E5A8] hover:brightness-110 text-[#050816] rounded-xl text-sm font-bold shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                @if (isLoading()) {
                  <div class="h-4 w-4 border-2 border-[#050816] border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying credentials...</span>
                } @else {
                  <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">{{ isLoginMode() ? 'login' : 'person_add' }}</mat-icon>
                  <span>{{ isLoginMode() ? 'Sign In Securely' : 'Register Account' }}</span>
                }
              </button>

            </form>

            <!-- Separator -->
            <div class="relative my-6 flex items-center justify-center">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-app-border"></div>
              </div>
              <span class="relative px-3 bg-app-card text-[9px] font-mono tracking-wider text-app-muted uppercase">
                OR CONTINUE WITH
              </span>
            </div>

            <!-- OAuth Buttons -->
            <button 
              id="btn-google-login"
              type="button"
              (click)="loginWithGoogle()"
              [disabled]="isLoading()"
              class="w-full flex justify-center items-center gap-2.5 py-2.5 px-4 border border-app-border rounded-xl text-xs font-bold text-app-text bg-app-bg/40 hover:bg-app-bg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span>Authenticate with Google</span>
            </button>

            <!-- Sandbox Quick Login -->
            

          </div>

        </div>
      </div>

    </div>
  `
})
export class Login implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoginMode = signal<boolean>(true);
  selectedRole = signal<'admin' | 'user'>('user');
  isLoading = signal<boolean>(false);
  isPasswordVisible = signal<boolean>(false);
  rememberMe = signal<boolean>(false);

  toastMessage = signal<string>('');
  toastType = signal<'success' | 'error'>('success');

  authForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  get f() {
    return this.authForm.controls;
  }

  ngOnInit() {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('ajr_remembered_email');
      if (savedEmail) {
        this.authForm.patchValue({ email: savedEmail });
        this.rememberMe.set(true);
      }
    }
  }

  showToast(msg: string, type: 'success' | 'error' = 'success') {
    this.toastMessage.set(msg);
    this.toastType.set(type);
    setTimeout(() => {
      this.toastMessage.set('');
    }, 5000);
  }

  onForgotPassword() {
    const email = this.authForm.value.email;
    if (!email) {
      this.showToast('Please enter your email address to recover your password.', 'error');
      return;
    }
    this.showToast(`Reset instructions transmitted to ${email}. Check your inbox.`, 'success');
  }

  async fillDemo(email: string, role: 'admin' | 'user') {
    this.authForm.patchValue({
      email: email,
      password: 'demopassword123'
    });
    this.isLoginMode.set(true);
    this.isLoading.set(true);
    try {
      await this.authService.register(email, 'demopassword123', role);
    } catch (e) {
      // ignore duplicate error
    } finally {
      this.isLoading.set(false);
    }
    this.onSubmit();
  }

  async onSubmit() {
    if (this.authForm.invalid) { return; }

    this.isLoading.set(true);
    const email = this.authForm.value.email!;
    const password = this.authForm.value.password!;

    try {
      if (this.isLoginMode()) {
        const res = await this.authService.login(email, password);

        // Handle Remember Me storage
        if (typeof window !== 'undefined') {
          if (this.rememberMe()) {
            localStorage.setItem('ajr_remembered_email', email);
          } else {
            localStorage.removeItem('ajr_remembered_email');
          }
        }

        this.showToast('Logged in successfully!', 'success');
        const redirectUrl = localStorage.getItem('redirectAfterLogin');
        const user = this.authService.currentUser();
        if (redirectUrl) {
          localStorage.removeItem('redirectAfterLogin');
          this.router.navigateByUrl(redirectUrl);
        } else if (user && user.role === 'admin') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      } else {
        const role = this.selectedRole();
        await this.authService.register(email, password, role);
        this.showToast('Account registered! You can now log in.', 'success');
        this.isLoginMode.set(true);
      }
    } catch (err: any) {
      this.showToast(err.message || 'Authentication failed', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loginWithGoogle() {
    this.isLoading.set(true);
    const role = this.selectedRole();
    try {
      await this.authService.signInWithGoogle(role);

      const email = this.authService.currentUser()?.email;
      if (email && typeof window !== 'undefined') {
        if (this.rememberMe()) {
          localStorage.setItem('ajr_remembered_email', email);
        } else {
          localStorage.removeItem('ajr_remembered_email');
        }
      }

      this.showToast('Logged in with Google successfully!', 'success');
      const redirectUrl = localStorage.getItem('redirectAfterLogin');
      const user = this.authService.currentUser();
      if (redirectUrl) {
        localStorage.removeItem('redirectAfterLogin');
        this.router.navigateByUrl(redirectUrl);
      } else if (user && user.role === 'admin') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/dashboard']);
      }
    } catch (err: any) {
      this.showToast(err.message || 'Google authentication failed', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }
}
