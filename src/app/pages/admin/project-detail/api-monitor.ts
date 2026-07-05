import { Component, ChangeDetectionStrategy, input, inject, signal, computed, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ProjectData } from '../../../services/project-detail.service';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../../environments/environment';
import { ObservabilityComponent } from './observability';

// Current month name helper
const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const now = new Date();
const currentMonthLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

@Component({
  selector: 'app-project-api-monitor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, FormsModule, ObservabilityComponent],
  template: `
    <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
      <h2 class="text-2xl font-bold text-app-text tracking-tight flex items-center gap-2">
         <mat-icon class="text-indigo-500">sensors</mat-icon> Analytics & Live Connection Stream
      </h2>

      <!-- Desktop Sub Tab Switcher -->
      <div class="hidden md:flex flex-wrap gap-2 border-b border-app-border pb-px">
        <button (click)="activeTab.set('combined')" [class]="activeTab() === 'combined' ? 'border-indigo-500 text-indigo-400 font-bold border-b-2' : 'text-app-muted hover:text-app-text border-b-2 border-transparent'" class="px-4 py-2 text-sm transition-all pb-3 cursor-pointer">Combined Stream</button>
        <button (click)="activeTab.set('api')" [class]="activeTab() === 'api' ? 'border-indigo-500 text-indigo-400 font-bold border-b-2' : 'text-app-muted hover:text-app-text border-b-2 border-transparent'" class="px-4 py-2 text-sm transition-all pb-3 cursor-pointer">Standard API Monitor</button>
        <button (click)="activeTab.set('usage')" [class]="activeTab() === 'usage' ? 'border-indigo-500 text-indigo-400 font-bold border-b-2' : 'text-app-muted hover:text-app-text border-b-2 border-transparent'" class="px-4 py-2 text-sm transition-all pb-3 flex items-center gap-1 cursor-pointer"><mat-icon class="!w-4 !h-4 !text-[16px] text-indigo-500">bar_chart</mat-icon> Usage & Billing</button>
        <button (click)="activeTab.set('firebase_overview')" [class]="activeTab() === 'firebase_overview' ? 'border-orange-500 text-orange-400 font-bold border-b-2' : 'text-app-muted hover:text-app-text border-b-2 border-transparent'" class="px-4 py-2 text-sm transition-all pb-3 flex items-center gap-1 cursor-pointer"><mat-icon class="!w-4 !h-4 !text-[16px] text-orange-500">sync</mat-icon> Firebase Overview</button>
        <button (click)="activeTab.set('firebase_logs')" [class]="activeTab() === 'firebase_logs' ? 'border-orange-500 text-orange-400 font-bold border-b-2' : 'text-app-muted hover:text-app-text border-b-2 border-transparent'" class="px-4 py-2 text-sm transition-all pb-3 flex items-center gap-1 cursor-pointer"><mat-icon class="!w-4 !h-4 !text-[16px] text-orange-500">receipt_long</mat-icon> Firebase Logs</button>
        <button (click)="activeTab.set('storage')" [class]="activeTab() === 'storage' ? 'border-orange-500 text-orange-400 font-bold border-b-2' : 'text-app-muted hover:text-app-text border-b-2 border-transparent'" class="px-4 py-2 text-sm transition-all pb-3 flex items-center gap-1 cursor-pointer"><mat-icon class="!w-4 !h-4 !text-[16px] text-orange-500">cloud_queue</mat-icon> Storage Panel</button>
        <button (click)="activeTab.set('firebase_api_hits')" [class]="activeTab() === 'firebase_api_hits' ? 'border-orange-500 text-orange-400 font-bold border-b-2' : 'text-app-muted hover:text-app-text border-b-2 border-transparent'" class="px-4 py-2 text-sm transition-all pb-3 flex items-center gap-1 cursor-pointer"><mat-icon class="!w-4 !h-4 !text-[16px] text-orange-500">bolt</mat-icon> Firebase API Hits (RTDB)</button>
        <button (click)="activeTab.set('observability')" [class]="activeTab() === 'observability' ? 'border-indigo-500 text-indigo-400 font-bold border-b-2' : 'text-app-muted hover:text-app-text border-b-2 border-transparent'" class="px-4 py-2 text-sm transition-all pb-3 flex items-center gap-1 cursor-pointer"><mat-icon class="!w-4 !h-4 !text-[16px] text-indigo-500">cloud</mat-icon> ☁️ GCP Observability</button>
      </div>

      <!-- Mobile Sub Tab Selector -->
      <div class="md:hidden relative w-full mb-4 z-30 animate-in duration-200">
         <!-- Mobile Active Tab Indicator -->
         <div (click)="isMobileTabMenuOpen.set(!isMobileTabMenuOpen())" class="flex items-center justify-between w-full pl-4 pr-1.5 py-1.5 bg-app-card border border-app-border rounded-xl cursor-pointer hover:bg-app-card/85 transition-all select-none shadow-xs">
            <span class="flex items-center gap-2 font-bold text-xs text-indigo-400">
               <mat-icon class="!w-[16px] !h-[16px] !text-[16px]">{{ getTabIcon(activeTab()) }}</mat-icon>
               {{ getTabLabel(activeTab()) }}
            </span>
            <button class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-app-bg/50 text-app-muted hover:text-app-text transition-colors">
               <mat-icon class="!w-[18px] !h-[18px] !text-[18px]">{{ isMobileTabMenuOpen() ? 'close' : 'menu' }}</mat-icon>
            </button>
         </div>

         <!-- Floating Tab Dropdown Options -->
         @if (isMobileTabMenuOpen()) {
            <div class="absolute left-0 right-0 mt-1 bg-app-card border border-app-border rounded-xl shadow-xl z-50 p-1.5 max-h-[60vh] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
               <div class="flex flex-col gap-0.5">
                  <button (click)="activeTab.set('combined'); isMobileTabMenuOpen.set(false)" [class]="activeTab() === 'combined' ? 'bg-indigo-50/20 text-indigo-500 font-bold border border-indigo-500/10' : 'text-app-text hover:bg-app-bg border border-transparent'" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left">
                     <mat-icon class="!w-[16px] !h-[16px] !text-[16px]">shuffle</mat-icon> Combined Stream
                  </button>
                  <button (click)="activeTab.set('api'); isMobileTabMenuOpen.set(false)" [class]="activeTab() === 'api' ? 'bg-indigo-50/20 text-indigo-500 font-bold border border-indigo-500/10' : 'text-app-text hover:bg-app-bg border border-transparent'" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left">
                     <mat-icon class="!w-[16px] !h-[16px] !text-[16px]">sensors</mat-icon> Standard API Monitor
                  </button>
                  <button (click)="activeTab.set('usage'); isMobileTabMenuOpen.set(false)" [class]="activeTab() === 'usage' ? 'bg-indigo-50/20 text-indigo-500 font-bold border border-indigo-500/10' : 'text-app-text hover:bg-app-bg border border-transparent'" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left">
                     <mat-icon class="!w-[16px] !h-[16px] !text-[16px]">bar_chart</mat-icon> Usage & Billing
                  </button>
                  <button (click)="activeTab.set('firebase_overview'); isMobileTabMenuOpen.set(false)" [class]="activeTab() === 'firebase_overview' ? 'bg-orange-50/20 text-orange-400 font-bold border border-orange-500/10' : 'text-app-text hover:bg-app-bg border border-transparent'" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left">
                     <mat-icon class="!w-[16px] !h-[16px] !text-[16px]">sync</mat-icon> Firebase Overview
                  </button>
                  <button (click)="activeTab.set('firebase_logs'); isMobileTabMenuOpen.set(false)" [class]="activeTab() === 'firebase_logs' ? 'bg-orange-50/20 text-orange-400 font-bold border border-orange-500/10' : 'text-app-text hover:bg-app-bg border border-transparent'" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left">
                     <mat-icon class="!w-[16px] !h-[16px] !text-[16px]">receipt_long</mat-icon> Firebase Logs
                  </button>
                  <button (click)="activeTab.set('storage'); isMobileTabMenuOpen.set(false)" [class]="activeTab() === 'storage' ? 'bg-orange-50/20 text-orange-400 font-bold border border-orange-500/10' : 'text-app-text hover:bg-app-bg border border-transparent'" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left">
                     <mat-icon class="!w-[16px] !h-[16px] !text-[16px]">cloud_queue</mat-icon> Storage Panel
                  </button>
                  <button (click)="activeTab.set('firebase_api_hits'); isMobileTabMenuOpen.set(false)" [class]="activeTab() === 'firebase_api_hits' ? 'bg-orange-50/20 text-orange-400 font-bold border border-orange-500/10' : 'text-app-text hover:bg-app-bg border border-transparent'" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left">
                     <mat-icon class="!w-[16px] !h-[16px] !text-[16px]">bolt</mat-icon> Firebase API Hits (RTDB)
                  </button>
                  <button (click)="activeTab.set('observability'); isMobileTabMenuOpen.set(false)" [class]="activeTab() === 'observability' ? 'bg-indigo-50/20 text-indigo-500 font-bold border border-indigo-500/10' : 'text-app-text hover:bg-app-bg border border-transparent'" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left">
                     <mat-icon class="!w-[16px] !h-[16px] !text-[16px]">cloud</mat-icon> GCP Observability
                  </button>
               </div>
            </div>
         }
      </div>

      <!-- Warning if Firebase not configured for Firebase tabs -->
      <div *ngIf="isFirebaseTab() && !project().firebase_config" class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 flex items-start gap-4 animate-in fade-in duration-300">
         <div class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
            <mat-icon class="text-amber-400">warning</mat-icon>
         </div>
         <div>
            <h3 class="text-sm font-bold text-amber-400">Firebase Integration Pending</h3>
            <p class="text-xs text-amber-200/80 mt-1">
               This application has not been configured with Firebase. 
               Go to the <strong class="text-amber-300 font-bold">Configuration</strong> tab to add integration credentials and enable live monitoring logs.
            </p>
         </div>
      </div>
      
      <!-- Content Switcher -->
      @switch (activeTab()) {
         <!-- 1. Combined Stream Tab -->
         @case ('combined') {
            <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 h-auto lg:h-[600px] animate-in fade-in duration-200">
               <!-- Left Analytics Panel (API overview) -->
               <div class="col-span-2 bg-app-bg border border-app-border rounded-xl flex flex-col overflow-hidden shadow-sm p-4 md:p-5 space-y-3 md:space-y-4">
                  <h3 class="text-xs font-bold text-app-text uppercase tracking-widest border-b border-app-border pb-2 md:pb-3">Gateway Telemetry</h3>
                  <div class="grid grid-cols-3 lg:grid-cols-1 gap-2 md:gap-4">
                     <div class="bg-app-card border border-app-border rounded-lg p-2.5 md:p-4 flex flex-col gap-1 min-w-0">
                        <span class="text-[9px] md:text-xs font-bold uppercase tracking-widest text-app-muted truncate">API Load</span>
                        <span class="text-xs sm:text-sm md:text-xl font-bold font-mono text-indigo-400 truncate">{{ analyticsData()?.hits || 0 | number }} Hits</span>
                     </div>
                     <div class="bg-app-card border border-app-border rounded-lg p-2.5 md:p-4 flex flex-col gap-1 min-w-0" *ngIf="project().firebase_config">
                        <span class="text-[9px] md:text-xs font-bold uppercase tracking-wider text-app-muted truncate">Active Users</span>
                        <span class="text-xs sm:text-sm md:text-xl font-bold font-mono text-orange-400 truncate">{{ firebaseAnalytics()?.activeUsers || 0 }} Users</span>
                     </div>
                     <div class="bg-app-card border border-app-border rounded-lg p-2.5 md:p-4 flex flex-col gap-1 min-w-0" *ngIf="project().firebase_config">
                        <span class="text-[9px] md:text-xs font-bold uppercase tracking-wider text-app-muted truncate">Storage Space</span>
                        <span class="text-xs sm:text-sm md:text-xl font-bold font-mono text-cyan-400 truncate">{{ firebaseStorage()?.storageUsedMb || 0 }} MB</span>
                     </div>
                  </div>
               </div>
               
               <!-- Right combined logs terminal -->
               <div class="col-span-3 bg-app-bg border border-app-border rounded-xl flex flex-col overflow-hidden shadow-sm h-[400px] lg:h-full">
                  <div class="p-4 border-b border-app-border flex items-center justify-between bg-app-bg">
                     <div class="flex items-center gap-3">
                        <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse relative shadow-[0_0_10px_rgba(16,185,129,0.7)]"></div>
                        <h3 class="text-xs font-bold text-app-text font-mono tracking-wider uppercase">Combined Gateway Feed</h3>
                     </div>
                  </div>
                  <div class="p-5 flex-grow overflow-y-auto space-y-2 font-mono text-[12px] h-full custom-scrollbar" id="stream-console">
                    @for (feed of combinedFeeds(); track feed.timestamp + feed.endpoint + feed.source) {
                      <div [class]="feed.isError ? 'flex items-start gap-4 border border-rose-500/20 bg-rose-500/5 p-2 rounded -mx-1 mt-2 mb-2' : 'flex items-start gap-4 opacity-70 hover:bg-app-bg/50 p-1 -mx-1 rounded'">
                        <span class="text-app-muted w-16 shrink-0">{{ feed.time }}</span>
                        <span [class]="feed.source === 'Firebase' ? 'bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border border-orange-500/20 shrink-0' : 'bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border border-indigo-500/20 shrink-0'">{{ feed.source }}</span>
                        <span [class]="feed.isError ? 'text-rose-400 font-bold w-12 shrink-0' : feed.method === 'GET' ? 'text-emerald-400 w-12 shrink-0' : 'text-indigo-400 w-12 shrink-0'">{{ feed.method }}</span>
                        <div class="flex-grow min-w-0">
                            <span [class]="feed.isError ? 'text-rose-300 break-all' : 'text-app-text break-all'">{{ feed.endpoint }}</span>
                            @if (feed.isError && feed.details) {
                              <div class="text-rose-400/80 mt-1">{{ feed.details }}</div>
                            }
                        </div>
                        @if (feed.source === 'API' && !feed.isError) {
                          <span class="text-emerald-500/70 ml-auto shrink-0 tabular-nums">{{ feed.status }} ({{ feed.duration }}ms)</span>
                        } @else if (feed.source === 'Firebase') {
                          <span [class]="feed.isError ? 'text-rose-400 ml-auto shrink-0 font-bold' : feed.status === 'WARNING' ? 'text-amber-400 ml-auto shrink-0 font-bold' : 'text-app-muted ml-auto shrink-0 font-mono'">{{ feed.status }}</span>
                        }
                      </div>
                    }
                    <div class="text-app-muted animate-pulse mt-6 text-center italic">Waiting for events...</div>
                  </div>
               </div>
            </div>
         }

         <!-- 2. Standard API Monitor Tab -->
         @case ('api') {
            <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 h-auto lg:h-[600px] animate-in fade-in duration-200">
               <!-- Endpoint Analysis -->
               <div class="col-span-2 bg-app-bg border border-app-border rounded-xl flex flex-col overflow-hidden shadow-sm">
                  <div class="p-4 border-b border-app-border bg-app-bg/80 flex justify-between items-center bg-app-bg">
                     <h3 class="text-xs font-bold text-app-text uppercase tracking-widest">Routing Analysis</h3>
                     @if (analyticsData()) {
                        <span class="text-xs text-app-muted">Total Hits: {{ analyticsData().hits | number }}</span>
                      }
                  </div>
                  <div class="flex-grow overflow-y-auto custom-scrollbar p-3 md:p-4 flex flex-row lg:flex-col gap-2.5 md:gap-4">
                     @if (analyticsData()) {
                        <div class="bg-app-card border border-app-border rounded-lg p-2.5 md:p-4 flex flex-col gap-1 md:gap-2 flex-1 min-w-0">
                           <span class="text-[9px] md:text-xs font-bold uppercase tracking-widest text-app-muted truncate">Error Rate</span>
                           <span class="text-xs sm:text-sm md:text-2xl font-bold font-mono text-rose-400 truncate">{{ analyticsData().error_rate }}</span>
                        </div>
                        <div class="bg-app-card border border-app-border rounded-lg p-2.5 md:p-4 flex flex-col gap-1 md:gap-2 flex-1 min-w-0">
                           <span class="text-[9px] md:text-xs font-bold uppercase tracking-widest text-app-muted truncate">Avg Latency</span>
                           <span class="text-xs sm:text-sm md:text-2xl font-bold font-mono text-amber-400 truncate">{{ analyticsData().avg_latency }}</span>
                        </div>
                        <div class="bg-app-card border border-app-border rounded-lg p-2.5 md:p-4 flex flex-col gap-1 md:gap-2 flex-1 min-w-0">
                           <span class="text-[9px] md:text-xs font-bold uppercase tracking-widest text-app-muted truncate">Live Conns</span>
                           <span class="text-xs sm:text-sm md:text-2xl font-bold font-mono text-emerald-400 truncate">{{ analyticsData().live_connections }}</span>
                        </div>
                     } @else {
                        <div class="text-app-muted text-center italic mt-10 w-full">Loading analytics...</div>
                     }
                  </div>
               </div>

               <!-- Live Stream Console -->
               <div class="col-span-3 bg-app-bg border border-app-border rounded-xl flex flex-col overflow-hidden shadow-sm h-[400px] lg:h-full">
                  <div class="p-4 border-b border-app-border flex items-center justify-between bg-app-bg">
                     <div class="flex items-center gap-3">
                        <div class="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse relative shadow-[0_0_10px_rgba(99,102,241,0.7)]"></div>
                        <h3 class="text-xs font-bold text-app-text font-mono tracking-wider uppercase">Live Connection Feed</h3>
                     </div>
                     <select (change)="updateFilter($any($event.target).value)" class="bg-app-bg border border-app-border text-xs text-app-muted rounded px-3 py-1.5 outline-none hover:border-slate-600 transition cursor-pointer">
                        <option value="all">All Connections</option>
                        <option value="errors">Errors Only</option>
                     </select>
                  </div>
                  <div class="p-5 flex-grow overflow-y-auto space-y-2 font-mono text-[12px] h-full custom-scrollbar" id="api-stream-console">
                    @for (feed of filteredFeeds(); track feed.time + feed.endpoint) {
                      <div [class]="feed.isError ? 'flex items-start gap-4 border border-rose-500/20 bg-rose-500/5 p-2 rounded -mx-1 mt-2 mb-2' : 'flex items-start gap-4 opacity-70 hover:bg-app-bg/50 p-1 -mx-1 rounded'">
                        <span [class]="feed.isError ? 'text-rose-500 w-16 shrink-0' : 'text-app-muted w-16 shrink-0'">{{ feed.time }}</span>
                        <span [class]="feed.isError ? 'text-rose-400 font-bold w-10 shrink-0' : feed.method === 'GET' ? 'text-emerald-400 w-10 shrink-0' : 'text-indigo-400 w-10 shrink-0'">{{ feed.isError ? 'ERR' : feed.method }}</span>
                        <div class="flex-grow min-w-0">
                            <span [class]="feed.isError ? 'text-rose-300 break-all' : 'text-app-text break-all'">{{ feed.endpoint }}</span>
                            @if (feed.isError) {
                              <div class="text-rose-400/80 mt-1">{{ feed.details }}</div>
                            }
                        </div>
                        @if (!feed.isError) {
                          <span class="text-emerald-500/70 ml-auto shrink-0">{{ feed.status }} ({{ feed.duration }}ms)</span>
                        }
                      </div>
                    }
                    <div class="text-app-muted animate-pulse mt-6 text-center italic">Waiting for events...</div>
                  </div>
               </div>
            </div>
         }

         <!-- 2b. Usage & Cost Tab (Firebase style dashboard cost + hits chart) -->
         @case ('usage') {
            <div class="space-y-6 animate-in fade-in duration-200">
               
               <!-- A. Project Cost widget (matches reference design layout) -->
               <div class="bg-[#111827] border border-app-border rounded-xl p-6 shadow-xl relative overflow-hidden">
                  <!-- Header tools -->
                  <div class="flex justify-between items-start mb-4">
                     <div>
                        <h3 class="text-lg font-bold text-app-text flex items-center gap-3">
                           Project cost 
                           <span class="bg-[#374151] text-xs font-bold text-gray-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {{ project().plan || 'Blaze' }}
                           </span>
                           @if (billingData()?.billingEnabled) {
                              <span class="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                 <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Live Data
                              </span>
                           }
                        </h3>
                        <p class="text-xs text-app-muted mt-1 font-sans">
                           Your project's complete billing information can be viewed in <a [href]="'https://console.cloud.google.com/billing?project=' + (project().firebase_config?.projectId || '')" target="_blank" class="text-blue-400 hover:underline inline-flex items-center gap-1">Google Cloud Console <mat-icon class="!w-3 !h-3 !text-[11px] align-middle">open_in_new</mat-icon></a>
                        </p>
                     </div>
                     <!-- Month dropdown selector -->
                     <div class="relative">
                        <button (click)="isMonthDropdownOpen.set(!isMonthDropdownOpen())" class="flex items-center gap-2 bg-[#1f2937] hover:bg-[#374151] border border-app-border rounded-lg px-3 py-1.5 cursor-pointer text-xs text-gray-200 font-sans transition-colors duration-200">
                           <mat-icon class="!w-4 !h-4 !text-[16px] text-gray-400 align-middle">calendar_month</mat-icon>
                           <span class="font-bold">{{ currentMonthLabel() }}</span>
                           <mat-icon class="!w-3 !h-3 !text-[12px] text-gray-400 align-middle">expand_more</mat-icon>
                        </button>
                        @if (isMonthDropdownOpen()) {
                           <div class="absolute right-0 mt-2 w-48 bg-[#1f2937] border border-app-border rounded-lg shadow-xl z-50 overflow-hidden py-1 max-h-60 overflow-y-auto custom-scrollbar">
                              @for (m of availableMonths(); track m.value) {
                                 <button (click)="selectMonth(m.value); isMonthDropdownOpen.set(false)" class="w-full text-left px-4 py-2 text-xs transition-colors duration-150 text-gray-300 hover:bg-[#374151]" [ngClass]="{'bg-blue-500/10 !text-blue-400 font-bold': selectedMonth() === m.value}">
                                    {{ m.label }}
                                 </button>
                              }
                           </div>
                        }
                     </div>
                  </div>

                  <!-- Floating Delay Banner -->
                  <div class="flex justify-center -mt-1 mb-4">
                     <div class="bg-[#1f2937] border border-app-border/60 text-gray-300 px-4 py-1.5 rounded-lg text-xs font-bold shadow-md">
                        Cost data may be delayed up to 24 hours · Source: Cloud Monitoring API
                     </div>
                  </div>

                  <!-- Chart Grid & Graph -->
                  <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
                                       <!-- Left Chart SVG -->
                      <div class="lg:col-span-3 h-52 relative border-b border-app-border/40 pb-4">
                         <svg class="w-full h-full overflow-visible" viewBox="0 0 1000 200" preserveAspectRatio="none">
                            <defs>
                               <linearGradient id="functions-glow" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stop-color="#f43f5e" stop-opacity="0.15" />
                                  <stop offset="100%" stop-color="#f43f5e" stop-opacity="0.0" />
                               </linearGradient>
                               <linearGradient id="hosting-glow" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.15" />
                                  <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.0" />
                               </linearGradient>
                               <linearGradient id="non-firebase-glow" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.15" />
                                  <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.0" />
                               </linearGradient>
                               <filter id="functions-neon" x="-10%" y="-10%" width="120%" height="120%">
                                  <feGaussianBlur stdDeviation="4" result="blur" />
                                  <feMerge>
                                     <feMergeNode in="blur" />
                                     <feMergeNode in="SourceGraphic" />
                                  </feMerge>
                               </filter>
                               <filter id="hosting-neon" x="-10%" y="-10%" width="120%" height="120%">
                                  <feGaussianBlur stdDeviation="4" result="blur" />
                                  <feMerge>
                                     <feMergeNode in="blur" />
                                     <feMergeNode in="SourceGraphic" />
                                  </feMerge>
                               </filter>
                               <filter id="non-firebase-neon" x="-10%" y="-10%" width="120%" height="120%">
                                  <feGaussianBlur stdDeviation="4" result="blur" />
                                  <feMerge>
                                     <feMergeNode in="blur" />
                                     <feMergeNode in="SourceGraphic" />
                                  </feMerge>
                               </filter>
                            </defs>
 
                            <!-- Grid lines -->
                            <line x1="0" y1="30" x2="1000" y2="30" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />
                            <line x1="0" y1="95" x2="1000" y2="95" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />
                            <line x1="0" y1="160" x2="1000" y2="160" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />
 
                            <!-- Filled Glows & Paths -->
                            @if (functionsPoints().length > 0) {
                               <!-- Cloud Functions -->
                               @if (showFunctionsLine) {
                                  <path [attr.d]="functionsFillPath()" fill="url(#functions-glow)" />
                                  <path [attr.d]="functionsPath()" fill="none" stroke="#f43f5e" stroke-width="2.5" filter="url(#functions-neon)" stroke-linecap="round" />
                                  <circle [attr.cx]="functionsLatestPoint().x" [attr.cy]="functionsLatestPoint().y" r="5" fill="#f43f5e" />
                               }
                               
                               <!-- App Hosting -->
                               @if (showHostingLine) {
                                  <path [attr.d]="hostingFillPath()" fill="url(#hosting-glow)" />
                                  <path [attr.d]="hostingPath()" fill="none" stroke="#3b82f6" stroke-width="2.5" filter="url(#hosting-neon)" stroke-linecap="round" />
                                  <circle [attr.cx]="hostingLatestPoint().x" [attr.cy]="hostingLatestPoint().y" r="5" fill="#3b82f6" />
                               }

                               <!-- Non-Firebase Services -->
                               @if (showNonFirebaseLine) {
                                  <path [attr.d]="nonFirebaseFillPath()" fill="url(#non-firebase-glow)" />
                                  <path [attr.d]="nonFirebasePath()" fill="none" stroke="#f59e0b" stroke-width="2.5" filter="url(#non-firebase-neon)" stroke-linecap="round" />
                                  <circle [attr.cx]="nonFirebaseLatestPoint().x" [attr.cy]="nonFirebaseLatestPoint().y" r="5" fill="#f59e0b" />
                               }
                            }
                         </svg>
                         
                         <!-- Dynamic Axis Labels -->
                         <div class="flex justify-between text-[9px] text-app-muted font-bold mt-2 font-mono uppercase tracking-wider">
                            @for (label of historyAxisLabels(); track label) {
                               <span>{{ label }}</span>
                            }
                         </div>
                      </div>
 
                      <!-- Right check list & Total Cost -->
                      <div class="lg:col-span-1 bg-[#1f2937]/40 border border-app-border rounded-xl p-5 space-y-5">
                         <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-[#f43f5e] flex items-center gap-1.5">
                               <span class="w-2.5 h-2.5 rounded-full bg-[#f43f5e]"></span> Cloud Functions
                            </span>
                            <div class="flex items-center gap-2">
                               <input type="checkbox" [(ngModel)]="showFunctionsLine" class="accent-rose-500 rounded cursor-pointer">
                               <span class="text-sm font-black font-mono text-app-text">₹{{ getFunctionsCost() }}</span>
                            </div>
                         </div>

                         <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-[#3b82f6] flex items-center gap-1.5">
                               <span class="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></span> App Hosting
                            </span>
                            <div class="flex items-center gap-2">
                               <input type="checkbox" [(ngModel)]="showHostingLine" class="accent-blue-500 rounded cursor-pointer">
                               <span class="text-sm font-black font-mono text-app-text">₹{{ getHostingCost() }}</span>
                            </div>
                         </div>

                         <div class="flex items-center justify-between">
                             <span class="text-xs font-bold text-[#f59e0b] flex items-center gap-1.5" title="Cloud Logging, Artifact Registry, Secrets, Build overhead">
                                <span class="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span> GCP Non-Firebase
                                <mat-icon class="!text-[12px] !w-3 !h-3 text-app-muted align-middle">help_outline</mat-icon>
                             </span>
                             <div class="flex items-center gap-2">
                                <input type="checkbox" [(ngModel)]="showNonFirebaseLine" class="accent-amber-500 rounded cursor-pointer">
                                <span class="text-sm font-black font-mono text-app-text">₹{{ getGcpNonFirebaseCost() }}</span>
                             </div>
                          </div>

                          <div class="flex items-center justify-between">
                             <span class="text-xs font-bold text-[#10b981] flex items-center gap-1.5" title="WhatsApp API, Push Notifications, Custom domain Routing">
                                <span class="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span> Local Services
                                <mat-icon class="!text-[12px] !w-3 !h-3 text-app-muted align-middle">help_outline</mat-icon>
                             </span>
                             <div class="flex items-center gap-2">
                                <span class="text-sm font-black font-mono text-app-text">₹{{ getNonFirebaseCost() }}</span>
                             </div>
                          </div>
                         
                         @if (billingData()?.totalExecutions) {
                            <div class="flex items-center justify-between">
                               <span class="text-xs font-bold text-gray-400">Total Executions (MTD)</span>
                               <span class="text-xs font-black font-mono text-cyan-400">{{ billingData().totalExecutions | number }}</span>
                            </div>
                         }
                         
                         <div class="border-t border-app-border/40 pt-4">
                            <span class="text-[10px] font-bold text-app-muted uppercase tracking-widest block">Project cost (MTD)</span>
                            <span class="text-2xl font-black font-mono text-app-text mt-1 block">₹{{ realProjectCost() }}</span>
                            @if (billingData()?.billingEnabled) {
                               <span class="text-[10px] text-emerald-400 font-bold">● Real Firebase Billing</span>
                            } @else {
                               <span class="text-[10px] text-app-muted">From usage analytics</span>
                            }
                         </div>
                      </div>
                  </div>
               </div>

               <!-- B. Product Usage & API Hits Graph -->
               <div class="bg-[#111827] border border-app-border rounded-xl p-6 shadow-xl space-y-4">
                  <div>
                     <h3 class="text-lg font-bold text-app-text">Product Usage</h3>
                     <p class="text-xs text-app-muted mt-1 font-sans">
                        Firebase offers a no-cost tier for paid infrastructure products. You'll be charged only for any usage that goes above these no-cost tier thresholds.
                     </p>
                  </div>

                  <div class="bg-[#1f2937]/20 border border-app-border/60 rounded-xl p-5 space-y-4">
                     <div class="flex items-center gap-2 text-xs font-bold text-app-text border-b border-app-border/40 pb-3">
                        <mat-icon class="text-indigo-400 !w-4 !h-4 !text-[16px]">sensors</mat-icon>
                        <span>Cloud Storage / API Gateway Hits</span>
                     </div>

                     <!-- Chart SVG -->
                     <div class="h-44 relative">
                        <svg class="w-full h-full overflow-visible" viewBox="0 0 1000 200" preserveAspectRatio="none">
                           <defs>
                              <linearGradient id="hits-glow" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="0%" stop-color="#818cf8" stop-opacity="0.15" />
                                 <stop offset="100%" stop-color="#818cf8" stop-opacity="0.0" />
                              </linearGradient>
                              <filter id="hits-neon" x="-10%" y="-10%" width="120%" height="120%">
                                 <feGaussianBlur stdDeviation="4" result="blur" />
                                 <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                 </feMerge>
                              </filter>
                           </defs>

                           <!-- Grid lines -->
                           <line x1="0" y1="30" x2="1000" y2="30" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />
                           <line x1="0" y1="95" x2="1000" y2="95" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />
                           <line x1="0" y1="160" x2="1000" y2="160" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />

                           <!-- Filled Glow -->
                           @if (hitsPoints().length > 0) {
                              <path [attr.d]="hitsFillPath()" fill="url(#hits-glow)" />
                              <path [attr.d]="hitsPath()" fill="none" stroke="#818cf8" stroke-width="2" filter="url(#hits-neon)" stroke-linecap="round" />
                              
                              <!-- Dot on latest -->
                              <circle [attr.cx]="hitsLatestPoint().x" [attr.cy]="hitsLatestPoint().y" r="4.5" fill="#818cf8" />
                           }
                        </svg>
                     </div>
                  </div>

                  <!-- Summary Table of hits & latency -->
                  <div class="grid grid-cols-2 md:grid-cols-4 bg-[#1f2937]/30 border border-app-border rounded-xl p-3 md:p-4 text-center uppercase tracking-widest text-[9px] md:text-[10px] font-bold gap-y-4 md:gap-y-0">
                     <div class="flex flex-col gap-1 border-r border-app-border/40 py-1 md:py-2 min-w-0">
                        <span class="text-app-muted truncate">Triggered Hits</span>
                        <span class="text-sm md:text-lg font-black font-mono text-indigo-400 mt-0.5 md:mt-1 truncate">{{ analyticsData()?.hits || 0 | number }} Hits</span>
                     </div>
                     <div class="flex flex-col gap-1 md:border-r border-app-border/40 py-1 md:py-2 min-w-0">
                        <span class="text-app-muted truncate">Avg Latency</span>
                        <span class="text-sm md:text-lg font-black font-mono text-amber-400 mt-0.5 md:mt-1 truncate">{{ analyticsData()?.avg_latency || '0ms' }}</span>
                     </div>
                     <div class="flex flex-col gap-1 border-r border-app-border/40 py-1 md:py-2 min-w-0">
                        <span class="text-app-muted truncate">Error Rate</span>
                        <span class="text-sm md:text-lg font-black font-mono text-rose-400 mt-0.5 md:mt-1 truncate">{{ analyticsData()?.error_rate || '0%' }}</span>
                     </div>
                     <div class="flex flex-col gap-1 py-1 md:py-2 min-w-0">
                        <span class="text-app-muted truncate">Cost (MTD)</span>
                        <span class="text-sm md:text-lg font-black font-mono text-emerald-400 mt-0.5 md:mt-1 truncate">₹{{ realProjectCost() }}</span>
                     </div>
                  </div>

               </div>
            </div>
         }

         <!-- 3. Firebase Overview Tab -->
         @case ('firebase_overview') {
            <div class="space-y-6 animate-in fade-in duration-200" *ngIf="project().firebase_config">
               <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  <!-- Project ID -->
                  <div class="bg-app-bg border border-app-border rounded-xl p-3 sm:p-4 md:p-5 shadow-sm flex flex-col justify-between">
                     <div>
                        <div class="text-[9px] md:text-xs font-bold text-app-muted uppercase tracking-wider mb-0.5 md:mb-1">Project ID</div>
                        <div class="text-xs sm:text-sm md:text-lg font-mono font-bold text-orange-400 truncate mt-1 md:mt-2" [title]="firebaseStatus()?.projectId || project().firebase_config?.projectId">{{ firebaseStatus()?.projectId || project().firebase_config?.projectId }}</div>
                     </div>
                  </div>
                  <!-- Status -->
                  <div class="bg-app-bg border border-app-border rounded-xl p-3 sm:p-4 md:p-5 shadow-sm flex flex-col justify-between">
                     <div>
                        <div class="text-[9px] md:text-xs font-bold text-app-muted uppercase tracking-wider mb-0.5 md:mb-1">Status</div>
                        <div class="flex items-center gap-1.5 mt-1 md:mt-2">
                           <div class="w-2 h-2 rounded-full shrink-0" [ngClass]="{'bg-emerald-400': firebaseStatus()?.status === 'LIVE', 'bg-rose-400': firebaseStatus()?.status !== 'LIVE'}"></div>
                           <span class="text-xs sm:text-sm md:text-lg font-bold text-app-text uppercase truncate">{{ firebaseStatus()?.status || 'UNKNOWN' }}</span>
                        </div>
                     </div>
                  </div>
                  <!-- Last Deploy -->
                  <div class="bg-app-bg border border-app-border rounded-xl p-3 sm:p-4 md:p-5 shadow-sm flex flex-col justify-between">
                     <div>
                        <div class="text-[9px] md:text-xs font-bold text-app-muted uppercase tracking-wider mb-0.5 md:mb-1">Last Deployed</div>
                        <div class="text-[10px] md:text-xs font-semibold text-app-text mt-1 md:mt-2.5 truncate" [title]="firebaseStatus()?.lastDeployTime | date:'medium'">{{ firebaseStatus()?.lastDeployTime | date:'short' }}</div>
                     </div>
                  </div>
                  <!-- Active Users -->
                  <div class="bg-app-bg border border-app-border rounded-xl p-3 sm:p-4 md:p-5 shadow-sm flex flex-col justify-between">
                     <div>
                        <div class="text-[9px] md:text-xs font-bold text-app-muted uppercase tracking-wider mb-0.5 md:mb-1">Active Users</div>
                        <div class="text-sm sm:text-base md:text-2xl font-black text-cyan-400 mt-0.5 md:mt-1 font-mono truncate">{{ firebaseAnalytics()?.activeUsers || 0 | number }}</div>
                     </div>
                  </div>
               </div>

               <!-- Deployment Gateway details -->
               <div class="bg-app-bg border border-app-border rounded-xl p-6 shadow-sm space-y-4" *ngIf="firebaseStatus()">
                  <h3 class="text-sm font-bold text-app-text flex items-center gap-2">
                     <mat-icon class="text-orange-500">language</mat-icon> Deployment Gateway Endpoints
                  </h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                     <div>
                        <span class="text-app-muted block mb-1">Hosting URL</span>
                        <a [href]="firebaseStatus()?.hostingUrl" target="_blank" class="text-indigo-400 hover:underline flex items-center gap-1.5">
                           {{ firebaseStatus()?.hostingUrl }} <mat-icon class="!w-3 !h-3 !text-[12px]">open_in_new</mat-icon>
                        </a>
                     </div>
                     <div>
                        <span class="text-app-muted block mb-1">Deployed By</span>
                        <span class="text-app-text">{{ firebaseStatus()?.deployedBy }}</span>
                     </div>
                  </div>
               </div>
            </div>
         }

         <!-- 4. Firebase Logs Tab -->
         @case ('firebase_logs') {
            <div class="bg-app-bg border border-app-border rounded-xl flex flex-col overflow-hidden shadow-sm h-[500px] animate-in fade-in duration-200" *ngIf="project().firebase_config">
               <div class="p-4 border-b border-app-border flex items-center justify-between bg-app-bg">
                  <div class="flex items-center gap-3">
                     <div class="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse relative shadow-[0_0_10px_rgba(249,115,22,0.7)]"></div>
                     <h3 class="text-xs font-bold text-app-text font-mono tracking-wider uppercase">Firebase Real-time Terminal</h3>
                  </div>
                  <select (change)="updateFirebaseFilter($any($event.target).value)" class="bg-app-bg border border-app-border text-xs text-app-muted rounded px-3 py-1.5 outline-none hover:border-slate-600 transition cursor-pointer font-sans">
                     <option value="ALL">All Severities</option>
                     <option value="INFO">INFO Only</option>
                     <option value="WARNING">WARNING Only</option>
                     <option value="ERROR">ERROR Only</option>
                  </select>
               </div>
               
               <div class="p-5 flex-grow overflow-y-auto space-y-2 font-mono text-[12px] h-full custom-scrollbar" id="firebase-stream-console">
                 @for (log of filteredFirebaseLogs(); track log.timestamp + log.message) {
                   <div [class]="log.isError ? 'flex items-start gap-4 border border-rose-500/20 bg-rose-500/5 p-2 rounded -mx-1 mt-2 mb-2' : 'flex items-start gap-4 opacity-70 hover:bg-app-bg/50 p-1 -mx-1 rounded'">
                     <span [class]="log.isError ? 'text-rose-500 w-16 shrink-0' : 'text-app-muted w-16 shrink-0'">{{ log.time }}</span>
                     <span [class]="log.isError ? 'text-rose-400 font-bold w-14 shrink-0' : log.severity === 'WARNING' ? 'text-amber-400 font-bold w-14 shrink-0' : 'text-emerald-400 w-14 shrink-0'">{{ log.severity }}</span>
                     <div class="flex-grow min-w-0">
                         <span [class]="log.isError ? 'text-rose-300 break-all' : 'text-app-text break-all'">{{ log.message }}</span>
                     </div>
                   </div>
                 }
                 <div class="text-app-muted animate-pulse mt-6 text-center italic">Waiting for events...</div>
               </div>
            </div>
         }

          <!-- 4b. Firebase API Hits Tab (RTDB) -->
          @case ('firebase_api_hits') {
             <div class="bg-app-bg border border-app-border rounded-xl flex flex-col overflow-hidden shadow-sm h-[500px] animate-in fade-in duration-200" *ngIf="project().firebase_config">
                <div class="p-4 border-b border-app-border flex items-center justify-between bg-app-bg">
                   <div class="flex items-center gap-3">
                      <div class="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse relative shadow-[0_0_10px_rgba(249,115,22,0.7)]"></div>
                      <h3 class="text-xs font-bold text-app-text font-mono tracking-wider uppercase">Firebase RTDB API Hits Stream</h3>
                   </div>
                   <select (change)="updateApiHitsFilter($any($event.target).value)" class="bg-app-bg border border-app-border text-xs text-app-muted rounded px-3 py-1.5 outline-none hover:border-slate-600 transition cursor-pointer font-sans">
                      <option value="ALL">All Methods</option>
                      <option value="GET">GET Only</option>
                      <option value="POST">POST Only</option>
                      <option value="PUT">PUT Only</option>
                      <option value="DELETE">DELETE Only</option>
                   </select>
                </div>
                
                <div class="p-5 flex-grow overflow-y-auto space-y-2 font-mono text-[12px] h-full custom-scrollbar" id="firebase-api-hits-console">
                  @for (hit of filteredFirebaseApiHits(); track hit.id || hit.timestamp + hit.endpoint) {
                    <div [class]="hit.statusCode >= 400 ? 'flex items-start gap-4 border border-rose-500/20 bg-rose-500/5 p-2 rounded -mx-1 mt-2 mb-2' : 'flex items-start gap-4 opacity-70 hover:bg-app-bg/50 p-1 -mx-1 rounded'">
                      <span class="text-app-muted w-20 shrink-0">{{ hit.time }}</span>
                      <span [class]="hit.method === 'GET' ? 'text-emerald-400 font-bold w-14 shrink-0' : hit.method === 'POST' ? 'text-indigo-400 font-bold w-14 shrink-0' : hit.method === 'PUT' ? 'text-amber-400 font-bold w-14 shrink-0' : 'text-rose-400 font-bold w-14 shrink-0'">{{ hit.method }}</span>
                      <div class="flex-grow min-w-0">
                          <span class="text-app-text break-all font-bold">{{ hit.endpoint }}</span>
                      </div>
                      <span [class]="hit.statusCode >= 400 ? 'text-rose-400 font-bold ml-auto shrink-0' : 'text-emerald-500 ml-auto shrink-0'">{{ hit.statusCode }}</span>
                      <span class="text-app-muted shrink-0 w-16 text-right tabular-nums">{{ hit.responseTime }}ms</span>
                    </div>
                  } @empty {
                    <div class="text-app-muted text-center py-10 italic">No API hits recorded in Realtime Database yet.</div>
                  }
                  <div class="text-app-muted animate-pulse mt-6 text-center italic">Listening to Firebase Realtime Database...</div>
                </div>
             </div>
          }

         <!-- 5. Firebase Storage Tab -->
         @case ('storage') {
            <div class="space-y-6 animate-in fade-in duration-200" *ngIf="project().firebase_config">
               <div class="grid grid-cols-2 gap-3 md:gap-6" *ngIf="firebaseStorage()">
                  <!-- Storage MB used -->
                  <div class="bg-app-bg border border-app-border rounded-xl p-3.5 sm:p-5 flex flex-col justify-between shadow-sm min-h-[120px] md:min-h-[150px] min-w-0">
                     <div>
                        <h3 class="text-[9px] md:text-xs font-bold text-app-muted uppercase tracking-wider mb-1 md:mb-2 truncate">Storage Used</h3>
                        <div class="text-lg sm:text-2xl md:text-4xl font-black text-app-text font-mono truncate">{{ firebaseStorage()?.storageUsedMb }} MB</div>
                     </div>
                     <div class="text-[9px] md:text-xs text-app-muted mt-2 md:mt-4 truncate">Bucket: <strong class="text-app-text font-mono truncate" [title]="firebaseStorage()?.bucketName">{{ firebaseStorage()?.bucketName }}</strong></div>
                  </div>
                  
                  <!-- Files hosted -->
                  <div class="bg-app-bg border border-app-border rounded-xl p-3.5 sm:p-5 flex flex-col justify-between shadow-sm min-h-[120px] md:min-h-[150px] min-w-0">
                     <div>
                        <h3 class="text-[9px] md:text-xs font-bold text-app-muted uppercase tracking-wider mb-1 md:mb-2 truncate">Files Hosted</h3>
                        <div class="text-lg sm:text-2xl md:text-4xl font-black text-indigo-400 font-mono truncate">{{ firebaseStorage()?.filesCount | number }} files</div>
                     </div>
                     <div class="text-[9px] md:text-xs text-app-muted mt-2 md:mt-4 truncate">Synced: {{ firebaseStorage()?.lastUpdated | date:'mediumTime' }}</div>
                  </div>
               </div>
               
               <div class="bg-app-bg border border-app-border rounded-xl p-6 shadow-sm" *ngIf="!firebaseStorage() && isLoadingStorage()">
                  <div class="text-center py-6 text-app-muted italic">Loading storage metrics...</div>
               </div>
            </div>
         }
         @case ('observability') {
            <app-observability-dashboard [project]="project()"></app-observability-dashboard>
         }
      }
    </div>
  `
})
export class ProjectApiMonitorComponent implements OnInit, OnDestroy {
  project = input.required<ProjectData>();
  apiService = inject(ApiService);
  cdr = inject(ChangeDetectorRef);
  
