import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, tap, map } from 'rxjs/operators';
import { AdminStoreService } from './admin-store.service';
import { ApiService } from './api.service';

export interface OverviewKpi {
  apps: number;
  activeUsers: number;
  apiRequests: number;
  errors: number;
  revenue: number;
}

export interface DeploymentStatus {
  name: string;
  domain: string;
  status: 'Live' | 'Deploying' | 'Failed';
  lastDeploy: string;
  env: 'Production' | 'Staging';
}

export interface WebsiteConfig {
  siteName: string;
  logoUrl: string;
  theme: 'light' | 'dark';
  features: {
    marketplace: boolean;
    services: boolean;
    analytics: boolean;
  };
}

export interface RateLimiterConfig {
  enabled: boolean;
  rpm: number;
  rph: number;
  burst: number;
}

export interface AnalyticsTimelinePoint {
  date: string;
  requests: number;
  errors: number;
  users: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminData {
  private apiService = inject(ApiService);
  private store = inject(AdminStoreService);

  constructor() {
    this.loadWebsiteConfig();
    this.loadRateLimiter();
  }

  loadWebsiteConfig() {
    this.apiService.get<any>('/settings/website_config').subscribe({
      next: (cfg) => {
        if (cfg) {
          this.store.websiteConfig.update(old => ({
            siteName: cfg.siteName !== undefined ? cfg.siteName : old.siteName,
            logoUrl: cfg.logoUrl !== undefined ? cfg.logoUrl : old.logoUrl,
            theme: cfg.theme !== undefined ? cfg.theme : old.theme,
            globalFeatures: old.globalFeatures,
            features: {
              marketplace: (cfg.features && cfg.features.marketplace !== undefined) ? cfg.features.marketplace : (old.features?.marketplace ?? true),
              services: (cfg.features && cfg.features.services !== undefined) ? cfg.features.services : (old.features?.services ?? true),
              analytics: (cfg.features && cfg.features.analytics !== undefined) ? cfg.features.analytics : (old.features?.analytics ?? true),
            }
          }));
        }
      },
      error: (err) => console.log('Could not load website_config from backend, using memory defaults:', err)
    });
  }

  loadRateLimiter() {
    this.apiService.get<any>('/settings/rate_limiter').subscribe({
      next: (rl) => {
        if (rl) {
          this.store.rateLimiter.update(old => ({
            ...old,
            enabled: rl.enabled !== undefined ? rl.enabled : old.enabled,
            rpm: rl.rpm !== undefined ? rl.rpm : old.rpm,
            rph: rl.rph !== undefined ? rl.rph : old.rph,
            burst: rl.burst !== undefined ? rl.burst : old.burst,
          }));
        }
      },
      error: (err) => console.log('Could not load rate_limiter from backend, using memory defaults:', err)
    });
  }

  // Centralized administration signals
  private _kpis = signal<OverviewKpi>({
    apps: 12,
    activeUsers: 342,
    apiRequests: 12893,
    errors: 23,
    revenue: 5400
  });

  private _deployments = signal<DeploymentStatus[]>([
    {
      name: 'Main Website',
      domain: 'ajrhub.com',
      status: 'Live',
      lastDeploy: '2 mins ago',
      env: 'Production'
    },
    {
      name: 'Services API Platform',
      domain: 'api.ajrhub.com',
      status: 'Live',
      lastDeploy: '1 hour ago',
      env: 'Production'
    },
    {
      name: 'Staging Sandbox Sandbox',
      domain: 'staging.ajrhub.com',
      status: 'Deploying',
      lastDeploy: 'Just now',
      env: 'Staging'
    },
    {
      name: 'Creative Portal Backend',
      domain: 'creative.ajrhub.com',
      status: 'Failed',
      lastDeploy: '1 day ago',
      env: 'Production'
    }
  ]);

  private _timelineData = signal<AnalyticsTimelinePoint[]>([
    { date: 'Jun 1', requests: 11000, errors: 450, users: 290 },
    { date: 'Jun 2', requests: 14500, errors: 310, users: 310 },
    { date: 'Jun 3', requests: 17200, errors: 390, users: 325 },
    { date: 'Jun 4', requests: 21000, errors: 490, users: 330 },
    { date: 'Jun 5', requests: 23200, errors: 270, users: 340 },
    { date: 'Jun 6', requests: 26000, errors: 360, users: 342 },
    { date: 'Jun 7', requests: 28293, errors: 410, users: 345 }
  ]);

  // Read-only signals exposed to the view
  kpis = computed(() => this._kpis());
  deployments = computed(() => this._deployments());
  
  websiteConfig = computed(() => {
    const sc = this.store.websiteConfig();
    return {
      siteName: sc.siteName,
      logoUrl: sc.logoUrl || 'https://picsum.photos/seed/ajrlogo/120/120',
      theme: sc.theme,
      features: {
        marketplace: sc.features ? sc.features.marketplace : true,
        services: sc.features ? sc.features.services : true,
        analytics: sc.features ? sc.features.analytics : true,
      }
    };
  });

  rateLimiter = computed(() => {
    const rl = this.store.rateLimiter();
    return {
      enabled: rl.enabled,
      rpm: rl.rpm,
      rph: rl.rph,
      burst: rl.burst
    };
  });
  
  timelineData = computed(() => this._timelineData());

  // Loading indicator helper
  isFetching = signal<boolean>(false);

  /**
   * Fetches Overview KPIs with a simulated network latency
   */
  getOverviewKpis(): Observable<OverviewKpi> {
    this.isFetching.set(true);
    return of(this._kpis()).pipe(
      delay(800),
      tap(() => this.isFetching.set(false))
    );
  }

  /**
   * Fetches deployments with a simulated network latency
   */
  getDeployments(): Observable<DeploymentStatus[]> {
    this.isFetching.set(true);
    return of(this._deployments()).pipe(
      delay(600),
      tap(() => this.isFetching.set(false))
    );
  }

  /**
   * Triggers a live deployment status simulation refresh
   */
  redeployAppSimulation(appName: string): Observable<DeploymentStatus[]> {
    this.isFetching.set(true);
    return of(null).pipe(
      delay(1200),
      map(() => {
        const updated = this._deployments().map(d => {
          if (d.name === appName) {
            return {
              ...d,
              status: 'Live' as const,
              lastDeploy: 'Just now'
            };
          }
          return d;
        });
        this._deployments.set(updated);
        this.isFetching.set(false);
        return updated;
      })
    );
  }

  /**
   * Refreshes all deployments simulation
   */
  simulateReloadDeployments(): Observable<DeploymentStatus[]> {
    this.isFetching.set(true);
    return of(null).pipe(
      delay(700),
      map(() => {
        // Shuffle random statuses
        const states: ('Live' | 'Deploying' | 'Failed')[] = ['Live', 'Deploying', 'Failed'];
        const updated = this._deployments().map(d => {
          const randomState = states[Math.floor(Math.random() * states.length)];
          return {
            ...d,
            status: randomState,
            lastDeploy: 'Synced just now'
          };
        });
        this._deployments.set(updated);
        this.isFetching.set(false);
        return updated;
      })
    );
  }

  /**
   * Save website custom configurations and publish them locally & to PostgreSQL backend
   */
  updateConfig(newConfig: WebsiteConfig): Observable<WebsiteConfig> {
    this.isFetching.set(true);
    return this.apiService.put<WebsiteConfig>('/admin/settings/website_config', newConfig).pipe(
      tap((cfg) => {
        if (cfg) {
          this.store.websiteConfig.set(cfg as any);
        }
        this.isFetching.set(false);
      })
    );
  }

  /**
   * Save and adjust rate limiter configurations on Postgres backend
   */
  updateRateLimiter(newLimiter: RateLimiterConfig): Observable<RateLimiterConfig> {
    this.isFetching.set(true);
    return this.apiService.put<RateLimiterConfig>('/admin/settings/rate_limiter', newLimiter).pipe(
      tap((rl) => {
        if (rl) {
          this.store.rateLimiter.set(rl as any);
        }
        this.isFetching.set(false);
      })
    );
  }

  /**
   * Simulates adding a live request hit to see the live metrics update
   */
  simulateKpiHit(): void {
    const prev = this._kpis();
    this._kpis.set({
      ...prev,
      apiRequests: prev.apiRequests + 1,
      activeUsers: Math.floor(prev.activeUsers + (Math.random() > 0.5 ? 1 : -1))
    });
  }
}
