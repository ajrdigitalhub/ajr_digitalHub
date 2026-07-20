import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketplaceService } from '../../../services/marketplace.service';
import { MatIconModule } from '@angular/material/icon';
import { EditorComponent } from '../marketplace-editor/editor.component';
import { PreviewComponent } from '../marketplace-preview/preview.component';
import { MarketplaceSidebarComponent, BuilderTemplate } from './marketplace-sidebar.component';
import { MarketplaceToolbarComponent } from './marketplace-toolbar.component';

interface MarketplaceItem {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  html_content: string;
  css_content?: string;
  status: string;
  created_at?: Date;
}

@Component({
  selector: 'app-marketplace-config',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatIconModule, 
    EditorComponent, 
    PreviewComponent,
    MarketplaceSidebarComponent,
    MarketplaceToolbarComponent
  ],
  templateUrl: './marketplace-config.component.html'
})
export class MarketplaceConfigComponent implements OnInit {
  private marketplaceService = inject(MarketplaceService);
  
  items = signal<MarketplaceItem[]>([]);
  activeItem = signal<Partial<MarketplaceItem> | null>(null);
  isLoading = signal(false);
  isSaving = signal(false);
  currentDevice = signal('desktop');
  
  ngOnInit() {
    this.loadItems();
  }
  
  loadItems() {
    this.isLoading.set(true);
    this.marketplaceService.getAdminItems().subscribe({
      next: (res: any) => {
        const rawItems = Array.isArray(res) ? res : (res?.data || []);
        this.items.set(rawItems);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }
  
  createNew() {
    this.activeItem.set({
      title: 'New Dynamic Asset',
      description: 'A dynamic UI block created with the builder.',
      price: 19.99,
      category: 'Hero',
      html_content: '',
      status: 'active'
    });
  }

  onSelectTemplate(template: any) {
     const item = this.activeItem();
     if (item) {
        this.activeItem.set({
          ...item,
          html_content: template.html || '',
          css_content: template.css || ''
        });
     }
  }
  
  editItem(item: MarketplaceItem) {
    this.activeItem.set({ ...item });
  }
  
  deleteItem(id: number) {
    if (confirm('Are you sure you want to delete this custom item?')) {
      this.marketplaceService.deleteAdminItem(id).subscribe(() => {
        this.loadItems();
        if (this.activeItem()?.id === id) {
          this.activeItem.set(null);
        }
      });
    }
  }
  
  updateActiveItem(item: any) {
    this.activeItem.set(item);
  }

  saveItem() {
    const item = this.activeItem() as any;
    if (!item || !item.title) return;
    
    this.isSaving.set(true);
    const payload = {
      ...item,
      title: item.title || item.name || 'Unnamed Asset',
      name: item.title || item.name || 'Unnamed Asset',
      description: item.description || '',
      price: parseFloat(item.price as any) || 0,
      category: item.category || 'Uncategorized',
      html: item.html_content || '',
      html_content: item.html_content || '',
      css: item.css_content || '',
      css_content: item.css_content || '',
      js: item.js || '',
      meta: item.meta || {},
      version: item.version || '1.0.0',
      image: item.image || item.image_url || 'https://picsum.photos/seed/placeholder/800/600',
      image_url: item.image || item.image_url || 'https://picsum.photos/seed/placeholder/800/600',
      status: item.status || 'active'
    };

    if (item.id) {
      this.marketplaceService.updateAdminItem(item.id, payload).subscribe({
        next: () => {
          this.loadItems();
          this.isSaving.set(false);
          this.activeItem.set(null);
        },
        error: () => this.isSaving.set(false)
      });
    } else {
      this.marketplaceService.createAdminItem(payload).subscribe({
        next: (res: any) => {
          this.loadItems();
          this.isSaving.set(false);
          this.activeItem.set(null);
        },
        error: () => this.isSaving.set(false)
      });
    }
  }
  
  cancelEdit() {
    this.activeItem.set(null);
  }
}
