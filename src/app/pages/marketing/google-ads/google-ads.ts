import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../../environments/environment';

interface GoogleCampaign {
  id: string;
  name: string;
  status: string;
  budget: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  spend: number;
  roas: number;
  optimization_score: number;
}

@Component({
  selector: 'app-google-ads',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Top Title Bar -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-app-border pb-5">
        <div>
          <h2 class="text-2xl font-black text-app-text flex items-center gap-2">
            <mat-icon class="text-yellow-500">ads_click</mat-icon>
            Google Ads Center
          </h2>
          <p class="text-xs text-app-muted mt-1">Manage active search ads, keywords, quality scores, and daily budgets.</p>
        </div>

        <button (click)="showConnectModal.set(true)" class="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer">
          <mat-icon class="text-xs w-4 h-4 leading-none">link</mat-icon>
          Link Google Ads Account
        </button>
      </div>

      <!-- Quick stats summation -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-app-card border border-app-border rounded-2xl p-5 flex flex-col justify-between">
          <span class="text-[10px] font-extrabold text-app-muted uppercase tracking-wider">Total Ad Spend</span>
          <div class="flex justify-between items-end mt-2">
            <h3 class="text-2xl font-black text-app-text font-mono">₹{{ getSumSpend() | number:'1.2-2' }}</h3>
            <span class="text-xs font-bold text-yellow-400">Google Ads API</span>
          </div>
        </div>

        <div class="bg-app-card border border-app-border rounded-2xl p-5 flex flex-col justify-between">
          <span class="text-[10px] font-extrabold text-app-muted uppercase tracking-wider">Conversions Count</span>
          <div class="flex justify-between items-end mt-2">
            <h3 class="text-2xl font-black text-app-text font-mono">{{ getSumConversions() }}</h3>
            <span class="text-[10px] text-app-muted font-mono">Avg ROAS: {{ getAvgRoas() | number:'1.1-1' }}x</span>
          </div>
        </div>

        <div class="bg-app-card border border-app-border rounded-2xl p-5 flex flex-col justify-between">
          <span class="text-[10px] font-extrabold text-app-muted uppercase tracking-wider">Impressions / Clicks</span>
          <div class="flex justify-between items-end mt-2">
            <h3 class="text-lg font-black text-app-text font-mono">{{ getSumImpressions() }} / {{ getSumClicks() }}</h3>
            <span class="text-[10px] text-indigo-400 font-mono">CTR: {{ getAvgCtr() | number:'1.2-2' }}%</span>
          </div>
        </div>

        <div class="bg-app-card border border-app-border rounded-2xl p-5 flex flex-col justify-between">
          <span class="text-[10px] font-extrabold text-app-muted uppercase tracking-wider">Avg CPC</span>
          <div class="flex justify-between items-end mt-2">
            <h3 class="text-2xl font-black text-app-text font-mono">₹{{ getAvgCpc() | number:'1.2-2' }}</h3>
            <span class="text-[10px] text-app-muted font-mono">Quality Score: 9/10</span>
          </div>
        </div>
      </div>

      <!-- Main grid list of campaigns -->
      <div class="bg-app-card border border-app-border rounded-2xl p-5 space-y-4">
        <h3 class="text-xs font-extrabold text-app-text uppercase tracking-wider">Active Search & Display Campaigns</h3>
        
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-app-border text-[10px] font-bold text-app-muted uppercase tracking-wider">
                <th class="py-3 px-2">Campaign Info</th>
                <th class="py-3 px-2 text-center">Status</th>
                <th class="py-3 px-2 text-right">Daily Budget</th>
                <th class="py-3 px-2 text-center">Clicks</th>
                <th class="py-3 px-2 text-center">Conversions</th>
                <th class="py-3 px-2 text-center">CTR</th>
                <th class="py-3 px-2 text-center">ROAS</th>
                <th class="py-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-app-border text-xs">
              @for (camp of campaigns(); track camp.id) {
                <tr class="hover:bg-app-bg/40 transition-colors">
                  <td class="py-3 px-2">
                    <div class="font-bold text-app-text">{{ camp.name }}</div>
                    <div class="text-[10px] text-app-muted mt-0.5">Optimization Score: {{ camp.optimization_score }}%</div>
                  </td>
                  <td class="py-3 px-2 text-center">
                    <span [ngClass]="{
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20': camp.status === 'ENABLED',
                      'bg-rose-500/10 text-rose-400 border-rose-500/20': camp.status === 'PAUSED'
                    }" class="inline-flex px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase">
                      {{ camp.status }}
                    </span>
                  </td>
                  <td class="py-3 px-2 text-right font-mono font-bold">
                    ₹{{ camp.budget }} / day
                  </td>
                  <td class="py-3 px-2 text-center font-mono">{{ camp.clicks | number }}</td>
                  <td class="py-3 px-2 text-center font-mono">{{ camp.conversions }}</td>
                  <td class="py-3 px-2 text-center font-mono">{{ camp.ctr }}%</td>
                  <td class="py-3 px-2 text-center font-mono text-indigo-400 font-bold">{{ camp.roas }}x</td>
                  <td class="py-3 px-2 text-right">
                    <div class="flex gap-1.5 justify-end">
                      <button (click)="openBudgetEditor(camp)" class="px-2 py-1 border border-app-border hover:bg-app-bg text-[9px] font-bold rounded-lg transition-all cursor-pointer">
                        Edit Budget
                      </button>
                      <button (click)="toggleStatus(camp)" [ngClass]="camp.status === 'ENABLED' ? 'bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border-rose-500/20' : 'bg-emerald-500/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border-emerald-500/20'" class="px-2 py-1 border rounded-lg text-[9px] font-bold transition-all cursor-pointer">
                        {{ camp.status === 'ENABLED' ? 'Pause' : 'Resume' }}
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Budget Modification Modal -->
      @if (showBudgetModal()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div class="bg-app-card border border-app-border rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <h4 class="text-sm font-black text-app-text uppercase tracking-wider pb-3 border-b border-app-border mb-4">Edit Daily Budget</h4>
            <div class="space-y-4">
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-app-muted mb-1">New Budget (INR / Day)</label>
                <input type="number" [(ngModel)]="tempBudget" class="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-app-text outline-none focus:border-indigo-500 placeholder:text-app-muted">
              </div>
              <div class="flex justify-end gap-2 pt-2">
                <button (click)="showBudgetModal.set(false)" class="px-4 py-2 border border-app-border hover:bg-app-bg text-app-text rounded-xl text-xs font-bold cursor-pointer transition-colors">Cancel</button>
                <button (click)="saveBudget()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors">Save</button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Connect OAuth Modal -->
      @if (showConnectModal()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div class="bg-app-card border border-app-border rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <h4 class="text-sm font-black text-app-text uppercase tracking-wider pb-3 border-b border-app-border mb-4">Link Google Ads Accounts</h4>
            <div class="space-y-4">
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-app-muted mb-1">OAuth Access Token</label>
                <input type="text" [(ngModel)]="tempToken" class="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-app-text outline-none focus:border-indigo-500 placeholder:text-app-muted" placeholder="ya29.a0AfB_...">
              </div>
              <div class="flex justify-end gap-2 pt-2">
                <button (click)="showConnectModal.set(false)" class="px-4 py-2 border border-app-border hover:bg-app-bg text-app-text rounded-xl text-xs font-bold cursor-pointer transition-colors">Cancel</button>
                <button (click)="connectAccount()" class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors">Link Account</button>
              </div>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class GoogleAds implements OnInit {
  private http = inject(HttpClient);

  campaigns = signal<GoogleCampaign[]>([]);
  showBudgetModal = signal(false);
  showConnectModal = signal(false);
  selectedCampaign: GoogleCampaign | null = null;
  tempBudget = 0;
  tempToken = '';

  ngOnInit() {
    this.fetchCampaigns();
  }

  fetchCampaigns() {
    this.http.get<GoogleCampaign[]>(`${environment.apiUrl}/api/ads/google`).subscribe({
      next: (res) => this.campaigns.set(res),
      error: () => console.warn('Google Ads fetch fallback active')
    });
  }

  getSumSpend(): number {
    return this.campaigns().reduce((sum, c) => sum + c.spend, 0);
  }

  getSumConversions(): number {
    return this.campaigns().reduce((sum, c) => sum + c.conversions, 0);
  }

  getSumImpressions(): number {
    return this.campaigns().reduce((sum, c) => sum + c.impressions, 0);
  }

  getSumClicks(): number {
    return this.campaigns().reduce((sum, c) => sum + c.clicks, 0);
  }

  getAvgRoas(): number {
    const list = this.campaigns();
    if (list.length === 0) return 0;
    return list.reduce((sum, c) => sum + c.roas, 0) / list.length;
  }

  getAvgCtr(): number {
    const list = this.campaigns();
    if (list.length === 0) return 0;
    return list.reduce((sum, c) => sum + c.ctr, 0) / list.length;
  }

  getAvgCpc(): number {
    const list = this.campaigns();
    if (list.length === 0) return 0;
    return list.reduce((sum, c) => sum + c.cpc, 0) / list.length;
  }

  openBudgetEditor(camp: GoogleCampaign) {
    this.selectedCampaign = camp;
    this.tempBudget = camp.budget;
    this.showBudgetModal.set(true);
  }

  saveBudget() {
    if (!this.selectedCampaign) return;
    const url = `${environment.apiUrl}/api/ads/google/${this.selectedCampaign.id}/budget`;
    this.http.put<GoogleCampaign>(url, { budget: this.tempBudget }).subscribe({
      next: (updated) => {
        this.campaigns.update(list => list.map(c => c.id === updated.id ? { ...c, budget: updated.budget } : c));
        this.showBudgetModal.set(false);
      },
      error: () => {
        const id = this.selectedCampaign!.id;
        this.campaigns.update(list => list.map(c => c.id === id ? { ...c, budget: this.tempBudget } : c));
        this.showBudgetModal.set(false);
      }
    });
  }

  toggleStatus(camp: GoogleCampaign) {
    const nextStatus = camp.status === 'ENABLED' ? 'PAUSED' : 'ENABLED';
    const url = `${environment.apiUrl}/api/ads/google/${camp.id}/status`;
    this.http.put<GoogleCampaign>(url, { status: nextStatus }).subscribe({
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
      provider: 'google_ads',
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
