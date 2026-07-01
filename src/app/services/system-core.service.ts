import { Injectable, inject, signal, computed, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AdminStoreService, ProjectData } from './admin-store.service';
import { interval, Subscription } from 'rxjs';
import { db } from '../firebase';
import { collection, onSnapshot, query, setDoc, doc } from 'firebase/firestore';

export interface AppTelemetry {
  appId: string;
  name: string;
  domain: string;
  status: 'ONLINE' | 'SCALING' | 'OFFLINE';
  health: number;
  apiHitsPerMin: number;
  trafficGbps: number;
  uptime: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  latency: number;
}

export interface GlobalTelemetry {
  cpuLoad: number;
  memoryUsed: number;
  memoryTotal: number;
  latencyMs: number;
  bandwidthTbps: number;
  activeNodes: number;
  uptimePercent: number;
  trafficHistory: number[];
}

export interface FirebaseSyncedApp {
  id: string;
  name: string;
  domain: string;
  environment: string;
  status: string;
  api_key: string;
  config: {
    theme: string;
    features: Record<string, boolean>;
    hero_config?: any;
  } | null;
  rateLimits: {
    rpm: number;
    rph: number;
    burst_limit?: number;
  } | null;
  billing: {
    amount: number;
    usage_json: Record<string, any>;
  } | null;
  syncedAt: string;
}

export interface FirebaseDeployment {
  id: string;
  appId: string;
  version: string;
  status: 'building' | 'success' | 'failed';
  progress: number;
  timestamp: string;
}

