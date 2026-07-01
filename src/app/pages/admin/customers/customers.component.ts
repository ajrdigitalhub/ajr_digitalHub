import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
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
  loading = signal<boolean>(false);
  customers = signal<any[]>([]);

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

  async toggleCustomerStatus(customer: any) {
    const nextStatus = customer.status === 'active' ? 'suspended' : 'active';
    try {
      const { firstValueFrom } = await import('rxjs');
      await firstValueFrom(this.api.put(`/customers/${customer.id}`, { status: nextStatus }));
      alert(`Customer status updated to ${nextStatus}`);
      this.loadCustomers();
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
