import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AdminData } from '../../services/admin-data';

@Component({
  selector: 'app-seller-portal',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  templateUrl: './seller.html'
})
export class SellerPortalComponent {
  private apiService = inject(ApiService);
  private adminData = inject(AdminData);

  siteName = computed(() => this.adminData.websiteConfig().siteName);
  
  isSubmitted = signal(false);
  product = {
    title: '',
    description: '',
    price: 0,
    category: 'Design',
    imageUrl: ''
  };

  submitAsset() {
    this.apiService.createSellerProduct(this.product).subscribe({
      next: () => {
        this.isSubmitted.set(true);
        this.resetForm();
        setTimeout(() => this.isSubmitted.set(false), 3000);
      },
      error: (err) => alert('Failed to create product: ' + err.error?.error)
    });
  }

  resetForm() {
    this.product = {
      title: '',
      description: '',
      price: 0,
      category: 'Design',
      imageUrl: ''
    };
  }
}
