import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';

interface Lead {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  company_name?: string;
  status: string;
  source: string;
  score: number;
  created_at: string;
}

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
  contact_id?: string;
  lead_id?: string;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  created_at: string;
}

@Component({
  selector: 'app-crm-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Top Title Grid -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-app-border pb-5">
        <div>
          <h2 class="text-2xl font-black text-app-text flex items-center gap-2">
            <mat-icon class="text-indigo-500">storefront</mat-icon>
            Sales CRM Hub
          </h2>
          <p class="text-xs text-app-muted mt-1">Manage leads, pipeline stages, activity notes, and deal metrics.</p>
        </div>
        
        <!-- Toggle Tabs -->
        <div class="bg-app-card border border-app-border p-1 rounded-xl flex gap-1">
          <button (click)="activeTab.set('pipeline')" [class.bg-indigo-600]="activeTab() === 'pipeline'" [class.text-white]="activeTab() === 'pipeline'" class="px-4 py-2 text-xs font-bold text-app-muted rounded-lg transition-all cursor-pointer">
            Deals Pipeline
          </button>
          <button (click)="activeTab.set('leads')" [class.bg-indigo-600]="activeTab() === 'leads'" [class.text-white]="activeTab() === 'leads'" class="px-4 py-2 text-xs font-bold text-app-muted rounded-lg transition-all cursor-pointer">
            Leads & Contacts
          </button>
        </div>
      </div>

      <!-- Tab Content 1: Deals Pipeline Kanban -->
      @if (activeTab() === 'pipeline') {
        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          @for (stage of stages; track stage) {
            <div class="bg-app-card border border-app-border rounded-2xl p-4 flex flex-col min-h-[500px]">
              <div class="flex justify-between items-center pb-3 border-b border-app-border mb-3">
                <h4 class="text-xs font-extrabold text-app-text uppercase tracking-wider">{{ stage }}</h4>
                <span class="text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded">
                  ₹{{ getStageTotal(stage) | number:'1.2-2' }}
                </span>
              </div>

              <!-- Deal list -->
              <div class="flex-grow space-y-3">
                @for (deal of getDealsForStage(stage); track deal.id) {
                  <div class="bg-app-bg border border-app-border rounded-xl p-3.5 hover:border-indigo-500/50 shadow-sm transition-all group relative">
                    <div class="flex justify-between items-start">
                      <h5 class="text-xs font-black text-app-text group-hover:text-indigo-400 truncate max-w-[120px]">{{ deal.title }}</h5>
                      <span class="text-[10px] font-mono font-bold text-emerald-400">₹{{ deal.value }}</span>
                    </div>
                    <p class="text-[9px] text-app-muted mt-1.5">ID: {{ deal.id }}</p>

                    <!-- Stage actions -->
                    <div class="mt-3 flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      @for (target of stages; track target) {
                        @if (target !== stage) {
                          <button (click)="moveDeal(deal.id, target)" [title]="'Move to ' + target"
                                  class="text-[9px] font-bold bg-app-card hover:bg-indigo-600 hover:text-white border border-app-border px-1.5 py-0.5 rounded transition-all cursor-pointer">
                            {{ target.charAt(0) }}
                          </button>
                        }
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- Quick Deal Creator inside Column -->
              <button (click)="openDealCreator(stage)" class="w-full mt-4 flex items-center justify-center gap-1.5 py-2 border border-dashed border-app-border hover:border-indigo-500 text-app-muted hover:text-app-text rounded-xl text-[10px] font-bold transition-all cursor-pointer">
                <mat-icon class="text-xs w-3 h-3 leading-none">add</mat-icon>
                Create Deal
              </button>
            </div>
          }
        </div>
      }

      <!-- Tab Content 2: Leads & Contacts Table -->
      @if (activeTab() === 'leads') {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Left: Leads Listing (2 Cols) -->
          <div class="lg:col-span-2 bg-app-card border border-app-border rounded-2xl p-5 space-y-4">
            <div class="flex justify-between items-center">
              <h3 class="text-sm font-extrabold text-app-text uppercase tracking-wider">Acquired Leads</h3>
              <button (click)="showLeadForm.set(!showLeadForm())" class="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer">
                <mat-icon class="text-xs w-4 h-4 leading-none">add</mat-icon>
                Add Lead
              </button>
            </div>

            <!-- Create Lead Inline form -->
            @if (showLeadForm()) {
              <form [formGroup]="leadForm" (ngSubmit)="saveLead()" class="bg-app-bg border border-app-border rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-150">
                <div>
                  <label class="block text-[10px] font-bold uppercase tracking-wider text-app-muted mb-1">Full Name</label>
                  <input type="text" formControlName="full_name" class="w-full bg-app-card border border-app-border rounded-xl px-3 py-2 text-xs text-app-text outline-none focus:border-indigo-500 placeholder:text-app-muted" placeholder="e.g. Jane Doe">
                </div>
                <div>
                  <label class="block text-[10px] font-bold uppercase tracking-wider text-app-muted mb-1">Email Address</label>
                  <input type="email" formControlName="email" class="w-full bg-app-card border border-app-border rounded-xl px-3 py-2 text-xs text-app-text outline-none focus:border-indigo-500 placeholder:text-app-muted" placeholder="e.g. jane@acme.com">
                </div>
                <div>
                  <label class="block text-[10px] font-bold uppercase tracking-wider text-app-muted mb-1">Phone Number</label>
                  <input type="text" formControlName="phone" class="w-full bg-app-card border border-app-border rounded-xl px-3 py-2 text-xs text-app-text outline-none focus:border-indigo-500 placeholder:text-app-muted" placeholder="e.g. +919988776655">
                </div>
                <div>
                  <label class="block text-[10px] font-bold uppercase tracking-wider text-app-muted mb-1">Company Name</label>
                  <input type="text" formControlName="company_name" class="w-full bg-app-card border border-app-border rounded-xl px-3 py-2 text-xs text-app-text outline-none focus:border-indigo-500 placeholder:text-app-muted" placeholder="e.g. Acme Corp">
                </div>
                <div>
                  <label class="block text-[10px] font-bold uppercase tracking-wider text-app-muted mb-1">Source channel</label>
                  <select formControlName="source" class="w-full bg-app-card border border-app-border rounded-xl px-3 py-2 text-xs text-app-text outline-none focus:border-indigo-500 cursor-pointer">
                    <option value="Manual">Manual</option>
                    <option value="Website Form">Website Form</option>
                    <option value="Google Ads">Google Ads</option>
                    <option value="Meta Ads">Meta Ads</option>
                    <option value="WhatsApp">WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[10px] font-bold uppercase tracking-wider text-app-muted mb-1">Lead Score (0-100)</label>
                  <input type="number" formControlName="score" class="w-full bg-app-card border border-app-border rounded-xl px-3 py-2 text-xs text-app-text outline-none focus:border-indigo-500" placeholder="e.g. 50">
                </div>
                <div class="col-span-1 md:col-span-2 flex justify-end gap-2 mt-2">
                  <button type="button" (click)="showLeadForm.set(false)" class="px-4 py-2 border border-app-border hover:bg-app-card text-app-text rounded-xl text-xs font-bold cursor-pointer transition-colors">Cancel</button>
                  <button type="submit" [disabled]="leadForm.invalid" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer transition-colors">Save Lead</button>
                </div>
              </form>
            }

            <!-- Leads Table -->
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-app-border text-[10px] font-bold text-app-muted uppercase tracking-wider">
                    <th class="py-3 px-2">Name</th>
                    <th class="py-3 px-2">Company</th>
                    <th class="py-3 px-2">Status</th>
                    <th class="py-3 px-2">Source</th>
                    <th class="py-3 px-2 text-center">Score</th>
                    <th class="py-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-app-border text-xs">
                  @for (lead of leads(); track lead.id) {
                    <tr class="hover:bg-app-bg/40 transition-colors">
                      <td class="py-3 px-2">
                        <div class="font-bold text-app-text">{{ lead.full_name }}</div>
                        <div class="text-[10px] text-app-muted mt-0.5">{{ lead.email }}</div>
                      </td>
                      <td class="py-3 px-2 text-app-text font-medium">{{ lead.company_name || 'N/A' }}</td>
                      <td class="py-3 px-2">
                        <span [ngClass]="{
                          'bg-sky-500/10 text-sky-400 border-sky-500/20': lead.status === 'New',
                          'bg-yellow-500/10 text-yellow-400 border-yellow-500/20': lead.status === 'Contacted',
                          'bg-emerald-500/10 text-emerald-400 border-emerald-500/20': lead.status === 'Qualified'
                        }" class="inline-flex px-1.5 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider">
                          {{ lead.status }}
                        </span>
                      </td>
                      <td class="py-3 px-2 text-app-muted font-medium">{{ lead.source }}</td>
                      <td class="py-3 px-2 text-center">
                        <div class="inline-flex items-center gap-1">
                          <div class="w-1.5 h-1.5 rounded-full" [ngClass]="lead.score >= 80 ? 'bg-emerald-400' : lead.score >= 40 ? 'bg-yellow-400' : 'bg-rose-400'"></div>
                          <span class="font-mono font-bold text-app-text">{{ lead.score }}</span>
                        </div>
                      </td>
                      <td class="py-3 px-2 text-right">
                        <button (click)="qualifyLead(lead)" class="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-lg text-[9px] font-bold transition-all cursor-pointer">
                          Qualify
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Right: Activity Logs Timeline (1 Col) -->
          <div class="bg-app-card border border-app-border rounded-2xl p-5 space-y-4">
            <h3 class="text-sm font-extrabold text-app-text uppercase tracking-wider">Recent Interactions</h3>
            
            <form [formGroup]="actForm" (ngSubmit)="saveActivity()" class="space-y-3">
              <div>
                <select formControlName="type" class="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-app-text outline-none focus:border-indigo-500 cursor-pointer">
                  <option value="Note">Log Note</option>
                  <option value="Call">Log Phone Call</option>
                  <option value="Meeting">Schedule Meeting</option>
                </select>
              </div>
              <div class="flex gap-2">
                <input type="text" formControlName="description" class="flex-grow bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-app-text outline-none focus:border-indigo-500 placeholder:text-app-muted" placeholder="Add activity summary...">
                <button type="submit" [disabled]="actForm.invalid" class="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer transition-colors">
                  Post
                </button>
              </div>
            </form>

            <div class="space-y-4 relative before:absolute before:inset-y-0 before:left-3 before:w-px before:bg-app-border pl-1.5 mt-4">
              @for (act of activities(); track act.id) {
                <div class="flex items-start gap-4 relative">
                  <div class="w-6 h-6 rounded-full bg-app-bg border border-app-border flex items-center justify-center text-app-muted z-10 shrink-0">
                    <mat-icon class="text-xs !w-4.5 !h-4.5 !text-[18px] leading-none text-indigo-400">
                      {{ act.type === 'Call' ? 'phone' : act.type === 'Meeting' ? 'groups' : 'notes' }}
                    </mat-icon>
                  </div>
                  <div>
                    <h5 class="text-xs font-extrabold text-app-text uppercase tracking-wide">{{ act.type }}</h5>
                    <p class="text-xs text-app-muted mt-1 leading-normal">{{ act.description }}</p>
                    <span class="text-[9px] text-app-muted/50 mt-1 block font-mono">{{ act.created_at | date:'short' }}</span>
                  </div>
                </div>
              }
            </div>
          </div>

        </div>
      }

      <!-- Deal Creation Modal Overlay -->
      @if (showDealModal()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div class="bg-app-card border border-app-border rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h4 class="text-sm font-black text-app-text uppercase tracking-wider pb-3 border-b border-app-border mb-4">Create Deal (Stage: {{ targetStage() }})</h4>
            <form [formGroup]="dealForm" (ngSubmit)="saveDeal()" class="space-y-4">
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-app-muted mb-1">Deal Title</label>
                <input type="text" formControlName="title" class="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-app-text outline-none focus:border-indigo-500 placeholder:text-app-muted" placeholder="e.g. Corporate Subscription Pack">
              </div>
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-app-muted mb-1">Deal Value (INR)</label>
                <input type="number" formControlName="value" class="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-app-text outline-none focus:border-indigo-500 placeholder:text-app-muted" placeholder="e.g. 15000">
              </div>
              <div class="flex justify-end gap-2 pt-2">
                <button type="button" (click)="showDealModal.set(false)" class="px-4 py-2 border border-app-border hover:bg-app-bg text-app-text rounded-xl text-xs font-bold cursor-pointer transition-colors">Cancel</button>
                <button type="submit" [disabled]="dealForm.invalid" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer transition-colors">Create Deal</button>
              </div>
            </form>
          </div>
        </div>
      }

    </div>
  `
})
export class CrmDashboard implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  activeTab = signal<'pipeline' | 'leads'>('pipeline');
  stages = ['Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Won'];

  leads = signal<Lead[]>([]);
  deals = signal<Deal[]>([]);
  activities = signal<Activity[]>([]);

  showLeadForm = signal(false);
  showDealModal = signal(false);
  targetStage = signal('');

  leadForm = this.fb.group({
    full_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    company_name: [''],
    source: ['Manual'],
    score: [50]
  });

  dealForm = this.fb.group({
    title: ['', Validators.required],
    value: [0, [Validators.required, Validators.min(0)]]
  });

  actForm = this.fb.group({
    type: ['Note'],
    description: ['', Validators.required]
  });

  ngOnInit() {
    this.fetchLeads();
    this.fetchDeals();
    this.fetchActivities();
  }

  fetchLeads() {
    const url = `${environment.apiUrl}/api/crm/leads`;
    this.http.get<Lead[]>(url).subscribe({
      next: (res) => this.leads.set(res),
      error: () => console.warn('CRM Leads fetch fallback active')
    });
  }

  fetchDeals() {
    const url = `${environment.apiUrl}/api/crm/deals`;
    this.http.get<Deal[]>(url).subscribe({
      next: (res) => this.deals.set(res),
      error: () => console.warn('CRM Deals fetch fallback active')
    });
  }

  fetchActivities() {
    const url = `${environment.apiUrl}/api/crm/activities`;
    this.http.get<Activity[]>(url).subscribe({
      next: (res) => this.activities.set(res),
      error: () => console.warn('CRM Activities fetch fallback active')
    });
  }

  getStageTotal(stage: string): number {
    return this.deals()
      .filter(d => d.stage === stage)
      .reduce((sum, d) => sum + Number(d.value), 0);
  }

  getDealsForStage(stage: string): Deal[] {
    return this.deals().filter(d => d.stage === stage);
  }

  moveDeal(dealId: string, newStage: string) {
    const url = `${environment.apiUrl}/api/crm/deals/${dealId}/stage`;
    this.http.put<Deal>(url, { stage: newStage }).subscribe({
      next: (updated) => {
        this.deals.update(list => list.map(d => d.id === dealId ? { ...d, stage: updated.stage } : d));
      },
      error: () => {
        // Fallback update
        this.deals.update(list => list.map(d => d.id === dealId ? { ...d, stage: newStage } : d));
      }
    });
  }

  openDealCreator(stage: string) {
    this.targetStage.set(stage);
    this.dealForm.reset({ title: '', value: 0 });
    this.showDealModal.set(true);
  }

  saveDeal() {
    if (this.dealForm.invalid) return;
    const body = {
      ...this.dealForm.value,
      stage: this.targetStage()
    };
    const url = `${environment.apiUrl}/api/crm/deals`;
    this.http.post<Deal>(url, body).subscribe({
      next: (newDeal) => {
        this.deals.update(list => [newDeal, ...list]);
        this.showDealModal.set(false);
      },
      error: () => {
        // Fallback create
        const localDeal = {
          id: `deal_${Date.now()}`,
          title: body.title!,
          value: Number(body.value!),
          stage: body.stage
        };
        this.deals.update(list => [localDeal, ...list]);
        this.showDealModal.set(false);
      }
    });
  }

  saveLead() {
    if (this.leadForm.invalid) return;
    const body = this.leadForm.value;
    const url = `${environment.apiUrl}/api/crm/leads`;
    this.http.post<Lead>(url, body).subscribe({
      next: (newLead) => {
        this.leads.update(list => [newLead, ...list]);
        this.showLeadForm.set(false);
        this.leadForm.reset({ source: 'Manual', score: 50 });
      },
      error: () => {
        // Fallback create
        const localLead = {
          id: `lead_${Date.now()}`,
          email: body.email!,
          full_name: body.full_name!,
          phone: body.phone || '',
          company_name: body.company_name || '',
          status: 'New',
          source: body.source || 'Manual',
          score: Number(body.score!) || 50,
          created_at: new Date().toISOString()
        };
        this.leads.update(list => [localLead, ...list]);
        this.showLeadForm.set(false);
        this.leadForm.reset({ source: 'Manual', score: 50 });
      }
    });
  }

  qualifyLead(lead: Lead) {
    const url = `${environment.apiUrl}/api/crm/leads/${lead.id}`;
    this.http.put<Lead>(url, { status: 'Qualified' }).subscribe({
      next: () => {
        this.leads.update(list => list.map(l => l.id === lead.id ? { ...l, status: 'Qualified' } : l));
        // Automatically create a matching deal for the qualified lead!
        const dealBody = { title: `${lead.company_name || lead.full_name} Pilot`, value: lead.score * 500, lead_id: lead.id };
        this.http.post<Deal>(`${environment.apiUrl}/api/crm/deals`, dealBody).subscribe({
          next: (d) => this.deals.update(list => [d, ...list])
        });
      },
      error: () => {
        // Fallback qualify
        this.leads.update(list => list.map(l => l.id === lead.id ? { ...l, status: 'Qualified' } : l));
        const localDeal = {
          id: `deal_${Date.now()}`,
          title: `${lead.company_name || lead.full_name} Pilot`,
          value: lead.score * 500,
          stage: 'Prospect'
        };
        this.deals.update(list => [localDeal, ...list]);
      }
    });
  }

  saveActivity() {
    if (this.actForm.invalid) return;
    const body = this.actForm.value;
    const url = `${environment.apiUrl}/api/crm/activities`;
    this.http.post<Activity>(url, body).subscribe({
      next: (newAct) => {
        this.activities.update(list => [newAct, ...list]);
        this.actForm.reset({ type: 'Note', description: '' });
      },
      error: () => {
        const localAct = {
          id: `act_${Date.now()}`,
          type: body.type!,
          description: body.description!,
          created_at: new Date().toISOString()
        };
        this.activities.update(list => [localAct, ...list]);
        this.actForm.reset({ type: 'Note', description: '' });
      }
    });
  }
}
