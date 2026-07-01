import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SystemCoreService, AppTelemetry } from '../../../services/system-core.service';
import { AdminStoreService } from '../../../services/admin-store.service';
import { SystemCoreLayoutComponent } from './system-core-layout.component';
import { AppMonitorCardComponent } from './app-monitor-card.component';
import { TelemetryChartComponent } from './telemetry-chart.component';

@Component({
  selector: 'app-system-core-monitor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, 
    MatIconModule, 
    SystemCoreLayoutComponent, 
    AppMonitorCardComponent, 
    TelemetryChartComponent
  ],
  templateUrl: './system-core.component.html',
  styleUrl: './system-core.component.scss'
})
export class SystemCoreComponent {
  service = inject(SystemCoreService);
  private store = inject(AdminStoreService);

  activeTab = signal<'telemetry' | 'firebase'>('telemetry');

  setTab(tab: 'telemetry' | 'firebase') {
    this.activeTab.set(tab);
  }

  // Computed array mapping store projects together with live simulated metrics
  appsTelemetry = computed<AppTelemetry[]>(() => {
    const telemetryMap = this.service.appTelemetryMap();
    const projects = this.store.projects();
    
    return projects.map(p => {
      const live = telemetryMap[p.id];
      if (live) return live;
      
      // Fallback in case list is updated but telemetry initialization is pending
      return {
        appId: p.id,
        name: p.name,
        domain: p.domain,
        status: p.status === 'live' ? 'ONLINE' : (p.status === 'deploying' ? 'SCALING' : 'OFFLINE'),
        health: p.status === 'live' ? 98 : (p.status === 'deploying' ? 92 : 0),
        apiHitsPerMin: p.status === 'live' ? 12.4 : 0,
        trafficGbps: p.status === 'live' ? 4.82 : 0,
        uptime: p.status === 'live' ? 99.98 : 0,
        errorRate: p.status === 'live' ? 0.02 : 0,
        cpuUsage: p.status === 'live' ? 42 : 0,
        memoryUsage: p.status === 'live' ? 8.4 : 0,
        latency: p.status === 'live' ? 14 : 0
      };
    });
  });
}
