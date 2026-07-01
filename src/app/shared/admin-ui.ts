import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { DeploymentStatus } from '../services/admin-data';

@Component({
  selector: 'ajr-kpi-card',
  imports: [CommonModule, MatIconModule],
  template: `
    <div 
      class="group relative bg-app-card rounded-2xl border border-app-border/70 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-300"
    >
      <!-- Background glowing ring -->
      <div class="absolute -inset-[1px] bg-gradient-to-tr from-indigo-500/10 to-emerald-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-[1px] -z-10"></div>
      
      <div class="flex items-start justify-between">
        <div class="space-y-1">
          <span class="text-[10px] font-black uppercase text-app-muted tracking-wider font-sans block">
            {{ title() }}
          </span>
          <h4 class="text-2xl font-black text-app-text tracking-tight font-sans">
            {{ formattedValue() }}
          </h4>
        </div>
        
        <div 
          [class]="iconBgClass()" 
          class="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
        >
          <mat-icon class="text-base text-current">{{ icon() }}</mat-icon>
        </div>
      </div>

      <!-- Trend Badge -->
      @if (percentChange() !== undefined) {
        <div class="mt-4 flex items-center gap-1.5">
          <span 
            [ngClass]="percentChange()! >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-rose-50 text-rose-700 border-rose-150'"
            class="text-[9px] font-bold px-1.5 py-0.5 border rounded-lg flex items-center gap-0.5 leading-none"
          >
            <mat-icon class="text-[10px] w-2.5 h-2.5 leading-none">
              {{ percentChange()! >= 0 ? 'trending_up' : 'trending_down' }}
            </mat-icon>
            {{ absPercent() }}%
          </span>
          <span class="text-[10px] text-slate-450 font-medium">vs yesterday</span>
        </div>
      }
    </div>
  `
})
export class KpiCard {
  title = input.required<string>();
  value = input.required<number | string>();
  icon = input<string>('analytics');
  percentChange = input<number>();
  prefix = input<string>('');
  suffix = input<string>('');
  color = input<'indigo' | 'emerald' | 'amber' | 'rose' | 'slate'>('indigo');

  formattedValue = computed(() => {
    const val = this.value();
    if (typeof val === 'number') {
      return this.prefix() + val.toLocaleString() + this.suffix();
    }
    return this.prefix() + val + this.suffix();
  });

  absPercent = computed(() => {
    const p = this.percentChange();
    return p !== undefined ? Math.abs(p).toFixed(1) : '0';
  });

  iconBgClass = computed(() => {
    switch (this.color()) {
      case 'indigo': return 'bg-indigo-50 text-indigo-600';
      case 'emerald': return 'bg-emerald-50 text-emerald-600';
      case 'amber': return 'bg-amber-50 text-amber-600';
      case 'rose': return 'bg-rose-50 text-rose-600';
      case 'slate': return 'bg-app-bg text-app-muted';
    }
  });
}

@Component({
  selector: 'ajr-status-badge',
  imports: [CommonModule, MatIconModule],
  template: `
    <span 
      [ngClass]="badgeClasses()"
      class="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 border rounded-full font-sans uppercase tracking-wider select-none"
    >
      <span [ngClass]="dotClasses()" class="w-1.5 h-1.5 rounded-full inline-block"></span>
      {{ status() }}
    </span>
  `
})
export class StatusBadge {
  status = input.required<'Live' | 'Deploying' | 'Failed' | string>();

  badgeClasses = computed(() => {
    switch (this.status()) {
      case 'Live':
        return 'bg-emerald-50/70 text-emerald-700 border-emerald-200/60';
      case 'Deploying':
        return 'bg-amber-50/70 text-amber-700 border-amber-200/60';
      case 'Failed':
        return 'bg-rose-50/70 text-rose-700 border-rose-200/80';
      default:
        return 'bg-app-bg/70 text-app-text border-app-border/60';
    }
  });

