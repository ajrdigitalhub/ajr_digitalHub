import { Component, input, signal, OnInit, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { animate } from 'motion';

@Component({
  selector: 'ajr-kpi-counter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col">
      <span class="text-4xl md:text-5xl font-black text-app-text tracking-tighter tabular-nums">
        {{ displayedValue() }}{{ suffix() }}
      </span>
      <span class="text-xs font-bold text-app-muted uppercase tracking-widest mt-1">
        {{ label() }}
      </span>
    </div>
  `
})
export class KpiCounterComponent implements OnInit {
  value = input.required<number>();
  label = input.required<string>();
  suffix = input<string>('');
  duration = input<number>(1.2);

  displayedValue = signal(0);
  private el = inject(ElementRef);

  ngOnInit() {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        this.startAnimation();
        observer.disconnect();
      }
    }, { threshold: 0.1 });

    observer.observe(this.el.nativeElement);
  }

  private startAnimation() {
    animate(0, this.value(), {
      duration: this.duration(),
      ease: [0.33, 1, 0.68, 1], // easeOutExpo-ish
      onUpdate: (latest: number) => {
        this.displayedValue.set(Math.floor(latest));
      }
    });
  }
}
