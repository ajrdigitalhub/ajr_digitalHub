import { Component, Input, signal, effect, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-marketplace-preview',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full w-full bg-[#111111] flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12 overflow-hidden relative overflow-y-auto custom-scrollbar">
       <!-- Dots Backdrop for more professional look -->
       <div class="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
       
       <!-- Toolbar inside preview area -->
       <div class="absolute bottom-6 right-6 flex items-center gap-1 bg-[#1e1e1e]/80 backdrop-blur-xl rounded-full shadow-2xl border border-app-border p-1.5 pointer-events-auto z-30">
          <button (click)="zoom.set(0.5)" [class.bg-indigo-600]="zoom() === 0.5" class="w-10 h-10 rounded-full hover:bg-white/5 text-app-text/50 hover:text-app-text transition-all text-[10px] font-black uppercase flex items-center justify-center">50%</button>
          <button (click)="zoom.set(0.75)" [class.bg-indigo-600]="zoom() === 0.75" class="w-10 h-10 rounded-full hover:bg-white/5 text-app-text/50 hover:text-app-text transition-all text-[10px] font-black uppercase flex items-center justify-center">75%</button>
          <button (click)="zoom.set(1)" [class.bg-indigo-600]="zoom() === 1" class="w-10 h-10 rounded-full hover:bg-white/5 text-app-text/50 hover:text-app-text transition-all text-[10px] font-black uppercase flex items-center justify-center">100%</button>
       </div>

       <!-- Browser Frame Container (handles scaling centering) -->
       <div class="relative flex items-center justify-center transition-all duration-500"
            [style.width]="'calc(' + deviceWidth() + ' * ' + zoom() + ')'"
            [style.height]="'calc(100vh * ' + zoom() + ')'">
            
          <div [style.width]="deviceWidth()" 
               [style.transform]="'scale(' + zoom() + ')'"
               class="flex flex-col bg-white rounded-3xl shadow-[0_60px_100px_-20px_rgba(0,0,0,0.7)] overflow-hidden transition-all duration-500 border border-app-border origin-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
             
             <!-- Browser Header -->
             <div class="h-10 bg-[#f8f9fa] border-b border-[#e1e3e4] flex items-center px-5 gap-4 shrink-0">
                <div class="flex gap-2">
                   <div class="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                   <div class="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                   <div class="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                </div>
                <div class="flex-grow flex justify-center">
                   <div class="bg-white rounded-lg px-4 py-1 text-[11px] text-app-muted font-mono flex items-center gap-2 border border-slate-200/80 shadow-sm min-w-[200px]">
                      <mat-icon class="!w-3 !h-3 !text-[12px]">lock</mat-icon> 
                      <span class="truncate">https://preview.low-code.io/asset-{{ activeDevice() }}</span>
                   </div>
                </div>
                <div class="flex items-center gap-3 text-app-text">
                  <mat-icon class="!w-4 !h-4 !text-[16px]">share</mat-icon>
                  <mat-icon class="!w-4 !h-4 !text-[16px]">more_vert</mat-icon>
                </div>
             </div>
             
             <div class="flex-grow overflow-auto relative h-full">
                @if (useIframe()) {
                   <iframe [srcdoc]="sanitizedHtml()" class="w-full h-full border-none" sandbox="allow-scripts allow-same-origin"></iframe>
                } @else {
                   <div [innerHTML]="sanitizedHtml()" class="w-full h-full p-0"></div>
                }
             </div>
          </div>
       </div>
    </div>

    <style>
      .bg-grid-pattern {
        background-image: 
          radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0);
        background-size: 24px 24px;
      }
    </style>
  `
})
export class PreviewComponent {
  private sanitizer = inject(DomSanitizer);
  
  @Input() set html(val: string) {
    this.htmlContent.set(val || '');
  }
  @Input() set css(val: string) {
    this.cssContent.set(val || '');
  }
  @Input() set device(val: string) {
    this.activeDevice.set(val);
  }
  
  htmlContent = signal<string>('');
  cssContent = signal<string>('');
  activeDevice = signal<string>('desktop');
  zoom = signal(0.75);
  sanitizedHtml = signal<SafeHtml>('');
  useIframe = signal<boolean>(true); 

  deviceWidth = computed(() => {
    switch(this.activeDevice()) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      default: return '1200px';
    }
  });
  
  constructor() {
    effect(() => {
      const content = this.htmlContent();
      const cssStyles = this.cssContent();
      const fullDoc = `
        <!DOCTYPE html>
        <html>
          <head>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
            <style>
              body { font-family: 'Inter', sans-serif; }
              /* Hide scrollbar but allow scrolling */
              ::-webkit-scrollbar { display: none; }
              body { -ms-overflow-style: none; scrollbar-width: none; }
              ${cssStyles}
            </style>
          </head>
          <body class="bg-transparent overflow-x-hidden">
            ${content}
          </body>
        </html>
      `;
      this.sanitizedHtml.set(this.sanitizer.bypassSecurityTrustHtml(fullDoc));
    }, { allowSignalWrites: true });
  }
}
