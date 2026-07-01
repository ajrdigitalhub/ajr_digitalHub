import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private currentId = 0;
  toasts = signal<ToastMessage[]>([]);

  success(message: string, duration = 4000) {
    this.addToast(message, 'success', duration);
  }

  error(message: string, duration = 5000) {
    this.addToast(message, 'error', duration);
  }

  warning(message: string, duration = 4500) {
    this.addToast(message, 'warning', duration);
  }

  info(message: string, duration = 4000) {
    this.addToast(message, 'info', duration);
  }

  private addToast(message: string, type: 'success' | 'error' | 'warning' | 'info', duration: number) {
    const id = ++this.currentId;
    const toast: ToastMessage = { id, message, type, duration };
    
    this.toasts.update(list => [...list, toast]);

    setTimeout(() => {
      this.remove(id);
    }, duration);
  }

  remove(id: number) {
    this.toasts.update(list => list.filter(toast => toast.id !== id));
  }
}