  dotClasses = computed(() => {
    switch (this.status()) {
      case 'Live':
        return 'bg-emerald-500 shadow-sm';
      case 'Deploying':
        return 'bg-amber-500 animate-pulse';
      case 'Failed':
        return 'bg-rose-600 shadow-md animate-ping';
      default:
        return 'bg-slate-400';
    }
  });
}

@Component({
  selector: 'ajr-config-toggle',
  imports: [CommonModule],
  template: `
    <div class="flex items-center justify-between p-4 bg-app-bg border border-slate-150 rounded-xl transition-all hover:bg-app-bg/40">
      <div class="flex-1 pr-4">
        <span class="block text-xs font-bold text-app-text tracking-tight font-sans">
          {{ label() }}
        </span>
        @if (description()) {
          <span class="block text-[10px] text-slate-450 mt-0.5 font-sans leading-relaxed">
            {{ description() }}
          </span>
        }
      </div>

      <!-- Pill Toggler Slider -->
      <button 
        type="button"
        (click)="toggle()"
        [class.bg-indigo-600]="checked()"
        [class.bg-slate-200]="!checked()"
        class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-1 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
      >
        <span 
          [class.translate-x-4]="checked()"
          [class.translate-x-0]="!checked()"
          class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-app-card shadow-xs ring-0 transition duration-200 ease-in-out"
        ></span>
      </button>
    </div>
  `
})
export class ConfigToggle {
  label = input.required<string>();
  description = input<string>('');
  checked = input<boolean>(false);
  checkedChange = output<boolean>();

  toggle() {
    this.checkedChange.emit(!this.checked());
  }
}

