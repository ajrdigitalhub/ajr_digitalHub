import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseMonitorService {
  private api = inject(ApiService);
  private baseUrl = environment.apiBaseUrl || '/api';

  getDashboardStats(): Observable<any> {
    return this.api.get<any>('/admin/firebase/dashboard');
  }

  getRealtimeDashboardStats(): Observable<any> {
    return new Observable(observer => {
      if (typeof window === 'undefined') {
        observer.complete();
        return;
      }
      
      const cleanBase = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
      const sseUrl = `${cleanBase}/admin/firebase/dashboard/realtime`;
      
      const eventSource = new EventSource(sseUrl, {
        withCredentials: true
      });

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          observer.next(data);
        } catch (e) {
          observer.error(e);
        }
      };

      eventSource.onerror = (err) => {
        observer.error(err);
      };

      return () => {
        eventSource.close();
      };
    });
  }

  getApplications(): Observable<any[]> {
    return this.api.get<any[]>('/admin/firebase/applications');
  }

  getApplicationDetails(id: string): Observable<any> {
    return this.api.get<any>(`/admin/firebase/applications/${id}`);
  }

  getSubscribers(params: { appId?: string; search?: string; platform?: string; status?: string }): Observable<any> {
    return this.api.get<any>('/admin/firebase/subscribers', { params });
  }

  revokeToken(tokenId: string): Observable<any> {
    return this.api.post<any>('/admin/firebase/subscribers/revoke', { id: tokenId });
  }

  disableNotifications(tokenId: string): Observable<any> {
    return this.api.post<any>('/admin/firebase/subscribers/disable', { id: tokenId });
  }

  refreshToken(tokenId: string): Observable<any> {
    return this.api.post<any>('/admin/firebase/subscribers/refresh', { id: tokenId });
  }

  getBilling(): Observable<any> {
    return this.api.get<any>('/admin/firebase/billing');
  }

  getLogs(params: { appId?: string; status?: string; startDate?: string; endDate?: string }): Observable<any[]> {
    return this.api.get<any[]>('/admin/firebase/logs', { params });
  }

  getReports(): Observable<any[]> {
    return this.api.get<any[]>('/admin/firebase/reports');
  }

  createReport(reportName: string, reportType: string, filters: any): Observable<any> {
    return this.api.post<any>('/admin/firebase/reports/create', { reportName, reportType, filters });
  }

  saveConfiguration(appId: string, settings: any): Observable<any> {
    return this.api.post<any>('/admin/firebase/configuration', { appId, settings });
  }

  testNotification(payload: { appId: string; token?: string; target?: string; title: string; body: string; image?: string; url?: string }): Observable<any> {
    return this.api.post<any>('/admin/firebase/test-notification', payload);
  }

  triggerRefreshTokens(appId?: string): Observable<any> {
    return this.api.post<any>('/admin/firebase/refresh-tokens', { appId });
  }

  // Client Portal specific stats
  getClientFirebaseStats(): Observable<any> {
    return this.api.get<any>('/billing/firebase-stats');
  }
}
