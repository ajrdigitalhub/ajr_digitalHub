import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'phone' | 'dropdown' | 'checkbox' | 'radio' | 'date' | 'textarea';
  required: boolean;
  placeholder: string;
  options?: string[];
}

interface Form {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
  isActive: boolean;
}

@Component({
  imports: [ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-app-bg text-app-text flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div id="public-form-container" class="max-w-xl w-full space-y-8">
        
        <!-- Loading State -->
        @if (isLoadingForm()) {
          <div class="glass p-12 text-center rounded-3xl border border-app-border shadow-xl flex flex-col items-center justify-center gap-4">
            <div class="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-xs font-semibold text-app-muted font-mono">Form loading...</p>
          </div>
        }

        <!-- Error State / Deactivated -->
        @else if (hasError() || (form() && !form()?.isActive)) {
          <div id="form-error-card" class="glass p-8 text-center rounded-3xl border border-rose-500/20 shadow-xl space-y-4">
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
              <mat-icon class="text-3xl leading-none">block</mat-icon>
            </div>
            <h3 class="text-lg font-bold text-app-text">Form Offline</h3>
            <p class="text-sm text-app-muted max-w-sm mx-auto leading-relaxed">
              This dynamic form link is inactive, deactivated by the system owner, or has been deleted.
            </p>
          </div>
        }

        <!-- Success thank you box -->
        @else if (hasSuccessfullySubmitted()) {
          <div id="form-success-card" class="glass p-10 text-center rounded-3xl border border-emerald-500/20 shadow-2xl space-y-6 animate-fadeIn">
            <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <mat-icon class="text-4xl h-10 w-10 leading-none">check_circle</mat-icon>
            </div>
            <div>
              <h3 class="text-xl font-bold text-app-text font-sans">Form Received Successfully</h3>
              <p class="text-xs font-medium text-app-muted mt-1">Submission Tally recorded in CRM.</p>
            </div>
            <p class="text-sm text-app-muted max-w-sm mx-auto leading-relaxed">
              Thank you for taking the time to share your details. Your answers have been safely cataloged.
            </p>
            <div class="pt-2 border-t border-app-border">
              <button 
                (click)="resetFormState()"
                class="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 font-semibold rounded-xl text-xs transition-all cursor-pointer"
              >
                <mat-icon class="text-xs">replay</mat-icon>
                Submit another response
              </button>
            </div>
          </div>
        }

        <!-- Normal Form Filling Screen -->
        @else {
          <div class="glass rounded-3xl shadow-xl border border-app-border overflow-hidden">
            <!-- App Style Top Stripe -->
            <div class="h-3 bg-indigo-600"></div>

            <div class="p-6 sm:p-10 space-y-6">
              <!-- Form Branding -->
              <div class="space-y-2 border-b border-app-border pb-5">
                <h2 class="text-2xl font-bold tracking-tight text-app-text font-sans">{{ form()?.name }}</h2>
                <p class="text-xs text-app-muted leading-relaxed">{{ form()?.description }}</p>
                <span class="inline-flex items-center text-[10px] uppercase font-mono tracking-wider font-bold text-app-muted/60">
                  ⚡ Powered by FormBuilder SaaS
                </span>
              </div>

              <!-- Submit Feedback toast -->
              @if (toastMessage()) {
                <div class="p-3.5 rounded-xl flex items-center gap-2 border text-sm bg-rose-500/10 border-rose-500/20 text-rose-400">
                  <mat-icon class="text-base">error</mat-icon>
                  <span>{{ toastMessage() }}</span>
                </div>
              }

              <!-- Dynamic form fields -->
              @if (dynamicForm) {
                <form [formGroup]="dynamicForm" (ngSubmit)="onSubmit()" class="space-y-6">
                  
                  @for (field of form()?.fields; track field.id) {
                    <div class="space-y-2">
                      <label [for]="field.id" class="block text-sm font-semibold text-app-text flex items-center gap-1 select-none">
                        {{ field.label }}
                        @if (field.required) {
                          <span class="text-rose-500 font-bold">*</span>
                        }
                      </label>

                      <!-- TEXT FIELD -->
                      @if (field.type === 'text') {
                        <input 
                          [id]="field.id"
                          [formControlName]="field.id"
                          type="text" 
                          [placeholder]="field.placeholder || 'Type your reply...'"
                          class="block w-full px-4 py-3 border border-app-border rounded-xl text-sm placeholder-app-muted bg-app-card text-app-text focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                      }

                      <!-- TEXTAREA FIELD -->
                      @if (field.type === 'textarea') {
                        <textarea 
                          [id]="field.id"
                          [formControlName]="field.id"
                          rows="3"
                          [placeholder]="field.placeholder || 'Type your paragraph reply...'"
                          class="block w-full px-4 py-3 border border-app-border rounded-xl text-sm placeholder-app-muted bg-app-card text-app-text focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        ></textarea>
                      }

                      <!-- NUMBER FIELD -->
                      @if (field.type === 'number') {
                        <input 
                          [id]="field.id"
                          [formControlName]="field.id"
                          type="number" 
                          [placeholder]="field.placeholder || '0'"
                          class="block w-full px-4 py-3 border border-app-border rounded-xl text-sm placeholder-app-muted bg-app-card text-app-text focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                      }

                      <!-- EMAIL FIELD -->
                      @if (field.type === 'email') {
                        <input 
                          [id]="field.id"
                          [formControlName]="field.id"
                          type="email" 
                          [placeholder]="field.placeholder || 'you@company.com'"
                          class="block w-full px-4 py-3 border border-app-border rounded-xl text-sm placeholder-app-muted bg-app-card text-app-text focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                      }

                      <!-- PHONE FIELD -->
                      @if (field.type === 'phone') {
                        <input 
                          [id]="field.id"
                          [formControlName]="field.id"
                          type="tel" 
                          [placeholder]="field.placeholder || '+1 (555) 000-0000'"
                          class="block w-full px-4 py-3 border border-app-border rounded-xl text-sm placeholder-app-muted bg-app-card text-app-text focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                      }

                      <!-- DATE FIELD -->
                      @if (field.type === 'date') {
                        <input 
                          [id]="field.id"
                          [formControlName]="field.id"
                          type="date" 
                          class="block w-full px-4 py-3 border border-app-border rounded-xl text-sm placeholder-app-muted bg-app-card text-app-text focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                      }

                      <!-- DROPDOWN SELECT FIELD -->
                      @if (field.type === 'dropdown') {
                        <select 
                          [id]="field.id"
                          [formControlName]="field.id"
                          class="block w-full px-4 py-3 border border-app-border rounded-xl text-sm bg-app-card text-app-text focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="" class="bg-app-card text-app-text">- Please Choose -</option>
                          @for (opt of field.options; track opt) {
                            <option [value]="opt" class="bg-app-card text-app-text">{{ opt }}</option>
                          }
                        </select>
                      }

                      <!-- RADIO BUTTONS -->
                      @if (field.type === 'radio') {
                        <div class="flex flex-col gap-2 mt-1 px-1">
                          @for (opt of field.options; track opt) {
                            <label class="inline-flex items-center gap-2 text-sm text-app-text cursor-pointer select-none">
                              <input 
                                type="radio" 
                                [formControlName]="field.id"
                                [value]="opt"
                                class="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                              >
                              {{ opt }}
                            </label>
                          }
                        </div>
                      }

                      <!-- MULTIPLE CHECKBOXES (Complex Binding) -->
                      @if (field.type === 'checkbox') {
                        <div class="flex flex-col gap-2 mt-1 px-1">
                          @for (opt of field.options; track opt) {
                            <label class="inline-flex items-center gap-2 text-sm text-app-text cursor-pointer select-none">
                              <input 
                                type="checkbox"
                                (change)="onCheckboxToggle($event, field.id, opt)"
                                [checked]="isChecked(field.id, opt)"
                                class="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                              >
                              {{ opt }}
                            </label>
                          }
                        </div>
                      }

                      <!-- Validation error warning string -->
                      @if (isInvalid(field.id)) {
                        <span class="text-xs text-rose-500 font-medium">This entry field is required or invalid</span>
                      }
                    </div>
                  }

                  <!-- Primary Submission Action Button -->
                  <div class="pt-4 border-t border-app-border flex justify-end">
                    <button 
                      id="btn-public-submit"
                      type="submit"
                      [disabled]="isSubmittingForm()"
                      class="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-app-text font-semibold rounded-xl text-sm shadow-md cursor-pointer transition-all disabled:opacity-50"
                    >
                      @if (isSubmittingForm()) {
                        <div class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Transmitting...
                      } @else {
                        <mat-icon class="text-sm">send</mat-icon>
                        Submit Response
                      }
                    </button>
                  </div>
                </form>
              }
            </div>
          </div>
        }

      </div>
    </div>
  `
})
export class PublicForm {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  formId = '';
  form = signal<Form | null>(null);
  
  isLoadingForm = signal<boolean>(true);
  hasError = signal<boolean>(false);
  isSubmittingForm = signal<boolean>(false);
  hasSuccessfullySubmitted = signal<boolean>(false);
  toastMessage = signal<string>('');

  // Complex Dynamic Reactive Form matching database fields
  dynamicForm: FormGroup | null = null;
  checkboxSelections: Record<string, string[]> = {};

  constructor() {
    this.route.params.subscribe(p => {
      if (p['id']) {
        this.formId = p['id'];
        this.fetchPublicForm();
      }
    });
  }

  async fetchPublicForm() {
    this.isLoadingForm.set(true);
    this.hasError.set(false);
    try {
      const res: any = await this.http.get<any>(`/api/forms/${this.formId}`).toPromise();
      const formData = res?.data || res;
      if (!formData || (!formData.fields && !formData.name)) {
        this.hasError.set(true);
        return;
      }
      this.form.set(formData);
      this.initFormGroup(formData);
    } catch (e) {
      this.hasError.set(true);
    } finally {
      this.isLoadingForm.set(false);
    }
  }

  initFormGroup(formData: Form) {
    const group: any = {};
    formData.fields.forEach(field => {
      const validations = field.required ? [Validators.required] : [];
      if (field.type === 'email') {
        validations.push(Validators.email);
      }
      
      // Checkboxes track list arrays instead of simple strings
      if (field.type === 'checkbox') {
        this.checkboxSelections[field.id] = [];
        group[field.id] = new FormControl([], validations);
      } else {
        group[field.id] = new FormControl('', validations);
      }
    });
    this.dynamicForm = new FormGroup(group);
  }

  isInvalid(fieldId: string): boolean {
    if (!this.dynamicForm) { return false; }
    const ctrl = this.dynamicForm.get(fieldId);
    return !!(ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty));
  }

  // Checkbox interactions helpers
  onCheckboxToggle(e: any, fieldId: string, option: string) {
    const checked = e.target.checked;
    let selected = this.checkboxSelections[fieldId] || [];

    if (checked) {
      if (!selected.includes(option)) { selected.push(option); }
    } else {
      selected = selected.filter(x => x !== option);
    }

    this.checkboxSelections[fieldId] = selected;
    if (this.dynamicForm) {
      const ctrl = this.dynamicForm.get(fieldId);
      if (ctrl) {
        ctrl.setValue(selected);
        ctrl.markAsDirty();
        ctrl.markAsTouched();
      }
    }
  }

  isChecked(fieldId: string, option: string): boolean {
    return (this.checkboxSelections[fieldId] || []).includes(option);
  }

  resetFormState() {
    this.hasSuccessfullySubmitted.set(false);
    const doc = this.form();
    if (doc) {
      this.initFormGroup(doc);
    }
  }

  async onSubmit() {
    if (!this.dynamicForm) { return; }
    
    // Mark all elements touched
    Object.keys(this.dynamicForm.controls).forEach(key => {
      this.dynamicForm?.get(key)?.markAsTouched();
    });

    if (this.dynamicForm.invalid) {
      this.toastMessage.set('Please check your entries. Standard validations have failed.');
      return;
    }

    this.isSubmittingForm.set(true);
    this.toastMessage.set('');

    const payload = {
      formId: this.formId,
      responses: this.dynamicForm.value
    };

    try {
      await this.http.post<any>(`/api/forms/${this.formId}/submit`, payload).toPromise();
      this.hasSuccessfullySubmitted.set(true);
    } catch (err: any) {
      this.toastMessage.set(err.error?.message || 'Transmission failed. Failed to submit responses.');
    } finally {
      this.isSubmittingForm.set(false);
    }
  }
}
