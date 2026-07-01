import { Injectable, signal, inject } from '@angular/core';
import { ThemeService, AppTheme } from './theme.service';

export type LayoutDensity = 'comfortable' | 'compact';

@Injectable({
  providedIn: 'root'
})
export class UiConfigService {
  themeService = inject(ThemeService);
  
  animationsEnabled = signal<boolean>(true);
  layoutDensity = signal<LayoutDensity>('comfortable');

  constructor() {
    this.loadConfig();
  }

  loadConfig() {
    if (typeof window !== 'undefined') {
      const anims = localStorage.getItem('ajr-hub-animations');
      if (anims !== null) {
        const enabled = anims === 'true';
        this.animationsEnabled.set(enabled);
        this.applyAnimationsClass(enabled);
      }

      const density = localStorage.getItem('ajr-hub-density') as LayoutDensity;
      if (density && ['comfortable', 'compact'].includes(density)) {
        this.layoutDensity.set(density);
        this.applyDensityClass(density);
      }
    }
  }

  toggleAnimations() {
    const nextVal = !this.animationsEnabled();
    this.animationsEnabled.set(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ajr-hub-animations', String(nextVal));
    }
    this.applyAnimationsClass(nextVal);
  }

  setDensity(density: LayoutDensity) {
    this.layoutDensity.set(density);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ajr-hub-density', density);
    }
    this.applyDensityClass(density);
  }

  private applyAnimationsClass(enabled: boolean) {
    if (typeof window !== 'undefined') {
      const body = document.body;
      if (enabled) {
        body.classList.remove('no-animations');
      } else {
        body.classList.add('no-animations');
      }
    }
  }

  private applyDensityClass(density: LayoutDensity) {
    if (typeof window !== 'undefined') {
      const body = document.body;
      body.classList.remove('density-comfortable', 'density-compact');
      body.classList.add(`density-${density}`);
    }
  }
}
