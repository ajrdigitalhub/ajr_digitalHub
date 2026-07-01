import { Injectable, inject } from '@angular/core';
import { ApiService, Product } from './api.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MarketplaceService {
  private apiService = inject(ApiService);

  getProducts(category?: string, search?: string): Observable<Product[]> {
    return this.apiService.get<Product[]>('/dynamic/marketplace', {
      params: {
        ...(category ? { category } : {}),
        ...(search ? { search } : {})
      }
    });
  }

  getPublicItems(category?: string, search?: string): Observable<any[]> {
    return this.apiService.get<any[]>('/marketplace', {
      params: {
        ...(category && category !== 'All' ? { category } : {}),
        ...(search ? { search } : {})
      }
    });
  }

  purchaseProduct(productId: number, amount: number): Observable<any> {
    return this.apiService.post('/dynamic/orders', { productId, amount, status: 'pending' });
  }

  getAdminItems(): Observable<any[]> {
    return this.apiService.get<any[]>('/admin/marketplace');
  }

  createAdminItem(item: any): Observable<any> {
    return this.apiService.post('/admin/marketplace', item);
  }

  updateAdminItem(id: number | string, item: any): Observable<any> {
    return this.apiService.put(`/admin/marketplace/${id}`, item);
  }

  deleteAdminItem(id: number | string): Observable<any> {
    return this.apiService.delete(`/admin/marketplace/${id}`);
  }
}
