// src/app/shared/sidebar/sidebar.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgFor, NgIf, NgClass } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../auth.service';
import { filter } from 'rxjs/operators';

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgFor, NgIf, NgClass],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  // Input: Ob Sidebar collapsed ist
  @Input() isCollapsed: boolean = false;
  
  // Input: Store ID für Routing
  @Input() storeId: string = '';
  
  // Output: Wenn Menu Item geklickt wird
  @Output() menuItemClick = new EventEmitter<string>();

  // Current active route
  activeRoute: string = 'dashboard';

  // Menu Items
  menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'dashboard',
      route: 'dashboard'
    },
    {
      id: 'products',
      label: 'All Products',
      icon: 'inventory_2',
      route: 'products'
    },
    {
      id: 'collections',
      label: 'Collections',
      icon: 'folder',
      route: 'collections'
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: 'shopping_cart',
      route: 'orders'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: 'analytics',
      route: 'analytics'
    },
    {
      id: 'settings',
      label: 'Store Settings',
      icon: 'settings',
      route: 'settings'
    }
  ];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    // Listen to route changes to update active route
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateActiveRoute(event.url);
      });
  }

  ngOnInit() {
    // Set initial active route
    this.updateActiveRoute(this.router.url);
  }

  // Update active route based on current URL
  private updateActiveRoute(url: string) {
    const urlParts = url.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    
    // Find matching menu item
    const foundItem = this.menuItems.find(item => item.route === lastPart);
    if (foundItem) {
      this.activeRoute = foundItem.id;
    } else {
      this.activeRoute = 'dashboard'; // Default
    }
  }

  // Handle menu item click
  onMenuItemClick(menuItem: MenuItem) {
    if (menuItem.disabled) {
      return;
    }

    this.activeRoute = menuItem.id;
    this.menuItemClick.emit(menuItem.id);

    // Navigate to route
    if (this.storeId) {
      this.router.navigate(['/store', this.storeId, menuItem.route]);
    }
  }

  // Get user display name
  getUserDisplayName(): string {
    const user = this.authService.getCurrentUser();
    if (user?.displayName) {
      return user.displayName;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  }

  // Get user email
  getUserEmail(): string {
    return this.authService.getUserEmail() || 'user@example.com';
  }

  // Get user initials for avatar
  getUserInitials(): string {
    const displayName = this.getUserDisplayName();
    return displayName.charAt(0).toUpperCase();
  }

  // Logout function
  onLogout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err) => console.error('Logout failed:', err)
    });
  }
}