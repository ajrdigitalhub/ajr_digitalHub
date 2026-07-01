import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex flex-col md:flex-row bg-app-bg text-app-text font-sans">
      
      <!-- Side panel slot -->
      <ng-content selector="[sidebar]"></ng-content>
      
      <!-- Main Content and Header Area -->
      <div class="flex-grow flex flex-col h-screen overflow-hidden">
        
        <!-- Top header bar slot -->
        <ng-content selector="[header]"></ng-content>
        
        <!-- Scrolling page body slot -->
        <main class="flex-grow p-6 md:p-8 overflow-y-auto scroll-smooth custom-scrollbar">
          <div class="max-w-[1400px] mx-auto">
            <ng-content></ng-content>
          </div>
        </main>
        
      </div>
    </div>
  `
})
export class AdminLayoutComponent {}