  activeTab = signal<'combined' | 'api' | 'usage' | 'firebase_overview' | 'firebase_logs' | 'storage' | 'firebase_api_hits' | 'observability'>('combined');
  streamFilter = signal<'all' | 'errors'>('all');
  firebaseFilter = signal<'ALL' | 'INFO' | 'WARNING' | 'ERROR'>('ALL');
  apiHitsFilter = signal<'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE'>('ALL');
  isMobileTabMenuOpen = signal(false);

  getTabIcon(tab: string): string {
    switch (tab) {
      case 'combined': return 'shuffle';
      case 'api': return 'sensors';
      case 'usage': return 'bar_chart';
      case 'firebase_overview': return 'sync';
      case 'firebase_logs': return 'receipt_long';
      case 'storage': return 'cloud_queue';
      case 'firebase_api_hits': return 'bolt';
      case 'observability': return 'cloud';
      default: return 'menu';
    }
  }

  getTabLabel(tab: string): string {
    switch (tab) {
      case 'combined': return 'Combined Stream';
      case 'api': return 'Standard API Monitor';
      case 'usage': return 'Usage & Billing';
      case 'firebase_overview': return 'Firebase Overview';
      case 'firebase_logs': return 'Firebase Logs';
      case 'storage': return 'Storage Panel';
      case 'firebase_api_hits': return 'Firebase API Hits (RTDB)';
      case 'observability': return 'GCP Observability';
      default: return 'Select Tab';
    }
  }
  
