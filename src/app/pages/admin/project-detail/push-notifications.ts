import { Component, ChangeDetectionStrategy, input, inject, signal, computed, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ProjectData } from '../../../services/project-detail.service';
import { FirebaseMonitorService } from '../../../services/firebase-monitor.service';
import { AdminStoreService } from '../../../services/admin-store.service';

@Component({
  selector: 'app-project-push-notifications',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatIconModule],
  styles: [`
    .tab-btn {
      padding: 6px 16px;
      border-radius: 6px;
      font-size: 12px;
      transition: all 0.2s;
      cursor: pointer;
      border: 1px solid transparent;
      display: inline-flex;
      align-items: center;
    }
    .tab-btn.active {
      background: rgba(139,92,246,0.15);
      border-color: rgba(139,92,246,0.3);
      color: #a78bfa;
      font-weight: 700;
    }
    .tab-btn.inactive {
      color: var(--app-muted, #94a3b8);
      border-color: transparent;
    }
    .tab-btn.inactive:hover { color: var(--app-text, #e2e8f0); }

    .guide-step {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      padding: 16px;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      transition: all 0.2s;
    }
    .guide-step:hover { background: rgba(255,255,255,0.04); border-color: rgba(139,92,246,0.2); }

    .step-num {
      width: 32px; height: 32px;
      min-width: 32px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700;
      background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(124,58,237,0.4);
    }

    .code-chip {
      display: inline-block;
      background: rgba(0,0,0,0.4);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      padding: 2px 8px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 11px;
      color: #a78bfa;
    }

    .stat-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 14px;
      padding: 16px;
      transition: all 0.2s;
    }
    .stat-card:hover { background: rgba(255,255,255,0.05); transform: translateY(-1px); }

    .notification-preview {
      background: linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(79,70,229,0.06) 100%);
      border: 1px solid rgba(124,58,237,0.2);
      border-radius: 14px;
      padding: 14px;
      position: relative;
      overflow: hidden;
    }
    .notification-preview::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg, #7c3aed, #4f46e5, #06b6d4);
    }

    .target-btn {
      flex: 1; padding: 10px 8px;
      border-radius: 10px; border: 1px solid;
      text-align: center; cursor: pointer;
      transition: all 0.2s; font-size: 11px; font-weight: 700;
      user-select: none;
    }
    .target-btn.drivers.active { background: rgba(244,63,94,0.15); border-color: rgba(244,63,94,0.5); color: #fb7185; }
    .target-btn.drivers.inactive { background: rgba(244,63,94,0.04); border-color: rgba(244,63,94,0.15); color: rgba(251,113,133,0.6); }
    .target-btn.drivers.inactive:hover { background: rgba(244,63,94,0.08); }
    .target-btn.customers.active { background: rgba(59,130,246,0.15); border-color: rgba(59,130,246,0.5); color: #60a5fa; }
    .target-btn.customers.inactive { background: rgba(59,130,246,0.04); border-color: rgba(59,130,246,0.15); color: rgba(96,165,250,0.6); }
    .target-btn.customers.inactive:hover { background: rgba(59,130,246,0.08); }
    .target-btn.both.active { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.5); color: #fbbf24; }
    .target-btn.both.inactive { background: rgba(245,158,11,0.04); border-color: rgba(245,158,11,0.15); color: rgba(251,191,36,0.6); }
    .target-btn.both.inactive:hover { background: rgba(245,158,11,0.08); }

    .input-field {
      width: 100%;
      padding: 10px 12px;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      font-size: 12px;
      color: var(--app-text, #e2e8f0);
      outline: none;
      transition: border-color 0.2s;
      font-family: inherit;
    }
    .input-field:focus { border-color: rgba(124,58,237,0.5); box-shadow: 0 0 0 2px rgba(124,58,237,0.1); }
    .input-field::placeholder { color: rgba(148,163,184,0.5); }

    .send-btn {
      background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
      color: white; border: 1px solid rgba(124,58,237,0.5);
      box-shadow: 0 4px 16px rgba(124,58,237,0.3);
    }
    .send-btn:hover:not(:disabled) { box-shadow: 0 6px 20px rgba(124,58,237,0.5); transform: translateY(-1px); }
    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .history-item {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px; padding: 14px;
      transition: all 0.2s;
    }
    .history-item:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.1); }

    .badge { border-radius: 6px; padding: 2px 8px; font-size: 10px; font-weight: 700; font-family: monospace; }

    @keyframes shimmer { 0%,100% { opacity:0.5; } 50% { opacity:1; } }
    .shimmer { animation: shimmer 2s ease-in-out infinite; }
  `],
  template: `
    <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10 max-w-5xl space-y-6">

      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-app-text flex items-center gap-2">
            <span class="w-8 h-8 rounded-lg flex items-center justify-center text-violet-400" style="background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.3)">
              <mat-icon class="!w-5 !h-5 !text-[18px]">campaign</mat-icon>
            </span>
            Push Notifications
          </h2>
          <p class="text-xs text-app-muted mt-1">
            Send real-time alerts to drivers, customers, or all users via Firebase Cloud Messaging
          </p>
        </div>
        <div class="flex gap-1.5 bg-app-bg border border-app-border p-1 rounded-xl shrink-0">
          <button (click)="activeTab.set('send')" [class]="activeTab() === 'send' ? 'active' : 'inactive'" class="tab-btn">
            <mat-icon class="!w-3.5 !h-3.5 !text-[14px] align-middle mr-1">send</mat-icon> Send
          </button>
          <button (click)="activeTab.set('guide')" [class]="activeTab() === 'guide' ? 'active' : 'inactive'" class="tab-btn">
            <mat-icon class="!w-3.5 !h-3.5 !text-[14px] align-middle mr-1">school</mat-icon> Setup Guide
          </button>
          <button (click)="activeTab.set('config')" [class]="activeTab() === 'config' ? 'active' : 'inactive'" class="tab-btn">
            <mat-icon class="!w-3.5 !h-3.5 !text-[14px] align-middle mr-1">tune</mat-icon> Config
          </button>
        </div>
      </div>

      <!-- ──────────────── SEND TAB ──────────────── -->
      @if (activeTab() === 'send') {
        <!-- Subscriber Stats Row -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="stat-card">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-rose-400 text-[18px]">🚚</span>
              <span class="text-[10px] font-bold uppercase tracking-widest text-app-muted">Drivers</span>
            </div>
            <div class="text-2xl font-black text-app-text font-mono">{{ driversCount() }}</div>
            <div class="text-[10px] text-app-muted mt-0.5">registered devices</div>
          </div>
          <div class="stat-card">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-blue-400 text-[18px]">👤</span>
              <span class="text-[10px] font-bold uppercase tracking-widest text-app-muted">Customers</span>
            </div>
            <div class="text-2xl font-black text-app-text font-mono">{{ customersCount() }}</div>
            <div class="text-[10px] text-app-muted mt-0.5">registered devices</div>
          </div>
          <div class="stat-card">
            <div class="flex items-center gap-2 mb-2">
              <mat-icon class="text-emerald-400 !w-4 !h-4 !text-[16px]">devices</mat-icon>
              <span class="text-[10px] font-bold uppercase tracking-widest text-app-muted">Total</span>
            </div>
            <div class="text-2xl font-black text-app-text font-mono">{{ bothCount() }}</div>
            <div class="text-[10px] text-app-muted mt-0.5">all subscribers</div>
          </div>
          <div class="stat-card">
            <div class="flex items-center gap-2 mb-2">
              <mat-icon class="text-violet-400 !w-4 !h-4 !text-[16px]">mark_email_read</mat-icon>
              <span class="text-[10px] font-bold uppercase tracking-widest text-app-muted">Sent</span>
            </div>
            <div class="text-2xl font-black text-app-text font-mono">{{ logs().length }}</div>
            <div class="text-[10px] text-app-muted mt-0.5">announcements total</div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <!-- Compose Panel -->
          <div class="lg:col-span-2 bg-app-card border border-app-border rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:linear-gradient(135deg,rgba(124,58,237,0.2),rgba(79,70,229,0.15));border:1px solid rgba(124,58,237,0.3)">
                <mat-icon class="text-violet-400 !w-5 !h-5 !text-[20px]">edit_notifications</mat-icon>
              </div>
              <div>
                <h3 class="text-sm font-bold text-app-text">Compose Announcement</h3>
                <p class="text-[11px] text-app-muted">Push notification + in-app alert</p>
              </div>
            </div>

            <!-- Target selector -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-widest text-app-muted mb-2">Send To</label>
              <div class="flex gap-2">
                <button (click)="selectedTarget.set('drivers')"
                        [class]="'target-btn drivers ' + (selectedTarget() === 'drivers' ? 'active' : 'inactive')">
                  🚚 Drivers
                  <div class="text-[10px] font-normal opacity-70 mt-0.5">{{ driversCount() }} devices</div>
                </button>
                <button (click)="selectedTarget.set('customers')"
                        [class]="'target-btn customers ' + (selectedTarget() === 'customers' ? 'active' : 'inactive')">
                  👤 Customers
                  <div class="text-[10px] font-normal opacity-70 mt-0.5">{{ customersCount() }} devices</div>
                </button>
                <button (click)="selectedTarget.set('both')"
                        [class]="'target-btn both ' + (selectedTarget() === 'both' ? 'active' : 'inactive')">
                  📣 All Users
                  <div class="text-[10px] font-normal opacity-70 mt-0.5">{{ bothCount() }} devices</div>
                </button>
              </div>
              @if (targetCount() === 0) {
                <div class="mt-2 flex items-center gap-2 p-2.5 rounded-lg text-[11px]"
                     style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);color:#fbbf24">
                  <mat-icon class="!w-4 !h-4 !text-[15px]">warning_amber</mat-icon>
                  No registered devices for this segment. Notification will be simulated.
                </div>
              }
            </div>

            <!-- Title -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-widest text-app-muted mb-1.5">Title</label>
              <input type="text" [(ngModel)]="triggerPayload.title"
                     placeholder="e.g. New Order Available!"
                     class="input-field">
              <div class="text-[10px] text-app-muted mt-1">📢 emoji is prepended automatically</div>
            </div>

            <!-- Message -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-widest text-app-muted mb-1.5">Message</label>
              <textarea rows="3" [(ngModel)]="triggerPayload.body"
                        placeholder="Write your announcement here..."
                        class="input-field resize-none"></textarea>
              <div class="text-[10px] text-app-muted mt-1">{{ triggerPayload.body.length }}/250 characters</div>
            </div>

            <!-- Optional fields toggle -->
            <div>
              <button (click)="showAdvanced.set(!showAdvanced())"
                      class="flex items-center gap-1.5 text-[11px] text-app-muted hover:text-app-text transition cursor-pointer">
                <mat-icon class="!w-4 !h-4 !text-[14px]" [class]="showAdvanced() ? 'rotate-90' : ''">chevron_right</mat-icon>
                Advanced Options (Image URL, Deep Link)
              </button>
              @if (showAdvanced()) {
                <div class="mt-3 space-y-3">
                  <div>
                    <label class="block text-[10px] font-bold uppercase tracking-widest text-app-muted mb-1.5">Image URL (optional)</label>
                    <input type="url" [(ngModel)]="triggerPayload.image"
                           placeholder="https://example.com/banner.jpg"
                           class="input-field">
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold uppercase tracking-widest text-app-muted mb-1.5">Click URL / Deep Link (optional)</label>
                    <input type="url" [(ngModel)]="triggerPayload.url"
                           placeholder="https://yourapp.com/orders"
                           class="input-field">
                  </div>
                </div>
              }
            </div>

            <!-- Quick Templates -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-widest text-app-muted mb-2">Quick Templates</label>
              <div class="flex flex-wrap gap-1.5">
                @for (tmpl of templates; track tmpl.label) {
                  <button (click)="applyTemplate(tmpl)"
                          class="px-2.5 py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition"
                          style="background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.2);color:#a78bfa"
                          [title]="tmpl.body">
                    {{ tmpl.label }}
                  </button>
                }
              </div>
            </div>

            <!-- Live Preview -->
            <div class="notification-preview">
              <div class="text-[10px] font-bold uppercase tracking-widest mb-2" style="color:rgba(167,139,250,0.7)">📱 Notification Preview</div>
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
                     style="background:linear-gradient(135deg,#7c3aed,#4f46e5)">
                  <mat-icon class="text-white !w-5 !h-5 !text-[20px]">notifications</mat-icon>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-[13px] font-black text-app-text truncate leading-tight">
                    📢 {{ triggerPayload.title || 'Your Title Here' }}
                  </div>
                  <div class="text-[11px] text-app-muted mt-0.5 line-clamp-2">
                    {{ triggerPayload.body || 'Your message will appear here...' }}
                  </div>
                  <div class="text-[9px] text-app-muted mt-1 opacity-60">Just now · Your App</div>
                </div>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="flex gap-2 pt-1 border-t border-app-border">
              <button (click)="clearAnnouncement()"
                      class="flex-1 py-2.5 bg-transparent border border-app-border hover:bg-app-card text-app-muted rounded-xl text-xs font-bold transition cursor-pointer">
                Clear
              </button>
              <button (click)="sendAnnouncement()"
                      [disabled]="isSendingNotification() || !triggerPayload.title.trim() || !triggerPayload.body.trim()"
                      class="flex-[2] py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 send-btn">
                @if (isSendingNotification()) {
                  <mat-icon class="!w-3.5 !h-3.5 !text-[14px] animate-spin">sync</mat-icon>
                  Sending...
                } @else {
                  <mat-icon class="!w-3.5 !h-3.5 !text-[14px]" style="transform:rotate(-25deg) translateY(-1px)">send</mat-icon>
                  Send to {{ targetCount() }} Device{{ targetCount() !== 1 ? 's' : '' }}
                }
              </button>
            </div>
          </div>

          <!-- History Panel -->
          <div class="lg:col-span-3 bg-app-card border border-app-border rounded-2xl flex flex-col overflow-hidden shadow-sm">
            <div class="p-5 border-b border-app-border flex items-center justify-between">
              <h3 class="text-sm font-bold text-app-text flex items-center gap-2">
                <mat-icon class="text-violet-400 !w-4 !h-4 !text-[16px]">history</mat-icon>
                Announcement History
              </h3>
              <button (click)="loadLogs()"
                      class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition text-app-muted hover:text-app-text"
                      style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07)">
                <mat-icon class="!w-3.5 !h-3.5 !text-[14px]">refresh</mat-icon> Refresh
              </button>
            </div>

            <div class="flex-grow p-4 space-y-3 overflow-y-auto custom-scrollbar max-h-[580px]">
              @for (log of logs(); track log.id) {
                <div class="history-item">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex items-start gap-3 min-w-0">
                      <!-- Icon -->
                      <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[16px]"
                           [style]="log.notification_type === 'drivers'
                             ? 'background:rgba(244,63,94,0.12);border:1px solid rgba(244,63,94,0.2)'
                             : log.notification_type === 'customers'
                               ? 'background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.2)'
                               : 'background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.2)'">
                        {{ log.notification_type === 'drivers' ? '🚚' : log.notification_type === 'customers' ? '👤' : '📣' }}
                      </div>
                      <div class="min-w-0">
                        <h4 class="font-bold text-app-text text-[13px] truncate">{{ log.title }}</h4>
                        <p class="text-app-muted text-[11px] mt-0.5 line-clamp-2">{{ log.body }}</p>
                        <div class="flex flex-wrap items-center gap-1.5 mt-2">
                          <!-- Segment badge -->
                          <span class="badge"
                                [style]="log.notification_type === 'drivers'
                                  ? 'background:rgba(244,63,94,0.08);border:1px solid rgba(244,63,94,0.15);color:#fb7185'
                                  : log.notification_type === 'customers'
                                    ? 'background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.15);color:#60a5fa'
                                    : 'background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.15);color:#fbbf24'">
                            {{ log.notification_type === 'both' ? 'All Users' : (log.notification_type | titlecase) }}
                          </span>
                          <!-- Delivered count -->
                          <span class="badge" style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.15);color:#34d399">
                            ✓ {{ log.retry_count }} delivered
                          </span>
                          <!-- Time -->
                          <span class="text-[10px] text-app-muted font-mono">
                            {{ log.sent_time | date:'d MMM, hh:mm a' }}
                          </span>
                        </div>
                      </div>
                    </div>
                    <!-- Count badge -->
                    <div class="text-right shrink-0">
                      <div class="text-xl font-black text-app-text font-mono">{{ log.retry_count }}</div>
                      <div class="text-[9px] font-bold uppercase tracking-wider text-app-muted">sent</div>
                    </div>
                  </div>
                </div>
              }
              @if (logs().length === 0) {
                <div class="flex flex-col items-center justify-center py-16 text-center">
                  <div class="text-4xl mb-3">📭</div>
                  <div class="text-sm font-bold text-app-text">No announcements yet</div>
                  <div class="text-xs text-app-muted mt-1">Send your first push notification to see history here</div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- ──────────────── SETUP GUIDE TAB ──────────────── -->
      @if (activeTab() === 'guide') {
        <div class="space-y-5">

          <!-- Hero banner -->
          <div class="relative rounded-2xl p-6 overflow-hidden"
               style="background:linear-gradient(135deg,rgba(124,58,237,0.15) 0%,rgba(79,70,229,0.08) 50%,rgba(6,182,212,0.06) 100%);border:1px solid rgba(124,58,237,0.25)">
            <div class="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10"
                 style="background:radial-gradient(circle,#7c3aed,transparent);transform:translate(30%,-30%)"></div>
            <div class="flex items-start gap-4">
              <div class="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-xl"
                   style="background:linear-gradient(135deg,#7c3aed,#4f46e5)">
                <mat-icon class="text-white !w-7 !h-7 !text-[28px]">notifications_active</mat-icon>
              </div>
              <div>
                <h3 class="text-xl font-black text-app-text">How Push Notifications Work</h3>
                <p class="text-sm text-app-muted mt-1 max-w-2xl">
                  This system uses <strong class="text-violet-400">Firebase Cloud Messaging (FCM)</strong> to deliver real-time push notifications
                  to your users' devices — both web browsers (PWA) and native mobile apps.
                  Follow the steps below to set everything up correctly.
                </p>
              </div>
            </div>
          </div>

          <!-- Architecture Overview -->
          <div class="bg-app-card border border-app-border rounded-2xl p-5">
            <h4 class="text-sm font-bold text-app-text mb-4 flex items-center gap-2">
              <mat-icon class="text-cyan-400 !w-4 !h-4 !text-[16px]">account_tree</mat-icon>
              System Architecture
            </h4>
            <div class="flex flex-col sm:flex-row items-center gap-3 text-xs text-app-muted">
              <div class="flex flex-col items-center gap-1 p-3 rounded-xl text-center w-full sm:w-auto"
                   style="background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.2)">
                <span class="text-2xl">📱</span>
                <span class="font-bold text-cyan-400">User Device</span>
                <span class="text-[10px]">Requests permission<br/>Registers FCM token</span>
              </div>
              <mat-icon class="text-app-muted rotate-90 sm:rotate-0 !w-5 !h-5">arrow_forward</mat-icon>
              <div class="flex flex-col items-center gap-1 p-3 rounded-xl text-center w-full sm:w-auto"
                   style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2)">
                <span class="text-2xl">🔥</span>
                <span class="font-bold text-amber-400">Firebase FCM</span>
                <span class="text-[10px]">Token stored in DB<br/>Message routing</span>
              </div>
              <mat-icon class="text-app-muted rotate-90 sm:rotate-0 !w-5 !h-5">arrow_forward</mat-icon>
              <div class="flex flex-col items-center gap-1 p-3 rounded-xl text-center w-full sm:w-auto"
                   style="background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.2)">
                <span class="text-2xl">⚙️</span>
                <span class="font-bold text-violet-400">AJR Hub Backend</span>
                <span class="text-[10px]">Admin sends<br/>via Service Account</span>
              </div>
              <mat-icon class="text-app-muted rotate-90 sm:rotate-0 !w-5 !h-5">arrow_forward</mat-icon>
              <div class="flex flex-col items-center gap-1 p-3 rounded-xl text-center w-full sm:w-auto"
                   style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2)">
                <span class="text-2xl">✅</span>
                <span class="font-bold text-emerald-400">Delivered</span>
                <span class="text-[10px]">Notification appears<br/>on device screen</span>
              </div>
            </div>
          </div>

          <!-- Step-by-Step Setup -->
          <div class="bg-app-card border border-app-border rounded-2xl p-5">
            <h4 class="text-sm font-bold text-app-text mb-4 flex items-center gap-2">
              <mat-icon class="text-violet-400 !w-4 !h-4 !text-[16px]">list_numbered</mat-icon>
              Step-by-Step Setup
            </h4>
            <div class="space-y-3">

              <!-- Step 1 -->
              <div class="guide-step">
                <div class="step-num">1</div>
                <div class="flex-1">
                  <h5 class="text-sm font-bold text-app-text">Create a Firebase Project</h5>
                  <p class="text-xs text-app-muted mt-1">
                    Go to <a href="https://console.firebase.google.com" target="_blank" class="text-violet-400 underline">console.firebase.google.com</a>
                    → Click <strong class="text-app-text">Add Project</strong> → Enter a project name (e.g., <span class="code-chip">my-app-push</span>)
                    → Disable Google Analytics if not needed → Create project.
                  </p>
                </div>
              </div>

              <!-- Step 2 -->
              <div class="guide-step">
                <div class="step-num">2</div>
                <div class="flex-1">
                  <h5 class="text-sm font-bold text-app-text">Enable Cloud Messaging</h5>
                  <p class="text-xs text-app-muted mt-1">
                    In your Firebase project → Go to <strong class="text-app-text">Project Settings</strong> (⚙️ gear icon) →
                    Click the <strong class="text-app-text">Cloud Messaging</strong> tab →
                    Ensure FCM API is enabled. If you see a <em>Legacy API</em>, enable the <strong class="text-violet-400">Firebase Cloud Messaging API (V1)</strong>.
                  </p>
                </div>
              </div>

              <!-- Step 3 -->
              <div class="guide-step">
                <div class="step-num">3</div>
                <div class="flex-1">
                  <h5 class="text-sm font-bold text-app-text">Download Service Account Key</h5>
                  <p class="text-xs text-app-muted mt-1 mb-2">
                    In Project Settings → <strong class="text-app-text">Service Accounts</strong> tab →
                    Click <strong class="text-violet-400">Generate new private key</strong> → Download the JSON file.
                    This file contains credentials your backend uses to send notifications.
                  </p>
                  <div class="p-3 rounded-lg font-mono text-[10px]" style="background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.08);color:#a78bfa">
                    {{'{'}} "type": "service_account",<br>
                    &nbsp;&nbsp;"project_id": "your-project-id",<br>
                    &nbsp;&nbsp;"private_key": "-----BEGIN RSA PRIVATE KEY-----...",<br>
                    &nbsp;&nbsp;"client_email": "firebase-adminsdk@...",<br>
                    &nbsp;&nbsp;... {{'}'}}
                  </div>
                  <div class="mt-2 p-2 rounded-lg flex items-center gap-2 text-[11px]"
                       style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#f87171">
                    <mat-icon class="!w-4 !h-4 !text-[14px]">security</mat-icon>
                    <strong>Security:</strong> Never commit this file to Git. Keep it encrypted.
                  </div>
                </div>
              </div>

              <!-- Step 4 -->
              <div class="guide-step">
                <div class="step-num">4</div>
                <div class="flex-1">
                  <h5 class="text-sm font-bold text-app-text">Upload Service Account in Admin Settings</h5>
                  <p class="text-xs text-app-muted mt-1">
                    Go to <strong class="text-app-text">Admin → System Settings → Push Notifications</strong> →
                    Paste or upload your Service Account JSON → Save. The system encrypts and stores it securely in the database.
                  </p>
                </div>
              </div>

              <!-- Step 5 -->
              <div class="guide-step">
                <div class="step-num">5</div>
                <div class="flex-1">
                  <h5 class="text-sm font-bold text-app-text">Add Firebase Config to Your App</h5>
                  <p class="text-xs text-app-muted mt-1 mb-2">
                    In Firebase Console → Project Settings → General → Your apps → Add a Web App →
                    Copy the Firebase configuration object:
                  </p>
                  <div class="p-3 rounded-lg font-mono text-[10px]" style="background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.08);color:#6ee7b7">
                    const firebaseConfig = {{'{'}} <br>
                    &nbsp;&nbsp;apiKey: <span style="color:#a78bfa">"AIzaSy..."</span>,<br>
                    &nbsp;&nbsp;authDomain: <span style="color:#a78bfa">"my-app.firebaseapp.com"</span>,<br>
                    &nbsp;&nbsp;projectId: <span style="color:#a78bfa">"my-app"</span>,<br>
                    &nbsp;&nbsp;messagingSenderId: <span style="color:#a78bfa">"123456789"</span>,<br>
                    &nbsp;&nbsp;appId: <span style="color:#a78bfa">"1:123456:web:abc123"</span><br>
                    {{'}'}};
                  </div>
                  <p class="text-xs text-app-muted mt-2">
                    Add this to your Angular app's <span class="code-chip">environment.ts</span> file.
                  </p>
                </div>
              </div>

              <!-- Step 6 -->
              <div class="guide-step">
                <div class="step-num">6</div>
                <div class="flex-1">
                  <h5 class="text-sm font-bold text-app-text">Add Firebase Service Worker to Your App</h5>
                  <p class="text-xs text-app-muted mt-1 mb-2">
                    Create a file <span class="code-chip">firebase-messaging-sw.js</span> in your app's
                    <span class="code-chip">src/</span> folder (it must be served from root):
                  </p>
                  <div class="p-3 rounded-lg font-mono text-[10px]" style="background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.08);color:#6ee7b7">
                    importScripts('https://www.gstatic.com/firebasejs/10.x.x/firebase-app-compat.js');<br>
                    importScripts('https://www.gstatic.com/firebasejs/10.x.x/firebase-messaging-compat.js');<br><br>
                    firebase.initializeApp({{'{'}} apiKey: '...', projectId: '...', messagingSenderId: '...', appId: '...' {{'}'}});<br><br>
                    const messaging = firebase.messaging();<br>
                    messaging.onBackgroundMessage((payload) => {{'{'}} <br>
                    &nbsp;&nbsp;self.registration.showNotification(payload.notification.title, {{'{'}} body: payload.notification.body {{'}'}});<br>
                    {{'}'}});
                  </div>
                </div>
              </div>

              <!-- Step 7 -->
              <div class="guide-step">
                <div class="step-num">7</div>
                <div class="flex-1">
                  <h5 class="text-sm font-bold text-app-text">Request Permission & Register Token in Your App</h5>
                  <p class="text-xs text-app-muted mt-1 mb-2">
                    In your Angular notification service, request permission from the user and register the FCM token
                    with your backend:
                  </p>
                  <div class="p-3 rounded-lg font-mono text-[10px]" style="background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.08);color:#6ee7b7">
                    <span style="color:#a78bfa">const</span> messaging = getMessaging();<br>
                    <span style="color:#a78bfa">const</span> token = <span style="color:#a78bfa">await</span> getToken(messaging, {{'{'}} vapidKey: 'YOUR_VAPID_KEY' {{'}'}});<br>
                    <span style="color:#a78bfa">if</span> (token) {{'{'}} <br>
                    &nbsp;&nbsp;<span style="color:#64748b">// POST to your backend to save the token</span><br>
                    &nbsp;&nbsp;<span style="color:#a78bfa">await</span> http.post('/api/push/register', {{'{'}} token, platform: 'web' {{'}'}}).toPromise();<br>
                    {{'}'}}
                  </div>
                  <p class="text-xs text-app-muted mt-2">
                    Get your VAPID Key from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → Generate key pair.
                  </p>
                </div>
              </div>

              <!-- Step 8 -->
              <div class="guide-step">
                <div class="step-num">8</div>
                <div class="flex-1">
                  <h5 class="text-sm font-bold text-app-text">Test Your Setup</h5>
                  <p class="text-xs text-app-muted mt-1">
                    Once tokens are registered, go to the <strong class="text-violet-400">Send tab</strong> above.
                    You'll see device counts update. Click <strong class="text-app-text">Send</strong> to push your first announcement.
                    A ✅ success response means FCM delivered the message.
                  </p>
                  <div class="mt-2 p-2 rounded-lg flex items-center gap-2 text-[11px]"
                       style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);color:#34d399">
                    <mat-icon class="!w-4 !h-4 !text-[14px]">check_circle</mat-icon>
                    If device count is 0, the Send still works as a simulation test.
                  </div>
                </div>
              </div>

            </div>
          </div>

          <!-- FCM Token Registration API -->
          <div class="bg-app-card border border-app-border rounded-2xl p-5">
            <h4 class="text-sm font-bold text-app-text mb-4 flex items-center gap-2">
              <mat-icon class="text-cyan-400 !w-4 !h-4 !text-[16px]">api</mat-icon>
              Token Registration API
            </h4>
            <p class="text-xs text-app-muted mb-4">
              Your client app must call this endpoint to register a device token after the user grants notification permission:
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div class="text-[10px] font-bold uppercase tracking-widest text-app-muted mb-2">Endpoint</div>
                <div class="p-2.5 rounded-lg font-mono text-[11px]" style="background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.07);color:#a78bfa">
                  POST /api/push/register-token
                </div>
              </div>
              <div>
                <div class="text-[10px] font-bold uppercase tracking-widest text-app-muted mb-2">Request Body</div>
                <div class="p-2.5 rounded-lg font-mono text-[11px]" style="background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.07);color:#6ee7b7">
                  {{'{'}} "token": "fcm-token-here",<br>&nbsp;&nbsp;"platform": "web" | "android" | "ios",<br>&nbsp;&nbsp;"role": "driver" | "customer" {{'}'}}
                </div>
              </div>
            </div>
            <div class="mt-3 p-2.5 rounded-lg flex items-center gap-2 text-[11px]"
                 style="background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.15);color:#67e8f9">
              <mat-icon class="!w-4 !h-4 !text-[14px]">info</mat-icon>
              The <span class="font-mono mx-1">role</span> field determines which segment a subscriber belongs to (used for targeting).
            </div>
          </div>

          <!-- Troubleshooting -->
          <div class="bg-app-card border border-app-border rounded-2xl p-5">
            <h4 class="text-sm font-bold text-app-text mb-4 flex items-center gap-2">
              <mat-icon class="text-amber-400 !w-4 !h-4 !text-[16px]">build</mat-icon>
              Common Issues &amp; Fixes
            </h4>
            <div class="space-y-2">
              @for (issue of troubleshootingItems; track issue.problem) {
                <div class="flex gap-3 p-3 rounded-xl" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05)">
                  <mat-icon class="text-amber-400 !w-4 !h-4 !text-[15px] shrink-0 mt-0.5">warning_amber</mat-icon>
                  <div>
                    <div class="text-xs font-bold text-app-text">{{ issue.problem }}</div>
                    <div class="text-[11px] text-app-muted mt-0.5">{{ issue.fix }}</div>
                  </div>
                </div>
              }
            </div>
          </div>

        </div>
      }

      <!-- ──────────────── CONFIG TAB ──────────────── -->
      @if (activeTab() === 'config') {
        <div class="bg-app-card border border-app-border rounded-2xl p-6 space-y-6 shadow-sm">
          <div>
            <h3 class="text-sm font-bold text-app-text flex items-center gap-2">
              <mat-icon class="text-violet-400">tune</mat-icon> Billing &amp; Limit Configurations
            </h3>
            <p class="text-xs text-app-muted mt-1">
              Customize push notification billing parameters for this application.
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label class="flex items-center justify-between p-4 rounded-xl border border-app-border bg-app-bg hover:bg-app-card cursor-pointer transition select-none">
              <div>
                <span class="text-sm font-semibold text-app-text block">Enable Push Notifications</span>
                <span class="text-xs text-app-muted">Allow push campaign routing and analytics triggers.</span>
              </div>
              <input type="checkbox" [(ngModel)]="configModel.enabled" class="rounded bg-app-card border-app-border text-indigo-500 focus:ring-0 w-4 h-4 cursor-pointer">
            </label>
            <label class="flex items-center justify-between p-4 rounded-xl border border-app-border bg-app-bg hover:bg-app-card cursor-pointer transition select-none">
              <div>
                <span class="text-sm font-semibold text-app-text block">Free Tier Monthly Quota</span>
                <span class="text-xs text-app-muted">Enable standard free tier notification allocation.</span>
              </div>
              <input type="checkbox" [(ngModel)]="configModel.free_quota_enabled" class="rounded bg-app-card border-app-border text-indigo-500 focus:ring-0 w-4 h-4 cursor-pointer">
            </label>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-app-border">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Free Notification Limit</label>
              <input type="number" [(ngModel)]="configModel.free_notifications" [disabled]="!configModel.free_quota_enabled" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text focus:border-indigo-500/50 outline-none transition-all font-mono">
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Rate per 1,000 Alerts</label>
              <input type="number" step="0.01" [(ngModel)]="configModel.price_per_1000" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text focus:border-indigo-500/50 outline-none transition-all font-mono">
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Monthly Service Charge</label>
              <input type="number" [(ngModel)]="configModel.platform_service_charge" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text focus:border-indigo-500/50 outline-none transition-all font-mono">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-app-border">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Preferred Currency</label>
              <select [(ngModel)]="configModel.currency" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text outline-none cursor-pointer">
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">GST Tax Percentage</label>
              <input type="number" [(ngModel)]="configModel.gst_percentage" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text focus:border-indigo-500/50 outline-none transition-all font-mono">
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Billing Frequency</label>
              <select [(ngModel)]="configModel.billing_frequency" class="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text outline-none cursor-pointer">
                <option value="monthly">Monthly Billing</option>
                <option value="yearly">Yearly Billing</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end pt-4 border-t border-app-border">
            <button (click)="saveConfiguration()" [disabled]="isSavingConfig()"
                    class="px-6 py-2.5 text-app-text rounded-xl text-sm font-bold transition flex items-center gap-2 cursor-pointer send-btn">
              @if (isSavingConfig()) {
                <mat-icon class="!w-4 !h-4 !text-[16px] animate-spin">sync</mat-icon>
              }
              Save Configuration
            </button>
          </div>
        </div>
      }

    </div>
  `
})
export class ProjectPushNotificationsComponent implements OnInit {
  project = input.required<ProjectData>();

