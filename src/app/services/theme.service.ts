import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppTheme = 'dark' | 'light' | 'neon';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  currentTheme = signal<AppTheme>('dark');
  theme$ = new BehaviorSubject<AppTheme>('dark');

  constructor() {
    this.loadTheme();
  }

  loadTheme() {
    if (typeof window !== 'undefined') {
      const saved = (localStorage.getItem('theme') || localStorage.getItem('ajr-hub-theme')) as AppTheme;
      if (saved && ['dark', 'light', 'neon'].includes(saved)) {
        this.setTheme(saved);
      } else {
        this.setTheme('dark');
      }
    }
  }

  setTheme(theme: AppTheme) {
    this.currentTheme.set(theme);
    this.theme$.next(theme);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
      localStorage.setItem('ajr-hub-theme', theme); // keep both for fallback safety
      
      const html = document.documentElement;
      const body = document.body;
      const themeClass = theme + '-theme';

      // Update html and body classNames dynamically
      html.className = themeClass;
      body.className = themeClass;

      // Support for standard tailwind "dark:" utilities
      if (theme === 'dark' || theme === 'neon') {
        html.classList.add('dark');
      }
    }
  }
}