  analyticsData = signal<any>(null);
  feeds = signal<any[]>([]);
  combinedFeeds = signal<any[]>([]);
  firebaseLogs = signal<any[]>([]);
  firebaseApiHits = signal<any[]>([]);
  billingData = signal<any>(null);
  
  firebaseStatus = signal<any>(null);
  firebaseAnalytics = signal<any>(null);
  firebaseStorage = signal<any>(null);
  
  isLoadingFirebaseOverview = signal(false);
  isLoadingStorage = signal(false);

  availableMonths = signal<{ label: string; value: string }[]>([]);
  selectedMonth = signal<string>(''); // e.g. "2026-06"
  isMonthDropdownOpen = signal(false);

  currentMonthLabel = computed(() => {
    const val = this.selectedMonth();
    if (!val) return '';
    const [y, m] = val.split('-');
    return `${monthNames[parseInt(m) - 1]} ${y}`;
  });

  // Computed: Real project cost (sums the active checked series in the legend)
  realProjectCost = computed(() => {
    let total = 0;
    if (this.showFunctionsLine) {
      total += Number(this.getFunctionsCost());
    }
    if (this.showHostingLine) {
      total += Number(this.getHostingCost());
    }
    if (this.showNonFirebaseLine) {
      total += Number(this.getGcpNonFirebaseCost());
    }
    total += Number(this.getNonFirebaseCost());
    return total.toFixed(2);
  });

