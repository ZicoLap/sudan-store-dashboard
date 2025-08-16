import { Routes } from '@angular/router';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { StoreSelectionComponent } from './store-selection/store-selection.component';
import { AuthGuard } from './gards/auth.gards';
import { StoreDashboardComponent } from './store-dashboard/store-dashboard.component';
import { DashboardOverviewComponent } from './store-dashboard/dashboard-overview/dashboard-overview.component';
import { ProductsListComponent } from './store-dashboard/products-list/products-list.component';
import { StoreGuard } from './guards/store.guard';
import { OrdersListComponent } from './store-dashboard/orders/orders-list/orders-list.component';


export const routes: Routes = [
  { 
    path: '', 
    component: LandingPageComponent,
    pathMatch: 'full' 
  },
  { 
    path: 'select-store', 
    component: StoreSelectionComponent, 
    canActivate: [AuthGuard] 
  },
  {
    path: 'store/:storeId',
    component: StoreDashboardComponent,
    canActivate: [AuthGuard, StoreGuard],
    children: [
      { 
        path: '', 
        redirectTo: 'overview', 
        pathMatch: 'full' 
      },
      { 
        path: 'overview', 
        component: DashboardOverviewComponent 
      },
      { 
        path: 'products', 
        component: ProductsListComponent 
      },
      { 
        path: 'collections', 
        loadComponent: () => import('./store-dashboard/collections/collections-list/collections-list.component').then(m => m.CollectionsListComponent)
      },
      { 
        path: 'orders', 
        children: [
          {
            path: '',
            component: OrdersListComponent
          },
          {
            path: ':orderId',
            loadComponent: () => import('./store-dashboard/orders/order-view/order-view.component').then(m => m.OrderViewComponent)
          }
        ]
      },
    ],
  },
  { 
    path: '**', 
    redirectTo: '',
    pathMatch: 'full' 
  }
];

