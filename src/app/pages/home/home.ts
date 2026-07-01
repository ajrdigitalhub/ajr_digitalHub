import { Component, signal, computed, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiService, Product } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { CountdownTimerComponent } from '../../shared/countdown-timer';
import { KpiCounterComponent } from '../../shared/kpi-counter';
import { TechBackground, FloatingCard, DataFlow, GlowButton, ParallaxContainer } from '../../shared/tech-ui';
import { AnimatedCardComponent, SkeletonLoaderComponent } from '../../shared/ui-atoms';
import { ScrollRevealDirective } from '../../shared/scroll-reveal.directive';

export interface TestimonialType {
  id: number;
  name: string;
  role: string;
  rating: number;
  comment: string;
  image_url: string;
}

export interface LandingConfigType {
  heroText: string;
  buttonText: string;
  buttonLink: string;
  stats: { value: string; label: string }[];
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  buttonText: string;
  buttonLink: string;
  overlayGradient: string;
  animationType: 'fade' | 'slide' | 'zoom';
  isActive: boolean;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink, 
    MatIconModule, 
    CommonModule, 
    ReactiveFormsModule,
    CountdownTimerComponent, 
    KpiCounterComponent,
    TechBackground,
    FloatingCard,
    DataFlow,
    GlowButton,
    ParallaxContainer,
    AnimatedCardComponent, 
    SkeletonLoaderComponent,
    ScrollRevealDirective
  ],
  templateUrl: './home.html'
})
export class HomeComponent implements OnInit, OnDestroy {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private fb = inject(FormBuilder);

  isLoginMode = signal<boolean>(true);
  isLoading = signal<boolean>(false);
  isPasswordVisible = signal<boolean>(false);
  
  toastMessage = signal<string>('');
  toastType = signal<'success' | 'error'>('success');

  authForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  get f() {
    return this.authForm.controls;
  }

  showToast(msg: string, type: 'success' | 'error' = 'success') {
    this.toastMessage.set(msg);
    this.toastType.set(type);
    setTimeout(() => {
      this.toastMessage.set('');
    }, 5000);
  }

