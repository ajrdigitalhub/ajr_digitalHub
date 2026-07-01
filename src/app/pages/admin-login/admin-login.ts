import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './admin-login.html'
})
export class AdminLoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  username = signal('');
  password = signal('');
  loading = signal(false);
  errorMsg = signal('');

  async login(event: Event) {
    event.preventDefault();
    this.loading.set(true);
    this.errorMsg.set('');

    try {
      const res = await this.authService.login(this.username(), this.password());
      if (res && res.user && res.user.role === 'admin') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/dashboard']);
      }
    } catch (err: any) {
      this.errorMsg.set(err.message || 'Invalid credentials');
    } finally {
      this.loading.set(false);
    }
  }

  async loginWithGoogle() {
    this.loading.set(true);
    this.errorMsg.set('');
    try {
      const res = await this.authService.signInWithGoogle('admin');
      if (res && res.user && res.user.role === 'admin') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/dashboard']);
      }
    } catch (err: any) {
      this.errorMsg.set(err.message || 'Google login failed');
    } finally {
      this.loading.set(false);
    }
  }
}
