import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { StoreService } from '../store/store.service';
import { Store } from '../store/store.model';
import { NgIf, NgClass } from '@angular/common';
import { AuthService } from '../auth.service';
import { HeaderComponent } from "./header/header.component";
import { SidebarComponent } from "./sidebar/sidebar.component";
import { FooterComponent } from "./footer/footer.component";

@Component({
  selector: 'app-store-dashboard',
  standalone: true,
  imports: [NgIf, NgClass, HeaderComponent, SidebarComponent, FooterComponent],
  templateUrl: './store-dashboard.component.html',
  styleUrls: ['./store-dashboard.component.css']
})
export class StoreDashboardComponent implements OnInit {
  store?: Store;
  loading = true;
  notFound = false;
  selectedMenu = 'dashboard';
  sidebarCollapsed = false;

  menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
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
  ) {}

  ngOnInit() {
    const storeId = this.route.snapshot.paramMap.get('id');
    if (!storeId) {
      this.notFound = true;
      this.loading = false;
      return;
    }

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

   onMenuItemClick(menuId: string) {
    console.log('Menu clicked:', menuId);
    // Hier kannst du später Content wechseln
  }
}