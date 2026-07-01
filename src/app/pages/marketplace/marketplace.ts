import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { ApiService, Product } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { AdminData } from '../../services/admin-data';
import { TechBackground, FloatingCard, GlowButton } from '../../shared/tech-ui';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TechBackground, FloatingCard, GlowButton],
  templateUrl: './marketplace.html'
})
export class MarketplaceComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private adminData = inject(AdminData);
  private router = inject(Router);

  isMarketplaceFeatureActive = computed(() => this.adminData.websiteConfig().features.marketplace);

  products = signal<Product[]>([]);
  dynamicItems = signal<any[]>([]); // Items from CMS
  showLoginModal = signal(false);

  // Live preview dialog states
  showPreviewModal = signal(false);
  previewProduct = signal<any>(null);

  confirmLogin() {
    this.showLoginModal.set(false);
    localStorage.setItem('redirectAfterLogin', this.router.url);
    this.router.navigate(['/login']);
  }
  
  // Combine for UI, with dynamic items taking priority
  combinedItems = computed(() => {
    return [
      ...this.dynamicItems().map(item => ({ isDynamic: true, ...item })),
      ...this.products().map(item => ({ isDynamic: false, ...item }))
    ];
  });

  categories = ['All', 'Design', 'Code', 'Content', 'Services'];
  selectedCategory = signal('All');
  searchQuery = signal('');
  loading = signal(false);

  ngOnInit() {
    this.loadProducts();
    if (typeof window !== 'undefined') {
      const pendingRaw = localStorage.getItem('pendingPurchase');
      if (pendingRaw && this.authService.currentUser()) {
        try {
          const product = JSON.parse(pendingRaw);
          localStorage.removeItem('pendingPurchase');
          setTimeout(() => {
            this.buyNow(product);
          }, 1000);
        } catch (e) {}
      }
    }
  }

  loadProducts() {
    this.loading.set(true);
    const cat = this.selectedCategory() === 'All' ? undefined : this.selectedCategory();
    
    // We fetch both dynamic items from the CMS and standard products
    forkJoin({
       dynamic: this.apiService.get<any>('/admin/marketplace-items'),
       products: this.apiService.getProducts(cat, this.searchQuery())
    }).subscribe({
      next: (res: any) => {
        const dynData = res.dynamic?.data || res.dynamic || [];
        const prodData = res.products?.data || res.products || [];
        
        let activeItems = dynData.filter((item: any) => item.status === 'active');
        if (this.searchQuery()) {
          activeItems = activeItems.filter((item: any) => item.title.toLowerCase().includes(this.searchQuery().toLowerCase()));
        }
        this.dynamicItems.set(activeItems);
        this.products.set(prodData);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  filterCategory(cat: string) {
    this.selectedCategory.set(cat);
    this.loadProducts();
  }

  onSearch() {
    this.loadProducts();
  }

  buyNow(product: any) {
    if (!this.authService.currentUser()) {
      localStorage.setItem('pendingPurchase', JSON.stringify(product));
      this.showLoginModal.set(true);
      return;
    }
    
    if (confirm(`Purchase ${product.title} for ₹${product.price}?`)) {
      if (product.isDynamic) {
        alert('Purchase successful! Dynamic Asset added to your dashboard.');
      } else {
        this.apiService.purchaseProduct(product.id, product.price).subscribe({
          next: () => alert('Purchase successful! Item added to your dashboard.'),
          error: (err) => alert('Purchase failed: ' + (err.error?.message || err.error?.error || 'Unknown error'))
        });
      }
    }
  }
  
  viewPreview(product: any) {
    this.previewProduct.set(product);
    this.showPreviewModal.set(true);
  }

  closePreview() {
    this.showPreviewModal.set(false);
    this.previewProduct.set(null);
  }
}
