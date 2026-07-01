import { Injectable, signal } from '@angular/core';
import { interval } from 'rxjs';

export interface ApiEndpointStat {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  hits: number;
  avg: number;
  status: 'Healthy' | 'Slow' | 'Error';
}

export interface ServiceHealth {
  id: string;
  name: string;
  status: 'Healthy' | 'Degraded' | 'Down';
  latency: number;
  uptime: number;
}

export interface DeploymentStat {
  id: string;
  version: string;
  status: 'Success' | 'Failed' | 'Deploying';
  progress: number;
  time: string;
}

export interface CloudState {
  globalStats: {
    totalRequests: number;
    rps: number;
    errorRate: number;
  };
  apiEndpoints: ApiEndpointStat[];
  services: ServiceHealth[];
  deployments: DeploymentStat[];
  dbConfig: {
    status: 'Connected' | 'Disconnected' | 'Connecting';
    connectionString: string;
    poolSize: number;
    timeout: number;
    activeConnections: number;
    queryLoad: number;
    lastBackup: string;
  };
  whatsapp: {
    enabled: boolean;
    token: string;
    phoneId: string;
    webhook: string;
    messagesSent: number;
    failures: number;
    status: 'Active' | 'Warning' | 'Error';
  };
  email: {
    enabled: boolean;
    host: string;
    port: number;
    username: string;
    sender: string;
  };
  rateLimit: {
    rpm: number;
    rph: number;
    burst: number;
    enabled: boolean;
    status: 'safe' | 'warning' | 'critical';
  };
}

@Injectable({
  providedIn: 'root'
})
export class AdminCloudService {
  state = signal<CloudState>({
    globalStats: { totalRequests: 1425390, rps: 45, errorRate: 0.12 },
    apiEndpoints: [
      { id: '1', endpoint: '/api/apps', method: 'GET', hits: 1240, avg: 120, status: 'Healthy' },
      { id: '2', endpoint: '/api/users/auth', method: 'POST', hits: 890, avg: 450, status: 'Slow' },
      { id: '3', endpoint: '/api/webhooks/stripe', method: 'POST', hits: 230, avg: 85, status: 'Healthy' },
      { id: '4', endpoint: '/api/analytics/export', method: 'GET', hits: 45, avg: 1250, status: 'Error' },
    ],
    services: [
      { id: 'api', name: 'API Gateway', status: 'Healthy', latency: 45, uptime: 99.99 },
      { id: 'db', name: 'Primary Database', status: 'Healthy', latency: 12, uptime: 99.95 },
      { id: 'wa', name: 'WhatsApp Service', status: 'Degraded', latency: 850, uptime: 98.4 },
      { id: 'email', name: 'SMTP Relay', status: 'Healthy', latency: 120, uptime: 99.9 },
    ],
    deployments: [
      { id: 'd_4', version: 'v2.4.1', status: 'Deploying', progress: 45, time: new Date().toISOString() },
      { id: 'd_3', version: 'v2.4.0', status: 'Failed', progress: 100, time: new Date(Date.now() - 3600000).toISOString() },
      { id: 'd_2', version: 'v2.3.9', status: 'Success', progress: 100, time: new Date(Date.now() - 86400000).toISOString() },
    ],
    dbConfig: {
      status: 'Connected',
      connectionString: 'postgresql://admin:********@aws-eu-west-1.rds.com/main',
      poolSize: 100,
      timeout: 5000,
      activeConnections: 42,
      queryLoad: 35,
      lastBackup: new Date(Date.now() - 14400000).toISOString()
    },
    whatsapp: {
      enabled: true,
      token: 'EAADXXXXXXXXXXXX',
      phoneId: '105829XXXXXXXXX',
      webhook: 'https://api.ajr.dev/webhooks/whatsapp',
      messagesSent: 45200,
      failures: 24,
      status: 'Warning'
    },
    email: {
      enabled: true,
      host: 'smtp.sendgrid.net',
      port: 587,
      username: 'apikey',
      sender: 'noreply@ajr.dev'
    },
    rateLimit: {
      rpm: 1000,
      rph: 50000,
      burst: 200,
      enabled: true,
      status: 'safe'
    }
  });

  constructor() {
    this.startSimulation();
  }

  private startSimulation() {
    // Simulate live traffic every 2 seconds
    interval(2000).subscribe(() => {
      this.state.update(s => {
        const newRps = Math.floor(Math.random() * 30) + 30; // 30-60
        const newRequests = s.globalStats.totalRequests + newRps * 2;
        
        const newDeployments = [...s.deployments];
        const activeDeploy = newDeployments.find(d => d.status === 'Deploying');
        if (activeDeploy) {
          activeDeploy.progress += Math.floor(Math.random() * 15);
          if (activeDeploy.progress >= 100) {
            activeDeploy.progress = 100;
            activeDeploy.status = 'Success';
          }
        }

        const newEndpoints = s.apiEndpoints.map(ep => ({
          ...ep,
          hits: ep.hits + Math.floor(Math.random() * 5)
        }));

        const newDbLoad = Math.max(10, Math.min(90, s.dbConfig.queryLoad + (Math.random() * 20 - 10)));
        const newConnections = Math.max(20, Math.min(90, s.dbConfig.activeConnections + (Math.random() * 10 - 5)));

        return {
          ...s,
          globalStats: { ...s.globalStats, totalRequests: newRequests, rps: newRps },
          deployments: newDeployments,
          apiEndpoints: newEndpoints,
          dbConfig: { ...s.dbConfig, queryLoad: Math.round(newDbLoad), activeConnections: Math.round(newConnections) }
        };
      });
    });
  }
}
