import { ApplicationConfig, APP_INITIALIZER, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { 
  MSAL_INSTANCE, 
  MSAL_GUARD_CONFIG, 
  MSAL_INTERCEPTOR_CONFIG,
  MsalService,
  MsalGuard,
  MsalBroadcastService,
  MsalInterceptor
} from '@azure/msal-angular';
import { 
  MSALInstanceFactory, 
  MSALGuardConfigFactory, 
  MSALInterceptorConfigFactory 
} from './shared/config/msal.config';
import { BackendAuthInterceptor } from './shared/interceptors/backend-auth.interceptor';
import { concatMap, firstValueFrom, map } from 'rxjs';

import { routes } from './app.routes';

/** Process the Microsoft redirect hash once before any route/guard runs. */
function initializeMsal(msalService: MsalService) {
  return () =>
    firstValueFrom(
      msalService.initialize().pipe(
        concatMap(() => msalService.handleRedirectObservable()),
        map((result) => {
          if (result?.account) {
            msalService.instance.setActiveAccount(result.account);
          }
        })
      )
    );
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeMsal,
      deps: [MsalService],
      multi: true,
    },
    {
      provide: MSAL_INSTANCE,
      useFactory: MSALInstanceFactory
    },
    {
      provide: MSAL_GUARD_CONFIG,
      useFactory: MSALGuardConfigFactory
    },
    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useFactory: MSALInterceptorConfigFactory
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: BackendAuthInterceptor,
      multi: true
    },
    MsalService,
    MsalGuard,
    MsalBroadcastService
  ]
};
