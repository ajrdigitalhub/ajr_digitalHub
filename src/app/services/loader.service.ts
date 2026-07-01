import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private activeRequests = 0;
  isLoading = signal<boolean>(false);
  private debounceTimer: any = null;

  show() {
    this.activeRequests++;
    if (this.activeRequests > 0 && !this.isLoading() && !this.debounceTimer) {
      this.debounceTimer = setTimeout(() => {
        if (this.activeRequests > 0) {
          this.isLoading.set(true);
        }
        this.debounceTimer = null;
      }, 200); // 200ms debounce to avoid flickering
    }
  }

  hide() {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    if (this.activeRequests === 0) {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      this.isLoading.set(false);
    }
  }

  reset() {
    this.activeRequests = 0;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.isLoading.set(false);
  }
}
