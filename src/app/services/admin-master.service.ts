import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminStoreService, AdminApp, WebsiteConfig, RateLimiterConfig, StaticAnalytics } from './admin-store.service';

export type { AdminApp, WebsiteConfig, RateLimiterConfig, StaticAnalytics };

@Injectable({
  providedIn: 'root'
})
export class AdminMasterService {
  private store = inject(AdminStoreService);

  // Delegate state signals
  apps = this.store.apps;
  websiteConfig = this.store.websiteConfig;
  rateLimiter = this.store.rateLimiter;
  staticAnalytics = this.store.staticAnalytics;

  // Delegate actions
  deleteProject(id: string): Observable<boolean> {
    return this.store.deleteProject(id);
  }

  updateAppConfig(id: string, updates: Partial<AdminApp>): Observable<boolean> {
    return this.store.updateAppConfig(id, updates);
  }

  regenerateApiKey(id: string): Observable<string> {
    return this.store.regenerateApiKey(id);
  }

  updateWebsiteConfig(config: WebsiteConfig): Observable<boolean> {
    return this.store.updateWebsiteConfig(config);
  }

  updateRateLimiter(config: RateLimiterConfig): Observable<boolean> {
    return this.store.updateRateLimiter(config);
  }

  refreshDeployStatus(id: string): Observable<string> {
    return this.store.refreshDeployStatus(id);
  }
}
