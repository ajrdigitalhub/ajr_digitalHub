import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../services/auth.service';

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'phone' | 'dropdown' | 'checkbox' | 'radio' | 'date' | 'textarea';
  required: boolean;
  placeholder: string;
  options?: string[]; // for dropdown, radio, checkbox options split by comma
}

interface Form {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
  ownerId: string;
  isActive: boolean;
  submissionsCount?: number;
}

@Component({
  imports: [ReactiveFormsModule, FormsModule, MatIconModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div id="form-list-page" class="space-y-6">
      
      <!-- List Headers -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-app-text font-sans">Dynamic Forms</h2>
          <p class="text-sm text-app-muted">Create, deploy, and collect feedback with shareable public forms.</p>
        </div>
        <button 
          id="btn-create-new-form"
          (click)="openBuildPanel()"
          class="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-app-text font-medium rounded-xl shadow-sm text-sm transition-all cursor-pointer"
        >
          <mat-icon class="text-sm">add_circle</mat-icon>
          Create New Form
        </button>
      </div>

      <!-- Action feedback toast -->
      @if (toastMessage()) {
        <div id="forms-toast" class="p-4 rounded-xl flex items-center gap-2 border text-sm max-w-md"
          [class]="toastType() === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'"
        >
          <mat-icon class="text-base">{{ toastType() === 'success' ? 'check_circle' : 'error' }}</mat-icon>
          <span>{{ toastMessage() }}</span>
        </div>
      }

      <!-- Main Columns -->
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        <!-- Forms list -->
        <div [class]="showBuildPanel() ? 'xl:col-span-2 space-y-4' : 'xl:col-span-3 space-y-4'">
          
          @if (isLoadingList()) {
            <div class="flex justify-center py-12">
              <div class="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          } @else if (forms().length === 0) {
            <!-- Empty State -->
            <div id="empty-state-card" class="bg-app-card rounded-2xl border border-app-border shadow-sm p-12 text-center max-w-xl mx-auto">
              <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-400 mb-4">
                <mat-icon class="text-3xl leading-none">post_add</mat-icon>
              </div>
              <h3 class="text-lg font-semibold text-app-text mb-1">No forms built yet</h3>
              <p class="text-sm text-app-muted mb-6 leading-relaxed">
                Start collecting customer leads, registrations, or sales feedback by designing your first fully custom dynamic form.
              </p>
              <button 
                (click)="openBuildPanel()"
                class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-app-text text-sm font-medium rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                <mat-icon class="text-sm">add_circle</mat-icon>
                Build Your First Form
              </button>
            </div>
          } @else {
            <!-- Grid of Forms -->
            <div class="grid grid-cols-1 gap-4">
              @for (form of forms(); track form.id) {
                <div [id]="'form-card-' + form.id" class="bg-app-card rounded-2xl border border-app-border shadow-sm p-5 hover:border-app-border transition-all card-hover flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <h4 class="text-base font-semibold text-app-text">{{ form.name }}</h4>
                      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                        [class]="form.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-app-bg text-app-muted border border-app-border'">
                        {{ form.isActive ? 'Active' : 'Draft' }}
                      </span>
                    </div>
                    <p class="text-xs text-app-muted line-clamp-1">{{ form.description || 'No description provided' }}</p>
                    
                    <!-- Metrics Row -->
                    <div class="flex items-center gap-4 pt-1 font-mono text-[11px] text-app-muted">
                      <span class="flex items-center gap-1">
                        <mat-icon class="text-xs h-3 w-3 leading-none">format_list_bulleted</mat-icon>
                        {{ form.fields.length }} Fields
                      </span>
                      <span class="flex items-center gap-1 font-semibold text-indigo-400">
                        <mat-icon class="text-xs h-3 w-3 leading-none">analytics</mat-icon>
                        {{ form.submissionsCount || 0 }} Submissions
                      </span>
                    </div>
                  </div>

                  <!-- Share & Manage actions -->
                  <div class="flex flex-wrap gap-2 w-full md:w-auto">
                    <!-- Share link copy -->
                    <button 
                      [id]="'btn-copy-' + form.id"
                      (click)="copyLink(form.id)"
                      class="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-app-border rounded-xl bg-app-card hover:bg-app-bg text-app-text text-xs font-semibold cursor-pointer transition-all"
                    >
                      <mat-icon class="text-xs leading-none">share</mat-icon>
                      Copy Link
                    </button>

                    <!-- View public form page directly -->
                    <a 
                      [href]="'/form/' + form.id"
                      target="_blank"
                      class="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl text-xs font-semibold transition-all text-center"
                    >
                      <mat-icon class="text-xs leading-none">open_in_new</mat-icon>
                      Open Form
                    </a>

                    <!-- View Responses Dashboard -->
                    <a 
                      [routerLink]="['/dashboard/forms', form.id, 'responses']"
                      class="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-app-text rounded-xl text-xs font-semibold shadow-sm transition-all text-center"
                    >
                      <mat-icon class="text-xs leading-none">assignment</mat-icon>
                      View CRM ({{ form.submissionsCount || 0 }})
                    </a>

                    <!-- Inactivate / Delete (Owner control) -->
                    <button 
                      (click)="onDelete(form.id)"
                      class="inline-flex items-center justify-center p-2 border border-app-border hover:border-rose-500/25 text-app-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                    >
                      <mat-icon class="text-sm">delete</mat-icon>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Form Builder Panel on Right -->
        @if (showBuildPanel()) {
          <div id="form-builder-panel" class="bg-app-card rounded-2xl border border-app-border shadow-xl p-5 md:p-6 space-y-6 flex flex-col xl:col-span-1 animate-fadeIn">
            
            <div class="flex items-center justify-between pb-3 border-b border-app-border">
               <h3 class="text-lg font-bold text-app-text flex items-center gap-1.5">
                <mat-icon class="text-indigo-500">design_services</mat-icon>
                Form Builder
              </h3>
              <button 
                (click)="showBuildPanel.set(false)"
                class="hover:bg-app-bg p-1.5 rounded-lg text-app-muted"
              >
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <!-- Form Information Setup -->
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-app-muted uppercase tracking-wider">Form Name</label>
                <input 
                  type="text" 
                  [(ngModel)]="newFormName"
                  [ngModelOptions]="{standalone: true}"
                  class="mt-1 block w-full px-3 py-2 border border-app-border rounded-xl text-sm bg-app-bg text-app-text placeholder-app-muted focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Sales Onboarding Inquiry"
                >
              </div>

              <div>
                <label class="block text-xs font-semibold text-app-muted uppercase tracking-wider">Description</label>
                <textarea 
                  [(ngModel)]="newFormDesc"
                  [ngModelOptions]="{standalone: true}"
                  rows="2"
                  class="mt-1 block w-full px-3 py-2 border border-app-border bg-app-bg text-app-text rounded-xl text-sm placeholder-app-muted focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Tell your clients why they are filling out this form..."
                ></textarea>
              </div>
            </div>

            <!-- Field Builder List -->
            <div class="space-y-4">
              <div class="flex items-center justify-between pb-1 border-b border-app-border">
                <span class="text-xs font-bold text-app-muted uppercase tracking-wider">Form Fields ({{ newFields().length }})</span>
                <button 
                  id="btn-add-field"
                  (click)="addNewField()"
                  class="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-xs font-bold cursor-pointer transition-all"
                >
                  <mat-icon class="text-xs h-3.5 w-3.5">add_circle</mat-icon>
                  Add Field
                </button>
              </div>

              @if (newFields().length === 0) {
                <p class="text-xs text-center text-app-muted py-4 italic">No fields configured. Click "Add Field" to begin designing.</p>
              } @else {
                <div class="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  @for (field of newFields(); track field.id; let idx = $index) {
                    <div class="bg-app-bg rounded-xl p-3 border border-app-border space-y-3 relative group">
                      
                      <!-- Field Header actions -->
                      <div class="flex items-center justify-between">
                        <span class="text-[10px] font-mono text-app-muted font-bold uppercase">Field #{{ idx + 1 }}</span>
                        <div class="flex items-center gap-1">
                          
                          <!-- Move field UP -->
                          <button 
                            type="button"
                            [disabled]="idx === 0"
                            (click)="moveField(idx, 'up')"
                            class="p-1 text-app-muted hover:text-app-text disabled:opacity-30"
                          >
                            <mat-icon class="text-xs">arrow_upward</mat-icon>
                          </button>

                          <!-- Move field DOWN -->
                          <button 
                            type="button"
                            [disabled]="idx === newFields().length - 1"
                            (click)="moveField(idx, 'down')"
                            class="p-1 text-app-muted hover:text-app-text disabled:opacity-30"
                          >
                            <mat-icon class="text-xs">arrow_downward</mat-icon>
                          </button>

                          <!-- Delete field -->
                          <button 
                            type="button"
                            (click)="removeField(field.id)"
                            class="p-1 text-app-muted hover:text-rose-400"
                          >
                            <mat-icon class="text-xs">delete</mat-icon>
                          </button>
                        </div>
                      </div>

                      <div class="grid grid-cols-2 gap-2">
                        <!-- Field Label -->
                        <div class="col-span-2">
                          <input 
                            type="text" 
                            [(ngModel)]="field.label"
                            [ngModelOptions]="{standalone: true}"
                            class="w-full px-2.5 py-1.5 border border-app-border rounded-lg text-xs font-medium bg-app-bg text-app-text focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            placeholder="Field Label (e.g., Full Name)"
                          >
                        </div>

                        <!-- Type Selector -->
                        <div>
                          <select 
                            [(ngModel)]="field.type"
                            [ngModelOptions]="{standalone: true}"
                            class="w-full px-2.5 py-1.5 border border-app-border rounded-lg text-xs bg-app-bg text-app-text focus:outline-none"
                          >
                            <option value="text">Single Line Text</option>
                            <option value="textarea">Paragraph Text</option>
                            <option value="number">Numeric Input</option>
                            <option value="email">Email address</option>
                            <option value="phone">Phone Number</option>
                            <option value="dropdown">Select Dropdown</option>
                            <option value="checkbox">Multi Checkboxes</option>
                            <option value="radio">Radio Options</option>
                            <option value="date">Date Picker</option>
                          </select>
                        </div>

                        <!-- Required boolean toggle -->
                        <div class="flex items-center justify-end pl-2">
                          <label class="inline-flex items-center gap-1 cursor-pointer">
                            <input 
                              type="checkbox" 
                              [(ngModel)]="field.required" 
                              [ngModelOptions]="{standalone: true}"
                              class="rounded text-indigo-600"
                            >
                            <span class="text-xs text-app-muted font-medium select-none">Mandatory</span>
                          </label>
                        </div>
                      </div>

                      <div class="grid grid-cols-1 gap-2">
                        <!-- Placeholder -->
                        <div>
                          <input 
                            type="text" 
                            [(ngModel)]="field.placeholder"
                            [ngModelOptions]="{standalone: true}"
                            class="w-full px-2.5 py-1.5 border border-app-border bg-app-bg text-app-text rounded-lg text-xs focus:outline-none"
                            placeholder="Input placeholder info (optional)"
                          >
                        </div>

                        <!-- Options config splitted by commas (Dropdown, Radio, Checkboxes) -->
                        @if (['dropdown', 'radio', 'checkbox'].includes(field.type)) {
                          <div>
                            <input 
                              type="text" 
                              (change)="onFieldOptionsChange($event, field)"
                              class="w-full px-2.5 py-1.5 border border-app-border bg-app-bg text-app-text rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                              placeholder="Choice Options (split with comma, e.g. Yes, No, Maybe)"
                              [value]="field.options ? field.options.join(', ') : ''"
                            >
                          </div>
                        }
                      </div>

                    </div>
                  }
                </div>
              }
            </div>

            <!-- Save Controls -->
            <div class="pt-4 border-t border-app-border flex gap-2">
              <button 
                id="btn-save-form"
                (click)="onSaveForm()"
                [disabled]="isSaving() || !newFormName"
                class="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-app-text font-semibold rounded-xl text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                @if (isSaving()) {
                  <div class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                } @else {
                  <mat-icon class="text-sm">save</mat-icon>
                  Save & Publish Form
                }
              </button>
              <button 
                (click)="showBuildPanel.set(false)"
                class="px-4 py-2.5 border border-app-border hover:bg-app-bg text-app-text font-semibold rounded-xl text-sm transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>

          </div>
        }

      </div>
    </div>
  `
})
export class FormList {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  forms = signal<Form[]>([]);
  showBuildPanel = signal<boolean>(false);
  
  isLoadingList = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  toastMessage = signal<string>('');
  toastType = signal<'success' | 'error'>('success');

  // New Form model signals
  newFormName = '';
  newFormDesc = '';
  newFields = signal<FormField[]>([]);

  constructor() {
    this.fetchForms();
  }

  showToast(msg: string, type: 'success' | 'error' = 'success') {
    this.toastMessage.set(msg);
    this.toastType.set(type);
    setTimeout(() => {
      this.toastMessage.set('');
    }, 4000);
  }

  async fetchForms() {
    this.isLoadingList.set(true);
    try {
      const res: any = await this.http.get<any>('/api/forms').toPromise();
      this.forms.set(res?.data || res || []);
    } catch (e) {
      this.showToast('Could not load forms', 'error');
    } finally {
      this.isLoadingList.set(false);
    }
  }

  openBuildPanel() {
    this.newFormName = '';
    this.newFormDesc = '';
    this.newFields.set([
      { id: '1', label: 'Customer Name', type: 'text', required: true, placeholder: 'Enter your full name' },
      { id: '2', label: 'Email Address', type: 'email', required: true, placeholder: 'name@company.com' }
    ]);
    this.showBuildPanel.set(true);
  }

  addNewField() {
    const id = Date.now().toString();
    this.newFields.update(fields => [
      ...fields,
      { id, label: 'Custom Field', type: 'text', required: false, placeholder: 'Enter response' }
    ]);
  }

  removeField(id: string) {
    this.newFields.update(f => f.filter(x => x.id !== id));
  }

  moveField(index: number, direction: 'up' | 'down') {
    const fields = [...this.newFields()];
    if (direction === 'up' && index > 0) {
      // Swap with preceding element
      const temp = fields[index];
      fields[index] = fields[index - 1];
      fields[index - 1] = temp;
    } else if (direction === 'down' && index < fields.length - 1) {
      // Swap with succeeding element
      const temp = fields[index];
      fields[index] = fields[index + 1];
      fields[index + 1] = temp;
    }
    this.newFields.set(fields);
  }

  onFieldOptionsChange(e: any, field: FormField) {
    const text = e.target.value || '';
    field.options = text.split(',').map((o: string) => o.trim()).filter((o: string) => !!o);
  }

  async onSaveForm() {
    if (!this.newFormName) {
      return;
    }
    this.isSaving.set(true);
    const ownerId = this.authService.currentUser()?.id;

    const payload = {
      name: this.newFormName,
      description: this.newFormDesc,
      fields: this.newFields(),
      ownerId: ownerId,
      isActive: true
    };

    try {
      await this.http.post<any>('/api/forms', payload).toPromise();
      this.showToast('Form successfully saved & deployed!', 'success');
      this.showBuildPanel.set(false);
      await this.fetchForms();
    } catch (e) {
      this.showToast('Failed to save the form', 'error');
    } finally {
      this.isSaving.set(false);
    }
  }

  async onDelete(id: string) {
    if (confirm('Are you entirely sure you want to delete this form and all its collected submissions?')) {
      try {
        await this.http.delete<any>(`/api/forms/${id}`).toPromise();
        this.showToast('Form successfully deleted', 'success');
        await this.fetchForms();
      } catch (e) {
        this.showToast('Could not delete form', 'error');
      }
    }
  }

  copyLink(id: string) {
    if (typeof window !== 'undefined') {
      const publicUrl = `${window.location.origin}/form/${id}`;
      navigator.clipboard.writeText(publicUrl).then(() => {
        this.showToast('Public link successfully copied to your clipboard!', 'success');
      }).catch(() => {
        this.showToast('Fallback: link is ' + publicUrl, 'success');
      });
    }
  }
}