export interface FirebaseLog {
  id: string;
  appId: string;
  method: string;
  endpoint: string;
  statusCode: number;
  responseTime: number;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class SystemCoreService implements OnDestroy {
  private store = inject(AdminStoreService);
  private timerSub?: Subscription;

  // Track loading state per app for control buttons
  loadingStates = signal<Record<string, 'starting' | 'stopping' | 'restarting' | null>>({});

  // Real-time telemetry map per app
  appTelemetryMap = signal<Record<string, AppTelemetry>>({});

  // Global system telemetry
  globalTelemetry = signal<GlobalTelemetry>({
    cpuLoad: 42,
    memoryUsed: 8.4,
    memoryTotal: 32,
    latencyMs: 14,
    bandwidthTbps: 1.2,
    activeNodes: 42,
    uptimePercent: 99.999,
    trafficHistory: Array.from({ length: 30 }, (_, i) => 30 + Math.sin(i / 2) * 15 + Math.random() * 8)
  });

  private platformId = inject(PLATFORM_ID);
  private eventSource?: EventSource;

  // Real-time Firestore synced collections
  firebaseApps = signal<FirebaseSyncedApp[]>([]);
  firebaseDeployments = signal<FirebaseDeployment[]>([]);
  firebaseLogs = signal<FirebaseLog[]>([]);
  private firebaseUnsubs: (() => void)[] = [];

  constructor() {
    this.initializeTelemetry();
    this.startSimulation();
    this.connectLiveSse();
    this.initFirebaseListeners();
  }

  private connectLiveSse() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.eventSource = new EventSource('/api/admin/stream');
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'traffic') {
          // Real-time API hit stats
          this.globalTelemetry.update(current => {
            const hist = [...current.trafficHistory];
            hist.shift();
            // push real response time
            hist.push(data.latency || 15);
            return {
              ...current,
              latencyMs: Math.round(data.latency || current.latencyMs),
              trafficHistory: hist
            };
          });

          // Overlay real metrics to app map if matched
          const currentMap = { ...this.appTelemetryMap() };
          const projects = this.store.projects();
          const targetProject = projects.find(p => data.endpoint.includes(p.id) || p.domain.includes(data.endpoint));
          
          if (targetProject && currentMap[targetProject.id]) {
            const appTel = currentMap[targetProject.id];
            currentMap[targetProject.id] = {
              ...appTel,
              apiHitsPerMin: parseFloat((appTel.apiHitsPerMin + 0.1).toFixed(1)),
              latency: Math.round(data.latency || appTel.latency)
            };
            this.appTelemetryMap.set(currentMap);
          }
        } else if (data.type === 'deploy-update') {
          this.store.projects.update(projects =>
            projects.map(p => {
              if (p.id === data.appId) {
                return {
                  ...p,
                  status: data.status === 'success' ? 'live' : 'deploying'
                };
              }
              return p;
            })
          );
          if (data.status === 'success') {
            this.store.showToast(`Deployment v${data.version} active on primary router`, 'success');
          }
        }
      } catch (err) {
        console.error('SSE Live payload parse failed:', err);
      }
    };
  }


  private initializeTelemetry() {
    const currentProjects = this.store.projects();
    const telemetry: Record<string, AppTelemetry> = {};

    currentProjects.forEach(p => {
      telemetry[p.id] = this.createInitialTelemetryForProject(p);
    });

    this.appTelemetryMap.set(telemetry);
  }

  private createInitialTelemetryForProject(p: ProjectData): AppTelemetry {
    const statusMap = {
      'live': 'ONLINE' as const,
      'deploying': 'SCALING' as const,
      'failed': 'OFFLINE' as const
    };

    const status = statusMap[p.status] || 'OFFLINE';
    const isOnline = status === 'ONLINE';
    const isScaling = status === 'SCALING';

    const errRate = isOnline ? parseFloat((Math.random() * 0.05 + 0.01).toFixed(2)) : (isScaling ? 1.5 : 0);
    const latency = isOnline ? Math.floor(Math.random() * 15 + 8) : (isScaling ? 120 : 0);

    // Calculate Health: 100 - (errors * 10 + latency / 5)
    const health = isOnline
      ? Math.max(80, Math.floor(100 - (errRate * 20 + latency / 4)))
      : (isScaling ? 65 : 0);

    return {
      appId: p.id,
      name: p.name,
      domain: p.domain,
      status,
      health,
      apiHitsPerMin: isOnline ? parseFloat((Math.random() * 5 + 8.5).toFixed(1)) : (isScaling ? 1.2 : 0),
      trafficGbps: isOnline ? parseFloat((Math.random() * 2 + 3.1).toFixed(2)) : (isScaling ? 0.4 : 0),
      uptime: isOnline ? parseFloat((99.9 + Math.random() * 0.09).toFixed(2)) : (isScaling ? 100 : 0),
      errorRate: errRate,
      cpuUsage: isOnline ? Math.floor(Math.random() * 25 + 15) : (isScaling ? Math.floor(Math.random() * 40 + 40) : 0),
      memoryUsage: isOnline ? parseFloat((Math.random() * 2 + 1.5).toFixed(1)) : (isScaling ? 4.2 : 0),
      latency
    };
  }

  private startSimulation() {
    // Poll every 2 seconds for real-time simulation updates
    this.timerSub = interval(2000).subscribe(() => {
      this.simulateAppUpdates();
      this.simulateGlobalUpdates();
    });
  }

  private simulateAppUpdates() {
    const nextTelemetry = { ...this.appTelemetryMap() };
    const projects = this.store.projects();

    projects.forEach(p => {
      // Ensure key exists
      if (!nextTelemetry[p.id]) {
        nextTelemetry[p.id] = this.createInitialTelemetryForProject(p);
        return;
      }

      const current = nextTelemetry[p.id];

      // Sync status if edited in store
      const statusMap = {
        'live': 'ONLINE' as const,
        'deploying': 'SCALING' as const,
        'failed': 'OFFLINE' as const
      };
      const syncedStatus = statusMap[p.status] || 'OFFLINE';
      
      if (current.status !== syncedStatus) {
        nextTelemetry[p.id] = {
          ...current,
          status: syncedStatus,
          health: syncedStatus === 'ONLINE' ? 98 : (syncedStatus === 'SCALING' ? 92 : 0)
        };
        return;
      }

      if (current.status === 'ONLINE') {
        // CPU & load spike simulation
        const isSpike = Math.random() > 0.85;
        const deltaHits = isSpike ? (Math.random() * 8 + 5) : (Math.random() * 2 - 1);
        const nextHits = Math.max(3.5, parseFloat((current.apiHitsPerMin + deltaHits).toFixed(1)));
        const nextTraffic = Math.max(1.2, parseFloat((current.trafficGbps + (deltaHits * 0.35)).toFixed(2)));

        const nextErr = isSpike 
          ? parseFloat((Math.random() * 0.15 + 0.05).toFixed(2)) 
          : parseFloat((Math.random() * 0.03 + 0.01).toFixed(2));
        
        const nextLatency = isSpike 
          ? Math.floor(Math.random() * 30 + 35) 
          : Math.floor(Math.random() * 10 + 10);

        const calculatedHealth = Math.min(100, Math.max(50, Math.floor(100 - (nextErr * 30 + nextLatency / 3))));

        nextTelemetry[p.id] = {
          ...current,
          apiHitsPerMin: nextHits,
          trafficGbps: nextTraffic,
          errorRate: nextErr,
          latency: nextLatency,
          cpuUsage: isSpike ? Math.floor(Math.random() * 30 + 60) : Math.floor(Math.random() * 20 + 18),
          memoryUsage: Math.max(1.0, parseFloat((current.memoryUsage + (Math.random() * 0.2 - 0.1)).toFixed(1))),
          health: calculatedHealth
        };
      } else if (current.status === 'SCALING') {
        nextTelemetry[p.id] = {
          ...current,
          cpuUsage: Math.floor(Math.random() * 20 + 50),
          memoryUsage: parseFloat((3.5 + Math.random() * 0.5).toFixed(1)),
          apiHitsPerMin: parseFloat((1.0 + Math.random() * 0.5).toFixed(1)),
          trafficGbps: parseFloat((0.3 + Math.random() * 0.1).toFixed(2)),
          health: Math.floor(80 + Math.random() * 15)
        };
      } else {
        // OFFLINE
        nextTelemetry[p.id] = {
          ...current,
          apiHitsPerMin: 0,
          trafficGbps: 0,
          errorRate: 0,
          latency: 0,
          cpuUsage: 0,
          memoryUsage: 0,
          health: 0
        };
      }
    });

    this.appTelemetryMap.set(nextTelemetry);
  }

  private simulateGlobalUpdates() {
    const historical = [...this.globalTelemetry().trafficHistory];
    historical.shift();

    // Sum api hits across all online apps
    const activeApps = Object.values(this.appTelemetryMap()).filter(t => t.status === 'ONLINE');
    const totalHits = activeApps.reduce((acc, app) => acc + app.apiHitsPerMin, 0);

    // Dynamic next point with some randomness
    const nextPoint = Math.max(10, totalHits * 3 + Math.random() * 10);
    historical.push(nextPoint);

    const activeAppCount = activeApps.length;
    const cpuAvg = activeAppCount > 0 
      ? Math.floor(activeApps.reduce((acc, app) => acc + app.cpuUsage, 0) / activeAppCount) + 5
      : Math.floor(Math.random() * 5 + 5);

    const memAvg = activeAppCount > 0
      ? parseFloat((activeApps.reduce((acc, app) => acc + app.memoryUsage, 0) + 4.2).toFixed(1))
      : parseFloat((4.0 + Math.random() * 0.5).toFixed(1));

    this.globalTelemetry.set({
      cpuLoad: Math.min(99, Math.max(5, cpuAvg)),
      memoryUsed: Math.min(31.5, Math.max(2.0, memAvg)),
      memoryTotal: 32,
      latencyMs: activeAppCount > 0 ? Math.floor(activeApps.reduce((acc, app) => acc + app.latency, 0) / activeAppCount) : 1,
      bandwidthTbps: parseFloat((0.8 + (Math.random() * 0.5)).toFixed(1)),
      activeNodes: 35 + activeAppCount * 3 + Math.floor(Math.random() * 4),
      uptimePercent: parseFloat((99.99 + Math.random() * 0.009).toFixed(3)),
      trafficHistory: historical
    });
  }

  // DevOps Controller actions
  startService(appId: string) {
    this.updateAppState(appId, 'starting');
    
    // Simulate container deployment timeline
    setTimeout(() => {
      this.store.projects.update(projects =>
        projects.map(p => p.id === appId ? { ...p, status: 'live' } : p)
      );
      this.updateAppState(appId, null);
      this.store.showToast(`Ecosystem service launched for app ${appId}!`, 'success');
    }, 3000);
  }

  stopService(appId: string) {
    this.updateAppState(appId, 'stopping');

    // Simulate system teardown timeline
    setTimeout(() => {
      this.store.projects.update(projects =>
        projects.map(p => p.id === appId ? { ...p, status: 'failed' } : p)
      );
      this.updateAppState(appId, null);
      this.store.showToast(`System core halt active for app ${appId}!`, 'info');
    }, 2000);
  }

  restartService(appId: string) {
    this.updateAppState(appId, 'restarting');

    setTimeout(() => {
      this.store.projects.update(projects =>
        projects.map(p => p.id === appId ? { ...p, status: 'deploying' } : p)
      );
      
      setTimeout(() => {
        this.store.projects.update(projects =>
          projects.map(p => p.id === appId ? { ...p, status: 'live' } : p)
        );
        this.updateAppState(appId, null);
        this.store.showToast(`Service hot-restart successful on ${appId}!`, 'success');
      }, 3000);

    }, 1500);
  }

  private updateAppState(appId: string, state: 'starting' | 'stopping' | 'restarting' | null) {
    this.loadingStates.update(states => ({
      ...states,
      [appId]: state
    }));
  }

  private initFirebaseListeners() {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      // Listen to edge_apps
      const appsQuery = query(collection(db, 'edge_apps'));
      const unsubApps = onSnapshot(appsQuery, (snapshot) => {
        const apps = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as FirebaseSyncedApp[];
        
        // If empty, auto-seed with mock records so the UI is immediately fully functional and populated
        if (apps.length === 0) {
          this.seedFirebaseMockData();
        } else {
          this.firebaseApps.set(apps);
        }
      }, (error) => {
        console.error('Error fetching Firestore edge_apps:', error);
      });

      // Listen to edge_deployments
      const deploymentsQuery = query(collection(db, 'edge_deployments'));
      const unsubDeployments = onSnapshot(deploymentsQuery, (snapshot) => {
        const deps = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as FirebaseDeployment[];
        
        deps.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        this.firebaseDeployments.set(deps);
      }, (error) => {
        console.error('Error fetching Firestore deployments:', error);
      });

      // Listen to edge_logs
      const logsQuery = query(collection(db, 'edge_logs'));
      const unsubLogs = onSnapshot(logsQuery, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as FirebaseLog[];
        
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        this.firebaseLogs.set(logs.slice(0, 50)); // limit to latest 50
      }, (error) => {
        console.error('Error fetching Firestore logs:', error);
      });

      this.firebaseUnsubs.push(unsubApps, unsubDeployments, unsubLogs);
    } catch (err) {
      console.error('Failed to init Firestore listeners:', err);
    }
  }

  private async seedFirebaseMockData() {
    const projects = this.store.projects();
    if (projects.length === 0) return;

    try {
      for (const p of projects) {
        const appId = p.id;
        const appDocRef = doc(db, 'edge_apps', appId);
        const seedApp: FirebaseSyncedApp = {
          id: appId,
          name: p.name,
          domain: p.domain,
          environment: p.environment || 'Live',
          status: p.status === 'live' ? 'active' : 'inactive',
          api_key: `sk_live_seed_${appId.substring(0, 6)}`,
          config: {
            theme: 'dark',
            features: {
              whatsapp: true,
              email: true,
              stripe: false
            }
          },
          rateLimits: {
            rpm: 1000,
            rph: 50000,
            burst_limit: 100
          },
          billing: {
            amount: p.status === 'live' ? 24.50 : 0,
            usage_json: {
              api: 4120,
              whatsapp: 148,
              plan: 'Starter Plus'
            }
          },
          syncedAt: new Date().toISOString()
        };
        await setDoc(appDocRef, seedApp);

        // Seed mock deployments
        const depId1 = `dep_1_${appId.substring(0, 4)}`;
        await setDoc(doc(db, 'edge_deployments', depId1), {
          id: depId1,
          appId,
          version: 'v2.4.1',
          status: 'success',
          progress: 100,
          timestamp: new Date(Date.now() - 3600000).toISOString()
        });

        const depId2 = `dep_2_${appId.substring(0, 4)}`;
        await setDoc(doc(db, 'edge_deployments', depId2), {
          id: depId2,
          appId,
          version: 'v2.4.2-rc1',
          status: 'building',
          progress: 65,
          timestamp: new Date().toISOString()
        });

        // Seed mock logs
        for (let i = 0; i < 3; i++) {
          const logId = `log_${Date.now() - i * 5000}_${appId.substring(0, 4)}`;
          const endpoints = ['/api/checkout', '/api/auth/session', '/api/users/profile'];
          const methods = ['POST', 'GET', 'PUT'];
          await setDoc(doc(db, 'edge_logs', logId), {
            id: logId,
            appId,
            method: methods[i],
            endpoint: endpoints[i],
            statusCode: i === 0 ? 201 : 200,
            responseTime: Math.floor(Math.random() * 150) + 40,
            timestamp: new Date(Date.now() - i * 5000).toISOString()
          });
        }
      }
      console.log('🌱 Seeded default mock data in Firestore successfully');
    } catch (e) {
      console.error('Failed to seed Firebase mock data:', e);
    }
  }

  ngOnDestroy() {
    if (this.timerSub) {
      this.timerSub.unsubscribe();
    }
    if (this.eventSource) {
      this.eventSource.close();
    }
    this.firebaseUnsubs.forEach(unsub => unsub());
  }
}
