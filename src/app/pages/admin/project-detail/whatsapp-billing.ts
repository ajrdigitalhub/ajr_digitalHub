import {
  Component, ChangeDetectionStrategy, input, inject, signal,
  OnInit, OnDestroy, ChangeDetectorRef, computed, effect, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ProjectData } from '../../../services/project-detail.service';
import {
  WhatsappBillingService,
  WaBillingSummary, WaTemplateStat, WaGraphData, WaTemplateDetail
} from '../../../services/whatsapp-billing.service';

// ────────────────────────────────────────────────────────────────────────────
//  WhatsApp Billing Component
// ────────────────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-whatsapp-billing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, FormsModule],
  templateUrl: './whatsapp-billing.html',
  styleUrls: ['./whatsapp-billing.scss']
  // Note: whatsapp-billing.scss contains all styles including the new ones
})
export class WhatsAppBillingComponent implements OnInit, OnDestroy {
  // Sync starting value with service and bind presets
  project = input.required<ProjectData>();

  private waService = inject(WhatsappBillingService);
  private cdr = inject(ChangeDetectorRef);

  // ── Exposed Math for template ──
  protected Math = Math;

  // ── State ──
  isLoading = signal(true);
  summary = signal<WaBillingSummary | null>(null);
  templates = signal<WaTemplateStat[]>([]);
  graph = signal<WaGraphData | null>(null);
  templateSearch = '';
  selectedTemplateName = signal<string | null>(null);
  selectedTemplate = signal<WaTemplateDetail | null>(null);
  isDetailLoading = signal(false);
  costAlertThreshold = 50; // ₹50/hr triggers alert

  // Days filter state
  selectedDays = signal<number>(90);
  isDaysDropdownOpen = signal<boolean>(false);

