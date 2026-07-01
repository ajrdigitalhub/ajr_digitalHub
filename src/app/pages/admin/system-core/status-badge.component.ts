import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss'
})
export class StatusBadgeComponent {
  status = input.required<'ONLINE' | 'SCALING' | 'OFFLINE'>();

  getBadgeClasses(): string {
    switch (this.status()) {
      case 'ONLINE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'SCALING':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'OFFLINE':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30 dark:border-rose-950/30';
      default:
        return 'bg-app-bg0/10 text-app-muted border-slate-500/30';
    }
  }

  getDotClasses(): string {
    switch (this.status()) {
      case 'ONLINE':
        return 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]';
      case 'SCALING':
        return 'bg-cyan-400 animate-ping shadow-[0_0_8px_rgba(34,211,238,0.6)]';
      case 'OFFLINE':
        return 'bg-rose-500 shadow-[0_0_4px_rgba(239,68,68,0.4)]';
      default:
        return 'bg-app-bg0';
    }
  }
}
