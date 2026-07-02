import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-admin-docs',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './documentation-admin.component.html',
  styleUrl: './documentation-admin.component.scss'
})
export class AdminDocsComponent implements OnInit {
  private api = inject(ApiService);
  loading = signal<boolean>(false);
  pages = signal<any[]>([]);

  showModal = signal<boolean>(false);
  editMode = signal<boolean>(false);
  activeDoc: any = {};

  // Form array input string helpers
  newFeature = '';
  newBenefit = '';
  newUseCase = '';
  newSecurity = '';
  newPerf = '';
  newKeyword = '';

  // Version management states
  showVersionsPanel = signal<boolean>(false);
  versions = signal<any[]>([]);
  selectedDocForVersions: any = null;

  categories = [
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

  ngOnInit() {
    this.loadPages();
  }

  async loadPages() {
    this.loading.set(true);
    try {
      const { firstValueFrom } = await import('rxjs');
      const res = await firstValueFrom(this.api.get<any[]>('/documentation?status=all'));
      this.pages.set(res || []);
    } catch (e) {
      console.error('Failed to load documentation catalogue', e);
    } finally {
      this.loading.set(false);
    }
  }

  openAddModal() {
    this.editMode.set(false);
    this.activeDoc = {
      category: 'WhatsApp Marketing',
      status: 'published',
      features: [],
      benefits: [],
      business_use_cases: [],
      security_recommendations: [],
      performance_tips: [],
      search_keywords: [],
      faqs: [],
      seo_settings: { title: '', description: '' },
      pricing_details: { basePrice: 0, freeTier: 0, excessRate: 0 }
    };
    this.clearInputs();
    this.showModal.set(true);
  }

  async openEditModal(doc: any) {
    this.editMode.set(true);
    
    // Fetch full page details to edit all columns
    this.loading.set(true);
    try {
      const { firstValueFrom } = await import('rxjs');
      const fullDoc = await firstValueFrom(this.api.get<any>(`/documentation/${doc.slug}`));
      
      this.activeDoc = {
        ...fullDoc,
        features: Array.isArray(fullDoc.features) ? fullDoc.features : [],
        benefits: Array.isArray(fullDoc.benefits) ? fullDoc.benefits : [],
        business_use_cases: Array.isArray(fullDoc.business_use_cases) ? fullDoc.business_use_cases : [],
        security_recommendations: Array.isArray(fullDoc.security_recommendations) ? fullDoc.security_recommendations : [],
        performance_tips: Array.isArray(fullDoc.performance_tips) ? fullDoc.performance_tips : [],
        search_keywords: Array.isArray(fullDoc.search_keywords) ? fullDoc.search_keywords : [],
        faqs: Array.isArray(fullDoc.faqs) ? fullDoc.faqs : [],
        seo_settings: fullDoc.seo_settings || { title: '', description: '' },
        pricing_details: fullDoc.pricing_details || { basePrice: 0, freeTier: 0, excessRate: 0 }
      };
      
      this.clearInputs();
      this.showModal.set(true);
    } catch (e) {
      alert('Failed to retrieve full article parameters');
    } finally {
      this.loading.set(false);
    }
  }

  clearInputs() {
    this.newFeature = '';
    this.newBenefit = '';
    this.newUseCase = '';
    this.newSecurity = '';
    this.newPerf = '';
    this.newKeyword = '';
  }

  addItem(arrayName: string, inputVal: string) {
    if (!inputVal.trim()) return;
    if (!this.activeDoc[arrayName]) this.activeDoc[arrayName] = [];
    this.activeDoc[arrayName].push(inputVal.trim());
    
    // Clear specific input helper
    if (arrayName === 'features') this.newFeature = '';
    if (arrayName === 'benefits') this.newBenefit = '';
    if (arrayName === 'business_use_cases') this.newUseCase = '';
    if (arrayName === 'security_recommendations') this.newSecurity = '';
    if (arrayName === 'performance_tips') this.newPerf = '';
    if (arrayName === 'search_keywords') this.newKeyword = '';
  }

  removeItem(arrayName: string, index: number) {
    if (this.activeDoc[arrayName]) {
      this.activeDoc[arrayName].splice(index, 1);
    }
  }

  addFaq() {
    if (!this.activeDoc.faqs) this.activeDoc.faqs = [];
    this.activeDoc.faqs.push({ q: '', a: '' });
  }

  removeFaq(index: number) {
    if (this.activeDoc.faqs) {
      this.activeDoc.faqs.splice(index, 1);
    }
  }

  async savePage() {
    try {
      const { firstValueFrom } = await import('rxjs');
      if (this.editMode()) {
        await firstValueFrom(this.api.put(`/documentation/${this.activeDoc.id}`, this.activeDoc));
        alert('Documentation page updated successfully!');
      } else {
        await firstValueFrom(this.api.post('/documentation', this.activeDoc));
        alert('Documentation page created successfully!');
      }
      this.showModal.set(false);
      this.loadPages();
    } catch (e: any) {
      alert('Failed to save guide: ' + e.message);
    }
  }

  async deletePage(id: string) {
    if (!confirm('Are you sure you want to delete this documentation page?')) return;
    try {
      const { firstValueFrom } = await import('rxjs');
      await firstValueFrom(this.api.delete(`/documentation/${id}`));
      alert('Documentation page deleted successfully.');
      this.loadPages();
    } catch (e: any) {
      alert('Failed to delete guide: ' + e.message);
    }
  }

  async viewVersions(doc: any) {
    this.selectedDocForVersions = doc;
    this.versions.set([]);
    this.showVersionsPanel.set(true);
    
    try {
      const { firstValueFrom } = await import('rxjs');
      const res = await firstValueFrom(this.api.get<any[]>(`/documentation/${doc.id}/versions`));
      this.versions.set(res || []);
    } catch (e) {
      alert('Failed to fetch historical versions');
    }
  }

  async rollback(versionId: string) {
    if (!confirm('Are you sure you want to roll back to this version?')) return;
    
    try {
      const { firstValueFrom } = await import('rxjs');
      await firstValueFrom(
        this.api.post(`/documentation/${this.selectedDocForVersions.id}/versions/${versionId}/rollback`, {})
      );
      alert('Version rolled back successfully!');
      this.showVersionsPanel.set(false);
      this.loadPages();
    } catch (e: any) {
      alert('Failed to roll back version: ' + e.message);
    }
  }
}