  private monitorService = inject(FirebaseMonitorService);
  private store = inject(AdminStoreService);
  private cdr = inject(ChangeDetectorRef);

  activeTab = signal<'send' | 'guide' | 'config'>('send');
  selectedTarget = signal<'drivers' | 'customers' | 'both'>('customers');
  showAdvanced = signal(false);

  // State Signals
  metrics = signal<any>({});
  configModel = {
    enabled: true,
    free_quota_enabled: true,
    free_notifications: 10000,
    price_per_1000: 0.50,
    platform_service_charge: 10.00,
    gst_percentage: 18.00,
    currency: 'INR',
    billing_frequency: 'monthly'
  };
  billingDetails = signal<any>(null);
  logs = signal<any[]>([]);
  subscribers = signal<any[]>([]);

  // Computed Segment Counts
  driversCount = computed(() => this.subscribers().filter(s => s.role === 'driver').length);
  customersCount = computed(() => this.subscribers().filter(s => s.role === 'customer' || s.role === 'user' || !s.role).length);
  bothCount = computed(() => this.subscribers().length);

  targetCount = computed(() => {
    const t = this.selectedTarget();
    if (t === 'drivers') return this.driversCount();
    if (t === 'customers') return this.customersCount();
    return this.bothCount();
  });

  triggerPayload = {
    token: '',
    manualToken: '',
    title: '',
    body: '',
    image: '',
    url: ''
  };

