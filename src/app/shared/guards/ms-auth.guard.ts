import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { concatMap, map } from 'rxjs';

/**
 * Auth guard that waits for MSAL initialization AND redirect processing
 * before checking accounts.
 *
 * The old synchronous guard caused blank pages because:
 *  1. It called getAllAccounts() before MSAL finished initializing
 *  2. It didn't wait for handleRedirectObservable() to process any
 *     pending redirect from Microsoft — so on a fresh redirect-back
 *     the guard could see 0 accounts and redirect to /signin, while
 *     on stale localStorage it could pass with an inconsistent state.
 *
 * This version mirrors the pattern from MSAL Angular's built-in MsalGuard:
 *   initialize() → handleRedirectObservable() → check accounts
 */
export const msAuthGuard: CanActivateFn = (route, state) => {
  const msalService = inject(MsalService);
  const router = inject(Router);

  return msalService.initialize().pipe(
    concatMap(() => msalService.handleRedirectObservable()),
    map(() => {
      const accounts = msalService.instance.getAllAccounts();

      if (accounts.length > 0) {
        // Ensure an active account is set (needed after page refresh)
        if (!msalService.instance.getActiveAccount()) {
          msalService.instance.setActiveAccount(accounts[0]);
        }
        return true;
      }

      // User is not authenticated, redirect to sign-in page
      router.navigate(['/signin'], {
        queryParams: { returnUrl: state.url }
      });

      return false;
    })
  );
};
