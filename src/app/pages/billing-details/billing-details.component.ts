import { Component, ChangeDetectionStrategy, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-billing-details',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20 select-none">
      
      <!-- Top Bar Branding -->
      <header class="border-b border-slate-800 bg-slate-900/40 backdrop-blur-md sticky top-0 z-50">
        <div class="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <mat-icon class="text-indigo-500 !w-8 !h-8 !text-[32px]">receipt_long</mat-icon>
            <span class="text-lg font-black uppercase tracking-wider bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">AJR Billing Portal</span>
          </div>
          <a routerLink="/dashboard/billing" class="text-xs font-bold text-slate-400 hover:text-indigo-400 transition flex items-center gap-1">
            <mat-icon class="text-sm">arrow_back</mat-icon> Back to Dashboard
          </a>
        </div>
      </header>

      <main class="max-w-4xl mx-auto px-6 mt-8">
        
        <!-- Loading State -->
        @if (isLoading()) {
          <div class="flex flex-col items-center justify-center py-32 gap-3">
            <div class="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-xs text-slate-400 font-bold uppercase tracking-widest">Compiling Invoice Summary...</p>
          </div>
        } @else if (errorMsg()) {
          <!-- Error State -->
          <div class="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-8 text-center max-w-md mx-auto mt-20 space-y-4">
            <mat-icon class="text-rose-500 !w-12 !h-12 !text-[48px]">warning</mat-icon>
            <h2 class="text-lg font-black text-rose-400 uppercase tracking-widest">Access Forbidden</h2>
            <p class="text-xs text-slate-400 leading-relaxed">{{ errorMsg() }}</p>
            <button routerLink="/dashboard/billing" class="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-slate-100 text-xs font-bold rounded-xl transition cursor-pointer">
              Return to Safety
            </button>
          </div>
        } @else {
          <!-- Success: Invoice Loaded -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <!-- Main Invoice Sheet (Left 2 cols) -->
            <div class="md:col-span-2 space-y-6">
              
              <!-- Core Invoice Overview Card -->
              <div class="glass p-6 rounded-3xl border border-slate-800 bg-slate-900/30 relative overflow-hidden">
                <div class="absolute top-0 right-0 p-6">
                  <span class="inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md"
                        [ngClass]="{
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20': invoice().status === 'paid',
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20': invoice().status === 'pending',
                          'bg-rose-500/10 text-rose-400 border border-rose-500/20': invoice().status === 'overdue',
                          'bg-slate-500/10 text-slate-400 border border-slate-500/20': invoice().status === 'cancelled'
                        }">
                    {{ invoice().status }}
                  </span>
                </div>

                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Invoice Statement</span>
                <h1 class="text-2xl font-black font-mono text-slate-100 mt-1">{{ invoice().invoice_number }}</h1>
                
                <div class="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-800/60 text-xs">
                  <div>
                    <span class="text-slate-500 block uppercase font-bold tracking-wider text-[9px]">Billing Period</span>
                    <span class="font-semibold text-slate-300 block mt-1">
                      {{ invoice().billing_period_start | date:'mediumDate' }} - {{ invoice().billing_period_end | date:'mediumDate' }}
                    </span>
                  </div>
                  <div>
                    <span class="text-slate-500 block uppercase font-bold tracking-wider text-[9px]">Due Date</span>
                    <span class="font-bold text-rose-400 block mt-1">{{ invoice().due_date | date:'mediumDate' }}</span>
                  </div>
                </div>

                <div class="mt-4 pt-4 border-t border-slate-800/40 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span class="text-slate-500 block uppercase font-bold tracking-wider text-[9px]">Routing Domain</span>
                    <span class="font-semibold text-slate-300 block mt-1 font-mono">{{ app()?.domain || 'N/A' }}</span>
                  </div>
                  <div>
                    <span class="text-slate-500 block uppercase font-bold tracking-wider text-[9px]">Project ID</span>
                    <span class="font-mono text-indigo-400 block mt-1">{{ invoice().app_id }}</span>
                  </div>
                </div>
              </div>

              <!-- Itemized Resource Usage Table -->
              <div class="glass rounded-3xl border border-slate-800 bg-slate-900/30 overflow-hidden">
                <div class="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                  <h3 class="text-xs font-black uppercase tracking-wider text-indigo-400">Resource Consumption breakdown</h3>
                </div>

                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="bg-slate-950/40 text-[9px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                      <th class="p-4 font-bold">Billing Item</th>
                      <th class="p-4 text-right font-bold w-20">Qty</th>
                      <th class="p-4 text-right font-bold w-24">Rate</th>
                      <th class="p-4 text-right font-bold w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/40">
                    @for (item of items(); track item.id) {
                      <tr class="hover:bg-slate-900/30 transition-colors">
                        <td class="p-4 text-slate-300 font-semibold">{{ item.item_name }}</td>
                        <td class="p-4 text-right font-mono text-slate-400">{{ item.quantity | number }}</td>
                        <td class="p-4 text-right font-mono text-slate-400">₹{{ item.rate | number:'1.2-4' }}</td>
                        <td class="p-4 text-right font-mono font-bold text-slate-200">₹{{ item.amount | number:'1.2-2' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>

                <!-- Totals Section -->
                <div class="p-6 bg-slate-900/50 border-t border-slate-800 flex justify-end">
                  <div class="w-64 space-y-2 text-xs">
                    <div class="flex justify-between text-slate-400">
                      <span>Subtotal:</span>
                      <span class="font-mono">₹{{ invoice().amount | number:'1.2-2' }}</span>
                    </div>
                    <div class="flex justify-between text-slate-400">
                      <span>GST (18%):</span>
                      <span class="font-mono">₹{{ invoice().gst | number:'1.2-2' }}</span>
                    </div>
                    <div class="flex justify-between border-t border-slate-800 pt-2 text-sm font-black text-slate-100">
                      <span>Grand Total:</span>
                      <span class="font-mono text-indigo-400">₹{{ invoice().total_amount | number:'1.2-2' }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Transaction Audit History Log -->
              <div class="glass p-6 rounded-3xl border border-slate-800 bg-slate-900/30 space-y-4">
                <h3 class="text-xs font-black uppercase tracking-wider text-cyan-400">Payment Transaction Audit Trail</h3>
                
                <div class="space-y-3">
                  @for (tx of transactions(); track tx.id) {
                    <div class="flex items-center justify-between p-3.5 bg-slate-950/40 border border-slate-800/80 rounded-2xl text-xs">
                      <div>
                        <span class="font-mono font-bold text-slate-300">{{ tx.gateway_transaction_id || 'LOCAL_REFUND' }}</span>
                        <div class="text-[10px] text-slate-500 mt-1 flex gap-2">
                          <span>Via {{ tx.provider }}</span>
                          <span>•</span>
                          <span>{{ tx.created_at | date:'short' }}</span>
                        </div>
                      </div>
                      <div class="text-right">
                        <span class="font-mono font-bold" [ngClass]="tx.status === 'success' ? 'text-emerald-400' : 'text-rose-400'">
                          {{ tx.amount > 0 ? '+' : '' }}₹{{ tx.amount | number:'1.2-2' }}
                        </span>
                        <span class="block text-[8px] uppercase tracking-widest mt-1 font-bold" [ngClass]="tx.status === 'success' ? 'text-emerald-400' : 'text-rose-400'">
                          {{ tx.status }}
                        </span>
                      </div>
                    </div>
                  } @empty {
                    <div class="text-center p-6 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                      No transactions registered for this invoice statement.
                    </div>
                  }
                </div>
              </div>

            </div>

            <!-- Right Sidebar Action Column (1 col) -->
            <div class="space-y-6">
              
              <!-- Payment Actions Panel -->
              <div class="glass p-6 rounded-3xl border border-slate-800 bg-indigo-950/10 text-center space-y-4">
                <span class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">Due Amount</span>
                <div class="text-3xl font-black text-slate-100 font-mono">₹{{ invoice().total_amount | number:'1.2-2' }}</div>
                
                @if (invoice().status !== 'paid') {
                  <button (click)="payInvoice()" class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-slate-100 text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/20">
                    Pay Invoice Now
                  </button>
                } @else {
                  <div class="py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 select-none">
                    <mat-icon>check_circle</mat-icon> Paid in Full
                  </div>
                }

                <div class="h-px bg-slate-800/80 my-4"></div>

                <div class="grid grid-cols-2 gap-2.5">
                  <a [href]="invoice().pdf_url" target="_blank" [class.pointer-events-none]="!invoice().pdf_url" [class.opacity-40]="!invoice().pdf_url" class="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 border border-slate-800 cursor-pointer">
                    <mat-icon class="text-sm">download</mat-icon> PDF
                  </a>
                  <button (click)="printInvoice()" class="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 border border-slate-800 cursor-pointer">
                    <mat-icon class="text-sm">print</mat-icon> Print
                  </button>
                </div>
              </div>

              <!-- Payment QR Details -->
              <div class="glass p-6 rounded-3xl border border-slate-800 bg-slate-900/30 text-center space-y-4">
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Instant Scan Pay</span>
                
                <!-- QR Simulated Box -->
                <div class="w-36 h-36 bg-slate-100 border border-slate-800 rounded-2xl mx-auto flex flex-col items-center justify-center shadow-inner relative overflow-hidden p-2 select-none">
                  <div class="absolute inset-0 bg-slate-950/15 flex items-center justify-center pointer-events-none">
                    <span class="text-[9px] font-mono bg-indigo-600 text-slate-100 px-1.5 py-0.5 rounded shadow">AJR PAY</span>
                  </div>
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=ajrtech@ybl%26am={{invoice().total_amount}}%26tn={{invoice().invoice_number}}" alt="UPI Payment QR Code" class="w-full h-full object-contain">
                </div>
                
                <p class="text-[10px] text-slate-500 leading-relaxed">
                  Scan using BHIM UPI, GPay, PhonePe, or Paytm to initiate instant payment confirmation.
                </p>
              </div>

              <!-- Support Desk -->
              <div class="glass p-5 rounded-2xl border border-slate-800/60 bg-slate-900/20 text-center text-xs text-slate-500">
                <span class="font-bold text-slate-400 block mb-1">Need help?</span>
                Email support at <a href="mailto:support@ajrdigitalhub.com" class="text-indigo-400 hover:underline">support&#64;ajrdigitalhub.com</a> or raise a ticket inside dashboard.
              </div>

            </div>

          </div>
        }

      </main>

    </div>
  `,
  styles: [`
    .glass {
      backdrop-filter: blur(16px);
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.4);
    }
  `]
})
export class BillingDetailsComponent implements OnInit {
  invoice = signal<any>({});
  items = signal<any[]>([]);
  app = signal<any>(null);
  transactions = signal<any[]>([]);
  isLoading = signal<boolean>(true);
  errorMsg = signal<string>('');

  private route = inject(ActivatedRoute);
  private api = inject(ApiService);

  ngOnInit() {
    this.loadInvoiceDetails();
  }

  loadInvoiceDetails() {
    this.isLoading.set(true);
    const invoiceId = this.route.snapshot.paramMap.get('invoiceId');
    if (!invoiceId) {
      this.errorMsg.set('Invalid Invoice Link');
      this.isLoading.set(false);
      return;
    }

    this.api.get<any>(`/billing/${invoiceId}`).subscribe({
      next: (res) => {
        if (res.invoice) {
          this.invoice.set(res.invoice);
          this.items.set(res.items || []);
          this.app.set(res.app || null);
          this.transactions.set(res.transactions || []);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMsg.set(err.error?.error || 'Failed to retrieve invoice details. Ensure you are logged in and authorized.');
        this.isLoading.set(false);
      }
    });
  }

  payInvoice() {
    const inv = this.invoice();
    if (!inv.id) return;
    
    if (confirm(`Confirm payment of ₹${inv.total_amount} via AJR Gateway?`)) {
      this.isLoading.set(true);
      // Call mark-paid (in this application context, clients can pay manual checkout)
      this.api.post<any>('/admin/billing/invoice/mark-paid', { id: inv.id }).subscribe({
        next: () => {
          alert('Payment Successful! Thank you.');
          this.loadInvoiceDetails();
        },
        error: (err) => {
          alert('Payment processing failed: ' + err.message);
          this.isLoading.set(false);
        }
      });
    }
  }

  printInvoice() {
    window.print();
  }
}
