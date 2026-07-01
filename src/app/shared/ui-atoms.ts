import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ajr-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      [class]="className()"
      class="animate-pulse bg-slate-200/50 rounded-lg relative overflow-hidden"
    >
      <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
    </div>
  `
})
export class SkeletonLoaderComponent {
  className = input<string>('w-full h-4');
}

@Component({
  selector: 'ajr-animated-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="group relative bg-app-card rounded-2xl border border-app-border/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200"
    >
      <!-- Suble Border Glow -->
      <div class="absolute -inset-[1px] bg-gradient-to-br from-indigo-500/20 to-pink-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-[2px] -z-10"></div>
      
      <ng-content></ng-content>
    </div>
  `
})
export class AnimatedCardComponent {}

@Component({
  selector: 'ajr-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      (click)="onClick($event)"
      class="relative overflow-hidden group px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
      [ngClass]="variantClasses()"
    >
      <span class="relative z-10 flex items-center justify-center gap-2">
        <ng-content></ng-content>
      </span>
      
      <!-- Ripple Effect Container -->
      <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-10 transition-opacity">
        <div class="w-full h-full bg-app-card scale-0 group-hover:scale-150 transition-transform duration-500 rounded-full"></div>
      </div>
    </button>
  `
})
export class AnimatedButtonComponent {
  variant = input<'primary' | 'secondary' | 'outline' | 'ghost'>('primary');
  type = input<'button' | 'submit'>('button');
  disabled = input(false);

  variantClasses = () => {
    switch(this.variant()) {
      case 'primary': return 'bg-indigo-600 text-app-text hover:bg-indigo-700';
      case 'secondary': return 'bg-app-bg text-app-text hover:bg-app-card';
      case 'outline': return 'bg-app-card text-app-text border border-app-border hover:bg-app-bg';
      case 'ghost': return 'bg-transparent text-app-muted hover:bg-app-bg hover:text-app-text shadow-none';
      default: return 'bg-indigo-600 text-app-text';
    }
  };

  onClick(event: MouseEvent) {
    // Basic ripple logic could go here if needed, but the CSS transition/scale handles it well
  }
}
