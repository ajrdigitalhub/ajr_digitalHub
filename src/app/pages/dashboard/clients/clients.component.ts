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

  company: any = {};
  primaryContact: any = {};
  billingContact: any = {};
  subscription: any = {};
  integrations: any = {
    whatsapp_cloud_api: {},
    google_ads: {},
    firebase: {}
  };
  activityLogs = signal<any[]>([]);

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
        this.primaryContact = fullCust.contacts?.find((c: any) => c.is_primary) || {};
        this.billingContact = fullCust.billing || {};
        this.subscription = fullCust.subscription || { plan: 'Lite', billing_cycle: 'monthly' };
        this.integrations = fullCust.integrations || { whatsapp_cloud_api: {}, google_ads: {}, firebase: {} };
        if (typeof this.integrations.whatsapp_cloud_api === 'string') {
          this.integrations.whatsapp_cloud_api = JSON.parse(this.integrations.whatsapp_cloud_api);
        }
        if (typeof this.integrations.google_ads === 'string') {
          this.integrations.google_ads = JSON.parse(this.integrations.google_ads);
        }
        if (typeof this.integrations.firebase === 'string') {
          this.integrations.firebase = JSON.parse(this.integrations.firebase);
        }

        // Fetch logs
        const logs = await firstValueFrom(this.api.get<any[]>(`/customers/${customers[0].id}/activity`));
        this.activityLogs.set(logs || []);
      }
    } catch (e) {
      console.error('Failed to load workspace data', e);
    } finally {
      this.loading.set(false);
    }
  }

  async saveWorkspace() {
    if (!this.company.id) {
      // Create new customer
      try {
        const { firstValueFrom } = await import('rxjs');
        await firstValueFrom(this.api.post('/customers', {
          ...this.company,
          primary_contact: this.primaryContact,
          billing_contact: this.billingContact,
          subscription: this.subscription,
          integrations: this.integrations
        }));
        alert('Workspace saved successfully!');
        this.loadWorkspaceData();
      } catch (e: any) {
        alert('Failed to save profile: ' + e.message);
      }
      return;
    }

    try {
      const { firstValueFrom } = await import('rxjs');
      await firstValueFrom(this.api.put(`/customers/${this.company.id}`, {
        ...this.company,
        primary_contact: this.primaryContact,
        billing_contact: this.billingContact,
        subscription: this.subscription,
        integrations: this.integrations
      }));
      alert('Workspace updated successfully!');
      this.loadWorkspaceData();
    } catch (e: any) {
      alert('Failed to update workspace: ' + e.message);
    }
  }
}
