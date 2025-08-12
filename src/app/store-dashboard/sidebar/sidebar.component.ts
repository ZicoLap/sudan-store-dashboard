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
      route: 'overview'
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
  onMenuItemClick(menuItem: MenuItem, event?: Event) {
    console.log('onMenuItemClick called with:', { menuItem, event });
    
    // Prevent default behavior and stop propagation
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (menuItem.disabled) {
      console.log('Menu item is disabled, not navigating');
      return;
    }

    if (!this.storeId) {
      console.error('No storeId available for navigation');
      return;
    }

    console.log('Setting active route to:', menuItem.id);
    this.activeRoute = menuItem.id;
    this.menuItemClick.emit(menuItem.id);

    // Get the current route segments
    const currentUrl = this.router.url;
    console.log('Current URL:', currentUrl);
    
    // Navigate to the correct route
    const targetRoute = ['/store', this.storeId, menuItem.route];
    console.log('Navigating to:', targetRoute);
    
    this.router.navigate(targetRoute, { 
      skipLocationChange: false 
    })
    .then(success => {
      console.log('Navigation successful:', success);
    })
    .catch(error => {
      console.error('Navigation error:', error);
    });
  }

  // Close sidebar when clicking on the overlay
  closeSidebar(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    // Emit an event to the parent component to toggle the sidebar
    this.menuItemClick.emit('toggle');
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