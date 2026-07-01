import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  // States using Angular Signals
  currentUser = signal<User | null>(null);
  accessToken = signal<string | null>(null);

  isAuthenticated = computed(() => !!this.currentUser());
  isAdmin = computed(() => this.currentUser()?.role === 'admin');

  constructor() {
    this.restoreSession();
  }

  private restoreSession() {
    if (isPlatformBrowser(this.platformId)) {
      const storedUser = localStorage.getItem('form_builder_user');
      const storedToken = localStorage.getItem('form_builder_token');
      if (storedUser && storedToken) {
        try {
          this.currentUser.set(JSON.parse(storedUser));
          this.accessToken.set(storedToken);
        } catch (err) {
          this.clearSession();
        }
      }
    }
  }

  private getApiUrl(path: string): string {
    const base = environment.apiBaseUrl || '/api';
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    if (cleanPath.startsWith('/api/')) {
      return `${cleanBase}/${cleanPath.substring(5)}`;
    }
    return `${cleanBase}${cleanPath}`;
  }

  async login(email: string, password: string): Promise<any> {
    try {
      const res: any = await firstValueFrom(
        this.http.post<any>(this.getApiUrl('/api/auth/login'), { email, password })
      );
      if (res && res.accessToken) {
        this.sessionSuccess(res.user, res.accessToken, res.refreshToken);
        return res;
      }
      throw new Error(res?.message || 'Login failed');
    } catch (err: any) {
      throw new Error(err.error?.message || err.message || 'Login failed');
    }
  }

  async googleLogin(idToken: string, role?: 'admin' | 'user'): Promise<any> {
    try {
      const res: any = await firstValueFrom(
        this.http.post<any>(this.getApiUrl('/api/auth/google-login'), { idToken, role })
      );
      if (res && res.accessToken) {
        this.sessionSuccess(res.user, res.accessToken, res.refreshToken);
        return res;
      }
      throw new Error(res?.message || 'Google Login failed');
    } catch (err: any) {
      throw new Error(err.error?.message || err.error?.error || err.message || 'Google Login failed');
    }
  }

  async signInWithGoogle(role: 'admin' | 'user' = 'user'): Promise<any> {
    const { auth } = await import('../firebase');
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      return await this.googleLogin(idToken, role);
    } catch (error: any) {
      if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        console.warn('⚠️ Google authentication failed or popup blocked. Using mockup fallback for local test...');
        const defaultMockEmail = role === 'admin' ? 'admin-google@saas.com' : 'user-google@saas.com';
        let userEmail: string | null = null;
        try {
          userEmail = prompt('Google popup authentication was blocked/failed. Enter mock Google email for local testing:', defaultMockEmail);
        } catch (e) {
          console.warn('prompt() is blocked or unsupported in this browser environment.');
        }
        const finalEmail = (userEmail || defaultMockEmail).trim() || defaultMockEmail;
        const mockPayload = {
          email: finalEmail,
          name: finalEmail.split('@')[0],
          iat: Math.floor(Date.now() / 1000)
        };
        const mockToken = 'mock.' + btoa(JSON.stringify(mockPayload)) + '.signature';
        return await this.googleLogin(mockToken, role);
      }
      throw new Error(error.message || 'Failed to authenticate with Google');
    }
  }

  async register(email: string, password: string, role: 'admin' | 'user'): Promise<any> {
    try {
      const res: any = await firstValueFrom(
        this.http.post<any>(this.getApiUrl('/api/auth/register'), { email, password, role })
      );
      return res;
    } catch (err: any) {
      throw new Error(err.error?.message || err.message || 'Fail to register');
    }
  }

  getRefreshToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('form_builder_refresh_token');
    }
    return null;
  }

  async tryRefresh(): Promise<boolean> {
    try {
      const rfToken = this.getRefreshToken();
      const res: any = await firstValueFrom(
        this.http.post<any>(this.getApiUrl('/api/auth/refresh'), { refreshToken: rfToken })
      );
      if (res && res.accessToken) {
        this.accessToken.set(res.accessToken);
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('form_builder_token', res.accessToken);
        }
        return true;
      }
    } catch (e) {
      this.clearSession();
    }
    return false;
  }

  refreshToken(): Observable<any> {
    const rfToken = this.getRefreshToken();
    return this.http.post<any>(this.getApiUrl('/api/auth/refresh'), { refreshToken: rfToken }).pipe(
      tap((res) => {
        if (res && res.accessToken) {
          this.accessToken.set(res.accessToken);
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('form_builder_token', res.accessToken);
          }
        }
      })
    );
  }

  logout() {
    this.http.post<any>(this.getApiUrl('/api/auth/logout'), {}).subscribe({
      next: () => this.clearSession(),
      error: () => this.clearSession()
    });
  }

  clearSession() {
    this.currentUser.set(null);
    this.accessToken.set(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('form_builder_user');
      localStorage.removeItem('form_builder_token');
      localStorage.removeItem('form_builder_refresh_token');
    }
    this.router.navigate(['/login']);
  }

  private sessionSuccess(user: User, token: string, refreshToken?: string) {
    this.currentUser.set(user);
    this.accessToken.set(token);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('form_builder_user', JSON.stringify(user));
      localStorage.setItem('form_builder_token', token);
      if (refreshToken) {
        localStorage.setItem('form_builder_refresh_token', refreshToken);
      }
    }
  }
}
