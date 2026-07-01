import { Directive, ElementRef, OnInit, OnDestroy, input, inject, Renderer2, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface ScrollRevealConfig {
  direction?: 'up' | 'down' | 'left' | 'right' | 'zoom' | 'fade';
  delay?: number;
  duration?: number;
  speed?: number;
  threshold?: number;
}

@Directive({
  selector: '[appScrollReveal]',
  standalone: true
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private platformId = inject(PLATFORM_ID);
  private observer: IntersectionObserver | null = null;

  // Single input that maps to [appScrollReveal] binding
  appScrollReveal = input<ScrollRevealConfig | '' | undefined>(undefined);

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.setUpInitialStyles();
    this.createObserver();
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private getResolvedConfig() {
    const config = this.appScrollReveal();
    const defaults = {
      direction: 'up' as const,
      delay: 0,
      duration: 600,
      threshold: 0.15
    };

    if (config && typeof config === 'object') {
      return {
        direction: config.direction ?? defaults.direction,
        delay: config.delay ?? defaults.delay,
        duration: config.duration ?? config.speed ?? defaults.duration,
        threshold: config.threshold ?? defaults.threshold
      };
    }

    return defaults;
  }

  private setUpInitialStyles() {
    const rawEl = this.el.nativeElement;
    const config = this.getResolvedConfig();
    
    // Set transitions
    this.renderer.setStyle(rawEl, 'transition-property', 'opacity, transform, filter');
    this.renderer.setStyle(rawEl, 'transition-duration', `${config.duration}ms`);
    this.renderer.setStyle(rawEl, 'transition-delay', `${config.delay}ms`);
    this.renderer.setStyle(rawEl, 'transition-timing-function', 'cubic-bezier(0.25, 1, 0.5, 1)');
    this.renderer.setStyle(rawEl, 'will-change', 'opacity, transform');

    // Initial state based on direction
    this.renderer.setStyle(rawEl, 'opacity', '0');

    switch (config.direction) {
      case 'up':
        this.renderer.setStyle(rawEl, 'transform', 'translateY(40px)');
        break;
      case 'down':
        this.renderer.setStyle(rawEl, 'transform', 'translateY(-40px)');
        break;
      case 'left':
        this.renderer.setStyle(rawEl, 'transform', 'translateX(-40px)');
        break;
      case 'right':
        this.renderer.setStyle(rawEl, 'transform', 'translateX(40px)');
        break;
      case 'zoom':
        this.renderer.setStyle(rawEl, 'transform', 'scale(0.92)');
        break;
      case 'fade':
        // Just opacity, no transformation
        break;
    }
  }

  private createObserver() {
    const rawEl = this.el.nativeElement;
    const config = this.getResolvedConfig();

    const options = {
      root: null, // viewport
      threshold: config.threshold,
      rootMargin: '0px 0px -80px 0px' // offset so triggers slightly before full center
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.reveal();
          if (this.observer) {
            this.observer.unobserve(rawEl); // Triggers once
          }
        }
      });
    }, options);

    this.observer.observe(rawEl);
  }

  private reveal() {
    const rawEl = this.el.nativeElement;
    this.renderer.setStyle(rawEl, 'opacity', '1');
    this.renderer.setStyle(rawEl, 'transform', 'translate(0px, 0px) scale(1)');
  }
}
