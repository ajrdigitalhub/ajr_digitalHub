import { Component, Input, Output, EventEmitter, signal, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-marketplace-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#1e1e1e] overflow-hidden shadow-2xl relative">
       <div class="bg-[#2d2d2d] px-4 h-9 flex justify-between items-center shrink-0 border-b border-app-border select-none">
          <div class="flex h-full">
             <div (click)="activeTab.set('html')" [class]="activeTab() === 'html' ? 'border-indigo-500 text-white' : 'border-transparent text-white/40 hover:text-white/80'" class="px-4 h-full flex items-center bg-[#1e1e1e] border-t-2 text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors">
                index.html
             </div>
             <div (click)="activeTab.set('css')" [class]="activeTab() === 'css' ? 'border-indigo-500 text-white bg-[#1e1e1e]' : 'border-transparent text-white/40 hover:text-white/80'" class="px-4 h-full flex items-center text-[11px] font-bold uppercase tracking-wider border-t-2 transition-colors cursor-pointer border-r border-app-border">
                styles.css
             </div>
          </div>
          <div class="flex items-center gap-3">
             <button class="text-app-text/40 hover:text-app-text transition-colors cursor-pointer" title="Format Code">
                <mat-icon class="!w-4 !h-4 !text-[16px]">format_align_left</mat-icon>
             </button>
          </div>
       </div>
       <div class="flex-grow relative group">
          <!-- Line Numbers -->
          <div class="absolute left-0 top-0 bottom-0 w-10 bg-[#1e1e1e] border-r border-app-border flex flex-col items-center pt-4 text-[#858585] text-[10px] font-mono leading-6 select-none pointer-events-none">
             @for (n of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]; track n) {
                <span>{{ n }}</span>
             }
          </div>
          @if (activeTab() === 'html') {
             <textarea 
               class="w-full h-full p-4 pl-12 bg-transparent text-[#d4d4d4] font-mono text-sm resize-none outline-none focus:ring-0 leading-6"
               placeholder="<!-- Enter HTML here... -->"
               [ngModel]="htmlCode" 
               (ngModelChange)="onHtmlChange($event)"
               spellcheck="false"
             ></textarea>
          } @else {
             <textarea 
               class="w-full h-full p-4 pl-12 bg-transparent text-[#ce9178] font-mono text-sm resize-none outline-none focus:ring-0 leading-6"
               placeholder="/* Enter CSS styles here... */"
               [ngModel]="cssCode" 
               (ngModelChange)="onCssChange($event)"
               spellcheck="false"
             ></textarea>
          }
       </div>
       
       <!-- Status Bar -->
       <div class="h-6 bg-[#007acc] px-3 flex justify-between items-center shrink-0">
          <div class="flex items-center gap-3 text-[10px] text-app-text/90 font-medium font-mono uppercase">
             <div class="flex items-center gap-1">
               <mat-icon class="!w-3 !h-3 !text-[12px]">source</mat-icon> UTF-8
             </div>
             <div class="flex items-center gap-1">
               <mat-icon class="!w-3 !h-3 !text-[12px]">code</mat-icon> {{ activeTab() === 'html' ? 'HTML' : 'CSS' }}
             </div>
          </div>
          <div class="text-[10px] text-app-text/80 font-mono">
            Ln 1, Col 1
          </div>
       </div>
    </div>
  `
})
export class EditorComponent {
  @HostBinding('class') hostClass = 'flex-grow flex flex-col h-full w-full overflow-hidden';

  @Input() htmlCode = '';
  @Input() cssCode = '';
  @Output() htmlCodeChange = new EventEmitter<string>();
  @Output() cssCodeChange = new EventEmitter<string>();
  
  activeTab = signal<'html'|'css'>('html');
  
  // Debounce logic
  private htmlTimeout: any;
  private cssTimeout: any;
  
  onHtmlChange(val: string) {
    this.htmlCode = val;
    clearTimeout(this.htmlTimeout);
    this.htmlTimeout = setTimeout(() => {
      this.htmlCodeChange.emit(val);
    }, 300); // 300ms debounce
  }

  onCssChange(val: string) {
    this.cssCode = val;
    clearTimeout(this.cssTimeout);
    this.cssTimeout = setTimeout(() => {
      this.cssCodeChange.emit(val);
    }, 300); // 300ms debounce
  }
}
