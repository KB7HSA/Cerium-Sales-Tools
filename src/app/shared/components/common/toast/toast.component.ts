import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-toast',
  imports: [CommonModule],
  template: `
    <div class="fixed right-6 top-6 z-50 flex flex-col gap-3">
      <div
        *ngFor="let toast of (toastService.toasts$ | async)"
        class="flex items-start gap-3 rounded-lg border px-4 py-3 shadow-theme-sm"
        [ngClass]="{
          'border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-200': toast.type === 'success',
          'border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-200': toast.type === 'error',
          'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200': toast.type === 'info'
        }"
      >
        <span class="text-sm font-medium">{{ toast.message }}</span>
        <button
          type="button"
          class="ml-2 text-xs opacity-70 hover:opacity-100"
          (click)="toastService.remove(toast.id)"
          aria-label="Dismiss"
        >
          Close
        </button>
      </div>
    </div>
  `
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}
}
