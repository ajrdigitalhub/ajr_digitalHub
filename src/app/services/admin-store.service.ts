import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiService } from './api.service';
import { ToastService } from './toast.service';
import { Observable, of, delay, tap, map } from 'rxjs';

export interface AdminApp {
  id: string;
  name: string;
  domain: string;
  status: 'live' | 'deploying' | 'failed';
  plan: 'Starter' | 'Pro' | 'Enterprise' | 'Lite' | 'Standard';
  apiUsage: number;
  lastUpdated: string;
  environment: 'Production' | 'Staging' | 'Sandbox';
  features: {
    marketplace: boolean;
    services: boolean;
    analytics: boolean;
  };
  apiKey: string;
}

export interface WebsiteConfig {
  siteName: string;
  logoUrl: string;
  theme: 'light' | 'dark';
  globalFeatures: {
    maintenanceMode: boolean;
    userRegistration: boolean;
  };
  features: {
    marketplace: boolean;
    services: boolean;
    analytics: boolean;
  };
}

export interface RateLimiterConfig {
  rpm: number;
  rph: number;
  burst: number;
  enabled: boolean;
  status: 'safe' | 'warning' | 'critical';
}

export interface StaticAnalytics {
  apiUsage: { date: string; requests: number }[];
  errors: number;
  activeUsers: number;
  totalRequests: number;
}

export interface ProjectPolicy {
  api: {
    rpmLimit: number;
    rpHourLimit: number;
    allowedOrigins: string;
    ipWhitelist: string;
    endpointLimits: { endpoint: string; maxRpm: number }[];
  };
  security: {
    authRequired: boolean;
    tokenExpiryMinutes: number;
    accessRoles: string;
    geoRestrictions: string;
    sessionLimits: number;
  };
  usage: {
    maxDailyCalls: number;
    maxUsers: number;
    storageLimitGb: number;
  };
}

export interface ProjectUser {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Developer' | 'Viewer';
  status: 'Active' | 'Invited';
  lastActive: string;
}

export interface ApiKeyDef {
  id: string;
  name: string;
  keyPrefix: string;
  created: string;
  lastUsed: string;
  permissions: string[];
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  enabled: boolean;
}

export interface BackupRun {
  id: string;
  date: string;
  sizeMb: number;
  status: 'Completed' | 'Failed';
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  ip: string;
}

export interface ProjectPlugin {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  status: 'Active' | 'Configuring' | 'Error';
}

export interface BillingData {
  plan: string;
  currentSpend: number;
  estimatedSpend: number;
  apiCalls: number;
  apiLimit: number;
  storageGb: number;
  storageLimit: number;
}

export interface ProjectLog {
  id: string;
  timestamp: string;
  type: 'API' | 'Error' | 'Deploy';
  severity: 'Info' | 'Warning' | 'Critical';
  message: string;
}

export interface ProjectData extends AdminApp {
  policies: ProjectPolicy;
  logs: ProjectLog[];
  users: ProjectUser[];
  apiKeys: ApiKeyDef[];
  alerts: AlertRule[];
  backups: BackupRun[];
  auditLogs: AuditEvent[];
  plugins: ProjectPlugin[];
  billing: BillingData;
  whatsapp?: {
    phone_number: string;
    waba_id?: string;
    api_key: string;
    enabled: boolean;
    permanent_token?: string;
    business_name?: string;
    webhook_verify_token?: string;
    webhook_secret?: string;
    api_version?: string;
    currency?: string;
    country?: string;
    business_manager_id?: string;
    display_name?: string;
    timezone?: string;
  };
  email?: {
    smtp_host: string;
    smtp_port: number;
    user: string;
    pass: string;
    enabled: boolean;
  };
  firebase_config?: {
    projectId: string;
    apiKey: string;
    authDomain: string;
    storageBucket: string;
    appId: string;
    measurementId?: string;
    serviceAccount?: {
      client_email: string;
      private_key: string;
    };
  } | null;
  cached_metrics?: {
    status?: any;
    analytics?: any;
    storage?: any;
    lastSynced?: string;
  } | null;
}

