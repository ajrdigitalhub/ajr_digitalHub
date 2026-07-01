import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

interface Workflow {
  id: string;
  name: string;
  triggerType: string;
  isActive: boolean;
  actions: string[];
}

@Component({
  selector: 'app-visual-workflow',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header Area -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-app-border pb-5">
        <div>
          <h2 class="text-2xl font-black text-app-text flex items-center gap-2">
            <mat-icon class="text-indigo-500">alt_route</mat-icon>
            Marketing Automation Builder
          </h2>
          <p class="text-xs text-app-muted mt-1">Design visual triggers and trigger-action workflows across your channels.</p>
        </div>

        <button (click)="createNewWorkflow()" class="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer">
          <mat-icon class="text-xs w-4 h-4 leading-none">add</mat-icon>
          Create New Workflow
        </button>
      </div>

      <!-- Main Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Left Column: Workflows directory -->
        <div class="bg-app-card border border-app-border rounded-2xl p-5 space-y-4">
          <h3 class="text-xs font-extrabold text-app-text uppercase tracking-wider">My Workflows</h3>
          <div class="space-y-2">
            @for (flow of workflows(); track flow.id) {
              <div (click)="selectWorkflow(flow)" [class.border-indigo-500]="selectedFlow()?.id === flow.id"
                   class="bg-app-bg border border-app-border rounded-xl p-3.5 hover:border-indigo-500/50 transition-all cursor-pointer flex justify-between items-center group">
                <div>
                  <h4 class="text-xs font-bold text-app-text group-hover:text-indigo-400">{{ flow.name }}</h4>
                  <span class="text-[9px] text-app-muted font-mono block mt-1">Trigger: {{ flow.triggerType }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span [ngClass]="flow.isActive ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-app-muted bg-app-card border-app-border'" class="inline-flex px-1.5 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wider">
                    {{ flow.isActive ? 'Active' : 'Draft' }}
                  </span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Center & Right: Visual Canvas (2 Cols) -->
        <div class="lg:col-span-2 bg-app-card border border-app-border rounded-2xl p-6 flex flex-col justify-between min-h-[500px]">
          @if (selectedFlow()) {
            <div class="space-y-6">
              <!-- Top configuration bar -->
              <div class="flex justify-between items-center pb-4 border-b border-app-border">
                <div>
                  <h3 class="text-sm font-black text-app-text uppercase tracking-wider">{{ selectedFlow()?.name }}</h3>
                  <p class="text-[10px] text-app-muted">Configure triggers and flow connections.</p>
                </div>
                <button (click)="toggleWorkflowState()" [ngClass]="selectedFlow()!.isActive ? 'bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border-rose-500/20' : 'bg-emerald-500/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border-emerald-500/20'" class="px-3 py-1 border rounded-xl text-xs font-bold transition-all cursor-pointer">
                  {{ selectedFlow()!.isActive ? 'Pause Flow' : 'Activate Flow' }}
                </button>
              </div>

              <!-- Node Workflow Timeline -->
              <div class="space-y-4 pl-8 relative before:absolute before:inset-y-0 before:left-11 before:w-px before:bg-app-border">
                
                <!-- Trigger Node -->
                <div class="flex gap-4 items-center relative">
                  <div class="w-8 h-8 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center justify-center font-bold text-xs z-10 shrink-0 shadow-lg">
                    <mat-icon class="text-xs">bolt</mat-icon>
                  </div>
                  <div class="bg-app-bg border border-app-border rounded-xl p-4 flex-grow">
                    <span class="text-[9px] font-bold tracking-wider text-yellow-400 uppercase bg-yellow-500/10 border border-yellow-500/20 px-1 rounded">Trigger</span>
                    <h4 class="text-xs font-bold text-app-text mt-1">When Lead status becomes "{{ selectedFlow()?.triggerType }}"</h4>
                    <p class="text-[10px] text-app-muted mt-0.5">Fires immediately when a lead is qualified or manually synced.</p>
                  </div>
                </div>

                <!-- Sequential Action Cards -->
                @for (act of selectedFlow()?.actions; track act; let idx = $index) {
                  <div class="flex gap-4 items-center relative animate-in slide-in-from-top-2 duration-150">
                    <div class="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-xs z-10 shrink-0 shadow-lg">
                      {{ idx + 1 }}
                    </div>
                    <div class="bg-app-bg border border-app-border rounded-xl p-4 flex-grow flex justify-between items-center group/card">
                      <div>
                        <span class="text-[9px] font-bold tracking-wider text-indigo-400 uppercase bg-indigo-500/10 border border-indigo-500/20 px-1 rounded">Action</span>
                        <h4 class="text-xs font-bold text-app-text mt-1">{{ act }}</h4>
                      </div>
                      <button (click)="removeAction(idx)" class="opacity-0 group-hover/card:opacity-100 text-xs text-rose-400 hover:text-rose-600 transition-all cursor-pointer">
                        <mat-icon class="text-sm">delete</mat-icon>
                      </button>
                    </div>
                  </div>
                }

                <!-- Add Action Node -->
                <div class="flex gap-4 items-center relative">
                  <div class="w-8 h-8 rounded-full bg-app-bg border border-dashed border-app-border flex items-center justify-center text-app-muted z-10 shrink-0">
                    <mat-icon class="text-xs">add</mat-icon>
                  </div>
                  <div class="flex-grow flex gap-2">
                    <button (click)="addAction('Delay 1 Day')" class="px-3 py-1.5 bg-app-bg hover:bg-app-card border border-app-border text-app-text rounded-xl text-[10px] font-bold cursor-pointer transition-colors">
                      + Add Delay
                    </button>
                    <button (click)="addAction('Send WhatsApp: Summer Template')" class="px-3 py-1.5 bg-app-bg hover:bg-app-card border border-app-border text-app-text rounded-xl text-[10px] font-bold cursor-pointer transition-colors">
                      + WhatsApp Dispatch
                    </button>
                    <button (click)="addAction('Create CRM Activity Log')" class="px-3 py-1.5 bg-app-bg hover:bg-app-card border border-app-border text-app-text rounded-xl text-[10px] font-bold cursor-pointer transition-colors">
                      + CRM Log
                    </button>
                  </div>
                </div>

              </div>
            </div>
            
            <div class="border-t border-app-border pt-4 mt-6 text-right">
              <span class="text-[10px] text-app-muted font-mono">Workflow ID: {{ selectedFlow()?.id }}</span>
            </div>
          } @else {
            <div class="flex-grow flex flex-col justify-center items-center text-app-muted space-y-2">
              <mat-icon class="text-4xl !w-12 !h-12 !text-[48px]">alt_route</mat-icon>
              <h4 class="text-xs font-bold">No Workflow Selected</h4>
              <p class="text-[10px]">Select or build a visual trigger workflow from the side menu list.</p>
            </div>
          }
        </div>

      </div>

    </div>
  `
})
export class VisualWorkflow implements OnInit {
  workflows = signal<Workflow[]>([]);
  selectedFlow = signal<Workflow | null>(null);

  ngOnInit() {
    this.workflows.set([
      { id: 'flow-1', name: 'Qualify Lead & Send WhatsApp Offer', triggerType: 'Qualified', isActive: true, actions: ['Delay 1 Day', 'Send WhatsApp: Summer Template', 'Create CRM Activity Log'] },
      { id: 'flow-2', name: 'Form Submitted Welcome Chain', triggerType: 'New', isActive: false, actions: ['Send Email: Welcome SaaS Pack', 'Delay 2 Hours', 'Create CRM Activity Log'] }
    ]);
    this.selectedFlow.set(this.workflows()[0]);
  }

  selectWorkflow(flow: Workflow) {
    this.selectedFlow.set(flow);
  }

  createNewWorkflow() {
    const newFlow = {
      id: `flow_${Date.now()}`,
      name: `Dynamic Marketing Flow #${this.workflows().length + 1}`,
      triggerType: 'New',
      isActive: false,
      actions: ['Send WhatsApp: Summer Template']
    };
    this.workflows.update(list => [...list, newFlow]);
    this.selectedFlow.set(newFlow);
  }

  toggleWorkflowState() {
    if (!this.selectedFlow()) return;
    const flow = this.selectedFlow()!;
    flow.isActive = !flow.isActive;
    this.workflows.update(list => list.map(f => f.id === flow.id ? { ...f, isActive: flow.isActive } : f));
    this.selectedFlow.set({ ...flow });
  }

  addAction(actionName: string) {
    if (!this.selectedFlow()) return;
    const flow = this.selectedFlow()!;
    flow.actions.push(actionName);
    this.workflows.update(list => list.map(f => f.id === flow.id ? { ...f, actions: flow.actions } : f));
    this.selectedFlow.set({ ...flow });
  }

  removeAction(idx: number) {
    if (!this.selectedFlow()) return;
    const flow = this.selectedFlow()!;
    flow.actions.splice(idx, 1);
    this.workflows.update(list => list.map(f => f.id === flow.id ? { ...f, actions: flow.actions } : f));
    this.selectedFlow.set({ ...flow });
  }
}
