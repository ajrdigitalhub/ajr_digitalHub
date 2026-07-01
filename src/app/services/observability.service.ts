import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ObservabilityService {
  private apiService = inject(ApiService);

  getLogs(appId: string, filters: any): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params = params.set(key, filters[key].toString());
      }
    });
    return this.apiService.get<any>(`/admin/apps/${appId}/observability/logs`, { params });
  }

  getMetrics(appId: string, timeRange: string): Observable<any> {
    const params = new HttpParams().set('timeRange', timeRange);
    return this.apiService.get<any>(`/admin/apps/${appId}/observability/metrics`, { params });
  }

  getChartData(appId: string, timeRange: string): Observable<any[]> {
    const params = new HttpParams().set('timeRange', timeRange);
    return this.apiService.get<any[]>(`/admin/apps/${appId}/observability/chart-data`, { params });
  }

  getAlerts(appId: string): Observable<any[]> {
    return this.apiService.get<any[]>(`/admin/apps/${appId}/observability/alerts`);
  }

  connectFirestoreLiveStream(appId: string): Observable<any[]> {
    return new Observable(subscriber => {
      const q = query(
        collection(db, 'api_logs'),
        where('appId', '==', appId),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const logs = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            appId: data['appId'],
            endpoint: data['endpoint'],
            method: data['method'],
            status: data['status'],
            latency: data['latency'],
            source: data['source'],
            timestamp: data['timestamp'],
            time: new Date(data['timestamp']).toLocaleTimeString()
          };
        });
        subscriber.next(logs);
      }, err => {
        console.error('Firestore live stream failed (ensure index appId + timestamp is created):', err);
        // Fallback or bubble error
        subscriber.error(err);
      });
      return () => unsubscribe();
    });
  }

  subscribeToMetrics(appId: string): Observable<any> {
    return new Observable(subscriber => {
      const unsub = onSnapshot(doc(db, 'metrics', appId), (snapshot) => {
        if (snapshot.exists()) {
          subscriber.next(snapshot.data());
        } else {
          subscriber.next(null);
        }
      }, err => {
        console.error('Firestore metrics subscription failed:', err);
        subscriber.next(null);
      });
      return () => unsub();
    });
  }
}