export interface AppToast {
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AdminStoreService {
  private api = inject(ApiService);
  private toastService = inject(ToastService);
  // Master State Signals
  projects = signal<ProjectData[]>([]);
  websiteConfig = signal<WebsiteConfig>({
    siteName: 'AJR Hub',
    logoUrl: '',
    theme: 'light',
    globalFeatures: { maintenanceMode: false, userRegistration: true },
    features: { marketplace: true, services: true, analytics: true }
  });

  rateLimiter = signal<RateLimiterConfig>({
    rpm: 1000,
    rph: 50000,
    burst: 200,
    enabled: true,
    status: 'safe'
  });

  staticAnalytics = signal<StaticAnalytics>({
    apiUsage: [
      { date: 'Mon', requests: 12000 },
      { date: 'Tue', requests: 15500 },
      { date: 'Wed', requests: 14200 },
      { date: 'Thu', requests: 18000 },
      { date: 'Fri', requests: 22000 },
      { date: 'Sat', requests: 19500 },
      { date: 'Sun', requests: 15000 }
    ],
    errors: 24,
    activeUsers: 1420,
    totalRequests: 116200
  });

  currentProjectId = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  toast = signal<AppToast>({ message: '', type: 'success', visible: false });

  // Computed signals
  apps = computed<AdminApp[]>(() => this.projects() as AdminApp[]);

  currentProject = computed<ProjectData | null>(() => {
    const id = this.currentProjectId();
    if (!id) return null;
    return this.projects().find(p => p.id === id) || null;
  });

  constructor() {
    if (typeof window !== 'undefined') {
      this.refreshAll();
    }
  }

  // Fetch initial apps & options
  refreshAll() {
    this.isLoading.set(true);
    this.api.get<any>('/admin/apps').subscribe({
      next: (data) => {
        if (Array.isArray(data)) {
          const mapped: ProjectData[] = data.map((app: any) => ({
            id: app.id,
            name: app.name,
            domain: app.domain || '',
            status: app.status || 'live',
            plan: app.plan || 'Pro',
            apiUsage: app.apiUsage || 0,
            lastUpdated: app.lastUpdated || new Date().toISOString(),
            environment: app.environment || 'Production',
            features: app.features || { marketplace: true, services: true, analytics: true },
            apiKey: app.apiKey || app.api_key || 'sk_live_' + app.id,
            policies: app.policies || {
              api: { rpmLimit: 1000, rpHourLimit: 50000, allowedOrigins: '*', ipWhitelist: '', endpointLimits: [] },
              security: { authRequired: true, tokenExpiryMinutes: 60, accessRoles: 'admin,user', geoRestrictions: 'None', sessionLimits: 5 },
              usage: { maxDailyCalls: 100000, maxUsers: 5000, storageLimitGb: 50 }
            },
            logs: app.logs || [],
            users: app.users || [],
            apiKeys: app.apiKeys || [],
            alerts: app.alerts || [],
            backups: app.backups || [],
            auditLogs: app.auditLogs || [],
            plugins: app.plugins || [],
            billing: app.billing || {
              plan: app.plan || 'Pro Plan',
              currentSpend: 145.50,
              estimatedSpend: 299.00,
              apiCalls: app.apiUsage || 0,
              apiLimit: 100000,
              storageGb: 42,
              storageLimit: 50
            },
            firebase_config: app.firebase_config || null,
            cached_metrics: app.cached_metrics || null
          }));
          this.projects.set(mapped);

          if (mapped.length > 0 && !this.currentProjectId()) {
            this.currentProjectId.set(mapped[0].id);
          }

          // Trigger parallel details fetching for each app
          mapped.forEach((app) => {
            this.api.get<any>(`/admin/apps/${app.id}`).subscribe({
              next: (detail) => {
                this.projects.update(list => list.map(p => {
                  if (p.id === app.id) {
                    return {
                      ...p,
                      ...detail,
                      apiUsage: detail.apiUsage || p.apiUsage || 0,
                      billing: detail.billing || p.billing,
                      firebase_config: detail.firebase_config || null
                    };
                  }
                  return p;
                }));

                if (detail.firebase_config && detail.firebase_config.projectId) {
                  this.api.get<any>(`/admin/apps/${app.id}/firebase/billing`).subscribe({
                    next: (firebaseBilling) => {
                      this.projects.update(list => list.map(p => {
                        if (p.id === app.id) {
                          return { ...p, firebaseBilling };
                        }
                        return p;
                      }));
                    },
                    error: (err) => console.warn(`Could not fetch Firebase billing for project ${app.id}`)
                  });
                }
              }
            });

            this.api.get<any>(`/api/admin/apps/${app.id}/whatsapp/realtime-summary?days=60`).subscribe({
              next: (waSummary) => {
                this.projects.update(list => list.map(p => {
                  if (p.id === app.id) {
                    return { ...p, waSummary };
                  }
                  return p;
                }));
              }
            });
          });
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });

    this.api.get<any>('/admin/policies').subscribe({
      next: (policy: any) => {
        if (policy) {
          this.rateLimiter.set({
            rpm: policy.rpmLimit || 1000,
            rph: (policy.rpmLimit || 1000) * 50,
            burst: 200,
            enabled: policy.authRequired !== false,
            status: (policy.rpmLimit || 1000) > 5000 ? 'critical' : 'safe'
          });
        }
      }
    });

    this.api.get<any>('/admin/analytics').subscribe({
      next: (res: any) => {
        if (res) {
          this.staticAnalytics.set({
            apiUsage: [
              { date: 'Mon', requests: Math.round(res.totalRequests * 0.1) },
              { date: 'Tue', requests: Math.round(res.totalRequests * 0.15) },
              { date: 'Wed', requests: Math.round(res.totalRequests * 0.12) },
              { date: 'Thu', requests: Math.round(res.totalRequests * 0.18) },
              { date: 'Fri', requests: Math.round(res.totalRequests * 0.22) },
              { date: 'Sat', requests: Math.round(res.totalRequests * 0.13) },
              { date: 'Sun', requests: Math.round(res.totalRequests * 0.1) }
            ],
            errors: res.errorsCount || 0,
            activeUsers: 1420,
            totalRequests: res.totalRequests || 0
          });
        }
      }
    });
  }

  // Actions
  showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
    if (type === 'success') {
      this.toastService.success(message);
    } else if (type === 'error') {
      this.toastService.error(message);
    } else {
      this.toastService.info(message);
    }
  }

  loadProject(id: string) {
    this.isLoading.set(true);
    this.currentProjectId.set(id);
    this.api.get<any>(`/admin/usage/${id}`).subscribe({
      next: (det) => {
        if (det) {
          const mappedStatus = det.status === 'live' ? 'live' : (det.status === 'deploying' ? 'deploying' : 'failed');
          this.projects.update(list => list.map(p => {
            if (p.id === id) {
              return {
                ...p,
                ...det,
                status: mappedStatus,
                policies: det.policies || p.policies,
                billing: det.billing || p.billing,
                users: det.users || p.users,
                apiKeys: det.apiKeys || p.apiKeys,
                logs: det.logs || p.logs,
                backups: det.backups || p.backups
              };
            }
            return p;
          }));
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  deleteProject(id: string): Observable<boolean> {
    return this.api.delete<any>(`/admin/apps/${id}`).pipe(
      tap(() => {
        this.projects.update(projects => projects.filter(p => p.id !== id));
        this.showToast('Application deleted successfully!', 'success');
      }),
      map(() => true)
    );
  }

  updateProject(id: string, partial: Partial<ProjectData>): Observable<boolean> {
    return this.api.put<any>(`/admin/apps/${id}`, partial).pipe(
      tap(() => {
        this.projects.update(projects =>
          projects.map(p => {
            if (p.id === id) {
              return { ...p, ...partial, lastUpdated: new Date().toISOString() };
            }
            return p;
          })
        );
        this.showToast(`Saved changes successfully!`, 'success');
      }),
      map(() => true)
    );
  }

  updateAppConfig(id: string, updates: Partial<AdminApp>): Observable<boolean> {
    return this.api.put<any>(`/admin/apps/${id}`, updates).pipe(
      tap(() => {
        this.projects.update(projects =>
          projects.map(p => {
            if (p.id === id) {
              return { ...p, ...updates, lastUpdated: new Date().toISOString() };
            }
            return p;
          })
        );
        this.showToast('Setup changed successfully!', 'success');
      }),
      map(() => true)
    );
  }

  regenerateApiKey(id: string): Observable<string> {
    return this.api.post<any>('/admin/api-keys', { name: 'Root Rotated Key' }).pipe(
      map((res: any) => res.keyPrefix || 'sk_live_' + id),
      tap((newKey) => {
        this.projects.update(projects =>
          projects.map(p => {
            if (p.id === id) {
              return { ...p, apiKey: newKey, lastUpdated: new Date().toISOString() };
            }
            return p;
          })
        );
        this.showToast('Root API Key rotated successfully!', 'info');
      })
    );
  }

  updateWebsiteConfig(config: WebsiteConfig): Observable<boolean> {
    return this.api.post<any>('/admin/policies', { allowedOrigins: config.logoUrl }).pipe(
      tap(() => {
        this.websiteConfig.set(config);
        this.showToast('Website configuration updated!', 'success');
      }),
      map(() => true)
    );
  }

  updateRateLimiter(config: RateLimiterConfig): Observable<boolean> {
    const status = config.rpm > 5000 ? 'critical' : config.rpm > 2000 ? 'warning' : 'safe';
    return this.api.post<any>('/admin/policies', { rpmLimit: config.rpm, authRequired: config.enabled }).pipe(
      tap(() => {
        this.rateLimiter.set({ ...config, status });
        this.showToast('Edge Rate Engine policies deployed!', 'success');
      }),
      map(() => true)
    );
  }

  refreshDeployStatus(id: string): Observable<string> {
    return this.api.get<any>('/admin/deployments').pipe(
      map(() => 'live'),
      tap(() => {
        this.projects.update(projects =>
          projects.map(p => {
            if (p.id === id) {
              return { ...p, status: 'live', lastUpdated: new Date().toISOString() };
            }
            return p;
          })
        );
        this.showToast('Deployment status updated to active.', 'info');
      })
    );
  }

  addProject(newProj: any) {
    this.isLoading.set(true);
    this.api.provisionApp(newProj).subscribe({
      next: (response: any) => {
        const app = response;
        const fullProject: ProjectData = {
          id: app.id || app.appId || 'app_new',
          name: app.name,
          domain: newProj.domain,
          environment: newProj.environment,
          plan: newProj.plan,
          status: 'live',
          lastUpdated: new Date().toISOString(),
          apiUsage: 0,
          apiKey: app.apiKey || 'sk_live_new',
          apiKeys: [],
          logs: [],
          auditLogs: [],
          users: [
            { id: 'u_1', name: 'Master Admin', email: 'admin@ajr.dev', role: 'Owner', status: 'Active', lastActive: new Date().toISOString() }
          ],
          backups: [],
          alerts: [],
          plugins: [],
          policies: {
            api: { rpmLimit: 1000, rpHourLimit: 60000, allowedOrigins: '*', ipWhitelist: '', endpointLimits: [] },
            security: { authRequired: true, tokenExpiryMinutes: 60, sessionLimits: 5, geoRestrictions: 'None', accessRoles: 'Administrator, Developer' },
            usage: { maxDailyCalls: 100000, maxUsers: 1000, storageLimitGb: 20 }
          },
          features: {
            marketplace: true,
            services: true,
            analytics: true
          },
          billing: newProj.billing,
          firebase_config: app.firebase_config || null,
          cached_metrics: app.cached_metrics || null
        };

        this.projects.update(list => [...list, fullProject]);
        this.showToast(`Application '${newProj.name}' provisioned successfully!`, 'success');
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Provisioning failed:', err);
        this.showToast(err.error?.error || 'Failed to provision application', 'error');
        this.isLoading.set(false);
      }
    });
  }
}

