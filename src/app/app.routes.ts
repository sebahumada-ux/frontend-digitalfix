import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

import { Dashboard } from './pages/dashboard/dashboard';
import { Catalog } from './pages/catalog/catalog';
import { Workorders } from './pages/workorders/workorders';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [MsalGuard]
  },
  {
    path: 'catalog',
    component: Catalog,
    canActivate: [MsalGuard, roleGuard],
    data: {
      roles: ['Admin', 'Supervisor']
    }
  },
  {
    path: 'workorders',
    component: Workorders,
    canActivate: [MsalGuard, roleGuard],
    data: {
      roles: ['Admin', 'Supervisor', 'Cliente']
    }
  }
];