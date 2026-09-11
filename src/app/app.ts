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
}