  toast = signal<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    visible: false, message: '', type: 'success'
  });

  // ── Chart dimensions ──
  chartWidth = 800;

  // ── Subscriptions ──
  private subs: Subscription[] = [];

  // ── Computed values ──
  filteredTemplates = computed(() => {
    const search = this.templateSearch.toLowerCase().trim();
    return this.templates().filter(t =>
      !search || t.templateName.toLowerCase().includes(search) || t.category.toLowerCase().includes(search)
    );
  });

  topTemplate = computed(() => {
    const ts = this.templates();
    if (!ts.length) return null;
    return ts.reduce((best, t) => {
      const bestTotal = best.sent + best.delivered + best.read;
      const tTotal = t.sent + t.delivered + t.read;
      return tTotal > bestTotal ? t : best;
    });
  });

  totalSent = computed(() => this.filteredTemplates().reduce((s, t) => s + t.sent, 0));
  totalDelivered = computed(() => this.filteredTemplates().reduce((s, t) => s + t.delivered, 0));
  getCurrencySymbol = computed(() => {
    const cur = this.summary()?.currency;
    if (cur === 'USD') return '$';
    if (cur === 'GBP') return '£';
    return '₹';
  });

  totalCost = computed(() => Math.round(this.filteredTemplates().reduce((s, t) => s + t.cost, 0) * 100) / 100);

  avgReadRate = computed(() => {
    const ts = this.filteredTemplates();
    if (!ts.length) return 0;
    return Math.round(ts.reduce((s, t) => s + t.readRate, 0) / ts.length);
  });

  templateMetricCards = computed(() => {
    const d = this.selectedTemplate();
    if (!d) return [];
    return [
      { label: 'Messages Sent', value: (d.metrics.sent).toLocaleString(), color: '#25d366', sub: null },
      { label: 'Delivered', value: (d.metrics.delivered).toLocaleString(), color: '#818cf8', sub: `${d.metrics.deliveryRate}% rate` },
      { label: 'Read', value: (d.metrics.read).toLocaleString(), color: '#fbbf24', sub: `${d.metrics.readRate}% read rate` },
      { label: 'Total Cost', value: `₹${d.metrics.cost.toFixed(2)}`, color: '#f59e0b', sub: `₹${d.metrics.costPerMessage.toFixed(4)}/msg` },
    ];
  });

  // Calculate dynamic date range text matching the selected days range
  getDateRangeString = computed(() => {
    const days = this.selectedDays();
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    const formatOption: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    const startStr = start.toLocaleDateString('en-US', formatOption);
    const endStr = end.toLocaleDateString('en-US', formatOption);
    return `Auto-detected: ${startStr} - ${endStr}`;
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    // Close days dropdown if clicked outside
    if (this.isDaysDropdownOpen() && !target.closest('.wa-days-dropdown-container')) {
      this.isDaysDropdownOpen.set(false);
    }
  }

  lastRefreshedTime = signal<string>('');

  ngOnInit(): void {
    const appId = this.project().id;
    this.selectedDays.set(this.waService.getSelectedDays());
    this.waService.startPolling(appId);

    const now = new Date();
    this.lastRefreshedTime.set(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }));

    this.subs.push(
      this.waService.summary$.subscribe(s => {
        this.summary.set(s);
        if (s) this.isLoading.set(false);
        this.cdr.markForCheck();
      }),
      this.waService.templates$.subscribe(t => {
        this.templates.set(t);
        this.cdr.markForCheck();
      }),
      this.waService.graph$.subscribe(g => {
        this.graph.set(g);
        this.cdr.markForCheck();
      }),
      this.waService.loading$.subscribe(l => {
        this.isLoading.set(l);
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.waService.stopPolling();
  }

  isAutoRefreshEnabled(): boolean {
    return this.waService.isAutoRefreshEnabled();
  }

  toggleAutoRefresh(event: any): void {
    const enabled = event.target.checked;
    this.waService.setAutoRefreshEnabled(enabled, this.project().id);
    this.showToast(enabled ? 'Auto-refresh enabled' : 'Auto-refresh disabled', 'info');
  }

  // ── Actions ──
  refreshAll(): void {
    const appId = this.project().id;
    this.isLoading.set(true);
    this.waService.fetchAll(appId).subscribe({
      next: (success) => {
        this.isLoading.set(false);
        if (success) {
          const now = new Date();
          this.lastRefreshedTime.set(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }));
          this.showToast('Data refreshed successfully', 'success');
        } else {
          this.showToast('Failed to refresh data', 'error');
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading.set(false);
        this.showToast('Failed to refresh data', 'error');
        this.cdr.markForCheck();
      }
    });
  }

  selectDays(days: number): void {
    this.selectedDays.set(days);
    const appId = this.project().id;
    this.waService.setSelectedDays(days, appId);
    this.isDaysDropdownOpen.set(false);
    this.showToast(`Switched filter to Last ${days} days`, 'success');

    // If template details are open, refresh it as well to match selected days
    const activeTemplate = this.selectedTemplateName();
    if (activeTemplate) {
      this.openTemplateDetail(activeTemplate);
    }
  }

  toggleDaysDropdown(event: Event): void {
    event.stopPropagation();
    this.isDaysDropdownOpen.update(val => !val);
  }

  exportCSV(): void {
    const appName = this.project().name || 'app';
    this.waService.exportTemplatesCSV(this.templates(), appName);
    this.showToast('CSV exported successfully!', 'success');
  }

  openTemplateDetail(name: string): void {
    this.selectedTemplateName.set(name);
    this.selectedTemplate.set(null);
    this.isDetailLoading.set(true);
    const appId = this.project().id;
    this.waService.getTemplateDetail(appId, name).subscribe(d => {
      this.selectedTemplate.set(d);
      this.isDetailLoading.set(false);
      this.cdr.markForCheck();
    });
  }

  closeTemplateDetail(): void {
    this.selectedTemplateName.set(null);
    this.selectedTemplate.set(null);
  }

  isTopTemplate(t: WaTemplateStat): boolean {
    const top = this.topTemplate();
    return !!top && top.templateName === t.templateName;
  }

  // ── Chart helpers ──
  buildPolylinePoints(values: number[]): string {
    if (!values || values.length === 0) return '';
    const max = Math.max(...values, 1);
    const height = 140;
    const width = this.chartWidth;
    const stepX = width / (values.length - 1 || 1);
    return values.map((v, i) => {
      const x = i * stepX;
      const y = height - (v / max) * (height - 10);
      return `${x},${y}`;
    }).join(' ');
  }

  // Get absolute maximum across sent, delivered, read series to draw proportional graphs
  getGlobalMax(graph: WaGraphData | null): number {
    if (!graph) return 1;
    const allValues = [...graph.sent, ...graph.delivered, ...graph.read];
    return Math.max(...allValues, 1);
  }

  buildMultiLinePoints(values: number[], max: number): string {
    if (!values || values.length === 0) return '';
    const height = 140;
    const width = this.chartWidth;
    const stepX = width / (values.length - 1 || 1);
    return values.map((v, i) => {
      const x = i * stepX;
      // 10px padding top/bottom to avoid drawing directly on boundaries
      const y = height - (v / max) * (height - 20) - 10;
      return `${x},${y}`;
    }).join(' ');
  }

  maxVal(arr: number[]): number {
    return Math.max(...arr, 1);
  }

  // ── Toast ──
  private toastTimer: any;
  showToast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ visible: true, message, type });
    this.toastTimer = setTimeout(() => {
      this.toast.set({ visible: false, message: '', type: 'success' });
      this.cdr.markForCheck();
    }, 3500);
  }
}

