import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';

export interface BillingInvoice {
  id: string;
  invoice_number: string;
  billing_period_start: string;
  billing_period_end: string;
  amount: number;
  gst: number;
  discounts: number;
  total_amount: number;
  status: 'pending' | 'paid' | 'unpaid' | 'overdue';
  due_date: string;
  pdf_url?: string;
  payment_link?: string;
}

@Component({
  selector: 'app-billing-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './billing.component.html',
  styleUrl: './billing.component.scss'
})
export class BillingDashboardComponent implements OnInit {
  private api = inject(ApiService);
  loading = signal<boolean>(false);
  invoices = signal<BillingInvoice[]>([]);
  stats = signal<any>({
    currentSpend: 0,
    plan: 'Lite',
    whatsapp: { msgs: 0, cost: 0 },
    firebase: { cost: 0 },
    googleAds: { spend: 0, cost: 0 }
  });

  customerProfile = signal<any>(null);
  isSavingGateway = signal<boolean>(false);

  ngOnInit() {
    this.loadBillingData();
    this.loadCustomerProfile();
  }

  async loadCustomerProfile() {
    try {
      const { firstValueFrom } = await import('rxjs');
      const custs = await firstValueFrom(this.api.get<any[]>('/customers'));
      if (custs && custs.length > 0) {
        const profile = await firstValueFrom(this.api.get<any>(`/customers/${custs[0].id}`));
        
        // Initialize payment_gateway if not present
        if (!profile.integrations) {
          profile.integrations = {};
        }
        if (!profile.integrations.payment_gateway) {
          profile.integrations.payment_gateway = {
            provider: 'Stripe',
            apiKey: '',
            secretKey: '',
            active: false,
            sandbox: true
          };
        }
        this.customerProfile.set(profile);
      }
    } catch (e) {
      console.error('Failed to load customer profile details', e);
    }
  }

  async savePaymentGateway() {
    const profile = this.customerProfile();
    if (!profile) return;
    this.isSavingGateway.set(true);
    try {
      const { firstValueFrom } = await import('rxjs');
      await firstValueFrom(this.api.put(`/customers/${profile.id}`, {
        integrations: {
          payment_gateway: profile.integrations.payment_gateway
        }
      }));
      alert('Payment gateway configurations saved successfully!');
    } catch (e: any) {
      alert('Failed to save gateway config: ' + e.message);
    } finally {
      this.isSavingGateway.set(false);
    }
  }

  async loadBillingData() {
    this.loading.set(true);
    try {
      const { firstValueFrom } = await import('rxjs');
      
      // Load billing statistics
      const statsRes = await firstValueFrom(this.api.get<any>('/billing/stats'));
      this.stats.set(statsRes || {});

      // Load client invoices
      const invoicesRes = await firstValueFrom(this.api.get<BillingInvoice[]>('/billing/invoices'));
      this.invoices.set(invoicesRes || []);
    } catch (e) {
      console.error('Failed to load billing summary details', e);
    } finally {
      this.loading.set(false);
    }
  }
}
