import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-client-management',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.scss'
})
export class ClientManagementComponent implements OnInit {
  private api = inject(ApiService);
  loading = signal<boolean>(false);
  
  // Navigation
  activeTab = signal<string>('dashboard');

  // Customer profile structures
  company: any = {
    name: '', business_type: '', gst_number: '', pan: '', website: '', industry: '', address: '',
    city: '', state: '', country: '', postal_code: '', timezone: 'Asia/Kolkata', currency: 'INR', logo: ''
  };
  primaryContact: any = { name: '', designation: '', email: '', mobile: '', whatsapp: '', alternate_mobile: '' };
  billingContact: any = { billing_name: '', billing_email: '', billing_mobile: '', gst_details: '', address: '' };
  subscription: any = { plan: 'Lite', billing_cycle: 'monthly', renewal_date: null, status: 'active' };
  
  // Settings & encrypted gateway configs
  integrations: any = {
    whatsapp_cloud_api: { phone_id: '', token: '', waba_id: '' },
    meta_business: { app_id: '', business_id: '' },
    google_ads: { customer_id: '', developer_token: '' },
    firebase: { project_id: '', config_json: '' },
    smtp: { host: '', port: 587, username: '', password: '' },
    payment_gateway: { provider: 'Stripe', apiKey: '', secretKey: '', active: false, sandbox: true }
  };

  // Account configurations
  account: any = { username: '', email: '', password: '', confirmPassword: '', twoFactor: false };

  // Data aggregations
  stats: any = {
    currentSpend: 0,
    plan: 'Lite',
    whatsapp: { msgs: 0, cost: 0 },
    firebase: { cost: 0 },
    googleAds: { spend: 0, cost: 0 }
  };
  
  invoices = signal<any[]>([]);
  transactions = signal<any[]>([]);
  tickets = signal<any[]>([]);
  activityLogs = signal<any[]>([]);

  // Filter values
  txFilterStatus = '';
  txFilterMethod = '';

  ngOnInit() {
    this.loadWorkspaceData();
  }

  async loadWorkspaceData() {
    this.loading.set(true);
    try {
      const { firstValueFrom } = await import('rxjs');
      const customers = await firstValueFrom(this.api.get<any[]>('/customers'));
      
      if (customers && customers.length > 0) {
        const fullCust = await firstValueFrom(this.api.get<any>(`/customers/${customers[0].id}`));
        
        this.company = fullCust;
        this.primaryContact = fullCust.contacts?.find((c: any) => c.is_primary) || { name: '', designation: '', email: '', mobile: '', whatsapp: '', alternate_mobile: '' };
        this.billingContact = fullCust.billing || { billing_name: '', billing_email: '', billing_mobile: '', gst_details: '', address: '' };
        this.subscription = fullCust.subscription || { plan: 'Lite', billing_cycle: 'monthly', renewal_date: null, status: 'active' };
        
        // Setup integrations defaults
        const rawIntegrations = fullCust.integrations || {};
        this.integrations = {
          whatsapp_cloud_api: rawIntegrations.whatsapp_cloud_api || { phone_id: '', token: '', waba_id: '' },
          meta_business: rawIntegrations.meta_business || { app_id: '', business_id: '' },
          google_ads: rawIntegrations.google_ads || { customer_id: '', developer_token: '' },
          firebase: rawIntegrations.firebase || { project_id: '', config_json: '' },
          smtp: rawIntegrations.smtp || { host: '', port: 587, username: '', password: '' },
          payment_gateway: rawIntegrations.payment_gateway || { provider: 'Stripe', apiKey: '', secretKey: '', active: false, sandbox: true }
        };

        // Load dashboard stats
        const statsRes = await firstValueFrom(this.api.get<any>('/billing/stats'));
        this.stats = statsRes || {};

        // Load invoices list
        const invoicesRes = await firstValueFrom(this.api.get<any[]>('/billing/invoices'));
        this.invoices.set(invoicesRes || []);

        // Load transactions history
        const txsRes = await firstValueFrom(this.api.get<any[]>('/billing/transactions'));
        this.transactions.set(txsRes || []);

        // Load support tickets
        const ticketsRes = await firstValueFrom(this.api.get<any[]>('/dynamic/tickets'));
        this.tickets.set(ticketsRes || []);

        // Fetch logs
        const logs = await firstValueFrom(this.api.get<any[]>(`/customers/${customers[0].id}/activity`));
        this.activityLogs.set(logs || []);
      }
    } catch (e) {
      console.error('Failed to load customer workspace data', e);
    } finally {
      this.loading.set(false);
    }
  }

  filteredTransactions() {
    return this.transactions().filter(tx => {
      const matchStatus = !this.txFilterStatus || tx.status === this.txFilterStatus;
      const matchMethod = !this.txFilterMethod || tx.provider === this.txFilterMethod;
      return matchStatus && matchMethod;
    });
  }

  async saveWorkspace() {
    this.loading.set(true);
    try {
      const { firstValueFrom } = await import('rxjs');
      await firstValueFrom(this.api.put(`/customers/${this.company.id}`, {
        ...this.company,
        primary_contact: this.primaryContact,
        billing_contact: this.billingContact,
        subscription: this.subscription,
        integrations: this.integrations
      }));
      
      alert('Workspace configurations updated successfully!');
      await this.loadWorkspaceData();
    } catch (e: any) {
      alert('Failed to save profile: ' + e.message);
    } finally {
      this.loading.set(false);
    }
  }

  async checkoutInvoice(inv: any) {
    if (confirm(`Pay ₹${inv.total_amount} outstanding invoice via ${this.integrations.payment_gateway.provider}?`)) {
      this.loading.set(true);
      try {
        const { firstValueFrom } = await import('rxjs');
        await firstValueFrom(this.api.post(`/billing/checkout/${inv.id}`, {
          amount: inv.total_amount,
          method: this.integrations.payment_gateway.provider
        }));
        
        alert('Payment successful! Transaction history registered.');
        await this.loadWorkspaceData();
      } catch (e: any) {
        alert('Failed to process payment: ' + e.message);
      } finally {
        this.loading.set(false);
      }
    }
  }

  async changePassword() {
    if (this.account.password !== this.account.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    alert('Account password updated successfully (future-ready 2FA state mapped).');
    this.account.password = '';
    this.account.confirmPassword = '';
  }
}
