import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

const API_SCOPE =
  'api://fad2db65-7d82-41d8-a0c5-2fa1e2512ee4/access_as_user';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {

  protected readonly title = signal('frontend-digitalfix');
  protected readonly isLoggedIn = signal(false);
  protected readonly username = signal('');
  protected readonly roles = signal<string[]>([]);

  constructor(private authService: MsalService) {}

  ngOnInit(): void {
    this.authService.handleRedirectObservable().subscribe({
      next: (result) => {

        if (result?.account) {
          this.authService.instance.setActiveAccount(result.account);
        }

        const account =
          this.authService.instance.getActiveAccount() ??
          this.authService.instance.getAllAccounts()[0];

        if (account) {
          this.authService.instance.setActiveAccount(account);
          this.isLoggedIn.set(true);
          this.username.set(account.username);

          this.cargarRoles();
        }
      },
      error: (error) => {
        console.error('Error MSAL:', error);
      }
    });
  }

  login(): void {
    this.authService.loginRedirect({
      scopes: [API_SCOPE]
    });
  }

  logout(): void {
    this.authService.logoutRedirect({
      postLogoutRedirectUri: 'http://localhost:4200'
    });
  }

  protected tieneRol(...rolesPermitidos: string[]): boolean {
    const rolesUsuario =
      this.roles().map((rol) => rol.toLowerCase());

    return rolesPermitidos.some((rol) =>
      rolesUsuario.includes(rol.toLowerCase())
    );
  }

  private cargarRoles(): void {
    const account = this.authService.instance.getActiveAccount();

    if (!account) {
      this.roles.set([]);
      return;
    }

    this.authService.acquireTokenSilent({
      scopes: [API_SCOPE],
      account
    }).subscribe({
      next: (result) => {
        const roles =
          this.obtenerRolesDesdeToken(result.accessToken);

        this.roles.set(roles);

        console.log('Roles del usuario:', roles);
      },
      error: (error) => {
        console.error('Error obteniendo roles:', error);
        this.roles.set([]);
      }
    });
  }

  private obtenerRolesDesdeToken(token: string): string[] {
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

      const claims = JSON.parse(atob(base64));

      if (Array.isArray(claims.roles)) {
        return claims.roles;
      }

      return [];
    } catch (error) {
      console.error(
        'Error leyendo claims del token:',
        error
      );

      return [];
    }
  }
}