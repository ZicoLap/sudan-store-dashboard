import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { StoreService } from '../store/store.service';
import { Store } from '../store/store.model';
import { NgIf, NgClass } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { HeaderComponent } from "./header/header.component";
import { SidebarComponent } from "./sidebar/sidebar.component";
import { FooterComponent } from "./footer/footer.component";
import { DashboardOverviewComponent } from "./dashboard-overview/dashboard-overview.component";

@Component({
  selector: 'app-store-dashboard',
  standalone: true,
  imports: [NgIf, NgClass, HeaderComponent, SidebarComponent, FooterComponent, RouterModule],
  templateUrl: './store-dashboard.component.html',
  styleUrls: ['./store-dashboard.component.css']
})
export class StoreDashboardComponent implements OnInit {
  store?: Store;
  loading = true;
  notFound = false;
  selectedMenu = 'overview';
  sidebarCollapsed = false;

  menuItems = [
    { id: 'overview', label: 'Dashboard', icon: '📊' },
    { id: 'products', label: 'All Products', icon: '📦' },
    { id: 'collections', label: 'Collections', icon: '📁' },
    { id: 'orders', label: 'Orders', icon: '🛒' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'settings', label: 'Store Settings', icon: '⚙️' }
  ];

  constructor(
    private route: ActivatedRoute,
    private storeService: StoreService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    // Get storeId from route parameters
    this.route.paramMap.subscribe(params => {
      const storeId = params.get('storeId');
      if (!storeId) {
        this.notFound = true;
        this.loading = false;
        return;
      }

      // Load store data
      this.loadStoreData(storeId);
    });
  }

  private loadStoreData(storeId: string): void {
    this.loading = true;
    this.storeService.getStoreById(storeId).subscribe({
      next: (store) => {
        this.store = store;
        this.loading = false;
        this.notFound = !store;
        console.log('Fetched store:', store);
      },
      error: (error) => {
        this.notFound = true;
        this.loading = false;
        console.error('Error fetching store:', error);
      }
    });
  }

  selectMenu(menuId: string) {
    this.selectedMenu = menuId;
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err) => console.error('Logout failed', err)
    });
  }

  goBack() {
    this.router.navigate(['/select-store']);
  }

  getUserDisplayName(): string {
    return this.authService.getCurrentUser()?.email?.split('@')[0] || 'User';
  }

  onMenuItemClick(menuId: string, event?: Event) {
    console.log('StoreDashboard: onMenuItemClick called with:', { menuId, event });
    
    // Prevent default behavior and stop propagation
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Handle toggle event from sidebar overlay
    if (menuId === 'toggle') {
      console.log('StoreDashboard: Toggling sidebar');
      this.toggleSidebar();
      return;
    }
    
    console.log('StoreDashboard: Selecting menu:', menuId);
    this.selectMenu(menuId);
    
    // Get storeId from the current route or component state
    const storeId = this.store?.id || this.route.snapshot.paramMap.get('storeId');
    console.log('StoreDashboard: Current storeId:', storeId);
    
    if (!storeId) {
      console.error('StoreDashboard: No store ID available for navigation');
      return;
    }
    
    // Special handling for dashboard/overview
    if (menuId === 'dashboard' || menuId === 'overview') {
      const targetRoute = ['/store', storeId, 'overview'];
      console.log('StoreDashboard: Navigating to overview:', targetRoute);
      this.router.navigate(targetRoute, { skipLocationChange: false })
        .then(() => console.log('StoreDashboard: Navigation to overview successful'))
        .catch(error => console.error('StoreDashboard: Navigation to overview failed:', error));
      return;
    }
    
    // For other menu items, navigate to the corresponding route
    if (menuId !== 'close') {
      const targetRoute = ['/store', storeId, menuId];
      console.log('StoreDashboard: Navigating to:', targetRoute);
      this.router.navigate(targetRoute, { skipLocationChange: false })
        .then(() => console.log('StoreDashboard: Navigation successful'))
        .catch(error => console.error('StoreDashboard: Navigation failed:', error));
    }
  }
}