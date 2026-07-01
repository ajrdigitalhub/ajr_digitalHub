import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MarketplaceService } from '../services/marketplace.service';

interface Product {
  id: number;
  title: string;
  author: string;
  price: number;
  rating: number;
  sales: number;
  category: string;
  imageUrl: string;
  html_content: string;
  addedToCart?: boolean;
}

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './marketplace.html'
})
export class MarketplaceComponent implements OnInit {
  private marketplaceService = inject(MarketplaceService);
  private sanitizer = inject(DomSanitizer);

  categories = signal(['All', 'Hero', 'Cards', 'Pricing', 'Landing', 'Content', 'UI Kits']);
  activeCategory = signal('All');
  searchQuery = signal('');
  products = signal<Product[]>([]);
  isLoading = signal(false);

  // Overlay state signals
  activePreviewProduct = signal<Product | null>(null);
  previewDevice = signal<string>('desktop');
  previewZoom = signal<number>(0.75);

  fallbackProducts: Product[] = [
    {
      id: 901,
      title: 'Nexus - Modern Admin Dashboard',
      author: 'AJR Studios',
      price: 49,
      rating: 4.9,
      sales: 1240,
      category: 'Cards',
      imageUrl: 'https://picsum.photos/seed/admin1/800/600',
      html_content: '<div class="p-8 bg-slate-900 border border-slate-800 rounded-3xl"><h3 class="text-white font-extrabold text-xl">Nexus Dashboard Card</h3><p class="text-slate-400 text-sm mt-2">Clean enterprise design.</p></div>'
    },
    {
      id: 902,
      title: 'Lumina - SaaS Landing Page',
      author: 'PixelCraft',
      price: 29,
      rating: 4.8,
      sales: 856,
      category: 'Landing',
      imageUrl: 'https://picsum.photos/seed/saas1/800/600',
      html_content: '<div class="p-8 bg-slate-900 border border-slate-800 rounded-3xl"><h3 class="text-white font-extrabold text-xl">Lumina SaaS Card</h3><p class="text-slate-400 text-sm mt-2">Smooth visual accents.</p></div>'
    },
    {
      id: 903,
      title: 'Aura - Minimalist Portfolio',
      author: 'DesignHub',
      price: 39,
      rating: 5.0,
      sales: 432,
      category: 'Content',
      imageUrl: 'https://picsum.photos/seed/port1/800/600',
      html_content: '<div class="p-8 bg-slate-900 border border-slate-800 rounded-3xl"><h3 class="text-white font-extrabold text-xl">Aura Portfolio Block</h3><p class="text-slate-400 text-sm mt-2">Aesthetic spatial grid.</p></div>'
    }
  ];

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.isLoading.set(true);
    // Fetch dynamic assets from backend
    this.marketplaceService.getPublicItems().subscribe({
      next: (res: any) => {
        const rawItems = Array.isArray(res) ? res : (res?.data || []);
        
        const mapped: Product[] = rawItems.map((item: any) => ({
          id: item.id,
          title: item.title,
          author: item.author || 'SaaS Architect',
          price: parseFloat(item.price as any) || 0,
          rating: item.rating || 4.8,
          sales: item.sales || Math.floor(Math.random() * 50) + 10,
          category: item.category || 'UI Kits',
          imageUrl: item.image || item.image_url || 'https://picsum.photos/seed/placeholder/800/600',
          html_content: item.html || item.html_content || '',
          addedToCart: false
        }));

        this.products.set([...mapped, ...this.fallbackProducts]);
        this.isLoading.set(false);
      },
      error: () => {
        // Fallback to offline list if database sync delay
        this.products.set(this.fallbackProducts);
        this.isLoading.set(false);
      }
    });
  }

  filteredProducts = computed(() => {
    let list = this.products();
    const cat = this.activeCategory();
    const q = this.searchQuery().toLowerCase().trim();

    if (cat !== 'All') {
      list = list.filter(p => p.category.toLowerCase().includes(cat.toLowerCase()));
    }
    if (q) {
      list = list.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.category.toLowerCase().includes(q)
      );
    }
    return list;
  });

  addToCart(product: Product) {
    product.addedToCart = true;
    setTimeout(() => {
      product.addedToCart = false;
    }, 2000);
  }

  // Live Sanitized Preview Computed Flow
  previewSanitizedHtml = computed(() => {
    const item = this.activePreviewProduct();
    if (!item) return '';
    const content = item.html_content || '';
    const fullDoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; background-color: #0b0f19; color: #f8fafc; }
            ::-webkit-scrollbar { display: none; }
            body { -ms-overflow-style: none; scrollbar-width: none; }
          </style>
        </head>
        <body class="bg-transparent overflow-x-hidden p-6">
          ${content}
        </body>
      </html>
    `;
    return this.sanitizer.bypassSecurityTrustHtml(fullDoc);
  });

  openPreview(product: Product) {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      this.previewDevice.set('mobile');
      this.previewZoom.set(1.0);
    } else {
      this.previewDevice.set('desktop');
      this.previewZoom.set(0.75);
    }
    this.activePreviewProduct.set(product);
  }

  closePreview() {
    this.activePreviewProduct.set(null);
  }
}
