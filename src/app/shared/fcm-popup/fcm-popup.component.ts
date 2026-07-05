import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NotificationManagerService } from '../../services/notification-manager.service';

@Component({
  selector: 'app-fcm-popup',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (isVisible()) {
      <div class="fcm-popup-overlay">
        <div class="fcm-popup-card animate-slide-up">
          <div class="fcm-popup-header">
            <div class="fcm-bell-wrapper">
              <mat-icon class="fcm-bell-icon">notifications_active</mat-icon>
            </div>
            <h3>Stay Updated</h3>
          </div>
          
          <div class="fcm-popup-body">
            <p class="description">Enable push notifications to receive real-time updates and alerts:</p>
            <ul class="benefits">
              <li>
                <mat-icon class="bullet-icon">check_circle</mat-icon>
                <span>Billing reminders & Invoice updates</span>
              </li>
              <li>
                <mat-icon class="bullet-icon">check_circle</mat-icon>
                <span>WhatsApp delivery status alerts</span>
              </li>
              <li>
                <mat-icon class="bullet-icon">check_circle</mat-icon>
                <span>Campaign and Marketplace updates</span>
              </li>
              <li>
                <mat-icon class="bullet-icon">check_circle</mat-icon>
                <span>System maintenance announcements</span>
              </li>
            </ul>
          </div>
          
          <div class="fcm-popup-actions">
            <button (click)="onAllow()" class="btn-allow">Allow Notifications</button>
            <button (click)="onLater()" class="btn-later">Maybe Later</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .fcm-popup-overlay {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      max-width: 380px;
      width: calc(100% - 48px);
    }
    .fcm-popup-card {
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      padding: 24px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      color: #ffffff;
      font-family: inherit;
    }
    .fcm-popup-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }
    .fcm-bell-wrapper {
      background: linear-gradient(135deg, #6366f1, #a855f7);
      border-radius: 16px;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 16px rgba(99, 102, 241, 0.3);
    }
    .fcm-bell-icon {
      color: #ffffff;
      font-size: 24px;
      width: 24px;
      height: 24px;
      animation: swing 2s infinite ease-in-out;
    }
    .fcm-popup-header h3 {
      font-size: 20px;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .fcm-popup-body {
      margin-bottom: 20px;
    }
    .description {
      font-size: 13px;
      color: #94a3b8;
      margin: 0 0 12px 0;
      line-height: 1.5;
    }
    .benefits {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .benefits li {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 13px;
      color: #cbd5e1;
    }
    .bullet-icon {
      color: #10b981;
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-top: 2px;
    }
    .fcm-popup-actions {
      display: flex;
      gap: 12px;
    }
    .btn-allow {
      flex: 1;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: #ffffff;
      border: none;
      border-radius: 14px;
      padding: 12px 16px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
    }
    .btn-allow:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(99, 102, 241, 0.35);
    }
    .btn-later {
      background: rgba(255, 255, 255, 0.05);
      color: #94a3b8;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 12px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-later:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }
    
    @keyframes swing {
      0%, 100% { transform: rotate(0); }
      10% { transform: rotate(15deg); }
      20% { transform: rotate(-10deg); }
      30% { transform: rotate(5deg); }
      40% { transform: rotate(-5deg); }
      50% { transform: rotate(0); }
    }
    
    .animate-slide-up {
      animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class FcmPopupComponent implements OnInit {
  private fcmManager = inject(NotificationManagerService);
  isVisible = signal<boolean>(false);

  ngOnInit() {
    this.checkVisibility();
  }

  private checkVisibility() {
    if (!this.fcmManager.isSupported || !this.fcmManager.isBrowser) return;

    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      return;
    }

    const dismissedTime = localStorage.getItem('fcm_dismissed_time');
    if (dismissedTime) {
      const past = parseInt(dismissedTime);
      const now = Date.now();
      const diffDays = (now - past) / (1000 * 60 * 60 * 24);
      if (diffDays < 7) {
        return;
      }
    }

    // Show the custom popup immediately to let the user trigger the permission prompt via button click (user gesture)
    this.isVisible.set(true);
  }

  onAllow() {
    this.isVisible.set(false);
    this.fcmManager.requestPermissionAndGetToken();
  }

  onLater() {
    this.isVisible.set(false);
    localStorage.setItem('fcm_dismissed_time', Date.now().toString());
  }
}
