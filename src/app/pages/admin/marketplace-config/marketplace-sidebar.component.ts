import { Component, Output, EventEmitter, Input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';

export interface BuilderTemplate {
  id: string;
  name: string;
  category: string;
  html: string;
  thumbnail: string;
}

@Component({
  selector: 'app-marketplace-sidebar',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-app-card border-r border-[#242424] overflow-hidden">
      <!-- Tabs header section -->
      <div class="flex border-b border-app-border shrink-0 bg-app-bg/50">
        <button 
          (click)="activeTab.set('templates')" 
          [class]="activeTab() === 'templates' ? 'border-indigo-500 text-indigo-400 font-black bg-app-card' : 'border-transparent text-app-muted hover:text-app-text hover:bg-app-card/30'"
          class="flex-1 py-3 text-center text-xs uppercase tracking-wider font-extrabold border-b-2 transition-all cursor-pointer">
          Templates
        </button>
        <button 
          (click)="activeTab.set('settings')" 
          [class]="activeTab() === 'settings' ? 'border-indigo-500 text-indigo-400 font-black bg-app-card' : 'border-transparent text-app-muted hover:text-app-text hover:bg-app-card/30'"
          class="flex-1 py-3 text-center text-xs uppercase tracking-wider font-extrabold border-b-2 transition-all cursor-pointer">
          Meta Settings
        </button>
      </div>
      
      <!-- Template Library -->
      @if (activeTab() === 'templates') {
        <div class="p-2 shrink-0 flex gap-1.5 overflow-x-auto no-scrollbar border-b border-app-border">
          @for (cat of categories; track cat) {
            <button 
              (click)="selectedCategory.set(cat)"
              [class]="selectedCategory() === cat ? 'bg-indigo-600 text-white font-extrabold' : 'bg-app-bg text-app-muted hover:text-app-text'"
              class="px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer">
              {{ cat }}
            </button>
          }
        </div>

        <div class="flex-grow overflow-y-auto p-3 space-y-4 custom-scrollbar">
          @for (template of filteredTemplates(); track template.id) {
            <div class="group relative bg-app-bg border border-app-border rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all cursor-pointer"
                 (click)="selectTemplate.emit(template)">
              <div class="aspect-video bg-app-card flex items-center justify-center relative overflow-hidden">
                 <div class="scale-50 opacity-50 group-hover:opacity-100 group-hover:scale-75 transition-all duration-500" [innerHTML]="template.html"></div>
                 <div class="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/20 transition-all flex items-center justify-center">
                    <mat-icon class="text-app-text opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">add_circle</mat-icon>
                 </div>
              </div>
              <div class="p-2 text-center border-t border-app-border">
                 <span class="text-[10px] font-bold text-app-text uppercase">{{ template.name }}</span>
              </div>
            </div>
          }
        </div>
      }

      <!-- Page details & Asset Settings -->
      @if (activeTab() === 'settings' && activeItem) {
        <div class="flex-grow overflow-y-auto p-4 space-y-5 custom-scrollbar">
          <!-- Description -->
          <div class="space-y-1.5">
            <label class="text-[9px] font-black text-app-muted uppercase tracking-widest block">Description</label>
            <textarea 
              [value]="activeItem.description || ''"
              (input)="updateField('description', $any($event.target).value)"
              rows="4"
              class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs font-semibold text-app-text outline-none focus:ring-1 focus:ring-indigo-500/50 placeholder:text-app-muted/30 resize-none"
              placeholder="Enter asset description..."></textarea>
          </div>

          <!-- Status Dropdown -->
          <div class="space-y-1.5">
            <label class="text-[9px] font-black text-app-muted uppercase tracking-widest block">Status</label>
            <select
              [value]="activeItem.status || 'active'"
              (change)="updateField('status', $any($event.target).value)"
              class="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs font-extrabold text-app-text outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <!-- Image Upload Option -->
          <div class="space-y-2 pt-2 border-t border-app-border/40">
            <label class="text-[9px] font-black text-app-muted uppercase tracking-widest block font-sans">Thumbnail Image</label>
            
            @if (activeItem.image || activeItem.image_url) {
              <div class="relative rounded-xl overflow-hidden aspect-video bg-[#111] border border-app-border group">
                <img [src]="activeItem.image || activeItem.image_url" alt="Asset Thumbnail Preview" class="w-full h-full object-cover" referrerpolicy="no-referrer" />
                <div class="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                  <button type="button" (click)="fileInput.click()" class="px-2.5 py-1 bg-indigo-600 text-app-text rounded-lg text-[10px] font-black uppercase tracking-wider hover:scale-105 transition-transform cursor-pointer">Replace</button>
                  <button type="button" (click)="removeImage()" class="px-2.5 py-1 bg-rose-600 text-app-text rounded-lg text-[10px] font-black uppercase tracking-wider hover:scale-105 transition-transform cursor-pointer">Remove</button>
                </div>
              </div>
            } @else {
              <div (click)="fileInput.click()" class="border-2 border-dashed border-app-border hover:border-indigo-500/40 rounded-xl p-5 text-center cursor-pointer transition-colors duration-200 bg-app-bg/20 group">
                <mat-icon class="text-app-muted mx-auto mb-1 text-xl group-hover:text-indigo-400 transition-colors">cloud_upload</mat-icon>
                <span class="text-[10px] font-black uppercase tracking-wider text-app-muted block">Upload Thumbnail</span>
              </div>
            }
            @if (isUploading()) {
              <div class="flex items-center gap-1.5 text-[10px] text-indigo-400 font-extrabold uppercase mt-1">
                <mat-icon class="animate-spin !w-3 !h-3 !text-[12px]">refresh</mat-icon>
                Syncing Upload...
              </div>
            }
            <input #fileInput type="file" accept="image/*" class="hidden" (change)="onImageSelected($event)" />
          </div>
        </div>
      }
    </div>
  `
})
export class MarketplaceSidebarComponent {
  private apiService = inject(ApiService);

  @Input() activeItem: any = null;
  @Output() activeItemChange = new EventEmitter<any>();
  @Output() selectTemplate = new EventEmitter<BuilderTemplate>();

  activeTab = signal<'templates' | 'settings'>('templates');
  categories = ['All', 'Hero', 'Cards', 'Pricing', 'Content'];
  selectedCategory = signal('All');
  isUploading = signal(false);

  onImageSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.isUploading.set(true);
    this.apiService.uploadImage(file).subscribe({
      next: (res) => {
        this.isUploading.set(false);
        const item = { ...this.activeItem, image: res.url, image_url: res.url };
        this.activeItemChange.emit(item);
      },
      error: (err) => {
        this.isUploading.set(false);
        console.error('Image upload failed', err);
      }
    });
  }

  removeImage() {
    const item = { ...this.activeItem, image: '', image_url: '' };
    this.activeItemChange.emit(item);
  }

  updateField(field: string, value: any) {
    const item = { ...this.activeItem, [field]: value };
    this.activeItemChange.emit(item);
  }

  templates: BuilderTemplate[] = [
    {
      id: 'hero-modern',
      name: 'Modern Hero',
      category: 'Hero',
      thumbnail: '',
      html: `
<section class="py-20 px-6 bg-app-card overflow-hidden relative">
  <div class="max-w-4xl mx-auto text-center relative z-10">
    <h1 class="text-5xl font-black text-app-text mb-6 leading-tight">Build the Future of <span class="bg-gradient-to-r from-cyan-400 to-indigo-500 bg-clip-text text-transparent">Digital Assets</span></h1>
    <p class="text-app-muted text-lg mb-10 max-w-2xl mx-auto">Deploy high-performance dynamic UI blocks globally with our new low-code orchestration engine.</p>
    <div class="flex flex-wrap justify-center gap-4">
      <button class="bg-indigo-600 text-app-text px-8 py-3 rounded-full font-bold shadow-lg shadow-indigo-500/20">Get Started</button>
      <button class="bg-white/10 text-app-text px-8 py-3 rounded-full font-bold backdrop-blur-md">Documentation</button>
    </div>
  </div>
  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[120px] -z-0"></div>
</section>`
    },
    {
      id: 'pricing-grid',
      name: 'Glass Pricing',
      category: 'Pricing',
      thumbnail: '',
      html: `
<div class="py-12 px-6 bg-slate-50 flex justify-center items-center">
  <div class="max-w-sm w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl">
    <div class="text-indigo-600 font-black text-xs uppercase tracking-widest mb-2">Professional</div>
    <div class="text-4xl font-black text-slate-900 mb-6">$49<span class="text-sm font-medium text-app-muted">/mo</span></div>
    <ul class="space-y-4 mb-8">
      <li class="flex items-center gap-2 text-sm text-app-muted"><span class="text-emerald-500">✓</span> Unlimited Projects</li>
      <li class="flex items-center gap-2 text-sm text-app-muted"><span class="text-emerald-500">✓</span> Priority Support</li>
      <li class="flex items-center gap-2 text-sm text-app-muted"><span class="text-emerald-500">✓</span> Advanced Analytics</li>
    </ul>
    <button class="w-full bg-app-card text-app-text py-3 rounded-2xl font-bold hover:bg-slate-800 transition-colors">Start Free Trial</button>
  </div>
</div>`
    },
    {
       id: 'asset-card',
       name: 'Asset Card',
       category: 'Cards',
       thumbnail: '',
       html: `
<div class="max-w-xs bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-lg group">
  <img src="https://picsum.photos/400/300" class="w-full h-40 object-cover grayscale group-hover:grayscale-0 transition-all duration-700">
  <div class="p-6">
    <h3 class="font-black text-slate-900 text-lg mb-2">Lumina Dashboard</h3>
    <p class="text-app-muted text-sm mb-4 leading-relaxed">A specialized dashboard for neural network visualization metrics.</p>
    <div class="flex items-center justify-between">
      <span class="text-indigo-600 font-black">$29.00</span>
      <button class="bg-indigo-50 text-indigo-600 px-4 py-1 rounded-full text-xs font-bold uppercase">View Details</button>
    </div>
  </div>
</div>`
    }
  ];

  filteredTemplates = () => {
    if (this.selectedCategory() === 'All') return this.templates;
    return this.templates.filter(t => t.category === this.selectedCategory());
  };
}
