import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
      <div class="flex flex-col items-center space-y-8">
        <!-- Logo -->
        <img
          src="/images/logo/Cerium_Large.png"
          alt="Cerium Sales Tools"
          class="h-16 w-auto"
        />

        <!-- Spinner -->
        <div class="relative">
          <div
            class="h-12 w-12 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600 dark:border-white/20 dark:border-t-brand-400"
          ></div>
        </div>

        <!-- Text -->
        <div class="text-center">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-white">
            Signing you in...
          </h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Please wait while we verify your credentials.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: ``
})
export class AuthCallbackComponent {}
