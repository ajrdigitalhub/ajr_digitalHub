import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  backgroundImage?: string;
  buttonText: string;
  buttonLink: string;
  overlayGradient: string;
  animationType: 'fade' | 'slide' | 'zoom';
  isActive: boolean;
}

@Component({
  selector: 'app-hero-slider-config',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Top Actions Bar -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-app-card border border-app-border rounded-2xl p-6 shadow-sm">
        <div>
          <h2 class="text-2xl font-black text-app-text tracking-tight uppercase leading-none flex items-center gap-2">
            <mat-icon class="text-indigo-500">slideshow</mat-icon> Hero Slider Configuration
          </h2>
          <p class="text-xs text-app-muted font-medium mt-2">Manage, reorder, and configure dynamic website banner slides.</p>
        </div>
        
        <div class="flex items-center gap-3">
          <button (click)="addSlide()" class="px-5 py-2.5 bg-[#222] hover:bg-[#2e2e2e] text-white border border-white/5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer">
            <mat-icon class="!w-4 !h-4 !text-[16px]">add_circle</mat-icon> Add Slide
          </button>
          
          <button (click)="saveAll()" [disabled]="isSaving()" class="px-6 py-2.5 bg-indigo-600 hover:scale-105 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-600/20 disabled:opacity-50">
            @if (isSaving()) {
              <mat-icon class="animate-spin !w-4 !h-4 !text-[16px]">refresh</mat-icon> Saving...
            } @else {
              <mat-icon class="!w-4 !h-4 !text-[16px]">cloud_sync</mat-icon> Synchronize CMS
            }
          </button>
        </div>
      </div>

      <!-- Main Columns -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <!-- Left slides list column (7 cols) -->
        <div class="lg:col-span-7 space-y-6">
          <div class="bg-app-card border border-app-border rounded-3xl p-6 shadow-sm">
            <h3 class="text-xs font-black uppercase tracking-widest text-[#a1a1a1] mb-6 flex items-center gap-1.5">
              <mat-icon class="!w-4 !h-4 !text-[16px]">list</mat-icon> Slides Index 
              <span class="text-indigo-400 font-mono">({{ slides().length }} slides total)</span>
            </h3>

            @if (slides().length === 0) {
              <div class="text-center py-16 border-2 border-dashed border-app-border/50 rounded-2xl bg-app-bg/10">
                <mat-icon class="text-app-muted text-4xl mb-3">broken_image</mat-icon>
                <p class="text-xs text-app-muted font-bold">No slides configured. Click Add Slide to start!</p>
              </div>
            }

            <div class="space-y-4">
              @for (slide of slides(); track slide.id; let idx = $index) {
                <div [class.border-indigo-500]="activeSlideIndex() === idx" [class.bg-indigo-500/5]="activeSlideIndex() === idx" class="bg-app-bg border border-app-border rounded-2xl p-5 hover:border-app-border-hover transition-all duration-200">
                  
                  <!-- Title bar representation -->
                  <div class="flex items-center justify-between border-b border-app-border/50 pb-3 mb-4 cursor-pointer" (click)="activeSlideIndex.set(idx)">
                    <div class="flex items-center gap-3">
                      <!-- Badge indicating numbering and active state -->
                      <span class="w-6 h-6 rounded-full bg-app-card text-[11px] font-black font-mono flex items-center justify-center border border-app-border text-app-text">
                        {{ idx + 1 }}
                      </span>
                      <span class="text-xs font-black text-app-text">{{ slide.title || 'Untitled Banner Slide' }}</span>
                      @if (!slide.isActive) {
                        <span class="text-[8px] bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full font-black uppercase">Draft</span>
                      }
                    </div>

                    <!-- Slide Reordering & Delete controls -->
                    <div class="flex items-center gap-1">
                      <!-- Move Up -->
                      <button (click)="moveSlide(idx, -1); $event.stopPropagation()" [disabled]="idx === 0" class="p-1 text-app-muted hover:text-white rounded hover:bg-white/5 cursor-pointer disabled:opacity-20">
                        <mat-icon class="!w-4 !h-4 !text-[16px]">arrow_upward</mat-icon>
                      </button>
                      <!-- Move Down -->
                      <button (click)="moveSlide(idx, 1); $event.stopPropagation()" [disabled]="idx === slides().length - 1" class="p-1 text-app-muted hover:text-white rounded hover:bg-white/5 cursor-pointer disabled:opacity-20">
                        <mat-icon class="!w-4 !h-4 !text-[16px]">arrow_downward</mat-icon>
                      </button>
                      <div class="w-px h-4 bg-app-border/40 mx-1"></div>
                      <!-- Delete slide -->
                      <button (click)="deleteSlide(idx); $event.stopPropagation()" class="p-1 text-rose-500 hover:text-white rounded hover:bg-rose-600/25 cursor-pointer">
                        <mat-icon class="!w-4 !h-4 !text-[16px]">delete</mat-icon>
                      </button>
                    </div>
                  </div>

                  <!-- Details and form controls (only editable when active slide index matches) -->
                  @if (activeSlideIndex() === idx) {
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-300">
                      
                      <!-- Slide Titles -->
                      <div class="space-y-1">
                        <label class="text-[9px] font-black uppercase tracking-wider text-app-muted">Title text</label>
                        <input type="text" [(ngModel)]="slide.title" class="w-full px-3 py-2 bg-app-card border border-app-border rounded-xl text-xs font-semibold text-app-text outline-none focus:ring-1 focus:ring-indigo-500/50">
                      </div>

                      <div class="space-y-1">
                        <label class="text-[9px] font-black uppercase tracking-wider text-app-muted">Subtitle Tag</label>
                        <input type="text" [(ngModel)]="slide.subtitle" class="w-full px-3 py-2 bg-app-card border border-app-border rounded-xl text-xs font-semibold text-app-text outline-none focus:ring-1 focus:ring-indigo-500/50">
                      </div>

                      <!-- Subtext Description -->
                      <div class="sm:col-span-2 space-y-1">
                        <label class="text-[9px] font-black uppercase tracking-wider text-app-muted">Description Description</label>
                        <textarea [(ngModel)]="slide.description" rows="2" class="w-full px-3 py-2 bg-app-card border border-app-border rounded-xl text-xs font-semibold text-app-text outline-none focus:ring-1 focus:ring-indigo-500/50 placeholder:text-app-muted/30 resize-none"></textarea>
                      </div>

                      <!-- Bullet parameters -->
                      <div class="space-y-1">
                        <label class="text-[9px] font-black uppercase tracking-wider text-app-muted">Button Link text</label>
                        <input type="text" [(ngModel)]="slide.buttonText" class="w-full px-3 py-2 bg-app-card border border-app-border rounded-xl text-xs font-semibold text-app-text outline-none focus:ring-1 focus:ring-indigo-500/50">
                      </div>

                      <div class="space-y-1">
                        <label class="text-[9px] font-black uppercase tracking-wider text-app-muted">Button Link URL</label>
                        <input type="text" [(ngModel)]="slide.buttonLink" class="w-full px-3 py-2 bg-app-card border border-app-border rounded-xl text-xs font-semibold text-app-text outline-none focus:ring-1 focus:ring-indigo-500/50">
                      </div>

                      <!-- Transitions & Overlay gradients -->
                      <div class="space-y-1">
                        <label class="text-[9px] font-black uppercase tracking-wider text-app-muted">Transition animation</label>
                        <select [(ngModel)]="slide.animationType" class="w-full px-3 py-2 bg-app-card border border-app-border rounded-xl text-xs font-extrabold text-app-text outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer">
                          <option value="fade">Fade Transition</option>
                          <option value="slide">Slide Transition</option>
                          <option value="zoom">Zoom Scale Transition</option>
                        </select>
                      </div>

                      <div class="space-y-1">
                        <label class="text-[9px] font-black uppercase tracking-wider text-app-muted">Overlay Gradient CSS</label>
                        <input type="text" [(ngModel)]="slide.overlayGradient" class="w-full px-3 py-2 bg-app-card border border-app-border rounded-xl text-xs font-bold text-app-text outline-none focus:ring-1 focus:ring-indigo-500/50">
                      </div>

                      <!-- Active state & Image Upload row -->
                      <div class="sm:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-4 border-t border-app-border/40 mt-2">
                        
                        <!-- Toggle Switch -->
                        <div class="flex items-center justify-between bg-app-card/45 rounded-xl px-4 py-2.5 border border-app-border">
                          <div>
                            <span class="text-[10px] font-black text-app-text block uppercase leading-none">Slide Active</span>
                            <span class="text-[8px] text-app-muted mt-1 block">Enable dynamically on Landing Page.</span>
                          </div>
                          <div class="flex items-center">
                            <input type="checkbox" [(ngModel)]="slide.isActive" class="w-4 h-4 text-indigo-600 border-app-border rounded cursor-pointer">
                          </div>
                        </div>

                        <!-- Image File input uploader -->
                        <div class="flex items-center gap-3">
                          @if (slide.image) {
                            <div class="w-12 h-12 bg-black rounded-lg border border-app-border overflow-hidden shrink-0">
                              <img [src]="slide.image" alt="Background preview" class="w-full h-full object-cover" referrerpolicy="no-referrer" />
                            </div>
                          } @else {
                            <div class="w-12 h-12 bg-app-card rounded-lg border border-app-border border-dashed flex items-center justify-center text-app-muted shrink-0">
                              <mat-icon class="text-sm">photo</mat-icon>
                            </div>
                          }

                          <div class="flex flex-col flex-grow">
                            <button type="button" (click)="fileInput.click()" class="px-3 py-1.5 bg-[#252528] border border-white/5 rounded-lg text-[10px] font-black uppercase tracking-wider text-white hover:bg-[#333] cursor-pointer transition-colors max-w-min whitespace-nowrap">
                              Upload Background
                            </button>
                            <input #fileInput type="file" accept="image/*" class="hidden" (change)="uploadSlideImage($event, idx)" />
                          </div>
                        </div>

                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Right Preview column (5 cols) -->
        <div class="lg:col-span-5 space-y-6">
          <div class="bg-[#111] border border-app-border rounded-3xl p-6 shadow-sm overflow-hidden relative top-24 sticky">
            <h3 class="text-xs font-black uppercase tracking-widest text-indigo-400 mb-6 flex items-center gap-1.5">
              <mat-icon class="!w-4 !h-4 !text-[16px]">visibility</mat-icon> Active Slide Live Simulation
            </h3>

            <!-- Simulated device viewport frame -->
            <div class="border border-white/10 rounded-2xl overflow-hidden aspect-video relative group select-none shadow-2xl bg-slate-950">
              
              <!-- Gradient Mask from Active Slide settings -->
              @if (currentActiveSlide()) {
                <div class="absolute inset-0 bg-cover bg-center duration-1000 transition-transform origin-center"
                     [style.backgroundImage]="'url(' + currentActiveSlide()!.image + ')'"
                     [class.scale-105]="currentActiveSlide()!.animationType === 'zoom'"
                     [class.translate-x-3]="currentActiveSlide()!.animationType === 'slide'">
                </div>
                
                <!-- Dynamic Overlay representation -->
                <div class="absolute inset-0 bg-gradient-to-r"
                     [class]="currentActiveSlide()!.overlayGradient || 'from-slate-950 via-slate-900/60 to-slate-950'">
                </div>

                <!-- Slide details -->
                <div class="absolute inset-0 flex flex-col justify-end p-5 select-none z-10">
                  <span class="text-[8px] bg-indigo-600/80 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest max-w-min mb-1 select-none">
                    {{ currentActiveSlide()!.subtitle || 'CORE CLUSTER' }}
                  </span>
                  
                  <h4 class="text-sm font-black text-white leading-tight mb-1 font-sans select-none tracking-tight">
                    {{ currentActiveSlide()!.title }}
                  </h4>
                  
                  <p class="text-[9px] text-[#bcbcbc] font-medium leading-normal mb-3 line-clamp-1 max-w-sm select-none">
                    {{ currentActiveSlide()!.description }}
                  </p>

                  <div class="flex items-center gap-2">
                    <button class="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[8px] px-3.5 py-1.5 rounded-lg uppercase tracking-wider flex items-center gap-1">
                      {{ currentActiveSlide()!.buttonText }}
                      <mat-icon class="!w-2 !h-2 !text-[8px] flex items-center justify-center">arrow_forward</mat-icon>
                    </button>
                    
                    <span class="text-[8px] text-app-muted uppercase font-black font-mono">Animation: {{ currentActiveSlide()!.animationType }}</span>
                  </div>
                </div>
              } @else {
                <div class="absolute inset-0 flex flex-col items-center justify-center text-app-muted gap-2">
                  <mat-icon class="text-4xl animate-pulse">panorama</mat-icon>
                  <span class="text-[10px] uppercase font-black tracking-widest">No active slide Selected</span>
                </div>
              }
            </div>

            <!-- Simulation Controls -->
            <div class="flex items-center justify-between border-t border-white/5 pt-4 mt-6">
              <span class="text-[10px] font-bold text-app-muted block uppercase">CMS Auto-Saving State</span>
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span class="text-[10px] font-bold text-emerald-400 font-mono">STANDBY</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class HeroSliderConfigComponent implements OnInit {
  private apiService = inject(ApiService);
  private toastService = inject(ToastService);

  slides = signal<HeroSlide[]>([]);
  activeSlideIndex = signal<number>(0);
  isSaving = signal(false);

  currentActiveSlide = computed(() => {
    const list = this.slides();
    const idx = this.activeSlideIndex();
    if (list.length > 0 && idx >= 0 && idx < list.length) {
      return list[idx];
    }
    return list[0] || null;
  });

  ngOnInit() {
    this.loadSlider();
  }

  loadSlider() {
    this.isSaving.set(true);
    this.apiService.get('/settings/hero-slider').subscribe({
      next: (res: any) => {
        // Doc settings wrapper or directly array
        const rawSlides = res?.slides || res?.data?.slides || [];
        this.slides.set(rawSlides);
        this.isSaving.set(false);
      },
      error: (err) => {
        this.toastService.error('Failed to load hero slider settings.');
        this.isSaving.set(false);
      }
    });
  }

  addSlide() {
    const defaultSlide: HeroSlide = {
      id: 'slide_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: 'Deploy High Performance Clusters',
      subtitle: 'CMS Dynamic Banner',
      description: 'Accelerate your cloud assets natively with fully custom responsive content modules built and optimized on our visual pipeline.',
      image: 'https://picsum.photos/seed/slide' + (this.slides().length + 1) + '/1920/1080',
      buttonText: 'Get Started Now',
      buttonLink: '/marketplace',
      overlayGradient: 'from-slate-950 via-slate-900/50 to-slate-950',
      animationType: 'fade',
      isActive: true
    };

    this.slides.update(list => [...list, defaultSlide]);
    this.activeSlideIndex.set(this.slides().length - 1);
    this.toastService.info('New slide added. Configure it and click Synchronize CRM to save.');
  }

  deleteSlide(idx: number) {
    if (confirm('Delete this slider banner slide item?')) {
      this.slides.update(list => list.filter((_, i) => i !== idx));
      const nextIdx = Math.max(0, idx - 1);
      this.activeSlideIndex.set(this.slides().length > 0 ? nextIdx : 0);
      this.toastService.warning('Slide removed. Sync to apply changes on database.');
    }
  }

  moveSlide(idx: number, direction: number) {
    const targetIdx = idx + direction;
    const list = [...this.slides()];
    if (targetIdx < 0 || targetIdx >= list.length) return;

    // Swap items
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;

    this.slides.set(list);
    this.activeSlideIndex.set(targetIdx);
  }

  uploadSlideImage(event: any, idx: number) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.isSaving.set(true);
    this.apiService.uploadImage(file).subscribe({
      next: (res) => {
        this.slides.update(list => {
          const updated = [...list];
          updated[idx] = {
            ...updated[idx],
            image: res.url,
            backgroundImage: res.url
          };
          return updated;
        });
        this.isSaving.set(false);
        this.toastService.success('Slide background uploaded successfully!');
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toastService.error('Background upload failed.');
      }
    });
  }

  saveAll() {
    this.isSaving.set(true);
    // Explicit array wrap inside slides object
    this.apiService.put('/admin/hero-slider', { slides: this.slides() }).subscribe({
      next: (res: any) => {
        this.isSaving.set(false);
        this.toastService.success('Hero slider configuration synchronized successfully!');
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toastService.error('Synchronization of hero slider config failed.');
      }
    });
  }
}
