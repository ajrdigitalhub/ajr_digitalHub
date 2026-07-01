import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppsService {
  private apiService = inject(ApiService);

  getApps(): Observable<any[]> {
    return this.apiService.get<any[]>('/dynamic/apps');
  }

  provisionApp(payload: any): Observable<any> {
    return this.apiService.post<any>('/admin/apps/provision', payload);
  }

  getPlans(): Observable<any[]> {
    return this.apiService.get<any[]>('/dynamic/plans');
  }

  getUsageLogs(appId: number): Observable<any[]> {
    return this.apiService.get<any[]>(`/admin/apps/${appId}/usage-logs`);
  }

  getWhatsappLogs(appId: number): Observable<any[]> {
    return this.apiService.get<any[]>(`/admin/apps/${appId}/whatsapp-logs`);
  }
}
