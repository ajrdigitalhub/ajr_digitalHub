import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminData } from '../../services/admin-data';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, RouterLink],
  templateUrl: './services.html'
})
export class ServicesComponent {
  private adminData = inject(AdminData);
  isServicesFeatureActive = computed(() => this.adminData.websiteConfig().features.services);

  pages = signal(5);
  complexity = signal('standard'); // standard, premium, enterprise
  integrations = signal(false);
  fastDelivery = signal(false);

  estimatedPrice = computed(() => {
    let base = this.pages() * 150;
    
    if (this.complexity() === 'premium') base *= 1.5;
    if (this.complexity() === 'enterprise') base *= 2.5;
    
    if (this.integrations()) base += 500;
    if (this.fastDelivery()) base += 300;
    
    return base;
  });

  updatePages(val: number) {
    if (val >= 1 && val <= 50) this.pages.set(val);
  }
}
