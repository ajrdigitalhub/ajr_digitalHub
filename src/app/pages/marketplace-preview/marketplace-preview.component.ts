import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
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
               <button class="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow hover:bg-indigo-500 transition-colors flex items-center gap-2">
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
         @if(item()?.html_content) {
            <iframe [srcdoc]="sanitizedHtml()" class="w-full h-full border-none" sandbox="allow-scripts allow-same-origin"></iframe>
         }
       </main>
    </div>
  `
})
export class MarketplacePreviewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private apiService = inject(ApiService);
  private sanitizer = inject(DomSanitizer);
  
  item = signal<any>(null);
  sanitizedHtml = signal<SafeHtml>('');
  isLoading = signal(true);
  
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
       this.apiService.get('/marketplace-items/' + id).subscribe({
         next: (res: any) => {
           this.item.set(res);
           this.sanitizedHtml.set(this.sanitizer.bypassSecurityTrustHtml(res.html_content || ''));
           this.isLoading.set(false);
         },
         error: () => {
           this.isLoading.set(false);
         }
       });
    }
  }
}
