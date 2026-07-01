import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private apiService = inject(ApiService);

  getAnalytics(appId?: number, daysRange = 7): Observable<any> {
    const params: any = { daysRange: daysRange.toString() };
    if (appId) {
      params.appId = appId.toString();
    }
    return this.apiService.get<any>('/admin/analytics', { params });
  }
}
