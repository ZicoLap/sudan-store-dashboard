import { Routes } from '@angular/router';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { StoreSelectionComponent } from './store-selection/store-selection.component';
import { AuthGuard } from './gards/auth.gards';
import { StoreDashboardComponent } from './store-dashboard/store-dashboard.component';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'select-store', component: StoreSelectionComponent, canActivate: [AuthGuard] },
   { path: 'store/:id', component: StoreDashboardComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  // other routes here...
];

