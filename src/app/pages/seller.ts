import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-seller-portal',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  templateUrl: './seller.html'
})
export class SellerPortalComponent {
  private api = inject(ApiService);
  isSubmitted = signal(false);
  isUploading = signal(false);
  previewUrl = signal<string | null>(null);
  
  asset = {
    title: '',
    category: 'SaaS Template',
    price: 0,
    description: '',
    image_url: ''
  };

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.isUploading.set(true);
      this.api.uploadImage(file).subscribe({
        next: (res) => {
          this.previewUrl.set(res.url);
          this.asset.image_url = res.url;
          this.isUploading.set(false);
        },
        error: (err) => {
          console.error('Upload failed:', err);
          this.isUploading.set(false);
        }
      });
    }
  }

  submitAsset() {
    if (!this.asset.title || !this.asset.image_url) return;

    this.api.createSellerProduct(this.asset).subscribe({
      next: () => {
        this.isSubmitted.set(true);
        this.asset = { title: '', category: 'SaaS Template', price: 0, description: '', image_url: '' };
        this.previewUrl.set(null);
        setTimeout(() => this.isSubmitted.set(false), 3000);
      },
      error: (err) => console.error('Failed to submit asset:', err)
    });
  }
}
