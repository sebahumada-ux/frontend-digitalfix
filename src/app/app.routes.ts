import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { Dashboard } from './pages/dashboard/dashboard';
import { Catalog } from './pages/catalog/catalog';

export const routes: Routes = [
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [MsalGuard]
  },
  {
    path: 'catalog',
    component: Catalog,
    canActivate: [MsalGuard]
  }
];