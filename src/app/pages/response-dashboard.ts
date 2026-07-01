import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

interface FormField {
  id: string;
  label: string;
  type: string;
  options?: string[];
}

interface Form {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
}

interface ResponseRecord {
  id: string;
  formId: string;
  responses: Record<string, any>;
  submittedAt: string;
  metadata?: {
    ip?: string;
    device?: string;
  };
}

interface Analytics {
  totalSubmissions: number;
  submissionsPerDay: Array<{ date: string; count: number }>;
  fieldStats: Record<string, Record<string, number>>; // fieldId -> option -> count map
}

@Component({
  imports: [RouterLink, MatIconModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div id="response-crm-page" class="space-y-6">
      
      <!-- Back Header Row -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
        <div class="space-y-1">
          <a routerLink="/dashboard/forms" class="inline-flex items-center gap-1 text-xs font-semibold text-app-muted hover:text-indigo-400 transition-colors">
            <mat-icon class="text-sm">arrow_back</mat-icon>
            Back to Dynamic Forms
          </a>
          <h2 class="text-2xl font-bold text-app-text leading-tight">
            {{ form()?.name || 'Form CRM' }}
          </h2>
          <p class="text-xs text-app-muted max-w-2xl">{{ form()?.description || 'View client responses, filter insights, and export collected entries.' }}</p>
        </div>

        <div class="flex items-center gap-2">
          <!-- Excel/CSV exporter -->
          <button 
            id="btn-export-csv"
            (click)="onExportCSV()"
            [disabled]="records().length === 0"
            class="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-app-border bg-app-card hover:bg-app-bg text-app-text font-semibold rounded-xl text-xs shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <mat-icon class="text-sm">download</mat-icon>
            Export Sheet (CSV)
          </button>
        </div>
      </div>

      <!-- Live Statistics Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-app-card border border-app-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div class="h-11 w-11 rounded-xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center">
            <mat-icon>folder_shared</mat-icon>
          </div>
          <div>
            <span class="text-xs font-semibold text-app-muted uppercase tracking-wide">Total Collected</span>
            <p id="stat-total-submissions" class="text-2xl font-bold text-app-text font-sans mt-0.5">{{ analytics()?.totalSubmissions || 0 }}</p>
          </div>
        </div>

        <div class="bg-app-card border border-app-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div class="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <mat-icon>speed</mat-icon>
          </div>
          <div>
            <span class="text-xs font-semibold text-app-muted uppercase tracking-wide">Conversion Status</span>
            <p class="text-2xl font-bold text-app-text font-sans mt-0.5">100%</p>
          </div>
        </div>

        <div class="bg-app-card border border-app-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div class="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <mat-icon>update</mat-icon>
          </div>
          <div>
            <span class="text-xs font-semibold text-app-muted uppercase tracking-wide">Real-Time Refresh</span>
            <span class="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 mt-1">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Connected
            </span>
          </div>
        </div>
      </div>

      <!-- Tabs (Submissions table vs Graphs) -->
      <div class="bg-app-card border border-app-border rounded-3xl shadow-sm overflow-hidden min-h-[450px]">
        <div class="flex border-b border-app-border px-6">
          <button 
            id="tab-responses-table"
            (click)="activeTab.set('submissions')"
            class="py-4 font-semibold text-sm cursor-pointer transition-all border-b-2 mr-6 flex items-center gap-2"
            [class.border-indigo-500]="activeTab() === 'submissions'"
            [class.text-indigo-400]="activeTab() === 'submissions'"
            [class.border-transparent]="activeTab() !== 'submissions'"
            [class.text-app-muted]="activeTab() !== 'submissions'"
          >
            <mat-icon class="text-sm">table_chart</mat-icon>
            Submissions Sheet
          </button>
          
          <button 
            id="tab-responses-analytics"
            (click)="activeTab.set('analytics')"
            class="py-4 font-semibold text-sm cursor-pointer transition-all border-b-2 flex items-center gap-2"
            [class.border-indigo-500]="activeTab() === 'analytics'"
            [class.text-indigo-400]="activeTab() === 'analytics'"
            [class.border-transparent]="activeTab() !== 'analytics'"
            [class.text-app-muted]="activeTab() !== 'analytics'"
          >
            <mat-icon class="text-sm">bar_chart</mat-icon>
            Analytics Insights
          </button>
        </div>

        <div class="p-6">
          
          <!-- SUBMISSIONS TAB -->
          @if (activeTab() === 'submissions') {
            <div class="space-y-4">
              <!-- Search and filtering toolbar -->
              <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div class="relative w-full sm:max-w-xs">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <mat-icon class="text-app-muted text-base">search</mat-icon>
                  </div>
                  <input 
                    type="text" 
                    (input)="onSearchChange($event)"
                    placeholder="Search inputs..." 
                    class="block w-full pl-9 pr-3 py-2 border border-app-border rounded-xl text-xs placeholder-app-muted focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-app-bg text-app-text"
                  >
                </div>
                
                <span class="text-xs text-app-muted font-mono">Showing {{ filteredRecords().length }} entries</span>
              </div>

              <!-- Responses Table block -->
              @if (isLoading()) {
                <div class="flex justify-center py-12">
                  <div class="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              } @else if (filteredRecords().length === 0) {
                <div class="text-center py-16 text-app-muted text-xs italic bg-app-bg rounded-2xl border border-dashed border-app-border">
                  No submissions match the current query.
                </div>
              } @else {
                <div class="overflow-x-auto rounded-2xl border border-app-border">
                  <table class="w-full text-left text-xs text-app-text min-w-[700px]">
                    <thead class="bg-app-bg text-app-muted uppercase tracking-wider font-mono text-[10px] border-b border-app-border">
                      <tr>
                        <th class="px-5 py-3.5 font-bold">Submitted Date</th>
                        
                        <!-- Dynamic Columns Headers based on form fields -->
                        @for (field of form()?.fields; track field.id) {
                          <th class="px-5 py-3.5 font-bold">{{ field.label }}</th>
                        }
                        
                        <th class="px-5 py-3.5 font-bold">Metadata / Device</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-app-border">
                      @for (record of currentPageRecords(); track record.id) {
                        <tr class="hover:bg-app-bg/50 transition-all font-sans">
                          <td class="px-5 py-3.5 font-mono text-[11px] whitespace-nowrap text-app-muted">
                            {{ record.submittedAt | date:'yyyy-MM-dd HH:mm' }}
                          </td>
                          
                          <!-- Dynamic responses based on keys -->
                          @for (field of form()?.fields; track field.id) {
                            <td class="px-5 py-3.5 max-w-xs truncate">
                              @if (record.responses[field.id] !== undefined) {
                                <!-- Check if list array type -->
                                @if (isArr(record.responses[field.id])) {
                                  <span class="flex flex-wrap gap-1">
                                    @for (opt of record.responses[field.id]; track opt) {
                                      <span class="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-medium font-mono">
                                        {{ opt }}
                                      </span>
                                    }
                                  </span>
                                } @else {
                                  {{ record.responses[field.id] }}
                                }
                              } @else {
                                <span class="text-app-muted">-</span>
                              }
                            </td>
                          }
                          
                          <td class="px-5 py-3.5 text-app-muted text-[10px] whitespace-nowrap flex flex-col gap-0.5">
                            <span class="font-mono">IP: {{ record.metadata?.ip || '127.0.0.1' }}</span>
                            <span>{{ record.metadata?.device || 'Chrome (OS X)' }}</span>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <!-- Simple Pagination Controls -->
                <div class="flex items-center justify-between pt-4 border-t border-app-border">
                  <span class="text-xs text-app-muted">
                    Page <b class="text-app-text">{{ page() }}</b> of <b class="text-app-text">{{ maxPage() }}</b>
                  </span>
                  
                  <div class="inline-flex gap-2">
                    <button 
                      [disabled]="page() === 1"
                      (click)="page.set(page() - 1)"
                      class="px-3 py-1.5 border border-app-border hover:bg-app-bg text-app-text text-xs font-semibold rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      Previous
                    </button>
                    <button 
                      [disabled]="page() === maxPage()"
                      (click)="page.set(page() + 1)"
                      class="px-3 py-1.5 border border-app-border hover:bg-app-bg text-app-text text-xs font-semibold rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              }
            </div>
          }

          <!-- ANALYTICS TAB -->
          @if (activeTab() === 'analytics') {
            <div class="space-y-10 font-sans">
              
              <!-- Submissions over Time Curve -->
              <div class="bg-app-bg/50 border border-app-border rounded-2xl p-5 space-y-4">
                <div>
                  <h3 class="text-sm font-bold text-app-text">Timeline Performance (Submissions Over Time)</h3>
                  <p class="text-xs text-app-muted">Submissions history tracked daily.</p>
                </div>

                <!-- Beautiful Responsive SVG Curve Chart -->
                <div class="relative w-full h-44 bg-app-bg rounded-xl border border-app-border p-2 overflow-hidden flex items-end">
                  @if (chartPoints().length < 2) {
                    <p class="text-xs text-app-muted italic mx-auto pb-10">Insufficient timeframe data (collect more coordinates).</p>
                  } @else {
                    <!-- SVG Polyline Curve -->
                    <svg class="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                      <!-- Grid lines -->
                      <line x1="0" y1="30" x2="500" y2="30" stroke="var(--app-border)" stroke-width="1" />
                      <line x1="0" y1="60" x2="500" y2="60" stroke="var(--app-border)" stroke-width="1" />
                      <line x1="0" y1="90" x2="500" y2="90" stroke="var(--app-border)" stroke-width="1" />
                      
                      <!-- Line segment -->
                      <polyline
                        fill="none"
                        stroke="#4f46e5"
                        stroke-width="2.5"
                        [attr.points]="svgPoints()"
                      />
                    </svg>

                    <!-- Horizontal timeline labels overlay -->
                    <div class="absolute bottom-1.5 left-2 right-2 flex justify-between text-[10px] font-mono text-app-muted select-none">
                      <span>{{ chartPoints()[0].date }}</span>
                      <span>{{ chartPoints()[chartPoints().length - 1].date }}</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Field distribution bar indicators -->
              <div class="space-y-6">
                <div>
                  <h3 class="text-sm font-bold text-app-text">Choice Distribution Insights</h3>
                  <p class="text-xs text-app-muted">Choice breakdown for Dropdown, Multiple-choice Checkboxes and Radio options.</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <!-- Loops through form selection fields to display option tallies -->
                  @for (field of selectableFields(); track field.id) {
                    <div class="bg-app-card border border-app-border rounded-2xl p-5 space-y-4">
                      <span class="inline-flex items-center gap-1.5 text-xs font-bold text-app-text bg-app-bg border border-app-border px-2 py-1 rounded-lg">
                        <mat-icon class="text-xs text-indigo-500 w-4 h-4 leading-none">bar_chart</mat-icon>
                        {{ field.label }}
                      </span>
                      
                      <div class="space-y-3.5">
                        @for (opt of field.options || []; track opt) {
                          <div class="space-y-1">
                            <div class="flex items-center justify-between text-xs">
                              <span class="font-medium text-app-muted">{{ opt }}</span>
                              <span class="font-bold text-app-text font-mono">{{ getTallyCount(field.id, opt) }} picks ({{ getTallyPercent(field.id, opt) }}%)</span>
                            </div>
                            <!-- Beautiful Tailwind horizontal Progress Meter -->
                            <div class="w-full h-2.5 bg-app-bg rounded-full overflow-hidden border border-app-border">
                              <div class="h-full bg-indigo-600 rounded-full transition-all duration-500"
                                [style.width]="getTallyPercent(field.id, opt) + '%'"></div>
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  } @empty {
                    <div class="col-span-2 text-center py-8 text-app-muted text-xs italic bg-app-bg border border-dashed border-app-border rounded-2xl">
                      Configure drop-downs, checklists, or radio components in your fields to see choice distribution metrics.
                    </div>
                  }
                </div>
              </div>

            </div>
          }

        </div>
      </div>

    </div>
  `
})
export class ResponseDashboard {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  formId = '';
  form = signal<Form | null>(null);
  records = signal<ResponseRecord[]>([]);
  analytics = signal<Analytics | null>(null);

  activeTab = signal<'submissions' | 'analytics'>('submissions');
  isLoading = signal<boolean>(false);
  
  // Search & Pagination controls
  searchQuery = signal<string>('');
  page = signal<number>(1);
  pageSize = 10;

  constructor() {
    this.route.params.subscribe(p => {
      if (p['id']) {
        this.formId = p['id'];
        this.fetchDashboardContext();
      }
    });
  }

  isArr(val: any): boolean {
    return Array.isArray(val);
  }

  async fetchDashboardContext() {
    this.isLoading.set(true);
    try {
      // 1. Fetch form metadata
      const formDetails: any = await this.http.get<any>(`/api/forms/${this.formId}`).toPromise();
      this.form.set(formDetails);

      // 2. Fetch responses
      const formResponses: any = await this.http.get<any>(`/api/forms/${this.formId}/responses`).toPromise();
      this.records.set(formResponses || []);

      // 3. Fetch analytics
      const formAnalytics: any = await this.http.get<any>(`/api/forms/${this.formId}/analytics`).toPromise();
      this.analytics.set(formAnalytics);
    } catch (e) {
      console.error(e);
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearchChange(e: any) {
    this.searchQuery.set(e.target.value || '');
    this.page.set(1); // Reset page to 1
  }

  // Filtered entries
  filteredRecords = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const all = this.records();
    if (!query) { return all; }

    return all.filter(r => {
      return Object.values(r.responses).some(val => {
        if (typeof val === 'string') {
          return val.toLowerCase().includes(query);
        } else if (Array.isArray(val)) {
          return val.some(valEntry => valEntry.toLowerCase().includes(query));
        }
        return false;
      });
    });
  });

  // Pagination states
  maxPage = computed(() => {
    const len = this.filteredRecords().length;
    return Math.max(1, Math.ceil(len / this.pageSize));
  });

  currentPageRecords = computed(() => {
    const list = this.filteredRecords();
    const startIdx = (this.page() - 1) * this.pageSize;
    return list.slice(startIdx, startIdx + this.pageSize);
  });

  // Selectable fields helper (for Bar breakdown stats)
  selectableFields = computed(() => {
    const doc = this.form();
    if (!doc) { return []; }
    return doc.fields.filter(f => ['dropdown', 'radio', 'checkbox'].includes(f.type));
  });

  getTallyCount(fieldId: string, optionName: string): number {
    const data = this.analytics();
    if (!data || !data.fieldStats || !data.fieldStats[fieldId]) { return 0; }
    return data.fieldStats[fieldId][optionName] || 0;
  }

  getTallyPercent(fieldId: string, optionName: string): number {
    const total = this.analytics()?.totalSubmissions || 0;
    if (total === 0) { return 0; }
    const picks = this.getTallyCount(fieldId, optionName);
    return Math.round((picks / total) * 100);
  }

  // Curve timeline helper
  chartPoints = computed(() => {
    const timeline = this.analytics()?.submissionsPerDay;
    if (!timeline || timeline.length === 0) { return []; }
    return timeline;
  });

  svgPoints = computed(() => {
    const data = this.chartPoints();
    if (data.length < 2) { return ''; }

    const maxCount = Math.max(...data.map(d => d.count), 1);
    const stepX = 500 / (data.length - 1);
    
    return data.map((d, idx) => {
      const x = idx * stepX;
      // High count means small SVG Y coordinate (meaning higher visually in coordinate layout)
      const ratio = d.count / maxCount;
      const y = 100 - (ratio * 80); // bound Y inside 20px to 100px range
      return `${x},${y}`;
    }).join(' ');
  });

  onExportCSV() {
    const fields = this.form()?.fields || [];
    if (fields.length === 0 || this.records().length === 0) { return; }

    // CSV header row
    const headers = ['Submitted Date', ...fields.map(f => f.label), 'IP', 'Device'];
    const csvLines = [headers.join(',')];

    // Response arrays
    this.records().forEach(r => {
      const row = [
        r.submittedAt,
        ...fields.map(f => {
          let val = r.responses[f.id] || '';
          if (Array.isArray(val)) {
            val = val.join('; ');
          }
          // escape commas
          return `"${val.toString().replace(/"/g, '""')}"`;
        }),
        r.metadata?.ip || '127.0.0.1',
        `"${(r.metadata?.device || 'Chrome').replace(/"/g, '""')}"`
      ];
      csvLines.push(row.join(','));
    });

    const csvBlob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(csvBlob);
    
    // Create temp anchor and download
    if (typeof window !== 'undefined') {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.setAttribute('download', `${this.form()?.name || 'CRM'}_Responses.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }
  }
}
