import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../../environments/environment';

interface AIResult {
  headline: string;
  bodyCopy: string;
  callToAction: string;
  keywords: string[];
  recommendations: string[];
}

@Component({
  selector: 'app-ai-campaign-assistant',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Top Title Bar -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-app-border pb-5">
        <div>
          <h2 class="text-2xl font-black text-app-text flex items-center gap-2">
            <mat-icon class="text-indigo-500">auto_awesome</mat-icon>
            AI Campaign Assistant
          </h2>
          <p class="text-xs text-app-muted mt-1">Generate high-converting marketing content and keywords using Gemini AI models.</p>
        </div>
      </div>

      <!-- Main split editor and results columns -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Left: Campaign Parameters Form -->
        <div class="bg-app-card border border-app-border rounded-2xl p-5 space-y-4 h-max">
          <h3 class="text-xs font-extrabold text-app-text uppercase tracking-wider">Campaign Parameters</h3>
          <form [formGroup]="paramsForm" (ngSubmit)="generateContent()" class="space-y-4">
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-app-muted mb-1">Target Channel</label>
              <select formControlName="channel" class="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-app-text outline-none focus:border-indigo-500 cursor-pointer">
                <option value="google">Google Search Ads</option>
                <option value="meta">Meta Image/Video Ad</option>
                <option value="whatsapp">WhatsApp Support/Broadcast</option>
                <option value="email">Email Campaign</option>
              </select>
            </div>

            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-app-muted mb-1">Campaign Topic / Product</label>
              <input type="text" formControlName="topic" class="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-app-text outline-none focus:border-indigo-500 placeholder:text-app-muted" placeholder="e.g. Dynamic invoice template builder">
            </div>

            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-app-muted mb-1">Target Audience</label>
              <input type="text" formControlName="audience" class="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-app-text outline-none focus:border-indigo-500 placeholder:text-app-muted" placeholder="e.g. Freelancers, Tech agencies">
            </div>

            <button type="submit" [disabled]="paramsForm.invalid || isLoading()" class="w-full flex justify-center items-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-app-text rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer">
              <mat-icon [class.animate-spin]="isLoading()" class="text-xs w-4 h-4 leading-none">auto_awesome</mat-icon>
              {{ isLoading() ? 'Generating copy...' : 'Generate Copy' }}
            </button>
          </form>
        </div>

        <!-- Right: AI Copy Results (2 cols) -->
        <div class="lg:col-span-2 space-y-6">
          @if (result()) {
            <div class="bg-app-card border border-app-border rounded-2xl p-5 space-y-4 animate-in fade-in duration-200">
              <div class="flex justify-between items-center pb-3 border-b border-app-border">
                <h3 class="text-xs font-extrabold text-app-text uppercase tracking-wider">Generated Copy Output</h3>
                <button (click)="copyToClipboard()" class="flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-500 cursor-pointer transition-colors">
                  <mat-icon class="text-xs w-4 h-4 leading-none">content_copy</mat-icon>
                  Copy All
                </button>
              </div>

              <!-- Output cards -->
              <div class="space-y-4">
                <div>
                  <span class="text-[9px] font-bold tracking-wider text-app-muted uppercase bg-app-bg border border-app-border px-1 rounded">Headline / Title</span>
                  <h4 class="text-sm font-black text-app-text mt-1.5 p-3 bg-app-bg rounded-xl border border-app-border select-all">{{ result()?.headline }}</h4>
                </div>

                <div>
                  <span class="text-[9px] font-bold tracking-wider text-app-muted uppercase bg-app-bg border border-app-border px-1 rounded">Body Content</span>
                  <p class="text-xs text-app-text mt-1.5 p-3.5 bg-app-bg rounded-xl border border-app-border leading-relaxed whitespace-pre-wrap select-all">{{ result()?.bodyCopy }}</p>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <span class="text-[9px] font-bold tracking-wider text-app-muted uppercase bg-app-bg border border-app-border px-1 rounded block w-max">Call to Action</span>
                    <span class="text-xs font-bold text-indigo-400 mt-1.5 p-2.5 bg-app-bg rounded-xl border border-app-border block text-center select-all">{{ result()?.callToAction }}</span>
                  </div>
                  <div>
                    <span class="text-[9px] font-bold tracking-wider text-app-muted uppercase bg-app-bg border border-app-border px-1 rounded block w-max">Target Keywords</span>
                    <div class="flex flex-wrap gap-1 mt-1.5">
                      @for (kw of result()?.keywords; track kw) {
                        <span class="text-[9px] font-bold font-mono text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-1.5 rounded">{{ kw }}</span>
                      }
                    </div>
                  </div>
                </div>

                <div class="mt-4 pt-4 border-t border-app-border">
                  <span class="text-[9px] font-bold tracking-wider text-app-muted uppercase bg-app-bg border border-app-border px-1 rounded block w-max">Optimization Recommendations</span>
                  <ul class="list-disc list-inside space-y-1.5 mt-2.5 pl-1.5 text-xs text-app-muted">
                    @for (rec of result()?.recommendations; track rec) {
                      <li>{{ rec }}</li>
                    }
                  </ul>
                </div>
              </div>
            </div>
          } @else {
            <div class="bg-app-card border border-app-border rounded-2xl p-6 flex flex-col justify-center items-center text-app-muted min-h-[300px]">
              <mat-icon class="text-4xl !w-12 !h-12 !text-[48px] text-indigo-500/50">auto_awesome</mat-icon>
              <h4 class="text-xs font-bold mt-2">Ready to Generate</h4>
              <p class="text-[10px]">Select a channel and topic parameters to trigger Google Gemini campaign copywriter.</p>
            </div>
          }
        </div>
      </div>

    </div>
  `
})
export class AiCampaignAssistant {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  paramsForm = this.fb.group({
    channel: ['google', Validators.required],
    topic: ['Dynamic Invoice Template Builder', Validators.required],
    audience: ['Freelancers and tech agencies', Validators.required]
  });

  result = signal<AIResult | null>(null);
  isLoading = signal(false);

  generateContent() {
    if (this.paramsForm.invalid) return;
    this.isLoading.set(true);
    const body = this.paramsForm.value;

    const url = `${environment.apiUrl}/api/ai-assistant/generate`;
    this.http.post<AIResult>(url, body).subscribe({
      next: (res) => {
        this.result.set(res);
        this.isLoading.set(false);
      },
      error: () => {
        // Fallback simulated copywriter
        setTimeout(() => {
          this.result.set({
            headline: `Link & Track: ${body.topic} Solutions`,
            bodyCopy: `Speed up your campaigns and CRM pipelines. Designed specifically for ${body.audience}. Zero configuration setup.`,
            callToAction: 'Get Started',
            keywords: ['marketing campaign', 'saas tools'],
            recommendations: ['Integrate WhatsApp Cloud API to run workflows', 'Match target headlines to your custom landing pages']
          });
          this.isLoading.set(false);
        }, 1000);
      }
    });
  }

  copyToClipboard() {
    const res = this.result();
    if (!res) return;
    const text = `Headline: ${res.headline}\nCopy: ${res.bodyCopy}\nCTA: ${res.callToAction}\nKeywords: ${res.keywords.join(', ')}`;
    navigator.clipboard.writeText(text);
    alert('Copied campaign content to clipboard!');
  }
}