  isSavingConfig = signal(false);
  isSendingNotification = signal(false);

  // Quick templates
  templates = [
    { label: '🚀 New Feature', title: 'New Feature Available!', body: 'We\'ve added exciting new features. Update your app to explore them now!' },
    { label: '📦 New Order', title: 'New Order Assigned', body: 'You have a new delivery order. Open the app to view details.' },
    { label: '🎉 Offer', title: 'Special Offer This Weekend!', body: 'Get 20% off on all deliveries this weekend. Don\'t miss out!' },
    { label: '⚠️ Maintenance', title: 'Scheduled Maintenance', body: 'Our system will be down for maintenance from 2AM to 4AM tonight.' },
    { label: '✅ Update', title: 'App Update Available', body: 'A new version of the app is available. Please update for the best experience.' },
  ];

  // Troubleshooting data
  troubleshootingItems = [
    { problem: 'Device count shows 0 subscribers', fix: 'The client app hasn\'t registered FCM tokens yet. Ensure the user has granted notification permission and the token is being POSTed to the backend.' },
    { problem: 'Notifications not received on device', fix: 'Check if the service worker file (firebase-messaging-sw.js) is accessible at the root URL. Also verify the VAPID key matches your Firebase project.' },
    { problem: 'Service account authentication errors', fix: 'Regenerate the service account key from Firebase Console and re-upload it in Admin → System Settings → Push Notifications.' },
    { problem: 'FCM token becomes invalid', fix: 'Tokens expire or become invalid when the app is reinstalled or permissions are revoked. The system automatically cleans up invalid tokens after a send attempt.' },
    { problem: 'Notifications only work in foreground', fix: 'Ensure firebase-messaging-sw.js is deployed at the root of your domain and properly imported. Background messages require the service worker to be active.' },
    { problem: 'Cannot initialize Firebase: app/duplicate-app', fix: 'Check that Firebase is only initialized once in your app. Use a singleton pattern or the app:already-exists guard.' },
  ];

