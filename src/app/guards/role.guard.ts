import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { catchError, map, of } from 'rxjs';

const API_SCOPE =
  'api://fad2db65-7d82-41d8-a0c5-2fa1e2512ee4/access_as_user';

export const roleGuard: CanActivateFn = (route) => {

  const authService = inject(MsalService);
  const router = inject(Router);

  const account =
    authService.instance.getActiveAccount() ??
    authService.instance.getAllAccounts()[0];

  if (!account) {
    return router.createUrlTree(['/']);
  }

  const rolesPermitidos =
    (route.data?.['roles'] as string[] ?? [])
      .map((rol) => rol.toLowerCase());

  return authService.acquireTokenSilent({
    scopes: [API_SCOPE],
    account
  }).pipe(

    map((result) => {

      const rolesUsuario =
        obtenerRolesDesdeToken(result.accessToken)
          .map((rol) => rol.toLowerCase());

      const autorizado = rolesPermitidos.some(
        (rol) => rolesUsuario.includes(rol)
      );

      if (autorizado) {
        return true;
      }

      return router.createUrlTree(['/workorders']);
    }),

    catchError((error) => {
      console.error(
        'Error validando rol:',
        error
      );

      return of(
        router.createUrlTree(['/'])
      );
    })
  );
};

function obtenerRolesDesdeToken(token: string): string[] {

  try {

    const payload = token.split('.')[1];

    if (!payload) {
      return [];
    }

    const base64 = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(
        Math.ceil(payload.length / 4) * 4,
        '='
      );

    const claims = JSON.parse(
      atob(base64)
    );

    if (Array.isArray(claims.roles)) {
      return claims.roles;
    }

    return [];

  } catch (error) {

    console.error(
      'Error leyendo roles del token:',
      error
    );

    return [];
  }
}