  // Dynamic axis labels from history dates
  historyAxisLabels = computed(() => {
    const data = this.analyticsData();
    if (!data?.history?.length) return [];
    const history = data.history as any[];
    // Pick up to 6 evenly spaced labels
    const count = Math.min(history.length, 6);
    const step = Math.floor(history.length / count);
    return Array.from({ length: count }, (_, i) => {
      const entry = history[Math.min(i * step, history.length - 1)];
      if (!entry?.date) return '';
      const d = new Date(entry.date);
      return `${monthNames[d.getUTCMonth()]} ${d.getUTCDate()}`;
    });
  });

  // Toggles for the lines in the UI
  showFunctionsLine = true;
  showHostingLine = true;
  showNonFirebaseLine = true;

  // SVG Chart Computed Properties
  costPoints = computed(() => {
    const data = this.analyticsData();
    if (!data || !data.history || data.history.length === 0) return [];
    const history = data.history as any[];
    const highestVal = Math.max(...history.map(h => Number(h.cost || 0)), 1.0);
    return history.map((val, i) => {
      const x = (i / (history.length - 1)) * 1000;
      const y = 200 - (Number(val.cost || 0) / highestVal) * 130 - 30;
      return { x, y, val: val.cost, date: val.date };
    });
  });

  functionsPoints = computed(() => {
    const data = this.analyticsData();
    if (!data || !data.history || data.history.length === 0) return [];
    const history = data.history as any[];
    const highestVal = Math.max(...history.map(h => Number(h.cost || 0)), 1.0);
    return history.map((val, i) => {
      const x = (i / (history.length - 1)) * 1000;
      const y = 200 - (Number(val.functionsCost || val.cost || 0) / highestVal) * 130 - 30;
      return { x, y, val: val.functionsCost || val.cost, date: val.date };
    });
  });

