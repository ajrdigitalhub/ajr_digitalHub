import { Component, input, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ajr-countdown-timer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center gap-4">
      <div class="relative w-32 h-32 md:w-40 md:h-40">
        <!-- SVG Ring -->
        <svg class="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="45"
            fill="transparent"
            stroke="currentColor"
            class="text-app-text"
            stroke-width="4"
          />
          <circle
            cx="50" cy="50" r="45"
            fill="transparent"
            stroke="url(#countdown-gradient)"
            stroke-width="4"
            stroke-linecap="round"
            [style.strokeDasharray]="282.7"
            [style.strokeDashoffset]="dashOffset()"
            class="transition-all duration-1000 ease-linear"
          />
          <defs>
            <linearGradient id="countdown-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#4f46e5" />
              <stop offset="100%" stop-color="#ec4899" />
            </linearGradient>
          </defs>
        </svg>

        <!-- Time Text -->
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-2xl md:text-3xl font-black text-app-text tracking-tighter">
            {{ formatTime() }}
          </span>
          <span class="text-[10px] font-bold text-app-muted uppercase tracking-widest mt-[-2px]">
            Remaining
          </span>
        </div>
      </div>
      
      @if (isExpired()) {
        <span class="text-xs font-bold text-rose-500 uppercase tracking-widest animate-pulse">
          Offer Expired
        </span>
      }
    </div>
  `
})
export class CountdownTimerComponent implements OnInit, OnDestroy {
  endTime = input.required<number>(); // Timestamp in ms
  
  private remainingSeconds = signal(0);
  private timer: ReturnType<typeof setInterval> | undefined;

  isExpired = computed(() => this.remainingSeconds() <= 0);
  
  dashOffset = computed(() => {
    const total = 282.7; // 2 * PI * R (45)
    // We assume a 24h cycle for the visual ring, or just based on initial set
    const progress = Math.max(0, this.remainingSeconds() % 86400) / 86400;
    return total * (1 - progress);
  });

  formatTime = computed(() => {
    const s = this.remainingSeconds();
    if (s <= 0) return '00:00';
    
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    
    if (h > 0) return `${h}h ${m}m`;
    return `${m.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  ngOnInit() {
    this.updateTime();
    this.timer = setInterval(() => this.updateTime(), 1000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private updateTime() {
    const now = Date.now();
    const diff = Math.floor((this.endTime() - now) / 1000);
    this.remainingSeconds.set(Math.max(0, diff));
  }
}
