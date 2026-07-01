import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-control-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  templateUrl: './control-button.component.html',
  styleUrl: './control-button.component.scss'
})
export class ControlButtonComponent {
  action = input.required<'start' | 'stop' | 'restart'>();
  loading = input<string | null>(null);
  disabled = input<boolean>(false);
  triggerAction = output<void>();

  getLabel(): string {
    switch (this.action()) {
      case 'start':
        return 'START SERVICE';
      case 'stop':
        return 'HALT SYSTEM';
      case 'restart':
        return 'HOT RESTART';
    }
  }

  getIcon(): string {
    switch (this.action()) {
      case 'start':
        return 'play_arrow';
      case 'stop':
        return 'stop';
      case 'restart':
        return 'autorenew';
    }
  }

  getButtonClasses(): string {
    if (this.loading() === this.action()) {
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.2)] animate-pulse';
    }

    switch (this.action()) {
      case 'start':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:border-cyan-400 hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:scale-[1.02] text-[11px]';
      case 'stop':
        return 'bg-app-card/40 text-app-muted border-app-border hover:border-rose-500/45 hover:text-rose-400 hover:bg-rose-500/5 hover:scale-[1.02]';
      case 'restart':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:border-purple-400 hover:bg-purple-500/20 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:scale-[1.02]';
      default:
        return 'bg-app-bg text-app-text border-app-border';
    }
  }

  onClick(event: Event) {
    event.stopPropagation(); // Prevent card navigation trigger
    this.triggerAction.emit();
  }
}
