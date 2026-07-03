import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../../services/notification.service';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 class="text-2xl font-bold text-app-text">Firebase Push Notifications Setup</h2>
          <p class="text-xs text-app-muted mt-1">Configure FCM VAPID keys, service account credentials, default payloads, and monitor delivery telemetry.</p>
        </div>
      </div>

      <!-- Tab Buttons -->
      <div class="flex border-b border-app-border">
        <button (click)="activeTab.set('settings')" [class.border-indigo-500]="activeTab() === 'settings'" [class.text-indigo-400]="activeTab() === 'settings'" class="px-6 py-3 border-b-2 border-transparent font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer text-app-muted hover:text-app-text">Config Settings</button>
        <button (click)="activeTab.set('test')" [class.border-indigo-500]="activeTab() === 'test'" [class.text-indigo-400]="activeTab() === 'test'" class="px-6 py-3 border-b-2 border-transparent font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer text-app-muted hover:text-app-text">Send Notification</button>
        <button (click)="activeTab.set('devices')" [class.border-indigo-500]="activeTab() === 'devices'" [class.text-indigo-400]="activeTab() === 'devices'" class="px-6 py-3 border-b-2 border-transparent font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer text-app-muted hover:text-app-text">Registered Devices</button>
        <button (click)="activeTab.set('logs')" [class.border-indigo-500]="activeTab() === 'logs'" [class.text-indigo-400]="activeTab() === 'logs'" class="px-6 py-3 border-b-2 border-transparent font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer text-app-muted hover:text-app-text">Delivery Logs</button>
      </div>

      <!-- Tab 1: Config Settings -->
      @if (activeTab() === 'settings') {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-200">
          <!-- Left: Config fields -->
          <div class="space-y-6">
            <!-- Firebase Web Config Card -->
            <div class="glass p-6 rounded-2xl border border-app-border space-y-4">
              <h3 class="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                <mat-icon class="!text-[16px] !w-4 !h-4">web</mat-icon> Firebase Client Web Configuration
              </h3>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">API Key</label>
                  <input type="text" [(ngModel)]="firebaseConfig.apiKey" class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
                </div>
                <div>
                  <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Auth Domain</label>
                  <input type="text" [(ngModel)]="firebaseConfig.authDomain" class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
                </div>
                <div>
                  <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Project ID</label>
                  <input type="text" [(ngModel)]="firebaseConfig.projectId" class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
                </div>
                <div>
                  <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Storage Bucket</label>
                  <input type="text" [(ngModel)]="firebaseConfig.storageBucket" class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
                </div>
                <div>
                  <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Messaging Sender ID</label>
                  <input type="text" [(ngModel)]="firebaseConfig.messagingSenderId" class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
                </div>
                <div>
                  <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">App ID</label>
                  <input type="text" [(ngModel)]="firebaseConfig.appId" class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
                </div>
              </div>
            </div>

            <!-- FCM VAPID Key Settings -->
            <div class="glass p-6 rounded-2xl border border-app-border space-y-4">
              <h3 class="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                <mat-icon class="!text-[16px] !w-4 !h-4">vpn_key</mat-icon> FCM Web Push Settings
              </h3>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Public VAPID Key</label>
                  <input type="text" [(ngModel)]="vapidKey" class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono font-bold" placeholder="e.g. BPl5s62...">
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Default Notification Icon</label>
                    <input type="text" [(ngModel)]="defaultIcon" class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
                  </div>
                  <div>
                    <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Default Redirect URL</label>
                    <input type="text" [(ngModel)]="defaultUrl" class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono">
                  </div>
                </div>

                <div class="flex items-center justify-between p-3 rounded-xl border border-app-border bg-app-bg/50">
                  <div>
                    <span class="block text-xs font-bold text-app-text">Enable Push Notifications</span>
                    <span class="block text-[10px] text-app-muted mt-0.5">Toggle push system notifications across all workspaces</span>
                  </div>
                  <input type="checkbox" [(ngModel)]="notificationsEnabled" class="rounded bg-app-card border-slate-600 text-indigo-500 w-4 h-4 cursor-pointer">
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Server Service Account Config -->
          <div class="space-y-6 flex flex-col justify-between">
            <div class="glass p-6 rounded-2xl border border-app-border space-y-4 flex-1">
              <h3 class="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                <mat-icon class="!text-[16px] !w-4 !h-4 text-rose-500 animate-pulse">lock</mat-icon> Firebase Server Admin Credentials
              </h3>
              
              <div class="space-y-4">
                <div>
                  <div class="flex justify-between items-center mb-1">
                    <label class="block text-[9px] font-bold text-app-muted uppercase">Firebase Service Account Key (JSON)</label>
                    @if (hasServiceAccount) {
                      <span class="inline-flex px-2 py-0.5 rounded text-[8px] bg-emerald-500/10 text-emerald-400 font-black tracking-wider uppercase border border-emerald-500/20">CREDENTIALS ENCRYPTED & SAVED</span>
                    }
                  </div>
                  <textarea rows="8" [(ngModel)]="serviceAccountJson" [placeholder]="hasServiceAccount ? '(Credentials configured. Paste new JSON here to overwrite)' : 'Paste Firebase Service Account private key JSON here...'" class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-rose-500 font-mono custom-scrollbar"></textarea>
                </div>
                
                <div class="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs space-y-1">
                  <span class="font-bold flex items-center gap-1"><mat-icon class="!w-4 !h-4 !text-[16px]">security</mat-icon> SECURITY POLICY</span>
                  <p class="leading-relaxed text-app-muted">The private key is encrypted immediately on submission using AES-256-CBC via SHA-256 hash. The credentials are never returned to client queries.</p>
                </div>
              </div>
            </div>

            <!-- Global Action Bar -->
            <div class="flex items-center gap-3">
              <button (click)="saveSettings()" [disabled]="isSaving()" class="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-app-text text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 border border-indigo-500/20">
                @if (isSaving()) {
                  <div class="w-4 h-4 border-2 border-app-text border-t-transparent rounded-full animate-spin"></div>
                  <span>SAVING CONFIGS...</span>
                } @else {
                  <mat-icon class="!text-[16px] !w-4 !h-4">save</mat-icon>
                  <span>SAVE CONFIGURATION</span>
                }
              </button>
              
              <button (click)="testConnection()" [disabled]="isTesting() || !hasServiceAccount" class="px-5 py-3 bg-app-card border border-app-border hover:bg-app-bg text-app-text text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5">
                @if (isTesting()) {
                  <div class="w-4 h-4 border-2 border-app-text border-t-transparent rounded-full animate-spin"></div>
                  <span>TESTING...</span>
                } @else {
                  <mat-icon class="!text-[16px] !w-4 !h-4">cloud_done</mat-icon>
                  <span>TEST CONNECTION</span>
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Tab 2: Send Notification -->
      @if (activeTab() === 'test') {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          <!-- Left Forms: Dispatch Details -->
          <div class="lg:col-span-2 glass p-6 rounded-2xl border border-app-border space-y-4">
            <h3 class="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
              <mat-icon class="!text-[16px] !w-4 !h-4">send</mat-icon> Compose Push Notification
            </h3>
            
            <div class="space-y-4">
              <div class="flex gap-4">
                <label class="flex items-center gap-2 text-xs font-bold cursor-pointer text-app-text">
                  <input type="radio" name="target" value="broadcast" [(ngModel)]="sendModel.targetType" class="text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer">
                  <span>Broadcast (All users)</span>
                </label>
                <label class="flex items-center gap-2 text-xs font-bold cursor-pointer text-app-text">
                  <input type="radio" name="target" value="user" [(ngModel)]="sendModel.targetType" class="text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer">
                  <span>Target Specific User</span>
                </label>
              </div>

              @if (sendModel.targetType === 'user') {
                <div>
                  <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Target User</label>
                  <select [(ngModel)]="sendModel.userId" class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none cursor-pointer">
                    <option value="">Select Target Receiver User...</option>
                    @for (u of users(); track u.id) {
                      <option [value]="u.id">{{ u.fullName }} ({{ u.email }})</option>
                    }
                  </select>
                </div>
              }

              <div>
                <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Notification Title</label>
                <input type="text" [(ngModel)]="sendModel.title" class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold" placeholder="e.g. Maintenance Announcement">
              </div>

              <div>
                <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Body Text</label>
                <textarea rows="3" [(ngModel)]="sendModel.body" class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500" placeholder="Type notification contents details..."></textarea>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Image URL (Optional)</label>
                  <input type="text" [(ngModel)]="sendModel.image" class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono" placeholder="https://picsum.photos/seed/promo/800/400">
                </div>
                <div>
                  <label class="block text-[9px] font-bold text-app-muted uppercase mb-1">Redirect / Deep Link URL</label>
                  <input type="text" [(ngModel)]="sendModel.url" class="w-full px-3 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs outline-none focus:border-indigo-500 font-mono" placeholder="https://ajrdigitalhub.com/dashboard/billing">
                </div>
              </div>

              <div class="pt-4 border-t border-app-border flex justify-end gap-3">
                <button (click)="sendTestToSelf()" [disabled]="isSendingTest()" class="px-5 py-2.5 bg-app-card border border-app-border hover:bg-app-bg text-app-text text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5">
                  <mat-icon class="!text-[14px] !w-3.5 !h-3.5">mobile_screen_share</mat-icon> Send Test to Me
                </button>
                <button (click)="submitSend()" [disabled]="isDispatching() || !sendModel.title || !sendModel.body || (sendModel.targetType === 'user' && !sendModel.userId)" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-app-text text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 border border-indigo-500/20">
                  @if (isDispatching()) {
                    <div class="w-4 h-4 border-2 border-app-text border-t-transparent rounded-full animate-spin"></div>
                    <span>DISPATCHING...</span>
                  } @else {
                    <mat-icon class="!text-[14px] !w-3.5 !h-3.5">send</mat-icon>
                    <span>SEND NOTIFICATION</span>
                  }
                </button>
              </div>
            </div>
          </div>

          <!-- Right: Live Mock Preview -->
          <div class="glass p-6 rounded-2xl border border-app-border space-y-4">
            <span class="block text-[10px] font-bold text-app-muted uppercase tracking-widest">Web Push Delivery Preview</span>
            
            <div class="bg-[#1e293b] rounded-2xl p-4 shadow-xl border border-slate-700/50 space-y-3 relative overflow-hidden select-none">
              <div class="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-700 pb-2">
                <span class="flex items-center gap-1 font-bold"><mat-icon class="!w-3 !h-3 !text-[12px] text-indigo-400">chrome_reader_mode</mat-icon> Google Chrome • Windows</span>
                <span>Just Now</span>
              </div>
              
              <div class="flex gap-3">
                <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                  <mat-icon class="text-white">notifications_active</mat-icon>
                </div>
                <div class="space-y-1">
                  <h4 class="text-xs font-black text-white leading-tight">{{ sendModel.title || 'Notification Title Placeholder' }}</h4>
                  <p class="text-[11px] text-slate-300 leading-relaxed">{{ sendModel.body || 'Compose body text inside the form to visualize how the notification wraps here...' }}</p>
                </div>
              </div>

              @if (sendModel.image) {
                <div class="rounded-xl overflow-hidden max-h-36 border border-slate-700 bg-slate-900 mt-2">
                  <img [src]="sendModel.image" class="w-full h-full object-cover">
                </div>
              }
              
              <div class="text-[9px] text-indigo-400 font-bold mt-1 text-right truncate">
                {{ sendModel.url || 'https://ajrdigitalhub.com' }}
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Tab 3: Registered Devices -->
      @if (activeTab() === 'devices') {
        <div class="glass p-6 rounded-2xl border border-app-border space-y-4 animate-in fade-in duration-200">
          <div class="flex justify-between items-center">
            <h3 class="text-xs font-black text-indigo-400 uppercase tracking-widest">Active Registered Device Tokens</h3>
            <span class="bg-app-bg text-[10px] font-mono px-2 py-0.5 rounded border border-app-border text-indigo-300">{{ tokensCount }} Total Tokens</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-app-border text-[9px] uppercase tracking-wider text-app-muted">
                  <th class="py-3 pr-4 font-bold">User</th>
                  <th class="py-3 px-4 font-bold">OS / Browser</th>
                  <th class="py-3 px-4 font-bold">Device Type</th>
                  <th class="py-3 px-4 font-bold">Language / Timezone</th>
                  <th class="py-3 px-4 font-bold">Last Seen</th>
                  <th class="py-3 pl-4 font-bold w-12 text-center">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-app-border/40">
                @for (t of deviceTokens(); track t.id) {
                  <tr class="hover:bg-app-card/30 transition-colors">
                    <td class="py-3.5 pr-4">
                      <span class="block font-bold text-app-text">{{ t.user_name || 'Standard Client' }}</span>
                      <span class="block text-[10px] text-app-muted">{{ t.user_email }}</span>
                    </td>
                    <td class="py-3.5 px-4 font-semibold text-app-text flex items-center gap-1 mt-1">
                      <mat-icon class="!text-[12px] !w-3 !h-3">computer</mat-icon>
                      <span>{{ t.os }} / {{ t.browser }}</span>
                    </td>
                    <td class="py-3.5 px-4 text-app-muted">{{ t.device }}</td>
                    <td class="py-3.5 px-4 font-mono text-app-muted">{{ t.language }} / {{ t.timezone }}</td>
                    <td class="py-3.5 px-4 text-app-muted">{{ t.last_seen | date:'medium' }}</td>
                    <td class="py-3.5 pl-4 text-center">
                      <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 mx-auto" title="Subscribed"></div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="py-8 text-center text-app-muted">No device tokens registered in database yet.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Tab 4: Delivery Logs -->
      @if (activeTab() === 'logs') {
        <div class="glass p-6 rounded-2xl border border-app-border space-y-6 animate-in fade-in duration-200">
          <div class="space-y-4">
            <h3 class="text-xs font-black text-indigo-400 uppercase tracking-widest">Notification Dispatch History</h3>
            
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-app-border text-[9px] uppercase tracking-wider text-app-muted">
                    <th class="py-3 pr-4 font-bold">Alert Details</th>
                    <th class="py-3 px-4 font-bold">Sender</th>
                    <th class="py-3 px-4 font-bold">Recipient</th>
                    <th class="py-3 px-4 font-bold text-center">Status</th>
                    <th class="py-3 pl-4 font-bold">Delivery Timestamp</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-app-border/40">
                  @for (h of history(); track h.id) {
                    <tr class="hover:bg-app-card/30 transition-colors">
                      <td class="py-3.5 pr-4">
                        <span class="block font-bold text-app-text">{{ h.title }}</span>
                        <span class="block text-[10px] text-app-muted mt-0.5">{{ h.body }}</span>
                      </td>
                      <td class="py-3.5 px-4 text-app-muted">{{ h.sender_name || 'System Scheduler' }}</td>
                      <td class="py-3.5 px-4 text-app-muted font-bold">{{ h.receiver_name || 'Broadcast' }}</td>
                      <td class="py-3.5 px-4 text-center">
                        <span class="inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">DELIVERED</span>
                      </td>
                      <td class="py-3.5 pl-4 text-app-muted font-mono">{{ h.created_at | date:'medium' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
              </div>
            </div>

            <!-- Exception logs sub card -->
            <div class="space-y-4 border-t border-app-border pt-6">
              <h3 class="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-1">
                <mat-icon class="!text-[14px] !w-3.5 !h-3.5">warning</mat-icon> FCM Integration Failure Logs
              </h3>

              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-app-border text-[9px] uppercase tracking-wider text-app-muted">
                      <th class="py-2 pr-4 font-bold">Message</th>
                      <th class="py-2 px-4 font-bold">Trace Level</th>
                      <th class="py-2 pl-4 font-bold">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-app-border/40 font-mono text-[11px]">
                    @for (log of systemLogs(); track log.id) {
                      <tr class="hover:bg-rose-500/5 text-rose-400/80">
                        <td class="py-2.5 pr-4 truncate max-w-sm" [title]="log.message">{{ log.message }}</td>
                        <td class="py-2.5 px-4 uppercase font-bold">{{ log.level }}</td>
                        <td class="py-2.5 pl-4 text-app-muted">{{ log.created_at | date:'medium' }}</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="3" class="py-4 text-center text-app-muted">No integration errors logged. All FCM nodes healthy.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        }
    </div>
  `
})
export class AdminNotificationsComponent implements OnInit {
  private notification = inject(NotificationService);
  private api = inject(ApiService);

  activeTab = signal<string>('settings');
  isSaving = signal<boolean>(false);
  isTesting = signal<boolean>(false);
  isDispatching = signal<boolean>(false);
  isSendingTest = signal<boolean>(false);

  // DB counts
  tokensCount = 0;

  // Configurations
  firebaseConfig = {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    measurementId: ''
  };

  vapidKey = '';
  notificationsEnabled = true;
  defaultIcon = '/assets/icons/icon-72x72.png';
  defaultUrl = 'https://ajrdigitalhub.com';

  // Server credentials
  serviceAccountJson = '';
  hasServiceAccount = false;

  // Send composing
  sendModel = {
    targetType: 'broadcast',
    userId: '',
    title: '',
    body: '',
    image: '',
    url: ''
  };

  // Data lists
  users = signal<any[]>([]);
  deviceTokens = signal<any[]>([]);
  history = signal<any[]>([]);
  systemLogs = signal<any[]>([]);

  ngOnInit() {
    this.loadSettings();
    this.loadAdminData();
  }

  loadSettings() {
    this.notification.getSettings().subscribe({
      next: (res) => {
        if (res) {
          this.firebaseConfig = { ...this.firebaseConfig, ...(res.firebase_config || {}) };
          this.vapidKey = res.vapid_key || '';
          this.notificationsEnabled = res.enabled ?? true;
          this.defaultIcon = res.default_icon || '/assets/icons/icon-72x72.png';
          this.defaultUrl = res.default_url || 'https://ajrdigitalhub.com';
          this.hasServiceAccount = res.hasServiceAccount || false;
        }
      },
      error: (err) => console.error('Failed to load FCM settings', err)
    });
  }

  loadAdminData() {
    // Fetch users for composer dropdown
    this.api.get<any[]>('/admin/data/users').subscribe(res => {
      this.users.set(res || []);
    });

    // Fetch device tokens
    this.api.get<any[]>('/admin/data/notification_tokens').subscribe(res => {
      const tokensList = res || [];
      this.tokensCount = tokensList.length;
      
      // Match usernames manually for tabular view completeness
      this.deviceTokens.set(tokensList.map(tok => {
        const u = this.users().find(user => user.id === tok.user_id);
        return {
          ...tok,
          user_name: u?.fullName || 'Standard Client',
          user_email: u?.email || 'N/A'
        };
      }));
    });

    // Fetch history
    this.notification.getHistory().subscribe(res => {
      this.history.set(res || []);
    });

    // Fetch integration failure logs
    this.notification.getLogs().subscribe(res => {
      this.systemLogs.set(res || []);
    });
  }

  saveSettings() {
    this.isSaving.set(true);
    const payload: any = {
      enabled: this.notificationsEnabled,
      firebase_config: this.firebaseConfig,
      vapid_key: this.vapidKey,
      default_icon: this.defaultIcon,
      default_url: this.defaultUrl
    };

    if (this.serviceAccountJson) {
      try {
        payload.service_account = JSON.parse(this.serviceAccountJson);
      } catch (err) {
        alert('Invalid Service Account JSON. Please verify formatting syntax.');
        this.isSaving.set(false);
        return;
      }
    }

    this.notification.saveSettings(payload).subscribe({
      next: () => {
        alert('Firebase FCM configuration settings saved successfully!');
        this.serviceAccountJson = ''; // Clear plaintext input box
        this.loadSettings();
        this.isSaving.set(false);
      },
      error: (err) => {
        alert('Failed to save settings: ' + (err.error?.error || err.message));
        this.isSaving.set(false);
      }
    });
  }

  testConnection() {
    this.isTesting.set(true);
    this.notification.sendTest().subscribe({
      next: () => {
        alert('FCM Service Account connection active! Sent a test message to your registered device.');
        this.loadAdminData();
        this.isTesting.set(false);
      },
      error: (err) => {
        alert('FCM connection test failed: ' + (err.error?.error || err.message));
        this.isTesting.set(false);
      }
    });
  }

  sendTestToSelf() {
    this.isSendingTest.set(true);
    this.notification.sendTest().subscribe({
      next: () => {
        alert('Test notification triggered. Check your device.');
        this.isSendingTest.set(false);
      },
      error: (err) => {
        alert('Failed: ' + (err.error?.error || err.message));
        this.isSendingTest.set(false);
      }
    });
  }

  submitSend() {
    this.isDispatching.set(true);
    const payload = {
      title: this.sendModel.title,
      body: this.sendModel.body,
      image: this.sendModel.image || undefined,
      url: this.sendModel.url || undefined,
      userId: this.sendModel.targetType === 'user' ? this.sendModel.userId : undefined
    };

    const action = this.sendModel.targetType === 'user' 
      ? this.notification.sendToUser(payload as any)
      : this.notification.sendBroadcast(payload as any);

    action.subscribe({
      next: () => {
        alert('Notification dispatched successfully!');
        this.sendModel.title = '';
        this.sendModel.body = '';
        this.sendModel.image = '';
        this.sendModel.url = '';
        this.loadAdminData();
        this.isDispatching.set(false);
      },
      error: (err) => {
        alert('Failed to dispatch push notification: ' + (err.error?.error || err.message));
        this.isDispatching.set(false);
      }
    });
  }
}
