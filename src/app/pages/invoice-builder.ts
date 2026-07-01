import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { HttpClient } from '@angular/common/http';

export interface InvoiceTemplate {
  id: string;
  name: string;
  category: string;
  primaryColor: string;
  textColor: string;
  fontFamily: string;
  logoPosition: 'left' | 'center' | 'right';
  showHeader: boolean;
  showLogo: boolean;
  showDates: boolean;
  showTable: boolean;
  showNotes: boolean;
  showSignature: boolean;
  premium: boolean;
  sectionsOrder: string[];
}

export interface LineItem {
  name: string;
  description: string;
  quantity: number;
  rate: number;
}

export interface CustomField {
  label: string;
  value: string;
}

@Component({
  selector: 'app-invoice-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule],
  templateUrl: './invoice-builder.html'
})
export class InvoiceBuilderComponent implements OnInit {
  private authService = inject(AuthService);
  private apiService = inject(ApiService);
  private http = inject(HttpClient);
  private router = inject(Router);

  // User details & Plan (Free by default, toggleable for sandbox evaluation)
  userPlan = signal<'free' | 'pro' | 'enterprise'>('free');
  
  // Interactive UI states
  activeTab = signal<'templates' | 'data' | 'branding' | 'layout'>('templates');
  activeViewMode = signal<'edit' | 'preview'>('edit');
  showLoginModal = signal(false);
  showUpgradeModal = signal(false);
  isSaving = signal(false);
  isSent = signal(false);
  isLoading = signal(true);
  isUploadingLogo = signal(false);
  isUploadingSignature = signal(false);

  // Template categories
  categories = ['All', 'Minimal', 'Corporate', 'Modern SaaS', 'Creative Agency', 'Retail'];
  selectedCategory = signal('All');

  // Loaded templates
  templates = signal<InvoiceTemplate[]>([]);
  selectedTemplateId = signal('tpl-minimalist');

  // Active Styling configuration
  primaryColor = signal('#1e293b');
  textColor = signal('#0f172a');
  fontFamily = signal('Inter');
  logoPosition = signal<'left' | 'center' | 'right'>('left');
  logoUrl = signal('');
  signatureText = signal('');
  signatureUrl = signal('');
  
  // Sections toggle flags
  showHeader = signal(true);
  showLogo = signal(true);
  showDates = signal(true);
  showTable = signal(true);
  showNotes = signal(true);
  showSignature = signal(false);

  // Dynamic layout order list
  sectionsOrder = signal<string[]>(['logo_header', 'bill_to', 'line_items', 'totals_notes']);

  // Invoice Data details
  invoiceId = signal('INV-2026-043');
  invoiceDate = signal('2026-03-27');
  dueDate = signal('2026-04-10');
  sellerName = signal('AJR DIGITAL HUB');
  sellerAddress = signal('123 Design Blvd, Suite 400\nSan Francisco, CA 94107\nhello@ajrdigital.hub');
  clientName = signal('Client Acme Corp');
  clientAddress = signal('456 Market St, Floor 12\nSan Francisco, CA 94103');
  notes = signal('Thank you for partnering with AJR Digital HUB! Payment is due within 14 days.');
  
  // Tax / discount inputs
  taxRate = signal(0); // in percent
  discountVal = signal(0);
  discountType = signal<'flat' | 'percent'>('flat');
  currency = signal('INR (₹)');
  paymentMethods = signal({
    card: true,
    bank: true
  });

  // Custom Fields (Premium)
  customFields = signal<CustomField[]>([
    { label: 'Project Ref', value: 'AJR-MATRIX-99' }
  ]);

  // Line items list
  lineItems = signal<LineItem[]>([
    { name: 'Enterprise Cloud Redesign', description: 'Interactive layout, split engine & global themes', quantity: 1, rate: 2500 },
    { name: 'Core Microservice License', description: 'Database and auth endpoints integration', quantity: 2, rate: 450 }
  ]);

  // Calculations
  subtotal = computed(() => {
    return this.lineItems().reduce((acc, item) => acc + (item.quantity * item.rate), 0);
  });

  discountAmount = computed(() => {
    if (this.discountType() === 'percent') {
      return this.subtotal() * (this.discountVal() / 100);
    }
    return this.discountVal();
  });

