import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { LandingConfigType } from '../pages/home/home';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // Generic dynamic helper methods
  get<T>(endpoint: string, options?: {
    headers?: any;
    params?: any;
    observe?: 'body';
    responseType?: any;
  }): Observable<T> {
    const formattedEndpoint = this.formatEndpoint(endpoint);
    return this.http.get(formattedEndpoint, options as any) as unknown as Observable<T>;
  }

  post<T>(endpoint: string, body: any, options?: {
    headers?: any;
    params?: any;
    observe?: 'body';
    responseType?: any;
  }): Observable<T> {
    const formattedEndpoint = this.formatEndpoint(endpoint);
    return this.http.post(formattedEndpoint, body, options as any) as unknown as Observable<T>;
  }

  put<T>(endpoint: string, body: any, options?: {
    headers?: any;
    params?: any;
    observe?: 'body';
    responseType?: any;
  }): Observable<T> {
    const formattedEndpoint = this.formatEndpoint(endpoint);
    return this.http.put(formattedEndpoint, body, options as any) as unknown as Observable<T>;
  }

  delete<T>(endpoint: string, options?: {
    headers?: any;
    params?: any;
    observe?: 'body';
    responseType?: any;
  }): Observable<T> {
    const formattedEndpoint = this.formatEndpoint(endpoint);
    return this.http.delete(formattedEndpoint, options as any) as unknown as Observable<T>;
  }

  private formatEndpoint(endpoint: string): string {
    const baseUrl = environment.apiBaseUrl || '/api';
    
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }

    const clean = endpoint.startsWith('/') ? endpoint : '/' + endpoint;

    if (clean.startsWith(baseUrl)) {
      return clean;
    }

    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    if (clean.startsWith('/api/')) {
      return `${cleanBaseUrl}/${clean.substring(5)}`;
    }

    return `${cleanBaseUrl}${clean}`;
  }

  // Landing Page
  getLandingConfig() {
    return this.get<LandingConfigType>('/settings/landing_config');
  }

  saveLandingConfig(config: LandingConfigType | null) {
    return this.put('/admin/settings/landing_config', config);
  }

  // Marketplace
  getProducts(category?: string, search?: string) {
    let params = new HttpParams();
    if (category) params = params.set('category', category);
    if (search) params = params.set('search', search);
    return this.get<Product[]>('/dynamic/marketplace', { params });
  }

  purchaseProduct(productId: number, amount: number) {
    return this.post('/dynamic/orders', { productId, amount, status: 'pending' });
  }

  // Client Dashboard
  getClientOrders() {
    return this.get<unknown[]>('/dynamic/orders');
  }

  getClientTickets() {
    return this.get<unknown[]>('/dynamic/tickets');
  }

  getKanban() {
    return this.get<unknown[]>('/dynamic/kanban_tasks');
  }

  updateTaskStatus(id: string, status: string) {
    return this.put(`/dynamic/kanban_tasks/${id}`, { status });
  }

  // Seller
  createSellerProduct(product: Partial<Product>) {
    return this.post('/dynamic/marketplace', product);
  }

  // Admin SaaS
  getApps() {
    return this.get<unknown[]>('/dynamic/apps');
  }

  provisionApp(payload: any) {
    return this.post<any>('/admin/apps/provision', payload);
  }

  getPlans() {
    return this.get<unknown[]>('/dynamic/plans');
  }

  getAnalytics(appId?: number, daysRange = 7) {
    let params = new HttpParams().set('daysRange', daysRange.toString());
    if (appId) params = params.set('appId', appId.toString());
    return this.get<unknown>('/admin/analytics', { params });
  }

  getUsageLogs(appId: number) {
    return this.get<unknown[]>(`/admin/apps/${appId}/usage-logs`);
  }

  getWhatsappLogs(appId: number) {
    return this.get<unknown[]>(`/admin/apps/${appId}/whatsapp-logs`);
  }

  // HTML Builder
  getTemplates(appId: number) {
    return this.get<unknown[]>(`/admin/apps/${appId}/html-templates`);
  }

  saveTemplate(appId: number, template: unknown) {
    return this.post(`/admin/apps/${appId}/html-templates`, template);
  }

  onClickTemplate(appId: number, id: number) {
    return this.post(`/admin/apps/${appId}/html-templates/${id}/publish`, {});
  }

  publishTemplate(appId: number, id: number) {
    return this.post(`/admin/apps/${appId}/html-templates/${id}/publish`, {});
  }

  getTestimonials() {
    return this.get<any[]>('/dynamic/testimonials');
  }

  // --- Dynamic Global Menus ---
  getMenus() {
    return this.get<any[]>('/menus');
  }

  createAdminMenu(menuItem: any) {
    return this.post('/admin/menus', menuItem);
  }

  updateAdminMenu(id: number, menuItem: any) {
    return this.put(`/admin/menus/${id}`, menuItem);
  }

  deleteAdminMenu(id: number) {
    return this.delete(`/admin/menus/${id}`);
  }

  // --- Dynamic Categories ---
  getHttpCategories() {
    return this.get<any[]>('/categories');
  }

  createAdminCategory(category: any) {
    return this.post('/admin/categories', category);
  }

  // --- Custom Pages ---
  getPage(slug: string) {
    return this.get<any>(`/pages/${slug}`);
  }

  getPagesSettings() {
    return this.get<any[]>('/settings/pages');
  }

  savePageSettings(page: any) {
    return this.post('/admin/pages', page);
  }

  // --- Upload ---
  uploadImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);
    return this.post<{ url: string }>('/admin/upload', formData);
  }
}
