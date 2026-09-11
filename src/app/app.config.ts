import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners
} from '@angular/core';

import { provideRouter } from '@angular/router';

import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi
} from '@angular/common/http';

import {
  BrowserCacheLocation,
  IPublicClientApplication,
  InteractionType,
  PublicClientApplication
} from '@azure/msal-browser';

import {
  MsalBroadcastService,
  MsalGuard,
  MsalGuardConfiguration,
  MsalInterceptor,
  MsalInterceptorConfiguration,
  MsalService,
  MSAL_GUARD_CONFIG,
  MSAL_INSTANCE,
  MSAL_INTERCEPTOR_CONFIG
} from '@azure/msal-angular';

import { routes } from './app.routes';

const FRONTEND_CLIENT_ID = '9e536c2a-00d9-4884-8336-6b83df73f11a';
const TENANT_ID = 'e41d6238-6d3e-4375-9eab-dac7f51fe731';

const API_SCOPE =
  'api://fad2db65-7d82-41d8-a0c5-2fa1e2512ee4/access_as_user';

const API_GATEWAY =
  'https://12up8d8jsh.execute-api.us-east-1.amazonaws.com';

export function msalInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: FRONTEND_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${TENANT_ID}`,
      redirectUri: 'http://localhost:4200'
    },
    cache: {
      cacheLocation: BrowserCacheLocation.SessionStorage
    }
  });
}

export function msalGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: {
      scopes: [API_SCOPE]
    },
    loginFailedRoute: '/'
  };
}

export function msalInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string>>();

  protectedResourceMap.set(
    `${API_GATEWAY}/*`,
    [API_SCOPE]
  );

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    provideRouter(routes),

    provideHttpClient(
      withInterceptorsFromDi()
    ),

    {
      provide: MSAL_INSTANCE,
      useFactory: msalInstanceFactory
    },

    {
      provide: MSAL_GUARD_CONFIG,
      useFactory: msalGuardConfigFactory
    },

    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useFactory: msalInterceptorConfigFactory
    },

    MsalService,
    MsalGuard,
    MsalBroadcastService,

    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true
    }
  ]
};