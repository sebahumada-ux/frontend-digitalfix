import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

import { Dashboard } from './pages/dashboard/dashboard';
import { Catalog } from './pages/catalog/catalog';
import { Workorders } from './pages/workorders/workorders';

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
  },
  {
    path: 'workorders',
    component: Workorders,
    canActivate: [MsalGuard]
  }
];