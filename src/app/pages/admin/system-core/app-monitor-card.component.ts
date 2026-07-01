import { Component, ChangeDetectionStrategy, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AppTelemetry, SystemCoreService } from '../../../services/system-core.service';
import { StatusBadgeComponent } from './status-badge.component';
import { ControlButtonComponent } from './control-button.component';

@Component({
  selector: 'app-app-monitor-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, StatusBadgeComponent, ControlButtonComponent],
  templateUrl: './app-monitor-card.component.html',
  styleUrl: './app-monitor-card.component.scss'
})
export class AppMonitorCardComponent {
  telemetry = input.required<AppTelemetry>();
  service = inject(SystemCoreService);
  router = inject(Router);

  getAmbientGlowClass(): string {
    switch (this.telemetry().status) {
      case 'ONLINE':
        return 'bg-emerald-500';
      case 'SCALING':
        return 'bg-cyan-500';
      case 'OFFLINE':
        return 'bg-rose-500';
      default:
        return 'bg-app-bg0';
    }
  }

  getHealthTextClass(): string {
    if (this.telemetry().status === 'OFFLINE') return 'text-rose-500 font-bold';
    const h = this.telemetry().health;
    if (h >= 90) return 'text-emerald-400 font-black shadow-[0_0_8px_rgba(52,211,153,0.3)]';
    if (h >= 75) return 'text-cyan-400 font-black';
    return 'text-amber-500 font-bold';
  }

  getHealthBarClass(): string {
    const h = this.telemetry().health;
    if (this.telemetry().status === 'OFFLINE') return 'bg-rose-500';
    if (h >= 90) return 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]';
    if (h >= 75) return 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]';
    return 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]';
  }

  getErrorRateClass(): string {
    if (this.telemetry().status === 'OFFLINE') return 'text-app-text';
    const err = this.telemetry().errorRate;
    if (err > 1.0) return 'text-rose-400 font-bold shadow-[0_0_6px_rgba(244,63,94,0.3)]';
    if (err > 0.1) return 'text-amber-400';
    return 'text-emerald-400';
  }

  navigateToDetail() {
    this.router.navigate(['/admin/apps', this.telemetry().appId]);
  }
}
