import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Protects app routes — requires a cached MSAL account.
 * Redirect handling runs on /auth-callback only (auth-callback.component.ts).
 */
export const msAuthGuard: CanActivateFn = (route, state) => {
  const msalService = inject(MsalService);
  const msalBroadcastService = inject(MsalBroadcastService);
  const router = inject(Router);
  const authService = inject(AuthService);

  if (authService.isDevelopmentBypassEnabled()) {
    return true;
  }

  return msalBroadcastService.inProgress$.pipe(
    filter((status: InteractionStatus) => status === InteractionStatus.None),
    take(1),
    map(() => {
      const accounts = msalService.instance.getAllAccounts();

      if (accounts.length > 0) {
        if (!msalService.instance.getActiveAccount()) {
          msalService.instance.setActiveAccount(accounts[0]);
        }
        return true;
      }

      router.navigate(['/signin'], {
        queryParams: { returnUrl: state.url },
      });
      return false;
    })
  );
};