  hostingPoints = computed(() => {
    const data = this.analyticsData();
    if (!data || !data.history || data.history.length === 0) return [];
    const history = data.history as any[];
    const highestVal = Math.max(...history.map(h => Number(h.cost || 0)), 1.0);
    return history.map((val, i) => {
      const x = (i / (history.length - 1)) * 1000;
      const y = 200 - (Number(val.hostingCost || 0) / highestVal) * 130 - 30;
      return { x, y, val: val.hostingCost || 0, date: val.date };
    });
  });

  nonFirebasePoints = computed(() => {
    const data = this.analyticsData();
    if (!data || !data.history || data.history.length === 0) return [];
    const history = data.history as any[];
    const highestVal = Math.max(...history.map(h => Number(h.cost || 0)), 1.0);
    return history.map((val, i) => {
      const x = (i / (history.length - 1)) * 1000;
      const y = 200 - (Number(val.nonFirebaseCost || 0) / highestVal) * 130 - 30;
      return { x, y, val: val.nonFirebaseCost || 0, date: val.date };
    });
  });

  hitsPoints = computed(() => {
    const data = this.analyticsData();
    if (!data || !data.history || data.history.length === 0) return [];
    const history = data.history as any[];
    const highestVal = Math.max(...history.map(h => Number(h.hits || 0)), 50);
    return history.map((val, i) => {
      const x = (i / (history.length - 1)) * 1000;
      const y = 200 - (Number(val.hits || 0) / highestVal) * 130 - 30;
      return { x, y, val: val.hits, date: val.date };
    });
  });

