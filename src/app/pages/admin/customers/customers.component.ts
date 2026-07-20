import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.scss'
})
export class AdminCustomersComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  loading = signal<boolean>(false);
  customers = signal<any[]>([]);

  // Drawer & History state signals
  selectedCustomer = signal<any | null>(null);
  notificationHistory = signal<any[]>([]);
  loadingHistory = signal<boolean>(false);

  ngOnInit() {
    this.loadCustomers();
  }

  async loadCustomers() {
    this.loading.set(true);
    try {
      const { firstValueFrom } = await import('rxjs');
      const res = await firstValueFrom(this.api.get<any[]>('/customers'));
      this.customers.set(res || []);
    } catch (e) {
      console.error('Failed to load customers list', e);
    } finally {
      this.loading.set(false);
    }
  }

  selectCustomer(cust: any) {
    this.selectedCustomer.set(cust);
    this.loadNotificationHistory(cust.id);
  }

  closeDrawer() {
    this.selectedCustomer.set(null);
    this.notificationHistory.set([]);
  }

  async loadNotificationHistory(customerId: string) {
    this.loadingHistory.set(true);
    try {
      const { firstValueFrom } = await import('rxjs');
      const history = await firstValueFrom(this.api.get<any[]>(`/notifications/history/${customerId}`));
      this.notificationHistory.set(history || []);
    } catch (err) {
      console.error('Failed to load customer notification history:', err);
    } finally {
      this.loadingHistory.set(false);
    }
  }

  notifyClient(customerId: string) {
    this.router.navigate(['/admin/notification-center'], { queryParams: { customerId } });
  }

  async toggleCustomerStatus(customer: any) {
    const nextStatus = customer.status === 'active' ? 'suspended' : 'active';
    try {
      const { firstValueFrom } = await import('rxjs');
      await firstValueFrom(this.api.put(`/customers/${customer.id}`, { status: nextStatus }));
      alert(`Customer status updated to ${nextStatus}`);
      this.loadCustomers();
      if (this.selectedCustomer()?.id === customer.id) {
        this.selectedCustomer.set({ ...customer, status: nextStatus });
      }
    } catch (e: any) {
      alert('Failed to update status: ' + e.message);
    }
  }

  async triggerBillingCron() {
    this.loading.set(true);
    try {
      const { firstValueFrom } = await import('rxjs');
      await firstValueFrom(this.api.post('/admin/billing/run-customer', {}));
      alert('Customer monthly billing cron completed successfully! Check invoice history.');
    } catch (e: any) {
      alert('Failed to run billing cron: ' + e.message);
    } finally {
      this.loading.set(false);
    }
  }
}