  taxAmount = computed(() => {
    const taxableAmount = this.subtotal() - this.discountAmount();
    return taxableAmount * (this.taxRate() / 100);
  });

  grandTotal = computed(() => {
    return this.subtotal() - this.discountAmount() + this.taxAmount();
  });

  filteredTemplates = computed(() => {
    const cat = this.selectedCategory();
    if (cat === 'All') return this.templates();
    return this.templates().filter(t => t.category === cat);
  });

  // Synchronize current template settings when changed
  onSelectTemplate(tpl: InvoiceTemplate) {
    if (tpl.premium && this.userPlan() === 'free') {
      this.showUpgradeModal.set(true);
      return;
    }

    this.selectedTemplateId.set(tpl.id);
    this.primaryColor.set(tpl.primaryColor);
    this.textColor.set(tpl.textColor);
    this.fontFamily.set(tpl.fontFamily);
    this.logoPosition.set(tpl.logoPosition);
    this.showHeader.set(tpl.showHeader);
    this.showLogo.set(tpl.showLogo);
    this.showDates.set(tpl.showDates);
    this.showTable.set(tpl.showTable);
    this.showNotes.set(tpl.showNotes);
    this.showSignature.set(tpl.showSignature);
    this.sectionsOrder.set([...tpl.sectionsOrder]);
  }

  ngOnInit() {
    this.loadInvoiceConfig();
    this.loadTemplates();
  }

  confirmLogin() {
    this.showLoginModal.set(false);
    localStorage.setItem('redirectAfterLogin', this.router.url);
    this.router.navigate(['/login']);
  }

