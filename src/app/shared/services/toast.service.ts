import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info';

export type ToastMessage = {
  id: number;
  type: ToastType;
  message: string;
};

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  readonly toasts$ = this.toastsSubject.asObservable();
  private nextId = 1;

  success(message: string, durationMs: number = 2500): void {
    this.show('success', message, durationMs);
  }

  error(message: string, durationMs: number = 3500): void {
    this.show('error', message, durationMs);
  }

  info(message: string, durationMs: number = 2500): void {
    this.show('info', message, durationMs);
  }

  remove(id: number): void {
    const current = this.toastsSubject.value;
    this.toastsSubject.next(current.filter(t => t.id !== id));
  }

  private show(type: ToastType, message: string, durationMs: number): void {
    const id = this.nextId++;
    const toast: ToastMessage = { id, type, message };
    const current = this.toastsSubject.value;
    this.toastsSubject.next([...current, toast]);

    setTimeout(() => this.remove(id), durationMs);
  }
}
