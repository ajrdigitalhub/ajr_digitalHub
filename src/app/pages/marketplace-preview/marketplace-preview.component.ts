import { Component, inject, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-marketplace-preview-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="h-screen w-screen flex flex-col bg-app-bg text-app-text overflow-hidden">
       <!-- Header -->
       <header class="h-14 bg-app-card border-b border-app-border flex items-center justify-between px-4 shrink-0">
          <div class="flex items-center gap-4">
             <a routerLink="/marketplace" class="text-app-muted hover:text-indigo-400 transition-colors flex items-center gap-1 text-sm font-bold">
                <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">arrow_back</mat-icon> Back to Marketplace
             </a>
             <div class="w-px h-6 bg-app-border mx-2"></div>
             @if(item()) {
                <h1 class="font-bold text-sm">{{ item()?.title }}</h1>
                <span class="bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded text-xs font-bold font-mono">\${{ item()?.price }}</span>
             } @else {
                <span class="text-sm text-app-muted">Loading preview...</span>
             }
          </div>
          <div class="flex items-center gap-3">
             @if(item()) {
                <button class="bg-indigo-600 text-app-text px-4 py-1.5 rounded-lg text-sm font-bold shadow hover:bg-indigo-500 transition-colors flex items-center gap-2">
                  <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">shopping_cart</mat-icon> Purchase
                </button>
             }
          </div>
       </header>
       
       <!-- Content -->
       <main class="flex-grow relative bg-white">
          @if(isLoading()) {
             <div class="absolute inset-0 flex items-center justify-center text-gray-400 font-medium">Getting preview ready...</div>
          }
          <iframe #previewIframe class="w-full h-full border-none" [class.hidden]="isLoading()" sandbox="allow-scripts allow-same-origin"></iframe>
       </main>
    </div>
  `
})
export class MarketplacePreviewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private apiService = inject(ApiService);

  @ViewChild('previewIframe', { static: false }) iframeRef!: ElementRef<HTMLIFrameElement>;
  
  item = signal<any>(null);
  isLoading = signal(true);
  
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
       this.apiService.get('/marketplace-items/' + id).subscribe({
          next: (res: any) => {
            const itemData = res?.data || res;
            this.item.set(itemData);
            this.isLoading.set(false);

            // Wait for ViewChild to be resolved and write contents to iframe
            setTimeout(() => {
              this.updateIframe();
            }, 0);
          },
          error: () => {
            this.isLoading.set(false);
          }
       });
    }
  }

  updateIframe() {
    const iframe = this.iframeRef?.nativeElement;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    const itemData = this.item();
    const html = itemData?.html_content || itemData?.html || '';
    const css = itemData?.css_content || itemData?.css || '';
    const js = itemData?.js || '';

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; }
            /* Hide scrollbar but allow scrolling */
            ::-webkit-scrollbar { display: none; }
            body { -ms-overflow-style: none; scrollbar-width: none; }
            ${css}
          </style>
        </head>
        <body class="bg-transparent overflow-x-hidden">
          ${html}
          ${js ? `<script>${js}</script>` : ''}
        </body>
      </html>
    `);
    doc.close();
  }
}