  costPath = computed(() => {
    const pts = this.costPoints();
    if (pts.length === 0) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      path += ` Q ${pts[i].x} ${pts[i].y}, ${xc} ${yc}`;
    }
    path += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
    return path;
  });

  functionsPath = computed(() => {
    const pts = this.functionsPoints();
    if (pts.length === 0) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      path += ` Q ${pts[i].x} ${pts[i].y}, ${xc} ${yc}`;
    }
    path += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
    return path;
  });

  hostingPath = computed(() => {
    const pts = this.hostingPoints();
    if (pts.length === 0) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      path += ` Q ${pts[i].x} ${pts[i].y}, ${xc} ${yc}`;
    }
    path += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
    return path;
  });

  nonFirebasePath = computed(() => {
    const pts = this.nonFirebasePoints();
    if (pts.length === 0) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      path += ` Q ${pts[i].x} ${pts[i].y}, ${xc} ${yc}`;
    }
    path += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
    return path;
  });

  costFillPath = computed(() => {
    const lpath = this.costPath();
    if (!lpath) return '';
    const pts = this.costPoints();
    const lastX = pts[pts.length - 1]?.x || 1000;
    return `${lpath} L ${lastX} 200 L 0 200 Z`;
  });

  functionsFillPath = computed(() => {
    const lpath = this.functionsPath();
    if (!lpath) return '';
    const pts = this.functionsPoints();
    const lastX = pts[pts.length - 1]?.x || 1000;
    return `${lpath} L ${lastX} 200 L 0 200 Z`;
  });

  hostingFillPath = computed(() => {
    const lpath = this.hostingPath();
    if (!lpath) return '';
    const pts = this.hostingPoints();
    const lastX = pts[pts.length - 1]?.x || 1000;
    return `${lpath} L ${lastX} 200 L 0 200 Z`;
  });

  nonFirebaseFillPath = computed(() => {
    const lpath = this.nonFirebasePath();
    if (!lpath) return '';
    const pts = this.nonFirebasePoints();
    const lastX = pts[pts.length - 1]?.x || 1000;
    return `${lpath} L ${lastX} 200 L 0 200 Z`;
  });

  hitsPath = computed(() => {
    const pts = this.hitsPoints();
    if (pts.length === 0) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      path += ` Q ${pts[i].x} ${pts[i].y}, ${xc} ${yc}`;
    }
    path += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
    return path;
  });

  hitsFillPath = computed(() => {
    const lpath = this.hitsPath();
    if (!lpath) return '';
    const pts = this.hitsPoints();
    const lastX = pts[pts.length - 1]?.x || 1000;
    return `${lpath} L ${lastX} 200 L 0 200 Z`;
  });

  costLatestPoint = computed(() => {
    const pts = this.costPoints();
    return pts[pts.length - 1] || { x: 0, y: 0 };
  });

  functionsLatestPoint = computed(() => {
    const pts = this.functionsPoints();
    return pts[pts.length - 1] || { x: 0, y: 0 };
  });

  hostingLatestPoint = computed(() => {
    const pts = this.hostingPoints();
    return pts[pts.length - 1] || { x: 0, y: 0 };
  });

  nonFirebaseLatestPoint = computed(() => {
    const pts = this.nonFirebasePoints();
    return pts[pts.length - 1] || { x: 0, y: 0 };
  });

  hitsLatestPoint = computed(() => {
    const pts = this.hitsPoints();
    return pts[pts.length - 1] || { x: 0, y: 0 };
  });

  getFunctionsCost(): string {
    const billing = this.billingData();
    if (billing?.functionsCost !== undefined && billing?.functionsCost !== null) {
      return billing.functionsCost.toFixed(2);
    }
    const data = this.analyticsData();
    if (data?.history) {
      const sum = data.history.reduce((s: number, h: any) => s + (h.functionsCost || h.cost || 0), 0);
      return sum.toFixed(2);
    }
    return '0.00';
  }

  getHostingCost(): string {
    const billing = this.billingData();
    if (billing?.hostingCost !== undefined && billing?.hostingCost !== null) {
      return billing.hostingCost.toFixed(2);
    }
    const data = this.analyticsData();
    if (data?.history) {
      const sum = data.history.reduce((s: number, h: any) => s + (h.hostingCost || 0), 0);
      return sum.toFixed(2);
    }
    return '0.00';
  }

  getGcpNonFirebaseCost(): string {
    const billing = this.billingData();
    if (billing?.gcpNonFirebaseCost !== undefined && billing?.gcpNonFirebaseCost !== null) {
      return billing.gcpNonFirebaseCost.toFixed(2);
    }
    const data = this.analyticsData();
    if (data?.history) {
      const sum = data.history.reduce((s: number, h: any) => s + (h.nonFirebaseCost || 0), 0);
      return sum.toFixed(2);
    }
    return '0.00';
  }

  getNonFirebaseCost(): string {
    const billing = this.billingData();
    if (billing?.nonFirebaseCost !== undefined && billing?.nonFirebaseCost !== null) {
      return billing.nonFirebaseCost.toFixed(2);
    }
    return '0.00';
  }
  
  eventSource: EventSource | null = null;
  firebaseLogsSource: EventSource | null = null;
  firebaseApiHitsSource: EventSource | null = null;
  refreshInterval: any;
 
  ngOnInit() {
    // Generate months dynamically
    const monthsList = [];
    const d = new Date();
    for (let i = 0; i < 12; i++) {
       const m = d.getMonth() - i;
       const date = new Date(d.getFullYear(), m, 1);
       const monthStr = String(date.getMonth() + 1).padStart(2, '0');
       const yearStr = String(date.getFullYear());
       monthsList.push({
          label: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
          value: `${yearStr}-${monthStr}`
       });
    }
    this.availableMonths.set(monthsList);
    this.selectedMonth.set(monthsList[0].value); // default to current month

    this.loadAnalytics();
    this.startLiveStream();
    
    if (this.project().firebase_config) {
       this.loadFirebaseOverview();
       this.startFirebaseLiveLogs();
       this.startFirebaseApiHitsStream();
       this.loadFirebaseStorage();
       this.loadBillingData();
    }
    
    // Auto refresh analytics every 30 seconds
    this.refreshInterval = setInterval(() => {
       this.loadAnalytics();
       if (this.project().firebase_config) {
          this.loadFirebaseOverview();
          this.loadFirebaseStorage();
          this.loadBillingData();
       }
    }, 30000);
  }
 
  ngOnDestroy() {
    if (this.eventSource) {
      this.eventSource.close();
    }
    if (this.firebaseLogsSource) {
      this.firebaseLogsSource.close();
    }
    if (this.firebaseApiHitsSource) {
      this.firebaseApiHitsSource.close();
    }
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
 
  isFirebaseTab(): boolean {
     const tab = this.activeTab();
     return tab === 'firebase_overview' || tab === 'firebase_logs' || tab === 'storage' || tab === 'firebase_api_hits';
  }
 
  loadAnalytics() {
     const monthVal = this.selectedMonth();
     const url = `/admin/apps/${this.project().id}/analytics` + (monthVal ? `?month=${monthVal}` : '');
     this.apiService.get<any>(url).subscribe({
        next: (res) => {
           this.analyticsData.set(res);
           this.cdr.markForCheck();
        },
        error: (err) => console.error('Failed to load analytics', err)
     });
  }
 
  loadBillingData() {
     const appId = this.project().id;
     if (!this.project().firebase_config) return;
     const monthVal = this.selectedMonth();
     const url = `/admin/apps/${appId}/firebase/billing` + (monthVal ? `?month=${monthVal}` : '');
     this.apiService.get<any>(url).subscribe({
        next: (billing) => {
           this.billingData.set(billing);
           this.cdr.markForCheck();
        },
        error: (err) => console.error('Failed to load billing data', err)
     });
  }

  loadFirebaseOverview() {
     this.isLoadingFirebaseOverview.set(true);
     const appId = this.project().id;
     
     this.apiService.get<any>(`/admin/apps/${appId}/firebase/status`).subscribe({
        next: (status) => {
           this.firebaseStatus.set(status);
           this.cdr.markForCheck();
        },
        error: (err) => console.error('Failed to load firebase status', err)
     });

     this.apiService.get<any>(`/admin/apps/${appId}/firebase/analytics`).subscribe({
        next: (analytics) => {
           this.firebaseAnalytics.set(analytics);
           this.isLoadingFirebaseOverview.set(false);
           this.cdr.markForCheck();
        },
        error: (err) => {
           console.error('Failed to load firebase analytics', err);
           this.isLoadingFirebaseOverview.set(false);
        }
     });
  }

  loadFirebaseStorage() {
     this.isLoadingStorage.set(true);
     const appId = this.project().id;
     this.apiService.get<any>(`/admin/apps/${appId}/firebase/storage`).subscribe({
        next: (storage) => {
           this.firebaseStorage.set(storage);
           this.isLoadingStorage.set(false);
           this.cdr.markForCheck();
        },
        error: (err) => {
           console.error('Failed to load firebase storage usage', err);
           this.isLoadingStorage.set(false);
        }
     });
  }

  startLiveStream() {
     const url = `${environment.apiBaseUrl}/admin/apps/${this.project().id}/live-stream`;
     this.eventSource = new EventSource(url, { withCredentials: true });
     
     this.eventSource.onmessage = (event: any) => {
        try {
           const data = JSON.parse(event.data);
           const isError = data.type === 'error';
           const feedItem = {
              time: new Date(data.timestamp).toLocaleTimeString(),
              method: data.method,
              endpoint: data.endpoint,
              status: isError ? `${data.status} ERR` : `${data.status} OK`,
              duration: data.latency,
              isError: isError,
              details: isError ? `${data.status} Error on ${data.endpoint}` : ''
           };
           this.feeds.update(current => [feedItem, ...current].slice(0, 50));
           
           // Combined Feed update
           const combinedItem = {
              time: feedItem.time,
              method: feedItem.method,
              endpoint: feedItem.endpoint,
              status: feedItem.status,
              duration: feedItem.duration,
              isError: feedItem.isError,
              details: feedItem.details,
              source: 'API',
              timestamp: new Date(data.timestamp).getTime()
           };
           this.combinedFeeds.update(current => this.insertSortCombined(combinedItem, current));
           
           this.cdr.markForCheck();
        } catch (e) {
           console.error('SSE parsing error', e);
        }
     };

     this.eventSource.onerror = (err: any) => {
        console.error('SSE Error', err);
     };
  }

  startFirebaseLiveLogs() {
     const appId = this.project().id;
     
     // 1. Fetch initial logs
     this.apiService.get<any[]>(`/admin/apps/${appId}/firebase/logs`).subscribe({
        next: (logs) => {
           const mappedLogs = logs.map(l => ({
              time: new Date(l.timestamp).toLocaleTimeString(),
              severity: l.severity,
              message: l.message,
              isError: l.severity === 'ERROR',
              timestamp: new Date(l.timestamp).getTime()
           }));
           this.firebaseLogs.set(mappedLogs);
           
           // Seed combined feed initial items
           mappedLogs.forEach(l => {
              const combinedItem = {
                 time: l.time,
                 method: l.severity,
                 endpoint: l.message,
                 status: l.severity,
                 duration: 0,
                 isError: l.isError,
                 details: l.message,
                 source: 'Firebase',
                 timestamp: l.timestamp
              };
              this.combinedFeeds.update(current => this.insertSortCombined(combinedItem, current));
           });
           this.cdr.markForCheck();
        },
        error: (err) => console.error('Failed to load initial firebase logs', err)
     });

     // 2. SSE Live Logs
     const url = `${environment.apiBaseUrl}/admin/apps/${appId}/firebase/live-logs`;
     this.firebaseLogsSource = new EventSource(url, { withCredentials: true });
     
     this.firebaseLogsSource.onmessage = (event: any) => {
        try {
           const data = JSON.parse(event.data);
           const isError = data.severity === 'ERROR';
           const logItem = {
              time: new Date(data.timestamp).toLocaleTimeString(),
              severity: data.severity,
              message: data.message,
              isError: isError,
              timestamp: new Date(data.timestamp).getTime()
           };
           this.firebaseLogs.update(current => [logItem, ...current].slice(0, 50));
           
           // Combined Feed Live update
           const combinedItem = {
              time: logItem.time,
              method: logItem.severity,
              endpoint: logItem.message,
              status: logItem.severity,
              duration: 0,
              isError: logItem.isError,
              details: logItem.message,
              source: 'Firebase',
              timestamp: logItem.timestamp
           };
           this.combinedFeeds.update(current => this.insertSortCombined(combinedItem, current));
           this.cdr.markForCheck();
        } catch (e) {
           console.error('Firebase SSE parsing error', e);
        }
     };

     this.firebaseLogsSource.onerror = (err: any) => {
        console.error('Firebase SSE Error', err);
     };
  }

  insertSortCombined(item: any, currentList: any[]): any[] {
     const newList = [item, ...currentList];
     // Sort descending chronologically
     newList.sort((a, b) => b.timestamp - a.timestamp);
     return newList.slice(0, 50);
  }

  updateFilter(val: 'all' | 'errors') {
    this.streamFilter.set(val);
  }

  updateFirebaseFilter(val: 'ALL' | 'INFO' | 'WARNING' | 'ERROR') {
     this.firebaseFilter.set(val);
  }
 
  updateApiHitsFilter(val: 'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE') {
     this.apiHitsFilter.set(val);
  }
 
  filteredFeeds() {
    if (this.streamFilter() === 'errors') {
      return this.feeds().filter(f => f.isError);
    }
    return this.feeds();
  }
 
  filteredFirebaseLogs() {
     const filter = this.firebaseFilter();
     if (filter === 'ALL') return this.firebaseLogs();
     return this.firebaseLogs().filter(l => l.severity === filter);
  }
 
  filteredFirebaseApiHits() {
     const filter = this.apiHitsFilter();
     if (filter === 'ALL') return this.firebaseApiHits();
     return this.firebaseApiHits().filter(h => h.method === filter);
  }
 
  selectMonth(value: string) {
     this.selectedMonth.set(value);
     this.loadAnalytics();
     if (this.project().firebase_config) {
        this.loadBillingData();
     }
  }
 
  startFirebaseApiHitsStream() {
     const appId = this.project().id;
     
     // 1. Fetch initial API hits
     this.apiService.get<any[]>(`/admin/apps/${appId}/firebase/api-hits`).subscribe({
        next: (hits) => {
           const mappedHits = hits.map(h => ({
              id: h.id,
              time: new Date(h.timestamp).toLocaleTimeString(),
              method: h.method,
              endpoint: h.endpoint,
              statusCode: h.statusCode,
              responseTime: h.responseTime,
              timestamp: new Date(h.timestamp).getTime()
           }));
           this.firebaseApiHits.set(mappedHits);
           this.cdr.markForCheck();
        },
        error: (err) => console.error('Failed to load initial RTDB api hits', err)
     });

     // 2. SSE Live API Hits
     const url = `${environment.apiBaseUrl}/admin/apps/${appId}/firebase/live-api-hits`;
     this.firebaseApiHitsSource = new EventSource(url, { withCredentials: true });
     
     this.firebaseApiHitsSource.onmessage = (event: any) => {
        try {
           const data = JSON.parse(event.data);
           const hitItem = {
              id: data.id,
              time: new Date(data.timestamp).toLocaleTimeString(),
              method: data.method,
              endpoint: data.endpoint,
              statusCode: data.statusCode,
              responseTime: data.responseTime,
              timestamp: new Date(data.timestamp).getTime()
           };
           
           this.firebaseApiHits.update(current => {
              if (current.some(c => c.id === hitItem.id)) return current;
              return [hitItem, ...current].slice(0, 100);
           });
           this.cdr.markForCheck();
        } catch (e) {
           console.error('Firebase RTDB API hits SSE parsing error', e);
        }
     };

     this.firebaseApiHitsSource.onerror = (err: any) => {
        console.error('Firebase RTDB API hits SSE Error', err);
     };
  }
}
