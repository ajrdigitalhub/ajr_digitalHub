import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

interface Theme {
  id: string;
  name: string;
  description: string;
  image: string;
  isPremium: boolean;
  color: string;
}

@Component({
  selector: 'app-themes',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './themes.html'
})
export class ThemesComponent {
  isProUser = true; // Mock user state
  activeTheme = signal('theme-1');
  isSaved = signal(false);

  saveChanges() {
    this.isSaved.set(true);
    setTimeout(() => {
      this.isSaved.set(false);
    }, 2000);
  }

  themes = signal<Theme[]>([
    {
      id: 'theme-1',
      name: 'Clean Standard',
      description: 'A minimal, professional look suitable for any business.',
      image: '',
      isPremium: false,
      color: '#4f46e5' // indigo-600
    },
    {
      id: 'theme-2',
      name: 'Modern Bold',
      description: 'Strong typography and high contrast for a striking impression.',
      image: '',
      isPremium: false,
      color: '#0f172a' // slate-900
    },
    {
      id: 'theme-3',
      name: 'Creative Studio',
      description: 'Playful layout with vibrant accents for creative agencies.',
      image: '',
      isPremium: true,
      color: '#f59e0b' // amber-500
    },
    {
      id: 'theme-4',
      name: 'Corporate Elegant',
      description: 'Sophisticated serif fonts and muted tones for consulting.',
      image: '',
      isPremium: true,
      color: '#0d9488' // teal-600
    },
    {
      id: 'theme-5',
      name: 'Tech Startup',
      description: 'Monospace fonts and dark mode elements for dev shops.',
      image: '',
      isPremium: true,
      color: '#8b5cf6' // violet-500
    },
    {
      id: 'theme-6',
      name: 'Eco Friendly',
      description: 'Earthy tones and organic shapes for sustainable brands.',
      image: '',
      isPremium: true,
      color: '#10b981' // emerald-500
    }
  ]);

  selectTheme(id: string) {
    const theme = this.themes().find(t => t.id === id);
    if (theme?.isPremium && !this.isProUser) {
      // Handle premium unlock logic
      alert('This is a premium theme. Upgrade to Pro to unlock.');
      return;
    }
    this.activeTheme.set(id);
  }
}
