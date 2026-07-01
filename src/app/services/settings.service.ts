import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private apiService = inject(ApiService);

  getLandingConfig(): Observable<any> {
    return this.apiService.get('/settings/landing_config');
  }

  saveLandingConfig(config: any): Observable<any> {
    return this.apiService.put('/admin/settings/landing_config', config);
  }

  getWebsiteConfig(): Observable<any> {
    return this.apiService.get('/settings/website_config');
  }

  saveWebsiteConfig(config: any): Observable<any> {
    return this.apiService.put('/admin/settings/website_config', config);
  }

  getRateLimiter(): Observable<any> {
    return this.apiService.get('/settings/rate_limiter');
  }

  saveRateLimiter(config: any): Observable<any> {
    return this.apiService.put('/admin/settings/rate_limiter', config);
  }

  getPagesSettings(): Observable<any[]> {
    return this.apiService.get<any[]>('/settings/pages');
  }

  savePageSettings(page: any): Observable<any> {
    return this.apiService.post('/admin/pages', page);
  }
}
