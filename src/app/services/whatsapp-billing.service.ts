import { Injectable, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, Subscription, of, forkJoin } from 'rxjs';
import { switchMap, shareReplay, catchError, debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';

// ────────────────────────────────────────────────────────────────────────────
//  Interfaces
// ────────────────────────────────────────────────────────────────────────────
export interface WaBillingSummary {
  messagesSent: number;
  messagesDelivered: number;
  messagesRead: number;
  messagesFailed: number;
  totalMessages: number;
  deliveryRate: number;
  readRate: number;
  estimatedCost: number;
  monthlyEstimate: number;
  aiCostPrediction: number;
  period: string;
  lastUpdated: string;
  dataSource: string;
  currency?: string;
}

export interface WaTemplateStat {
  templateName: string;
  category: string;
  status: string;
  language: string;
  qualityScore: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  readRate: number;
  deliveryRate: number;
  cost: number;
}

export interface WaGraphData {
  labels: string[];
  sent: number[];
  delivered: number[];
  read: number[];
  cost: number[];
  lastUpdated: string;
  dataSource: string;
}

export interface WaTemplateDetail {
  templateName: string;
  category: string;
  status: string;
  language: string;
  qualityScore: string;
  bodyText?: string;
  headerText?: string;
  footerText?: string;
  metrics: {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    total: number;
    readRate: number;
    deliveryRate: number;
    cost: number;
    costPerMessage: number;
  };
  graph: WaGraphData;
  period: string;
  lastUpdated: string;
}

// ────────────────────────────────────────────────────────────────────────────
//  Service
// ────────────────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class WhatsappBillingService implements OnDestroy {
  // Syncs and polls template performance metrics from Meta Cloud API
  private api = inject(ApiService);

  // ── State subjects ──
  private summarySubject = new BehaviorSubject<WaBillingSummary | null>(null);
  private templatesSubject = new BehaviorSubject<WaTemplateStat[]>([]);
  private graphSubject = new BehaviorSubject<WaGraphData | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private liveLogsSubject = new BehaviorSubject<any[]>([]);

  // ── Public observables ──
  summary$ = this.summarySubject.asObservable().pipe(shareReplay(1));
  templates$ = this.templatesSubject.asObservable().pipe(shareReplay(1));
  graph$ = this.graphSubject.asObservable().pipe(shareReplay(1));
  loading$ = this.loadingSubject.asObservable();
  error$ = this.errorSubject.asObservable();
  liveLogs$ = this.liveLogsSubject.asObservable();

  private pollingSubscriptions: Subscription[] = [];
  private firestoreUnsub: (() => void) | null = null;
  private autoRefreshEnabled = false;

  private selectedDays = 90; // Default to 90 days as in screenshot

  setSelectedDays(days: number, appId: string): void {
    this.selectedDays = days;
    this.fetchAll(appId).subscribe();
  }

  getSelectedDays(): number {
    return this.selectedDays;
  }

  isAutoRefreshEnabled(): boolean {
    return this.autoRefreshEnabled;
  }

  setAutoRefreshEnabled(enabled: boolean, appId: string): void {
    this.autoRefreshEnabled = enabled;
    if (enabled) {
      this.startPolling(appId);
    } else {
      this.stopPolling();
      // Keep firestore logs connected
      this.connectFirestoreLiveLogs(appId);
    }
  }

  // ── Start all polling for an app ──
  startPolling(appId: string): void {
    this.stopPolling();
    this.loadingSubject.next(true);

    if (this.autoRefreshEnabled) {
      // Summary: poll every 30 seconds if enabled
      const summarySub = interval(30000).pipe(
        switchMap(() =>
          this.api.get<WaBillingSummary>(`/api/admin/apps/${appId}/whatsapp/realtime-summary?days=${this.selectedDays}`).pipe(
            catchError(() => of(null))
          )
        )
      ).subscribe(data => {
        if (data) {
          this.summarySubject.next(data);
          this.loadingSubject.next(false);
          this.errorSubject.next(null);
        }
      });

      // Templates: poll every 45 seconds if enabled
      const templatesSub = interval(45000).pipe(
        switchMap(() =>
          this.api.get<WaTemplateStat[]>(`/api/admin/apps/${appId}/whatsapp/templates-live?days=${this.selectedDays}`).pipe(
            catchError(() => of([]))
          )
        )
      ).subscribe(data => {
        this.templatesSubject.next(data || []);
      });

      this.pollingSubscriptions.push(summarySub, templatesSub);
    }

    // Initial load (no delay)
    this.fetchAll(appId).subscribe();

    // Firestore live logs subscription
    this.connectFirestoreLiveLogs(appId);
  }

  // ── Fetch all data immediately ──
  fetchAll(appId: string): Observable<boolean> {
    this.loadingSubject.next(true);
    
    // Load summary
    const summary$ = this.api.get<WaBillingSummary>(`/api/admin/apps/${appId}/whatsapp/realtime-summary?days=${this.selectedDays}`).pipe(
      catchError(() => of(null))
    );
    // Load templates
    const templates$ = this.api.get<WaTemplateStat[]>(`/api/admin/apps/${appId}/whatsapp/templates-live?days=${this.selectedDays}`).pipe(
      catchError(() => of([]))
    );
    // Load graph
    const graph$ = this.api.get<WaGraphData>(`/api/admin/apps/${appId}/whatsapp/realtime-graph?days=${this.selectedDays}`).pipe(
      catchError(() => of(null))
    );
    return forkJoin([summary$, templates$, graph$]).pipe(
      map(([summaryData, templatesData, graphData]: [any, any, any]) => {
        if (summaryData) this.summarySubject.next(summaryData);
        this.templatesSubject.next(templatesData || []);
        if (graphData) this.graphSubject.next(graphData);
        this.loadingSubject.next(false);
        return true;
      }),
      catchError(err => {
        this.loadingSubject.next(false);
        this.errorSubject.next(err.message || 'Failed to fetch data');
        return of(false);
      })
    );
  }

  // ── Get template detail (one-shot) ──
  getTemplateDetail(appId: string, templateName: string): Observable<WaTemplateDetail> {
    return this.api.get<WaTemplateDetail>(
      `/api/admin/apps/${appId}/whatsapp/template/${encodeURIComponent(templateName)}?days=${this.selectedDays}`
    ).pipe(catchError(() => of(null as any)));
  }

  // ── Firestore real-time log stream ──
  private connectFirestoreLiveLogs(appId: string): void {
    try {
      const q = query(
        collection(db, 'whatsapp_logs'),
        where('appId', '==', appId),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      this.firestoreUnsub = onSnapshot(q,
        snap => {
          const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          this.liveLogsSubject.next(logs);
        },
        _err => { /* Firestore may not have this collection yet — silent */ }
      );
    } catch (_) { /* Firestore offline — no-op */ }
  }

  // ── Export to CSV ──
  exportTemplatesCSV(templates: WaTemplateStat[], appName: string): void {
    const headers = ['Template Name', 'Category', 'Status', 'Sent', 'Delivered', 'Read', 'Failed', 'Read Rate (%)', 'Cost (₹)'];
    const rows = templates.map(t => [
      t.templateName,
      t.category,
      t.status,
      t.sent,
      t.delivered,
      t.read,
      t.failed,
      t.readRate,
      t.cost.toFixed(2)
    ]);

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp_billing_${appName}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Stop all polling and subscriptions ──
  stopPolling(): void {
    this.pollingSubscriptions.forEach(s => s.unsubscribe());
    this.pollingSubscriptions = [];
    if (this.firestoreUnsub) {
      this.firestoreUnsub();
      this.firestoreUnsub = null;
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }
}