  async onLoginSubmit() {
    if (this.authForm.invalid) { return; }
    
    this.isLoading.set(true);
    const email = this.authForm.value.email!;
    const password = this.authForm.value.password!;

    try {
      await this.authService.login(email, password);
      this.showToast('Logged in successfully!', 'success');
      const user = this.authService.currentUser();
      if (user && user.role === 'admin') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/dashboard']);
      }
    } catch (err: any) {
      this.showToast(err.message || 'Authentication failed', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  isMessageSent = signal(false);
  testimonials = signal<TestimonialType[]>([]);
  isChatOpen = signal(false);
  landingConfig = signal<LandingConfigType | null>(null);
  duplicatedTestimonials = signal<TestimonialType[]>([]);
  
  // Featured products & shopping flow
  featuredProducts = signal<Product[]>([]);
  showLoginModal = signal(false);
  isLoadingProducts = signal(false);

  // Hero slider banner state
  slides = signal<HeroSlide[]>([]);
  currentSlideIndex = signal<number>(0);
  private autoPlayTimer: any = null;

  // Sandboxed Iframe Preview Modal State
  showPreviewModal = signal(false);
  previewProduct = signal<any>(null);

  // Growth & A/B testing system state
  growthConfig = signal<any>(null);
  heroVersion = signal<'A' | 'B'>('A');

  // Animated metric counters
  activeUsersCount = signal<number>(0);
  apiCallsCount = signal<number>(0);
  revenueCount = signal<number>(0);
  appsDeployedCount = signal<number>(0);

  // Live telemetry status
  latencyMs = signal<number>(124);
  private liveTickInterval: any = null;

  activeSlide = computed(() => {
    const list = this.slides();
    const idx = this.currentSlideIndex();
    if (list.length > 0 && idx >= 0 && idx < list.length) {
      return list[idx];
    }
    return null;
  });

  // SVG Line Chart Calculators
  chartData = computed(() => {
    const config = this.growthConfig();
    const activeUsers = config?.activeUsersOverride || 1284;
    const apiCalls = config?.apiCallsOverride || 98234;
    const revenue = config?.revenueOverride || 1240000;
    const apps = config?.appsDeployedOverride || 342;

    return {
      users: [Math.round(activeUsers * 0.15), Math.round(activeUsers * 0.38), Math.round(activeUsers * 0.52), Math.round(activeUsers * 0.68), Math.round(activeUsers * 0.82), Math.round(activeUsers * 0.94), activeUsers],
      api: [Math.round(apiCalls * 0.35), Math.round(apiCalls * 0.58), Math.round(apiCalls * 0.49), Math.round(apiCalls * 0.72), Math.round(apiCalls * 0.88), Math.round(apiCalls * 0.95), apiCalls],
      revenue: [Math.round(revenue * 0.12), Math.round(revenue * 0.28), Math.round(revenue * 0.45), Math.round(revenue * 0.58), Math.round(revenue * 0.72), Math.round(revenue * 0.88), revenue],
      apps: [Math.round(apps * 0.1), Math.round(apps * 0.3), Math.round(apps * 0.45), Math.round(apps * 0.6), Math.round(apps * 0.78), Math.round(apps * 0.9), apps]
    };
  });

  // 24 hours from now for the demo
  offerEndTime = signal(Date.now() + 24 * 60 * 60 * 1000);

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.apiService.getLandingConfig().subscribe({
      next: (config) => this.landingConfig.set(config),
      error: (err) => console.error('Landing config error:', err)
    });

    // Fetch Growth and A/B configurations
    this.apiService.get<any>('/settings/growth_config').subscribe({
      next: (res: any) => {
        const config = res?.data || res;
        this.growthConfig.set(config);

        // A/B test allocation logic
        let version: 'A' | 'B' = 'A';
        if (config.activeHeroVersion === 'A' || config.activeHeroVersion === 'B') {
          version = config.activeHeroVersion;
        } else {
          // split testing
          const savedVersion = sessionStorage.getItem('heroVersion');
          if (savedVersion === 'A' || savedVersion === 'B') {
            version = savedVersion;
          } else {
            version = Math.random() < 0.5 ? 'A' : 'B';
            sessionStorage.setItem('heroVersion', version);
          }
        }
        this.heroVersion.set(version);

        // Track View Telemetry
        this.apiService.post('/settings/growth/track', { type: 'view', version }).subscribe();

        // Trigger count-up metrics animations
        this.animateMetric(config.activeUsersOverride || 1284, (v) => this.activeUsersCount.set(v));
        this.animateMetric(config.apiCallsOverride || 98234, (v) => this.apiCallsCount.set(v));
        this.animateMetric(config.revenueOverride || 1240000, (v) => this.revenueCount.set(v));
        this.animateMetric(config.appsDeployedOverride || 342, (v) => this.appsDeployedCount.set(v));

        if (config.countdownEndTime) {
          this.offerEndTime.set(new Date(config.countdownEndTime).getTime());
        }
      },
      error: (err) => {
        console.error('Growth Config Error, falling back:', err);
        this.heroVersion.set('A');
        this.animateMetric(1284, (v) => this.activeUsersCount.set(v));
        this.animateMetric(98234, (v) => this.apiCallsCount.set(v));
        this.animateMetric(1240000, (v) => this.revenueCount.set(v));
        this.animateMetric(342, (v) => this.appsDeployedCount.set(v));
      }
    });

    // Start live status indicators ticks
    this.liveTickInterval = setInterval(() => {
      const base = 124;
      const dev = Math.floor(Math.random() * 8) - 4;
      this.latencyMs.set(base + dev);
    }, 4000);

    this.loadTestimonials();
    this.loadSliderBanners();
    this.loadFeaturedProducts();
  }

  ngOnDestroy() {
    if (this.autoPlayTimer) {
      clearInterval(this.autoPlayTimer);
    }
    if (this.liveTickInterval) {
      clearInterval(this.liveTickInterval);
    }
  }

  // Count-up numbers easing animator
  private animateMetric(target: number, setter: (val: number) => void) {
    const duration = 1800; // 1.8 seconds fluid animation
    const startTime = Date.now();
    const startVal = 0;
    
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quad
      const eased = progress * (2 - progress);
      const current = Math.round(startVal + (target - startVal) * eased);
      setter(current);
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }

  // Track Conversion Telemetry
  trackConversion() {
    const version = this.heroVersion();
    this.apiService.post('/settings/growth/track', { type: 'conversion', version }).subscribe({
      error: (e) => console.error('Failed to log conversion tracker:', e)
    });
  }

  onCtaClick(buttonLink: string) {
    this.trackConversion();
    this.router.navigateByUrl(buttonLink);
  }

  // Sandboxed iframe preview modal functions
  openPreview(product: any) {
    this.trackConversion(); // Treat preview interest as micro-conversion!
    this.previewProduct.set(product);
    this.showPreviewModal.set(true);
  }

  closePreview() {
    this.showPreviewModal.set(false);
    this.previewProduct.set(null);
  }

  // Generates SVG Line string path coordinates for simple visual charting
  getSvgPath(data: number[], width = 500, height = 200): string {
    if (!data || data.length === 0) return '';
    const maxVal = Math.max(...data) || 1;
    const minVal = Math.min(...data) || 0;
    const range = maxVal - minVal || 1;
    const padding = 15;

    return data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * (width - padding * 2) + padding;
      const y = height - ((val - minVal) / range) * (height - padding * 2) - padding;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }

  getSvgAreaPath(data: number[], width = 500, height = 200): string {
    const linePath = this.getSvgPath(data, width, height);
    if (!linePath) return '';
    const padding = 15;
    const startX = padding;
    const endX = width - padding;
    return `${linePath} L ${endX.toFixed(1)} ${height.toFixed(1)} L ${startX.toFixed(1)} ${height.toFixed(1)} Z`;
  }

  private loadFeaturedProducts() {
    this.isLoadingProducts.set(true);
    this.apiService.getProducts().pipe(
      finalize(() => this.isLoadingProducts.set(false))
    ).subscribe({
      next: (res: any) => {
        // Take first 3 as featured products
        const items = res?.data || res || [];
        this.featuredProducts.set(items.slice(0, 3));
      },
      error: (err) => {
        console.error('Featured products load error:', err);
        // Fallback mockup list if empty
        this.featuredProducts.set([
          { id: 1, title: 'Smart CRM Engine', description: 'Next-generation user management with automated sales scoring.', price: 1249, category: 'Code', image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=80' },
          { id: 2, title: 'Neo UI Kit', description: 'Glow, transparency, and customizable theme bindings.', price: 599, category: 'Design', image_url: 'https://images.unsplash.com/photo-1541462608141-2f528a719857?auto=format&fit=crop&w=400&q=80' },
          { id: 3, title: 'MicroSaaS Blueprint', description: 'Start your subscription logic with preconfigured routes.', price: 2199, category: 'Services', image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80' }
        ]);
      }
    });
  }

  buyNow(product: any) {
    this.trackConversion();
    if (!this.authService.currentUser()) {
      localStorage.setItem('pendingPurchase', JSON.stringify(product));
      this.showLoginModal.set(true);
      return;
    }
    
    if (confirm(`Purchase ${product.title} for ₹${product.price}?`)) {
      this.apiService.purchaseProduct(product.id, product.price).subscribe({
        next: () => alert('Purchase successful! Item added to your dashboard.'),
        error: (err) => alert('Purchase failed: ' + (err.error?.message || err.error?.error || 'Unknown error'))
      });
    }
  }

  confirmLogin() {
    this.showLoginModal.set(false);
    localStorage.setItem('redirectAfterLogin', this.router.url);
    this.router.navigate(['/login']);
  }

  private loadSliderBanners() {
    this.apiService.get('/settings/hero-slider').subscribe({
      next: (res: any) => {
        const rawSlides = res?.slides || res?.data?.slides || [];
        // Filter to keep active slides only
        const activeOnly = rawSlides.filter((s: any) => s.isActive === true);
        this.slides.set(activeOnly);

        if (activeOnly.length > 1) {
          this.startAutoPlay();
        }
      },
      error: (err) => console.error('Slider load error:', err)
    });
  }

  private startAutoPlay() {
    if (this.autoPlayTimer) clearInterval(this.autoPlayTimer);
    
    this.autoPlayTimer = setInterval(() => {
      this.nextSlide();
    }, 7000); // Transitions automatically after 7 seconds
  }

  nextSlide() {
    const total = this.slides().length;
    if (total === 0) return;
    this.currentSlideIndex.set((this.currentSlideIndex() + 1) % total);
  }

  prevSlide() {
    const total = this.slides().length;
    if (total === 0) return;
    this.currentSlideIndex.set((this.currentSlideIndex() - 1 + total) % total);
  }

  setSlide(index: number) {
    this.currentSlideIndex.set(index);
    // Restart autoplay clock on custom input
    this.startAutoPlay();
  }

  private loadTestimonials() {
    this.apiService.getTestimonials().subscribe({
      next: (data) => {
        const testimonials = Array.isArray(data) ? data : [];
        this.testimonials.set(testimonials);
        this.duplicatedTestimonials.set([...testimonials, ...testimonials, ...testimonials, ...testimonials]);
      },
      error: (err) => console.error('Testimonials error:', err)
    });
  }

  // Premium SaaS landing page support signals
  billingCycle = signal<'monthly' | 'yearly'>('monthly');
  activeFaqIndex = signal<number | null>(null);
  activeMarketingModule = signal<string>('google');
  activeDashboardTab = signal<string>('campaigns');
  marketplaceIndex = signal<number>(0);

  toggleFaq(index: number) {
    if (this.activeFaqIndex() === index) {
      this.activeFaqIndex.set(null);
    } else {
      this.activeFaqIndex.set(index);
    }
  }

  setMarketingModule(module: string) {
    this.activeMarketingModule.set(module);
  }

  setDashboardTab(tab: string) {
    this.activeDashboardTab.set(tab);
  }

  prevMarketplace() {
    this.marketplaceIndex.update(idx => Math.max(0, idx - 1));
  }

  nextMarketplace(maxCount: number) {
    this.marketplaceIndex.update(idx => Math.min(maxCount - 1, idx + 1));
  }

  sendMessage() {
    this.isMessageSent.set(true);
    setTimeout(() => {
      this.isMessageSent.set(false);
    }, 3000);
  }

  toggleChat() {
    this.isChatOpen.update(v => !v);
  }
}
