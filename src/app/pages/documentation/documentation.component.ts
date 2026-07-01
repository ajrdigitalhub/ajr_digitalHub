import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { TopNavComponent } from '../../shared/top-nav.component';

export interface DocPage {
  id: string;
  slug: string;
  title: string;
  category: string;
  overview: string;
  features?: string[];
  benefits?: string[];
  setup_guide?: string;
  config_guide?: string;
  pricing_details?: { basePrice: number; freeTier: number; excessRate: number };
  faqs?: { q: string; a: string }[];
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

  categories = ['All', 'WhatsApp', 'Marketing', 'Billing', 'Core CRM', 'Hosting', 'Cloud Functions'];
  selectedCategory = signal<string>('All');
  searchQuery = '';

  allPages = signal<DocPage[]>([]);
  activeSlug = signal<string | null>(null);
  activePage = signal<DocPage | null>(null);
  loading = signal<boolean>(false);

  // Calculator states
  calcWa = 0;
  calcAds = 0;
  calcFb = 0;

  filteredPages = computed(() => {
    let pages = this.allPages();
    const cat = this.selectedCategory();
    if (cat !== 'All') {
      pages = pages.filter(p => p.category.toLowerCase() === cat.toLowerCase());
    }
    return pages;
  });

  totalEstimate = computed(() => {
    const waCount = Number(this.calcWa) || 0;
    const adsSpend = Number(this.calcAds) || 0;
    const fbCount = Number(this.calcFb) || 0;

    const baseSubscription = 1500; // Standard plan base
    const excessWaCharge = Math.max(0, waCount - 100) * 0.8; // ₹0.80 per wa conv
    const excessFbCharge = Math.max(0, fbCount - 10000) * 0.02; // ₹0.02 excess

    const subtotal = baseSubscription + excessWaCharge + adsSpend + excessFbCharge;
    const gst = subtotal * 0.18;
    return subtotal + gst;
  });

  ngOnInit() {
    this.loadAllPages();
    this.route.params.subscribe(params => {
      const slug = params['slug'];
      this.activeSlug.set(slug || null);
      if (slug) {
        this.loadPageDetails(slug);
      }
    });
  }

  onSearchChange() {
    this.loadAllPages();
  }

  async loadAllPages() {
    try {
      const { firstValueFrom } = await import('rxjs');
      let endpoint = '/documentation';
      let params: any = {};
      if (this.searchQuery) params.search = this.searchQuery;
      
      const res = await firstValueFrom(this.api.get<DocPage[]>(endpoint, { params }));
      this.allPages.set(res || []);

      // If page is active, check if it is valid
      if (!this.activeSlug() && res && res.length > 0) {
        // Redirect to first page by default
        this.router.navigate(['/documentation', res[0].slug]);
      }
    } catch (e) {
      console.error('Failed to load doc pages', e);
    }
  }

  async loadPageDetails(slug: string) {
    this.loading.set(true);
    try {
      const { firstValueFrom } = await import('rxjs');
      const res = await firstValueFrom(this.api.get<DocPage>(`/documentation/${slug}`));
      this.activePage.set(res || null);
    } catch (e) {
      console.error('Failed to load doc page details', e);
    } finally {
      this.loading.set(false);
    }
  }
}
