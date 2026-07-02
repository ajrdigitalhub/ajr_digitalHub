import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-landing-page-builder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Top Title Bar -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-app-border pb-5">
        <div>
          <h2 class="text-2xl font-black text-app-text flex items-center gap-2">
            <mat-icon class="text-purple-500">web</mat-icon>
            Landing Page Builder
          </h2>
          <p class="text-xs text-app-muted mt-1">Design responsive high-converting pages, configure search engine parameters, and map domains.</p>
        </div>

        <button (click)="createPage()" class="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-app-text rounded-xl text-xs font-bold transition-all cursor-pointer">
          <mat-icon class="text-xs w-4 h-4 leading-none">add</mat-icon>
          Create Landing Page
        </button>
      </div>

      <!-- Main Visual Workspace Split -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Center/Left visual list of templates (2 cols) -->
        <div class="lg:col-span-2 bg-app-card border border-app-border rounded-2xl p-5 space-y-4">
          <h3 class="text-xs font-extrabold text-app-text uppercase tracking-wider">Visual Page Templates</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @for (page of pages(); track page.id) {
              <div class="bg-app-bg border border-app-border rounded-2xl overflow-hidden hover:border-purple-500/50 shadow-sm transition-all group">
                <div class="h-32 bg-app-card flex items-center justify-center text-app-muted relative">
                  <mat-icon class="text-3xl">pageview</mat-icon>
                  <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all">
                    <button (click)="editTemplate(page)" class="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-app-text rounded-lg text-[10px] font-bold cursor-pointer transition-colors">Edit Visuals</button>
                    <a [href]="'http://' + page.domain" target="_blank" class="px-2.5 py-1 bg-app-card hover:bg-app-bg text-app-text border border-app-border rounded-lg text-[10px] font-bold cursor-pointer transition-colors">Preview</a>
                  </div>
                </div>
                <div class="p-4 flex justify-between items-center bg-app-card">
                  <div>
                    <h4 class="text-xs font-bold text-app-text">{{ page.title }}</h4>
                    <span class="text-[9px] text-app-muted font-mono block mt-1">Domain: {{ page.domain }}</span>
                  </div>
                  <span [ngClass]="page.abTest ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' : 'text-app-muted bg-app-bg border-app-border'" class="inline-flex px-1.5 py-0.5 rounded border text-[8px] font-bold uppercase">
                    {{ page.abTest ? 'A/B Testing' : 'Standard' }}
                  </span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Right Column: SEO & Domain configurations (1 col) -->
        <div class="space-y-6">
          <div class="bg-app-card border border-app-border rounded-2xl p-5 space-y-4">
            <h3 class="text-xs font-extrabold text-app-text uppercase tracking-wider">SEO & Domain Mapping</h3>
            
            <div class="space-y-3">
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-app-muted mb-1">SEO Title Tag</label>
                <input type="text" [(ngModel)]="seoTitle" class="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-app-text outline-none focus:border-purple-500 placeholder:text-app-muted" placeholder="e.g. Best SaaS Builder Pack">
              </div>
              
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-app-muted mb-1">Meta Description</label>
                <textarea rows="3" [(ngModel)]="seoDesc" class="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-app-text outline-none focus:border-purple-500 placeholder:text-app-muted" placeholder="Write description..."></textarea>
              </div>

              <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-app-muted mb-1">Custom Domain Name</label>
                <input type="text" [(ngModel)]="customDomain" class="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-app-text outline-none focus:border-purple-500 placeholder:text-app-muted" placeholder="e.g. promo.mybrand.com">
              </div>

              <div class="flex items-center justify-between pt-2">
                <span class="text-xs font-bold text-app-text">Enable A/B split traffic testing</span>
                <input type="checkbox" [(ngModel)]="abTestEnabled" class="h-4 w-4 rounded border-app-border text-purple-600 focus:ring-purple-500 cursor-pointer">
              </div>

              <button (click)="saveConfigurations()" class="w-full mt-2 py-2 bg-purple-600 hover:bg-purple-700 text-app-text rounded-xl text-xs font-bold transition-all cursor-pointer">
                Save Configurations
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  `
})
export class LandingPageBuilder {
  pages = signal([
    { id: 'page-1', title: 'SaaS Form Builder Promo', domain: 'promo.ajr.digital', abTest: true },
    { id: 'page-2', title: 'Invoicing Suite Offer', domain: 'offer.invoice.hub', abTest: false }
  ]);

  seoTitle = 'AJR FormBuilder | Fast Responsive SaaS Forms';
  seoDesc = 'Deploy enterprise-grade responsive form suites on PostgreSQL within minutes. Free trial signup.';
  customDomain = 'promo.ajr.digital';
  abTestEnabled = true;

  createPage() {
    const num = this.pages().length + 1;
    this.pages.update(list => [
      ...list,
      { id: `page-${Date.now()}`, title: `Landing Block Template #${num}`, domain: `promo-${num}.ajr.internal`, abTest: false }
    ]);
  }

  editTemplate(page: any) {
    alert(`Visual Page templates editor active for: ${page.title}`);
  }

  saveConfigurations() {
    alert(`Configuration updated!\nDomain: ${this.customDomain}\nSEO Title: ${this.seoTitle}`);
  }
}