  loadTemplates() {
    this.http.get<any>('/api/invoice/templates').subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.templates.set(res.data);
        }
      },
      error: (e) => console.error('Failed to load templates:', e)
    });
  }

  loadInvoiceConfig() {
    const shopId = this.authService.currentUser()?.id || 'demo-shop-1';
    
    // Sync current plan from auth state
    const currentUser = this.authService.currentUser();
    if (currentUser) {
      this.userPlan.set(currentUser.role === 'admin' ? 'enterprise' : 'free');
    }

    this.http.get<any>(`/api/shops/${shopId}/invoice-config`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const d = res.data;
          if (d.company_name) this.sellerName.set(d.company_name);
          if (d.company_address) this.sellerAddress.set(d.company_address);
          if (d.notes_template) this.notes.set(d.notes_template);
          if (d.logo_url) this.logoUrl.set(d.logo_url);
          if (d.logo_position) this.logoPosition.set(d.logo_position);
          if (d.primary_color) this.primaryColor.set(d.primary_color);
          if (d.signature_text) this.signatureText.set(d.signature_text);
          if (d.signature_url) this.signatureUrl.set(d.signature_url);
          if (d.tax_rate !== undefined) this.taxRate.set(d.tax_rate);
          if (d.sections_order) this.sectionsOrder.set(d.sections_order);
          if (d.show_signature !== undefined) this.showSignature.set(d.show_signature);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  // Save Config to Server
  saveConfig() {
    if (!this.authService.currentUser()) {
      this.showLoginModal.set(true);
      return;
    }

    if (this.userPlan() === 'free') {
      this.showUpgradeModal.set(true);
      return;
    }

    this.isSaving.set(true);
    const shopId = this.authService.currentUser()?.id || 'demo-shop-1';
    const payload = {
      shopId,
      company_name: this.sellerName(),
      company_address: this.sellerAddress(),
      notes_template: this.notes(),
      logo_url: this.logoUrl(),
      logo_position: this.logoPosition(),
      primary_color: this.primaryColor(),
      signature_text: this.signatureText(),
      signature_url: this.signatureUrl(),
      tax_rate: this.taxRate(),
      show_signature: this.showSignature(),
      sections_order: this.sectionsOrder()
    };

    this.http.put<any>('/api/invoice/config', payload).subscribe({
      next: () => {
        this.apiService.getLandingConfig().subscribe(); // Dummy refresh trigger
        this.isSaving.set(false);
        alert('Branding and defaults saved successfully!');
      },
      error: (e) => {
        console.error('Failed to save config:', e);
        this.isSaving.set(false);
      }
    });
  }

  // Save current design as a new custom reusable template (PRO)
  saveCustomTemplate() {
    if (!this.authService.currentUser()) {
      this.showLoginModal.set(true);
      return;
    }

    if (this.userPlan() === 'free') {
      this.showUpgradeModal.set(true);
      return;
    }

    const tplName = prompt('Enter a name for your custom template layout:', 'My Custom Layout');
    if (!tplName) return;

    this.isSaving.set(true);
    const payload = {
      name: tplName,
      category: 'Creative Agency',
      primaryColor: this.primaryColor(),
      textColor: this.textColor(),
      fontFamily: this.fontFamily(),
      logoPosition: this.logoPosition(),
      showHeader: this.showHeader(),
      showLogo: this.showLogo(),
      showDates: this.showDates(),
      showTable: this.showTable(),
      showNotes: this.showNotes(),
      showSignature: this.showSignature(),
      sectionsOrder: this.sectionsOrder(),
      premium: true
    };

    this.http.post<any>('/api/invoice/save', payload).subscribe({
      next: () => {
        this.loadTemplates();
        this.isSaving.set(false);
        alert('Custom template layout saved to library!');
      },
      error: (e) => {
        console.error('Failed to save custom template:', e);
        this.isSaving.set(false);
      }
    });
  }

  // Image Upload handler (for logo or signature)
  onLogoSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (this.userPlan() === 'free') {
      this.showUpgradeModal.set(true);
      return;
    }

    this.isUploadingLogo.set(true);
    this.apiService.uploadImage(file).subscribe({
      next: (res) => {
        this.logoUrl.set(res.url);
        this.isUploadingLogo.set(false);
      },
      error: (e) => {
        console.error('Upload logo failed:', e);
        this.isUploadingLogo.set(false);
      }
    });
  }

  onSignatureSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (this.userPlan() === 'free') {
      this.showUpgradeModal.set(true);
      return;
    }

    this.isUploadingSignature.set(true);
    this.apiService.uploadImage(file).subscribe({
      next: (res) => {
        this.signatureUrl.set(res.url);
        this.isUploadingSignature.set(false);
      },
      error: (e) => {
        console.error('Upload signature failed:', e);
        this.isUploadingSignature.set(false);
      }
    });
  }

  // Reordering Section Positions (Up / Down)
  moveSection(index: number, direction: 'up' | 'down') {
    if (this.userPlan() === 'free') {
      this.showUpgradeModal.set(true);
      return;
    }

    const sections = [...this.sectionsOrder()];
    if (direction === 'up' && index > 0) {
      const temp = sections[index];
      sections[index] = sections[index - 1];
      sections[index - 1] = temp;
    } else if (direction === 'down' && index < sections.length - 1) {
      const temp = sections[index];
      sections[index] = sections[index + 1];
      sections[index + 1] = temp;
    }
    this.sectionsOrder.set(sections);
  }

  // Custom Fields (Premium)
  addCustomField() {
    if (this.userPlan() === 'free') {
      this.showUpgradeModal.set(true);
      return;
    }
    this.customFields.update(fields => [...fields, { label: 'New Field', value: '' }]);
  }

  removeCustomField(idx: number) {
    if (this.userPlan() === 'free') {
      this.showUpgradeModal.set(true);
      return;
    }
    this.customFields.update(fields => fields.filter((_, i) => i !== idx));
  }

  // Line items operations
  addLineItem() {
    this.lineItems.update(items => [...items, { name: '', description: '', quantity: 1, rate: 0 }]);
  }

  removeLineItem(index: number) {
    this.lineItems.update(items => items.filter((_, i) => i !== index));
  }

  // Print PDF Trigger
  triggerPrint() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  // Send simulated invoice
  sendInvoice() {
    this.isSent.set(true);
    setTimeout(() => this.isSent.set(false), 2000);
  }

  // Plan level upgrade toggle helper
  upgradeToPro() {
    this.userPlan.set('pro');
    this.showUpgradeModal.set(false);
  }

  upgradeToEnterprise() {
    this.userPlan.set('enterprise');
    this.showUpgradeModal.set(false);
  }
}
