import { Component, OnInit, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-pwa-install-prompt',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (showPrompt()) {
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300" (click)="close()">
        
        <!-- Bottom Sheet Container -->
        <div 
          class="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#1e202a] border-t border-app-border rounded-t-[32px] p-6 shadow-2xl z-50 transform translate-y-0 transition-transform duration-300 pointer-events-auto"
          (click)="$event.stopPropagation()"
        >
          <!-- Drag Handle -->
          <div class="w-12 h-1.5 bg-slate-700/50 rounded-full mx-auto mb-6"></div>

          <!-- Header Title -->
          <h2 class="text-center font-display font-bold text-app-text text-lg mb-6 tracking-wide select-none">
            Add to home screen
          </h2>

          <!-- List of Options -->
          <div class="space-y-4">
            
            <!-- Option 1: Install -->
            <button 
              (click)="triggerInstall()" 
              class="w-full flex items-center justify-between p-4 bg-app-card/60 hover:bg-app-card border border-app-border hover:border-indigo-500/30 rounded-2xl transition-all duration-200 text-left group cursor-pointer"
            >
              <div class="flex items-center gap-4">
                <!-- App Icon with Badge Overlay -->
                <div class="relative w-12 h-12 rounded-xl bg-app-bg border border-app-border flex-shrink-0 overflow-hidden flex items-center justify-center">
                  <img src="/logo.png" alt="App Logo" class="w-full h-full object-cover" />
                  <!-- Download Icon Badge overlay -->
                  <div class="absolute bottom-0 right-0 bg-indigo-600 text-app-text rounded-full p-0.5 border border-[#1e202a] flex items-center justify-center w-5 h-5 shadow-md">
                    <mat-icon class="!text-[10px] !w-[10px] !h-[10px] leading-none flex items-center justify-center font-black">arrow_downward</mat-icon>
                  </div>
                </div>
                <div>
                  <span class="text-sm font-bold text-app-text block group-hover:text-indigo-400 transition-colors">Install</span>
                  <span class="text-[10px] text-app-muted font-mono uppercase tracking-widest block mt-0.5">Quick standalone mode</span>
                </div>
              </div>
              <mat-icon class="text-app-muted group-hover:text-app-text transition-colors">chevron_right</mat-icon>
            </button>

            <!-- Option 2: Create Shortcut -->
            <button 
              (click)="triggerInstall()" 
              class="w-full flex items-center justify-between p-4 bg-app-card/60 hover:bg-app-card border border-app-border hover:border-indigo-500/30 rounded-2xl transition-all duration-200 text-left group cursor-pointer"
            >
              <div class="flex items-center gap-4">
                <!-- App Icon with Chrome Badge Overlay -->
                <div class="relative w-12 h-12 rounded-xl bg-app-bg border border-app-border flex-shrink-0 overflow-hidden flex items-center justify-center">
                  <img src="/logo.png" alt="App Logo" class="w-full h-full object-cover" />
                  <!-- Chrome Logo Badge overlay -->
                  <div class="absolute bottom-0 right-0 bg-white rounded-full p-0.5 border border-[#1e202a] flex items-center justify-center w-5 h-5 shadow-md">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
                      <path fill="#EA4335" d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
                    </svg>
                  </div>
                </div>
                <div>
                  <span class="text-sm font-bold text-app-text block group-hover:text-indigo-400 transition-colors">Create shortcut</span>
                  <span class="text-[10px] text-app-muted font-mono block mt-0.5">Shortcuts open in Chrome</span>
                </div>
              </div>
              <mat-icon class="text-app-muted group-hover:text-app-text transition-colors">chevron_right</mat-icon>
            </button>

          </div>

          <!-- Close / Dismiss Button -->
          <button 
            (click)="close()" 
            class="w-full mt-6 py-3.5 bg-slate-800/60 hover:bg-slate-850 border border-app-border text-app-text hover:text-app-text text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer text-center"
          >
            Cancel
          </button>
        </div>
      </div>
    }
  `
})
export class PwaInstallPromptComponent implements OnInit {
  deferredPrompt: any = null;
  showPrompt = signal<boolean>(false);

  ngOnInit() {
    // Check if app is already run in standalone (PWA) mode
    if (this.isStandalone()) {
      return;
    }

    if (typeof window !== 'undefined') {
      // Check if we already have the saved prompt in window
      const savedPrompt = (window as any).deferredInstallPrompt;
      if (savedPrompt) {
        this.deferredPrompt = savedPrompt;
        this.showPrompt.set(true);
      }
    }
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(event: any) {
    // Prevent the mini-infobar from appearing on mobile
    event.preventDefault();
    // Stash the event so it can be triggered later.
    this.deferredPrompt = event;
    if (typeof window !== 'undefined') {
      (window as any).deferredInstallPrompt = event;
    }
    // Show the custom installation prompt UI
    this.showPrompt.set(true);
  }

  isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches || 
           (window.navigator as any).standalone === true;
  }

  triggerInstall() {
    if (!this.deferredPrompt) return;

    // Show the native browser install prompt
    this.deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    this.deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
      } else {
        console.log('User dismissed the PWA install prompt');
      }
      this.deferredPrompt = null;
      (window as any).deferredInstallPrompt = null;
      this.showPrompt.set(false);
    });
  }

  close() {
    this.showPrompt.set(false);
  }
}