@Component({
  selector: 'ajr-rate-slider',
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="bg-app-card rounded-2xl border border-app-border p-5 shadow-xs font-sans">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <div [ngClass]="statusBg()" class="w-2.5 h-2.5 rounded-full inline-block"></div>
          <span class="text-xs font-black uppercase text-app-text tracking-wider">
            {{ label() }}
          </span>
        </div>
        <span class="text-xs font-bold text-slate-450">
          Limit: <span class="text-app-text font-black font-mono bg-app-bg px-1.5 py-0.5 rounded">{{ value() }} {{ suffix() }}</span>
        </span>
      </div>

      <!-- Linear Range Slider -->
      <div class="relative mt-3">
        <input 
          type="range"
          [min]="min()"
          [max]="max()"
          [step]="step()"
          [value]="value()"
          (input)="onInputChange($event)"
          class="w-full h-1.5 bg-app-bg rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
      </div>

      <!-- Threshold Warnings -->
      <div class="mt-3 flex items-center justify-between text-[10px]">
        <span class="text-app-muted font-semibold font-mono">{{ min() }}</span>
        <span [ngClass]="statusText()" class="font-bold flex items-center gap-1">
          @if (isWarning()) {
            <mat-icon class="text-[12px] w-3 h-3 text-current">warning</mat-icon> Alert Threshold
          } @else if (isCritical()) {
            <mat-icon class="text-[12px] w-3 h-3 text-current">error</mat-icon> System Redline
          } @else {
            <mat-icon class="text-[12px] w-3 h-3 text-current">done</mat-icon> Optimal Range
          }
        </span>
        <span class="text-app-muted font-semibold font-mono">{{ max() }}</span>
      </div>

      <!-- Visual Usage Progress simulation -->
      <div class="mt-4 pt-3 border-t border-dashed border-app-border">
        <div class="flex justify-between text-[9px] font-black text-app-muted uppercase tracking-widest pl-0.5 mb-1.5">
          <span>Simulation Stream Load</span>
          <span class="font-mono text-app-text font-bold">{{ simulationLoad() }}% Usage</span>
        </div>
        <div class="w-full bg-app-bg h-1 rounded-full overflow-hidden">
          <div 
            [style.width.%]="simulationLoad()"
            [ngClass]="progressBg()"
            class="h-full transition-all duration-550"
          ></div>
        </div>
      </div>
    </div>
  `
})
export class RateSlider {
  label = input.required<string>();
  value = input.required<number>();
  min = input<number>(10);
  max = input<number>(200);
  step = input<number>(1);
  suffix = input<string>('');
  valueChange = output<number>();

  simulationLoadValue = input<number>(45); // simulated concurrent metrics

  simulationLoad = computed(() => {
    // Calculated relatively against value()
    const rawVal = this.value();
    const range = this.max() - this.min();
    const relativeFactor = range > 0 ? (rawVal - this.min()) / range : 0.5;
    
    // Simulate typical flow usage that scales with the configured limit slightly
    const safeBase = Math.min(95, Math.max(10, Math.floor(65 * relativeFactor)));
    return safeBase;
  });

  isWarning = computed(() => {
    const rawVal = this.value();
    const maxVal = this.max();
    return rawVal > maxVal * 0.55 && rawVal <= maxVal * 0.85;
  });

  isCritical = computed(() => {
    const rawVal = this.value();
    const maxVal = this.max();
    return rawVal > maxVal * 0.85;
  });

  statusBg = computed(() => {
    if (this.isCritical()) return 'bg-rose-500 animate-ping';
    if (this.isWarning()) return 'bg-amber-400';
    return 'bg-emerald-500';
  });

  statusText = computed(() => {
    if (this.isCritical()) return 'text-rose-600 font-black';
    if (this.isWarning()) return 'text-amber-600';
    return 'text-emerald-600';
  });

  progressBg = computed(() => {
    if (this.isCritical()) return 'bg-rose-600';
    if (this.isWarning()) return 'bg-amber-500';
    return 'bg-indigo-600';
  });

  onInputChange(event: Event) {
    const val = +(event.target as HTMLInputElement).value;
    this.valueChange.emit(val);
  }
}

@Component({
  selector: 'ajr-deploy-card',
  imports: [CommonModule, StatusBadge, MatIconModule],
  template: `
    <div 
      class="group relative bg-app-card border border-slate-205 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all duration-300 hover:border-app-border font-sans"
    >
      <div class="flex items-start justify-between">
        <div class="space-y-1.5 flex-1 pr-4">
          <div class="flex items-center gap-2">
            <span class="text-sm font-black text-app-text tracking-tight leading-none">
              {{ deployment().name }}
            </span>
            <span class="text-[9px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-full inline-block leading-none">
              {{ deployment().env }}
            </span>
          </div>
          <span class="block text-[10px] text-app-muted font-mono select-all">
            {{ deployment().domain }}
          </span>
        </div>
        
        <ajr-status-badge [status]="deployment().status"></ajr-status-badge>
      </div>

      <div class="mt-6 pt-4 border-t border-app-border flex items-center justify-between">
        <div class="flex items-center gap-1.5">
          <mat-icon class="text-app-muted text-xs w-3 h-3 leading-none">schedule</mat-icon>
          <span class="text-[10px] text-slate-450 font-bold">
            Released: <span class="text-app-text">{{ deployment().lastDeploy }}</span>
          </span>
        </div>

        <button 
          (click)="onRebuild()"
          [disabled]="deployment().status === 'Deploying'"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-app-border text-[10px] font-bold text-slate-650 hover:bg-app-bg active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <mat-icon 
            [ngClass]="deployment().status === 'Deploying' ? 'animate-spin text-amber-500' : 'text-app-muted'"
            class="text-[12px] w-3 h-3 leading-none"
          >
            refresh
          </mat-icon>
          Recompile Node
        </button>
      </div>
    </div>
  `
})
export class DeployCard {
  deployment = input.required<DeploymentStatus>();
  rebuild = output<string>();

  onRebuild() {
    this.rebuild.emit(this.deployment().name);
  }
}
