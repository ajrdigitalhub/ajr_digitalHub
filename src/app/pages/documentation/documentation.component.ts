import { Component, OnInit, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { TopNavComponent } from '../../shared/top-nav.component';

export interface DocPage {
  id: string;
  slug: string;
  title: string;
  category: string;
  overview: string;
  purpose?: string;
  features?: string[];
  benefits?: string[];
  business_use_cases?: string[];
  setup_guide?: string;
  config_guide?: string;
  pricing_details?: { basePrice: number; freeTier: number; excessRate: number };
  billing_explanation?: string;
  security_recommendations?: string[];
  performance_tips?: string[];
  faqs?: { q: string; a: string }[];
  common_errors?: { code: string; desc: string; resolution: string }[];
  best_practices?: string[];
  related_products?: string[];
  external_references?: { name: string; url: string }[];
  status?: string;
  views?: number;
  likes?: number;
  dislikes?: number;
  updated_at?: string;
}

@Component({
  selector: 'app-documentation',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink, TopNavComponent],
  templateUrl: './documentation.component.html',
  styleUrl: './documentation.component.scss'
})
export class DocumentationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  authService = inject(AuthService);

  categories = [
    'All', 
    'Getting Started', 
    'Marketplace', 
    'WhatsApp Marketing', 
    'Google Ads', 
    'Meta Ads', 
    'Firebase', 
    'CRM', 
    'Form Builder', 
    'Invoice Generator', 
    'Billing & Subscription', 
    'Analytics', 
    'Provision App', 
    'Admin Guide', 
    'API Documentation'
  ];

  selectedCategory = signal<string>('All');
  searchQuery = signal<string>('');
  autocompleteResults = signal<any[]>([]);
  showAutocomplete = signal<boolean>(false);

  allPages = signal<DocPage[]>([]);
  activeSlug = signal<string | null>(null);
  activePage = signal<DocPage | null>(null);
  loading = signal<boolean>(false);
  submittingFeedback = signal<boolean>(false);
  feedbackSubmitted = signal<boolean>(false);

  // User details
  recentHistory = signal<any[]>([]);
  bookmarkedPages = signal<any[]>([]);
  isBookmarked = signal<boolean>(false);

  // Interactive Quota Calculator
  calcWa = 0;
  calcAds = 0;
  calcFb = 0;

  // Active section for ScrollSpy
  activeTocSection = signal<string>('overview');

  // Reading progress scroll percent
  scrollPercent = signal<number>(0);

  // Estimating reading time
  readingTime = computed(() => {
    const page = this.activePage();
    if (!page) return 1;
    const text = `${page.overview} ${page.purpose} ${page.setup_guide} ${page.config_guide}`;
    const wordCount = text.split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / 200)); // Average 200 WPM
  });

  filteredPages = computed(() => {
    let pages = this.allPages();
    const cat = this.selectedCategory();
    if (cat !== 'All') {
      pages = pages.filter(p => p.category.toLowerCase() === cat.toLowerCase());
    }
    return pages;
  });

  // Pages grouped by category for tree layout
  groupedPages = computed(() => {
    const groups: { [key: string]: DocPage[] } = {};
    for (const page of this.allPages()) {
      if (!groups[page.category]) {
        groups[page.category] = [];
      }
      groups[page.category].push(page);
    }
    return groups;
  });

  totalEstimate = computed(() => {
    const waCount = Number(this.calcWa) || 0;
    const adsSpend = Number(this.calcAds) || 0;
    const fbCount = Number(this.calcFb) || 0;

    const baseSubscription = 1500;
    const excessWaCharge = Math.max(0, waCount - 100) * 0.8;
    const excessFbCharge = Math.max(0, fbCount - 10000) * 0.02;

    const subtotal = baseSubscription + excessWaCharge + adsSpend + excessFbCharge;
    const gst = subtotal * 0.18;
    return subtotal + gst;
  });

  ngOnInit() {
    this.loadAllPages();
    this.loadHistoryAndBookmarks();
    this.route.params.subscribe(params => {
      const slug = params['slug'];
      this.activeSlug.set(slug || null);
      if (slug) {
        this.loadPageDetails(slug);
      }
    });
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const docElement = document.documentElement;
    const scrollTop = docElement.scrollTop || document.body.scrollTop;
    const scrollHeight = docElement.scrollHeight - docElement.clientHeight;
    if (scrollHeight > 0) {
      this.scrollPercent.set(Math.round((scrollTop / scrollHeight) * 100));
    }

    // ScrollSpy implementation
    const sections = ['overview', 'purpose', 'setup', 'config', 'faqs', 'security', 'billing'];
    for (const sec of sections) {
      const el = document.getElementById(sec);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top >= 0 && rect.top <= 200) {
          this.activeTocSection.set(sec);
          break;
        }
      }
    }
  }

  async loadHistoryAndBookmarks() {
    if (!this.authService.isAuthenticated()) return;
    try {
      const { firstValueFrom } = await import('rxjs');
      const hist = await firstValueFrom(this.api.get<any[]>('/documentation/history/recent'));
      this.recentHistory.set(hist || []);

      const bookmarks = await firstValueFrom(this.api.get<any[]>('/documentation/bookmarks/list'));
      this.bookmarkedPages.set(bookmarks || []);
    } catch (e) {
      console.warn('Failed to load history or bookmarks');
    }
  }

  async onSearchInput() {
    const queryStr = this.searchQuery().trim();
    if (!queryStr) {
      this.autocompleteResults.set([]);
      this.showAutocomplete.set(false);
      return;
    }

    try {
      const { firstValueFrom } = await import('rxjs');
      const res = await firstValueFrom(
        this.api.get<any[]>('/documentation/search', { params: { q: queryStr } })
      );
      this.autocompleteResults.set(res || []);
      this.showAutocomplete.set(true);
    } catch (e) {
      console.warn('Search autocomplete failed');
    }
  }

  selectAutocompleteItem(item: any) {
    this.searchQuery.set('');
    this.showAutocomplete.set(false);
    this.router.navigate(['/documentation', item.slug]);
  }

  async loadAllPages() {
    try {
      const { firstValueFrom } = await import('rxjs');
      const res = await firstValueFrom(this.api.get<DocPage[]>('/documentation'));
      this.allPages.set(res || []);

      if (!this.activeSlug() && res && res.length > 0) {
        this.router.navigate(['/documentation', res[0].slug]);
      }
    } catch (e) {
      console.error('Failed to load doc pages', e);
    }
  }

  async loadPageDetails(slug: string) {
    this.loading.set(true);
    this.feedbackSubmitted.set(false);
    try {
      const { firstValueFrom } = await import('rxjs');
      const res = await firstValueFrom(this.api.get<DocPage>(`/documentation/${slug}`));
      this.activePage.set(res || null);
      
      // Reset calculations
      if (res && res.pricing_details) {
        this.calcWa = res.pricing_details.freeTier;
      }

      // Check bookmark status
      if (res) {
        this.isBookmarked.set(this.bookmarkedPages().some(b => b.id === res.id));
      }
    } catch (e) {
      console.error('Failed to load doc page details', e);
    } finally {
      this.loading.set(false);
    }
  }

  async toggleBookmark() {
    const page = this.activePage();
    if (!page) return;
    if (!this.authService.isAuthenticated()) {
      alert('You must be logged in to bookmark articles.');
      return;
    }

    try {
      const { firstValueFrom } = await import('rxjs');
      const res = await firstValueFrom(this.api.post<any>(`/documentation/${page.id}/bookmark`, {}));
      this.isBookmarked.set(res.bookmarked);
      this.loadHistoryAndBookmarks();
    } catch (e) {
      alert('Failed to update bookmark');
    }
  }

  async submitFeedback(helpful: boolean) {
    const page = this.activePage();
    if (!page) return;

    this.submittingFeedback.set(true);
    try {
      const { firstValueFrom } = await import('rxjs');
      await firstValueFrom(
        this.api.post(`/documentation/${page.id}/feedback`, { helpful })
      );
      this.feedbackSubmitted.set(true);
      
      // Update local view values
      this.activePage.update(p => {
        if (!p) return null;
        return {
          ...p,
          likes: helpful ? (p.likes || 0) + 1 : p.likes,
          dislikes: !helpful ? (p.dislikes || 0) + 1 : p.dislikes
        };
      });
    } catch (e) {
      console.warn('Feedback submission failed');
    } finally {
      this.submittingFeedback.set(false);
    }
  }

  copyCode(codeText: string | undefined, event: MouseEvent) {
    if (!codeText) return;
    navigator.clipboard.writeText(codeText).then(() => {
      const button = event.currentTarget as HTMLButtonElement;
      const originalText = button.innerHTML;
      button.innerHTML = '<span class="text-emerald-400 font-bold flex items-center gap-1"><mat-icon class="!text-[14px] !w-3.5 !h-3.5">done</mat-icon> COPIED!</span>';
      setTimeout(() => {
        button.innerHTML = originalText;
      }, 2000);
    });
  }

  triggerPrint() {
    window.print();
  }

  scrollToSection(secId: string) {
    const el = document.getElementById(secId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.activeTocSection.set(secId);
    }
  }
}
