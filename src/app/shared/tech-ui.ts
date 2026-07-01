import { Component, input, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'ajr-tech-background',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-app-bg">
      <!-- Animated Tech Grid -->
      <div class="absolute inset-0 tech-grid opacity-20"></div>
      
      <!-- Drifting Gradient Orbs -->
      <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse-soft"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[150px] animate-pulse-soft" style="animation-delay: -2s"></div>
      <div class="absolute top-[30%] right-[10%] w-[20%] h-[20%] bg-emerald-500/10 rounded-full blur-[100px] animate-orbit"></div>
      
      <!-- Moving Particles (CSS only) -->
      @for (p of particles; track $index) {
        <div class="absolute w-1 h-1 bg-app-card/20 rounded-full animate-float-slow" 
             [style.left.%]="p.x" 
             [style.top.%]="p.y" 
             [style.animation-delay]="p.d + 's'"></div>
      }
    </div>
  `
})
export class TechBackground {
  particles = Array.from({ length: 20 }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    d: Math.random() * 10
  }));
}

@Component({
  selector: 'ajr-sparkle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="absolute inset-0 pointer-events-none overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      @for (s of sparkles; track $index) {
        <div class="absolute bg-app-card rounded-full animate-ping shadow-[0_0_8px_rgba(255,255,255,0.8)]"
             [style.left.%]="s.x" 
             [style.top.%]="s.y"
             [style.width.px]="s.size"
             [style.height.px]="s.size"
             [style.animation-delay]="s.delay + 'ms'"
             [style.animation-duration]="s.duration + 'ms'"></div>
      }
    </div>
  `
})
export class SparkleEffect {
  sparkles = Array.from({ length: 12 }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 1,
    delay: Math.random() * 2000,
    duration: Math.random() * 800 + 400
  }));
}

@Component({
  selector: 'ajr-floating-card',
  standalone: true,
  imports: [CommonModule, SparkleEffect],
  template: `
    <div class="relative group perspective-1000" 
         (mousemove)="handleMouseMove($event)"
         (mouseleave)="resetTilt()">
      <div class="transition-all duration-500 ease-out preserve-3d"
           [style.transform]="tiltTransform()">
        <div class="glass p-6 rounded-[32px] border border-white/10 shadow-2xl relative overflow-hidden group-hover:neon-border">
          <div class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
          
          <!-- Sparkle Effect on Hover -->
          <ajr-sparkle></ajr-sparkle>
          
          <div class="relative z-10">
            <ng-content></ng-content>
          </div>
        </div>
      </div>
    </div>
  `
})
export class FloatingCard {
  tiltX = signal(0);
  tiltY = signal(0);
  
  tiltTransform = () => `rotateX(${this.tiltX()}deg) rotateY(${this.tiltY()}deg)`;

  handleMouseMove(e: MouseEvent) {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    this.tiltX.set(((y - centerY) / centerY) * -10);
    this.tiltY.set(((x - centerX) / centerX) * 10);
  }

  resetTilt() {
    this.tiltX.set(0);
    this.tiltY.set(0);
  }
}

@Component({
  selector: 'ajr-data-flow',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg class="absolute inset-0 w-full h-full pointer-events-none opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path [attr.d]="path()" fill="none" stroke="url(#gradient)" stroke-width="0.5" 
            class="animate-data-stream" stroke-dasharray="10 90"/>
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#6366f1" stop-opacity="0" />
          <stop offset="50%" stop-color="#6366f1" stop-opacity="1" />
          <stop offset="100%" stop-color="#6366f1" stop-opacity="0" />
        </linearGradient>
      </defs>
    </svg>
  `
})
export class DataFlow {
  path = input('M 0 50 Q 50 20 100 50');
}

@Component({
  selector: 'ajr-glow-button',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <button [routerLink]="routerLink()" [disabled]="disabled()"
            class="relative px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all duration-300
                   bg-indigo-600 text-app-text shadow-lg shadow-indigo-600/30
                   hover:shadow-indigo-500/60 hover:-translate-y-0.5 active:scale-95
                   group overflow-hidden disabled:opacity-50 disabled:grayscale disabled:pointer-events-none">
      <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
      <div class="relative flex items-center justify-center gap-2">
        <ng-content></ng-content>
      </div>
    </button>
  `
})
export class GlowButton {
  routerLink = input<string | string[] | undefined>();
  disabled = input<boolean>(false);
}

@Component({
  selector: 'ajr-tech-cursor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 pointer-events-none z-[9999] hidden lg:block">
      <!-- Crosshair Lines -->
      <div class="absolute bg-indigo-500/10 transition-transform duration-75 ease-out"
           [style.left.px]="x()" [style.top]="'0'" [style.width.px]="1" [style.height]="'100%'"></div>
      <div class="absolute bg-indigo-500/10 transition-transform duration-75 ease-out"
           [style.left]="'0'" [style.top.px]="y()" [style.width]="'100%'" [style.height.px]="1"></div>
      
      <!-- Pulse Cursor -->
      <div class="absolute w-8 h-8 -ml-4 -mt-4 border border-indigo-500/30 rounded-full transition-transform duration-150 ease-out"
           [style.left.px]="x()" [style.top.px]="y()"></div>
      <div class="absolute w-2 h-2 -ml-1 -mt-1 bg-indigo-500 rounded-full shadow-[0_0_10px_#6366f1]"
           [style.left.px]="x()" [style.top.px]="y()"></div>
      
      <!-- Tech Data -->
      <div class="absolute text-[8px] font-mono text-indigo-400/60 transition-transform duration-75 uppercase tracking-tighter"
           [style.left.px]="x() + 15" [style.top.px]="y() + 15">
        X: {{ x() }}<br>
        Y: {{ y() }}<br>
        HUB_LINK: ACTIVE
      </div>
    </div>
  `
})
export class TechCursor implements OnInit {
  x = signal(0);
  y = signal(0);

  ngOnInit() {
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', (e) => {
        this.x.set(e.clientX);
        this.y.set(e.clientY);
      });
    }
  }
}


@Component({
  selector: 'ajr-parallax-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative overflow-hidden" (mousemove)="handleMouse($event)">
      <div class="transition-transform duration-700 ease-out" [style.transform]="transform()">
        <ng-content></ng-content>
      </div>
    </div>
  `
})
export class ParallaxContainer {
  moveX = signal(0);
  moveY = signal(0);
  
  transform = () => `translate3d(${this.moveX()}px, ${this.moveY()}px, 0)`;

  handleMouse(e: MouseEvent) {
    const { innerWidth, innerHeight } = window;
    const x = (e.clientX - innerWidth / 2) / 50;
    const y = (e.clientY - innerHeight / 2) / 50;
    this.moveX.set(x);
    this.moveY.set(y);
  }
}
