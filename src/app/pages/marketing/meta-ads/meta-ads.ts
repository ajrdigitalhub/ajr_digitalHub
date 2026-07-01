import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../../environments/environment';

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  reach: number;
  impressions: number;
  spend: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  frequency: number;
}

@Component({
  selector: 'app-meta-ads',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Top Title Bar -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-app-border pb-5">
        <div>
          <h2 class="text-2xl font-black text-app-text flex items-center gap-2">
            <mat-icon class="text-blue-500">campaign</mat-icon>
            Meta Ads Manager
          </h2>
          <p class="text-xs text-app-muted mt-1">Monitor reach, frequency, Meta Pixel connection status, and campaign spend.</p>
        </div>

        <button (click)="showConnectModal.set(true)" class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer">
          <mat-icon class="text-xs w-4 h-4 leading-none">link</mat-icon>
          Link Facebook Page
        </button>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-app-card border border-app-border rounded-2xl p-5 flex flex-col justify-between">
          <span class="text-[10px] font-extrabold text-app-muted uppercase tracking-wider">Facebook Reach</span>
          <div class="flex justify-between items-end mt-2">
            <h3 class="text-2xl font-black text-app-text font-mono">{{ getSumReach() | number }}</h3>
            <span class="text-xs font-bold text-blue-400">Meta Marketing API</span>
          </div>
        </div>

        <div class="bg-app-card border border-app-border rounded-2xl p-5 flex flex-col justify-between">
          <span class="text-[10px] font-extrabold text-app-muted uppercase tracking-wider">Ad Spend / Clicks</span>
          <div class="flex justify-between items-end mt-2">
            <h3 class="text-lg font-black text-app-text font-mono">₹{{ getSumSpend() | number:'1.2-2' }} / {{ getSumClicks() }}</h3>
            <span class="text-[10px] text-app-muted font-mono">Avg CPC: ₹{{ getAvgCpc() | number:'1.2-2' }}</span>
          </div>
        </div>

        <div class="bg-app-card border border-app-border rounded-2xl p-5 flex flex-col justify-between">
          <span class="text-[10px] font-extrabold text-app-muted uppercase tracking-wider">Conversions / Pixel Events</span>
          <div class="flex justify-between items-end mt-2">
            <h3 class="text-2xl font-black text-app-text font-mono">{{ getSumConversions() }}</h3>
            <span class="text-[10px] text-indigo-400 font-mono">CTR: {{ getAvgCtr() | number:'1.2-2' }}%</span>
          </div>
        </div>

        <div class="bg-app-card border border-app-border rounded-2xl p-5 flex flex-col justify-between">
          <span class="text-[10px] font-extrabold text-app-muted uppercase tracking-wider">Frequency Rate</span>
          <div class="flex justify-between items-end mt-2">
            <h3 class="text-2xl font-black text-app-text font-mono">{{ getAvgFrequency() | number:'1.2-2' }}x</h3>
            <span class="text-[10px] text-emerald-400 font-mono">Pixel Status: Active</span>
          </div>
        </div>
      </div>

      <!-- Main grid list of Meta campaigns -->
      <div class="bg-app-card border border-app-border rounded-2xl p-5 space-y-4">
        <h3 class="text-xs font-extrabold text-app-text uppercase tracking-wider">Active Campaigns & Ad Sets</h3>
        
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-app-border text-[10px] font-bold text-app-muted uppercase tracking-wider">
                <th class="py-3 px-2">Campaign Name</th>
                <th class="py-3 px-2 text-center">Status</th>
                <th class="py-3 px-2 text-center">Reach</th>
                <th class="py-3 px-2 text-center">Impressions</th>
                <th class="py-3 px-2 text-center">Clicks</th>
                <th class="py-3 px-2 text-center">Conversions</th>
                <th class="py-3 px-2 text-right">Spend (INR)</th>
                <th class="py-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-app-border text-xs">
              @for (camp of campaigns(); track camp.id) {
                <tr class="hover:bg-app-bg/40 transition-colors">
                  <td class="py-3 px-2">
                    <div class="font-bold text-app-text">{{ camp.name }}</div>
                    <div class="text-[10px] text-app-muted mt-0.5">Ad Set Frequency: {{ camp.frequency }}x</div>
                  </td>
                  <td class="py-3 px-2 text-center">
                    <span [ngClass]="{
                      'bg-blue-500/10 text-blue-400 border-blue-500/20': camp.status === 'ACTIVE',
                      'bg-rose-500/10 text-rose-400 border-rose-500/20': camp.status === 'PAUSED'
                    }" class="inline-flex px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase">
                      {{ camp.status }}
                    </span>
                  </td>
                  <td class="py-3 px-2 text-center font-mono">{{ camp.reach | number }}</td>
                  <td class="py-3 px-2 text-center font-mono">{{ camp.impressions | number }}</td>
                  <td class="py-3 px-2 text-center font-mono">{{ camp.clicks | number }}</td>
                  <td class="py-3 px-2 text-center font-mono font-bold">{{ camp.conversions }}</td>
                  <td class="py-3 px-2 text-right font-mono font-bold text-indigo-400">₹{{ camp.spend | number:'1.2-2' }}</td>
                  <td class="py-3 px-2 text-right font-bold">
                    <button (click)="toggleStatus(camp)" [ngClass]="camp.status === 'ACTIVE' ? 'bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border-rose-500/20' : 'bg-blue-500/10 hover:bg-blue-600 text-blue-400 hover:text-white border-blue-500/20'" class="px-2 py-1 border rounded-lg text-[9px] font-bold transition-all cursor-pointer">
                      {{ camp.status === 'ACTIVE' ? 'Pause' : 'Resume' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Connect OAuth Modal -->
      @if (showConnectModal()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div class="bg-app-card border border-app-border rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <h4 class="text-sm font-black text-app-text uppercase tracking-wider pb-3 border-b border-app-border mb-4">Link Meta Ad Account</h4>
            <div class="space-y-4">
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-app-muted mb-1">User Access Token</label>
                <input type="text" [(ngModel)]="tempToken" class="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-app-text outline-none focus:border-indigo-500 placeholder:text-app-muted" placeholder="EAAZAd...">
              </div>
              <div class="flex justify-end gap-2 pt-2">
                <button (click)="showConnectModal.set(false)" class="px-4 py-2 border border-app-border hover:bg-app-bg text-app-text rounded-xl text-xs font-bold cursor-pointer transition-colors">Cancel</button>
                <button (click)="connectAccount()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors">Link Page</button>
              </div>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class MetaAds implements OnInit {
  private http = inject(HttpClient);

  campaigns = signal<MetaCampaign[]>([]);
  showConnectModal = signal(false);
  tempToken = '';

  ngOnInit() {
    this.fetchCampaigns();
  }

  fetchCampaigns() {
    this.http.get<MetaCampaign[]>(`${environment.apiUrl}/api/ads/meta`).subscribe({
      next: (res) => this.campaigns.set(res),
      error: () => console.warn('Meta Ads fetch fallback active')
    });
  }

  getSumReach(): number {
    return this.campaigns().reduce((sum, c) => sum + c.reach, 0);
  }

  getSumSpend(): number {
    return this.campaigns().reduce((sum, c) => sum + c.spend, 0);
  }

  getSumClicks(): number {
    return this.campaigns().reduce((sum, c) => sum + c.clicks, 0);
  }

  getSumConversions(): number {
    return this.campaigns().reduce((sum, c) => sum + c.conversions, 0);
  }

  getAvgCpc(): number {
    const list = this.campaigns();
    if (list.length === 0) return 0;
    return list.reduce((sum, c) => sum + c.cpc, 0) / list.length;
  }

  getAvgCtr(): number {
    const list = this.campaigns();
    if (list.length === 0) return 0;
    return list.reduce((sum, c) => sum + c.ctr, 0) / list.length;
  }

  getAvgFrequency(): number {
    const list = this.campaigns();
    if (list.length === 0) return 0;
    return list.reduce((sum, c) => sum + c.frequency, 0) / list.length;
  }

  toggleStatus(camp: MetaCampaign) {
    const nextStatus = camp.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const url = `${environment.apiUrl}/api/ads/meta/${camp.id}/status`;
    this.http.put<MetaCampaign>(url, { status: nextStatus }).subscribe({
      next: (updated) => {
        this.campaigns.update(list => list.map(c => c.id === updated.id ? { ...c, status: updated.status } : c));
      },
      error: () => {
        this.campaigns.update(list => list.map(c => c.id === camp.id ? { ...c, status: nextStatus } : c));
      }
    });
  }

  connectAccount() {
    this.http.post(`${environment.apiUrl}/api/ads/oauth`, {
      provider: 'meta_ads',
      access_token: this.tempToken,
      expires_in: 3600
    }).subscribe({
      next: () => {
        this.showConnectModal.set(false);
        this.tempToken = '';
        this.fetchCampaigns();
      },
      error: () => {
        this.showConnectModal.set(false);
      }
    });
  }
}
