import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

export const msAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(MsalService);
  const router = inject(Router);

  const accounts = authService.instance.getAllAccounts();
  
  if (accounts.length > 0) {
    return true;
  }

  // User is not authenticated, redirect to sign-in page
  router.navigate(['/sign-in'], {
    queryParams: { returnUrl: state.url }
  });
  
  return false;
};
