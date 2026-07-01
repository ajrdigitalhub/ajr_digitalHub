import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="flex items-center gap-4 mb-8 border-b border-app-border pb-6">
        <div class="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-600">
          <mat-icon class="text-[32px] w-[32px] h-[32px]">dashboard</mat-icon>
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-app-text">User Dashboard</h1>
          <p class="text-app-muted mt-1">Manage your connected applications and services.</p>
        </div>
      </div>

      <!-- Welcome Card -->
      <div class="bg-app-card border border-app-border rounded-3xl p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
        <div>
          <h2 class="text-2xl font-bold text-app-text tracking-tight flex items-center gap-2">
            Welcome, {{ user()?.email }}!
          </h2>
          <p class="text-app-muted mt-2 max-w-2xl leading-relaxed">
            From your dashboard, you can view the apps assigned to you, track your usage statistics, and quick-launch connected services.
          </p>
        </div>
        <div class="flex-shrink-0">
          <a routerLink="/marketplace" class="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-1 transition-all flex items-center gap-2">
            Browse Services <mat-icon class="text-[20px] w-[20px] h-[20px]">shopping_bag</mat-icon>
          </a>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-app-card border border-app-border rounded-2xl p-6 hover:border-indigo-500/50 transition-colors">
          <div class="text-app-muted text-sm font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
            <mat-icon class="text-[18px] w-[18px] h-[18px]">apps</mat-icon> Active Apps
          </div>
          <div class="text-4xl font-bold text-app-text">0</div>
        </div>
        <div class="bg-app-card border border-app-border rounded-2xl p-6 hover:border-indigo-500/50 transition-colors">
          <div class="text-app-muted text-sm font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
            <mat-icon class="text-[18px] w-[18px] h-[18px]">storage</mat-icon> Storage Used
          </div>
          <div class="text-4xl font-bold text-app-text">0 <span class="text-xl text-app-muted font-medium">GB</span></div>
        </div>
        <div class="bg-app-card border border-app-border rounded-2xl p-6 hover:border-indigo-500/50 transition-colors">
          <div class="text-app-muted text-sm font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
            <mat-icon class="text-[18px] w-[18px] h-[18px]">receipt_long</mat-icon> Active Invoices
          </div>
          <div class="text-4xl font-bold text-app-text">0</div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="bg-app-bg border border-app-border border-dashed rounded-3xl p-12 text-center">
        <div class="w-20 h-20 bg-app-card rounded-full flex items-center justify-center mx-auto mb-4 text-app-muted border border-app-border">
          <mat-icon class="text-[32px] w-[32px] h-[32px]">widgets</mat-icon>
        </div>
        <h3 class="text-xl font-bold text-app-text mb-2">No Apps Assigned Yet</h3>
        <p class="text-app-muted max-w-sm mx-auto mb-6">
          You currently don't have any applications provisioned. Visit the marketplace to start adding services to your workspace.
        </p>
        <a routerLink="/marketplace" class="text-indigo-600 font-semibold hover:text-indigo-700 transition flex items-center justify-center gap-1">
          Explore Apps <mat-icon class="text-[18px] w-[18px] h-[18px]">arrow_forward</mat-icon>
        </a>
      </div>
    </div>
  `
})
export class DashboardComponent {
  authService = inject(AuthService);
  user = this.authService.currentUser;
}
