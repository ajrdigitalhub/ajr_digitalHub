import { Injectable, inject, PLATFORM_ID, signal, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NotificationService } from './notification.service';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationManagerService {
  private platformId = inject(PLATFORM_ID);
  backend = inject(NotificationService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);

  isBrowser = isPlatformBrowser(this.platformId);
  isSupported = false;
  fcmToken = signal<string | null>(null);

  notifications = signal<any[]>([]);
  unreadCount = signal<number>(0);
  
  private messageSource = new BehaviorSubject<any>(null);
  currentMessage = this.messageSource.asObservable();

  constructor() {
    if (this.isBrowser) {
      this.isSupported = 
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      effect(() => {
        const user = this.auth.currentUser();
        if (user) {
          if (this.isSupported) {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                this.initFCM().then(initialized => {
                  if (initialized) {
                    this.requestPermissionAndGetToken();
                  }
                });
              } else {
                console.warn('[FCM] Browser notification permission is not granted:', permission);
              }
            });
          }
          this.loadUserNotifications();
        } else {
          this.notifications.set([]);
          this.unreadCount.set(0);
        }
      });
    }
  }

  loadUserNotifications() {
    if (!this.auth.currentUser()) return;

    this.backend.getMyNotifications().subscribe({
      next: (res) => {
        this.notifications.set(res || []);
      },
      error: (err) => console.error('[FCM Manager] Failed to load user notifications history:', err)
    });

    this.backend.getUnreadCount().subscribe({
      next: (res) => {
        this.unreadCount.set(res?.count || 0);
      },
      error: (err) => console.error('[FCM Manager] Failed to load unread count:', err)
    });
  }

  async initFCM(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('[FCM] Push notifications are not supported on this browser/platform.');
      return false;
    }

    try {
      const settings = await this.backend.getSettings().toPromise();
      if (!settings || !settings.enabled || !settings.vapid_key || !settings.firebase_config) {
        console.log('[FCM] Notifications settings are empty or disabled.');
        return false;
      }

      const apps = getApps();
      const firebaseApp = apps.find(a => a.name === 'fcm-app') || initializeApp(settings.firebase_config, 'fcm-app');
      const messaging = getMessaging(firebaseApp);

      const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
      console.log('[FCM] Service worker registered.');

      if (reg.active) {
        reg.active.postMessage({
          type: 'INITIALIZE_FCM',
          config: settings.firebase_config
        });
      } else {
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          installing?.addEventListener('statechange', () => {
            if (installing.state === 'activated' && reg.active) {
              reg.active.postMessage({
                type: 'INITIALIZE_FCM',
                config: settings.firebase_config
              });
            }
          });
        });
      }

      onMessage(messaging, (payload) => {
        console.log('[FCM] Foreground notification received:', payload);
        this.messageSource.next(payload);
        
        const title = payload.notification?.title || payload.data?.['title'] || 'Notification';
        const body = payload.notification?.body || payload.data?.['body'] || '';
        this.toast.info(`${title}: ${body}`, 5000);

        this.loadUserNotifications();
      });

      return true;
    } catch (err) {
      console.error('[FCM] Initialization failed:', err);
      return false;
    }
  }

  async requestPermissionAndGetToken(): Promise<string | null> {
    if (!this.isSupported) return null;

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const settings = await this.backend.getSettings().toPromise();
        if (!settings || !settings.enabled || !settings.vapid_key || !settings.firebase_config) {
          return null;
        }

        const apps = getApps();
        const firebaseApp = apps.find(a => a.name === 'fcm-app') || initializeApp(settings.firebase_config, 'fcm-app');
        const messaging = getMessaging(firebaseApp);
        const registration = await navigator.serviceWorker.ready;

        const token = await getToken(messaging, {
          vapidKey: settings.vapid_key,
          serviceWorkerRegistration: registration
        });

        if (token) {
          this.fcmToken.set(token);
          
          const ua = navigator.userAgent;
          const language = navigator.language;
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          
          await this.backend.saveToken({
            token,
            browser: this.getBrowserName(ua),
            os: this.getOSName(ua),
            device: this.getDeviceType(ua),
            language,
            timezone
          }).toPromise();
          
          return token;
        }
      } else {
        console.warn('[FCM] Permission was denied.');
      }
      return null;
    } catch (err) {
      console.error('[FCM] Error requesting permission/token:', err);
      return null;
    }
  }

  async deleteToken(): Promise<void> {
    const activeToken = this.fcmToken();
    if (!activeToken) return;

    try {
      await this.backend.deleteToken(activeToken).toPromise();
      this.fcmToken.set(null);
    } catch (err) {
      console.error('[FCM] Error deleting token:', err);
    }
  }

  private getBrowserName(ua: string): string {
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Other';
  }

  private getOSName(ua: string): string {
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'MacOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Other';
  }

  private getDeviceType(ua: string): string {
    if (/Mobi|Android|iPhone/i.test(ua)) return 'Mobile';
    if (/Tablet|iPad/i.test(ua)) return 'Tablet';
    return 'Desktop';
  }
}
