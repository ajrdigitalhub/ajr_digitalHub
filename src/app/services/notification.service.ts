import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private api = inject(ApiService);

  saveToken(payload: { token: string; browser?: string; device?: string; os?: string; language?: string; timezone?: string }): Observable<any> {
    return this.api.post<any>('/notifications/token', payload);
  }

  deleteToken(token: string): Observable<any> {
    return this.api.delete<any>('/notifications/token', {
      headers: {},
      params: {},
      observe: 'body',
      responseType: 'json'
    });
  }

  getSettings(): Observable<any> {
    return this.api.get<any>('/notifications/settings');
  }

  getAdminSettings(): Observable<any> {
    return this.api.get<any>('/notifications/admin/settings'); // Wait! Admin panel might need this or can use the same
  }

  saveSettings(settings: any): Observable<any> {
    return this.api.post<any>('/notifications/admin/settings', settings);
  }

  getHistory(): Observable<any[]> {
    return this.api.get<any[]>('/notifications/admin/history');
  }

  getLogs(): Observable<any[]> {
    return this.api.get<any[]>('/notifications/admin/logs');
  }

  sendToUser(payload: { userId: string; title: string; body: string; image?: string; url?: string; customData?: any }): Observable<any> {
    return this.api.post<any>('/notifications/admin/send-to-user', payload);
  }

  sendBroadcast(payload: { title: string; body: string; image?: string; url?: string; customData?: any }): Observable<any> {
    return this.api.post<any>('/notifications/admin/send-broadcast', payload);
  }

  sendTest(): Observable<any> {
    return this.api.post<any>('/notifications/admin/test', {});
  }
}
