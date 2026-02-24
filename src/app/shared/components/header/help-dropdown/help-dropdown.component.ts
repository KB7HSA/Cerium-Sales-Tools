import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-help-dropdown',
  imports: [CommonModule],
  template: `
    <div class="relative">
      <button
        class="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        (click)="toggleDropdown()"
        title="Help"
      >
        <svg class="fill-current" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd"
            d="M10 1.54199C5.33172 1.54199 1.54169 5.33203 1.54169 10.0003C1.54169 14.6686 5.33172 18.4587 10 18.4587C14.6683 18.4587 18.4584 14.6686 18.4584 10.0003C18.4584 5.33203 14.6683 1.54199 10 1.54199ZM3.04169 10.0003C3.04169 6.16046 6.16015 3.04199 10 3.04199C13.8399 3.04199 16.9584 6.16046 16.9584 10.0003C16.9584 13.8402 13.8399 16.9587 10 16.9587C6.16015 16.9587 3.04169 13.8402 3.04169 10.0003Z"
            fill="currentColor"/>
          <path d="M10 8.95866C10.4142 8.95866 10.75 9.29445 10.75 9.70866V13.542C10.75 13.9562 10.4142 14.292 10 14.292C9.58579 14.292 9.25 13.9562 9.25 13.542V9.70866C9.25 9.29445 9.58579 8.95866 10 8.95866Z"
            fill="currentColor"/>
          <path d="M10.9167 6.87533C10.9167 7.38259 10.5073 7.79199 10 7.79199C9.49274 7.79199 9.08334 7.38259 9.08334 6.87533C9.08334 6.36806 9.49274 5.95866 10 5.95866C10.5073 5.95866 10.9167 6.36806 10.9167 6.87533Z"
            fill="currentColor"/>
        </svg>
      </button>

      <!-- Backdrop -->
      @if (isOpen) {
        <div class="fixed inset-0 z-40" (click)="closeDropdown()"></div>
      }

      <!-- Dropdown -->
      @if (isOpen) {
        <div class="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <!-- Header -->
          <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <h3 class="text-base font-semibold text-gray-800 dark:text-white">Help</h3>
          </div>

          <!-- Menu Items -->
          <div class="p-2">
            <button
              (click)="showAbout()"
              class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <svg class="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              About
            </button>
          </div>
        </div>
      }

      <!-- About Modal -->
      @if (showAboutModal) {
        <div class="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50" (click)="closeAbout()">
          <div class="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl dark:bg-gray-900" (click)="$event.stopPropagation()">
            <!-- Logo / Icon -->
            <div class="mb-6 flex justify-center">
              <div class="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10">
                <svg class="h-8 w-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 14.5M14.25 3.104c.251.023.501.05.75.082M19.8 14.5l-2.147 2.146m0 0a2.25 2.25 0 01-3.182 0l-.922-.922m4.104-1.224l.922.922a2.25 2.25 0 010 3.182l-.922.922m-4.104-4.104L12 17.25m0 0l-.922.922m.922-.922l.922-.922" />
                </svg>
              </div>
            </div>

            <!-- App Info -->
            <div class="text-center">
              <h2 class="text-xl font-bold text-gray-900 dark:text-white">Cerium Sales Tools</h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Version 0.9</p>
            </div>

            <!-- Details -->
            <div class="mt-6 space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <div class="flex justify-between text-sm">
                <span class="text-gray-500 dark:text-gray-400">Developed by</span>
                <span class="font-medium text-gray-800 dark:text-white">KHeide</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-500 dark:text-gray-400">Framework</span>
                <span class="font-medium text-gray-800 dark:text-white">Angular 19 + Node.js</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-500 dark:text-gray-400">UI Template</span>
                <span class="font-medium text-gray-800 dark:text-white">TailAdmin</span>
              </div>
            </div>

            <!-- Copyright -->
            <p class="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
              &copy; {{ currentYear }} Cerium Networks. All rights reserved.
            </p>

            <!-- Close Button -->
            <div class="mt-6 flex justify-center">
              <button
                (click)="closeAbout()"
                class="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class HelpDropdownComponent {
  isOpen = false;
  showAboutModal = false;
  currentYear = new Date().getFullYear();

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  closeDropdown() {
    this.isOpen = false;
  }

  showAbout() {
    this.isOpen = false;
    this.showAboutModal = true;
  }

  closeAbout() {
    this.showAboutModal = false;
  }
}
