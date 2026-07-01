import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AdminStoreService } from '../../../services/admin-store.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-system-core-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './system-core-layout.component.html',
  styleUrl: './system-core-layout.component.scss'
})
export class SystemCoreLayoutComponent {
  store = inject(AdminStoreService);
  router = inject(Router);
  authService = inject(AuthService);

  navItems = [
    { label: 'Admin Dashboard', icon: 'settings', route: '/admin' },
    { label: 'Applications', icon: 'grid_view', route: '/admin' },
    { label: 'SYSTEM CORE_MONITOR', icon: 'dns', route: '/admin/system-core' },
    { label: 'API Monitoring', icon: 'traffic', route: '/admin' },
    { label: 'Database Hub', icon: 'storage', route: '/admin' },
    { label: 'Ecosystem Services', icon: 'dns', route: '/admin' },
    { label: 'System Integrations', icon: 'extension', route: '/admin' },
  ];

  isActive(route: string): boolean {
    if (route === '/admin/system-core') {
      return this.router.url.includes('/system-core');
    }
    return !this.router.url.includes('/system-core') && route === '/admin';
  }

  navigate(route: string, label: string) {
    if (route === '/admin/system-core') {
      this.router.navigate([route]);
    } else {
      // Map menu clicks to sections in /admin as appropriate
      if (label === 'Applications') {
        this.router.navigate(['/admin'], { queryParams: { tab: 'applications' } });
      } else if (label === 'API Monitoring') {
        this.router.navigate(['/admin'], { queryParams: { tab: 'ratelimit' } });
      } else if (label === 'Database Hub') {
        this.router.navigate(['/admin'], { queryParams: { tab: 'applications' } }); // App grid to find database
        this.store.showToast('Select a managed application below to open its database CLI', 'info');
      } else if (label === 'Ecosystem Services') {
        this.router.navigate(['/admin'], { queryParams: { tab: 'analytics' } });
      } else if (label === 'System Integrations') {
        this.router.navigate(['/admin'], { queryParams: { tab: 'ratelimit' } });
      } else {
        this.router.navigate(['/admin']);
      }
    }
  }

  deployNewApp() {
    this.store.showToast('Initiating cloud container provisioning sequence...', 'info');
    setTimeout(() => {
      this.store.showToast('Deploy engine ready. Select template under admin workspace.', 'success');
    }, 1500);
  }

  openDoc() {
    this.store.showToast('Loading cloud terminal dev documentation v2...', 'info');
  }

  openSupport() {
    this.store.showToast('Opening virtual NOC support bridging channel...', 'success');
  }
}
