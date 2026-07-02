import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../services/loader.service';

@Component({
  selector: 'app-global-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (mode() === 'fullscreen' && loaderService.isLoading()) {
      <div 
        id="fullscreen-loader" 
        class="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-app-bg/45 dark:bg-black/60 backdrop-blur-md transition-all duration-300"
      >
        <div class="relative flex items-center justify-center">
          <!-- Multi-ring dynamic cyber spin -->
          <svg class="w-16 h-16 animate-spin text-indigo-500" viewBox="0 0 50 50">
            <circle class="opacity-10 stroke-current" cx="25" cy="25" r="20" fill="none" stroke-width="4"></circle>
            <circle class="stroke-current" cx="25" cy="25" r="20" fill="none" stroke-width="4" stroke-dasharray="80" stroke-dashoffset="30" stroke-linecap="round"></circle>
          </svg>
          <svg class="absolute w-10 h-10 animate-[spin_1s_linear_infinite_reverse] text-pink-500" viewBox="0 0 50 50">
            <circle class="opacity-15 stroke-current" cx="25" cy="25" r="20" fill="none" stroke-width="4"></circle>
            <circle class="stroke-current" cx="25" cy="25" r="20" fill="none" stroke-width="4" stroke-dasharray="40" stroke-dashoffset="15" stroke-linecap="round"></circle>
          </svg>
          <!-- Central neon nucleus -->
          <div class="absolute w-4 h-4 rounded-full bg-indigo-500 animate-pulse shadow-lg shadow-indigo-500/80"></div>
        </div>
        
        <div class="mt-5 flex flex-col items-center">
          <span class="text-xs uppercase font-bold tracking-[0.2em] text-indigo-400 animate-pulse">
            Processing Transaction
          </span>
          <span class="text-[10px] text-app-muted dark:text-app-muted tracking-wider mt-1 font-mono">
            UPLINK ACTIVE • SYNC IN PROGRESS
          </span>
        </div>
      </div>
    } @else if (mode() === 'inline') {
      <div class="flex flex-col items-center justify-center py-8 gap-3">
        <svg class="w-10 h-10 animate-spin text-indigo-600" viewBox="0 0 50 50">
          <circle class="opacity-15 stroke-slate-300 dark:stroke-slate-700" cx="25" cy="25" r="20" fill="none" stroke-width="4"></circle>
          <circle class="stroke-current" cx="25" cy="25" r="20" fill="none" stroke-width="4" stroke-dasharray="60" stroke-dashoffset="20" stroke-linecap="round"></circle>
        </svg>
      </div>
    } @else if (mode() === 'button') {
      <svg class="w-4 h-4 animate-spin text-current inline mr-2" viewBox="0 0 50 50">
        <circle class="opacity-20 stroke-current" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
        <circle class="stroke-current" cx="25" cy="25" r="20" fill="none" stroke-width="5" stroke-dasharray="50" stroke-dashoffset="15" stroke-linecap="round"></circle>
      </svg>
    }
  `
})
export class LoaderComponent {
  mode = input<'fullscreen' | 'inline' | 'button'>('fullscreen');
  loaderService = inject(LoaderService);
}