  ngOnInit() {
    this.loadAllData();
  }

  loadAllData() {
    const appId = this.project().id;

    this.monitorService.getApplicationDetails(appId).subscribe({
      next: (res) => {
        if (res.metrics) this.metrics.set(res.metrics);
        if (res.settings) {
          this.configModel = {
            enabled: res.settings.enabled ?? true,
            free_quota_enabled: res.settings.free_quota_enabled ?? true,
            free_notifications: res.settings.free_notifications ?? 10000,
            price_per_1000: Number(res.settings.price_per_1000 ?? 0.50),
            platform_service_charge: Number(res.settings.platform_service_charge ?? 10.0),
            gst_percentage: Number(res.settings.gst_percentage ?? 18.0),
            currency: res.settings.currency || 'INR',
            billing_frequency: res.settings.billing_frequency || 'monthly'
          };
        }
        this.cdr.markForCheck();
      }
    });

    this.monitorService.getBilling().subscribe({
      next: (res) => {
        if (res.breakdowns) {
          const matched = res.breakdowns.find((b: any) => b.appId === appId);
          if (matched && matched.calculation) this.billingDetails.set(matched.calculation);
        }
        this.cdr.markForCheck();
      }
    });

    this.monitorService.getSubscribers({ appId }).subscribe({
      next: (res) => {
        if (res.subscribers) this.subscribers.set(res.subscribers);
        this.cdr.markForCheck();
      }
    });

    this.loadLogs();
  }

  loadLogs() {
    const appId = this.project().id;
    this.monitorService.getLogs({ appId }).subscribe({
      next: (res) => {
        this.logs.set(res || []);
        this.cdr.markForCheck();
      }
    });
  }

  applyTemplate(tmpl: { label: string; title: string; body: string }) {
    this.triggerPayload.title = tmpl.title;
    this.triggerPayload.body = tmpl.body;
  }

  saveConfiguration() {
    this.isSavingConfig.set(true);
    const appId = this.project().id;
    this.monitorService.saveConfiguration(appId, this.configModel).subscribe({
      next: () => {
        this.isSavingConfig.set(false);
        this.store.showToast('Push Notification configurations saved successfully!', 'success');
        this.loadAllData();
      },
      error: (err) => {
        this.isSavingConfig.set(false);
        this.store.showToast(err.error?.error || err.message || 'Failed to save configuration settings.', 'error');
        this.cdr.markForCheck();
      }
    });
  }

  clearAnnouncement() {
    this.triggerPayload.title = '';
    this.triggerPayload.body = '';
    this.triggerPayload.image = '';
    this.triggerPayload.url = '';
  }

  sendAnnouncement() {
    this.isSendingNotification.set(true);
    const appId = this.project().id;
    const targetVal = this.selectedTarget();

    const titleVal = this.triggerPayload.title.startsWith('📢')
      ? this.triggerPayload.title
      : '📢 ' + this.triggerPayload.title;

    const payload = {
      appId,
      target: targetVal,
      title: titleVal,
      body: this.triggerPayload.body,
      image: this.triggerPayload.image || undefined,
      url: this.triggerPayload.url || undefined
    };

    this.monitorService.testNotification(payload).subscribe({
      next: (res) => {
        this.isSendingNotification.set(false);
        const count = res?.result?.successCount ?? this.targetCount();
        this.store.showToast(`Announcement delivered to ${count} device${count !== 1 ? 's' : ''}!`, 'success');
        this.clearAnnouncement();
        this.loadAllData();
      },
      error: (err) => {
        this.isSendingNotification.set(false);
        this.store.showToast(err.error?.error || err.message || 'Failed to trigger notification.', 'error');
        this.loadAllData();
      }
    });
  }
}
