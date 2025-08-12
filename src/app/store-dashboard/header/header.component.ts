// src/app/shared/header/header.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgIf } from '@angular/common';
import { AuthService } from '../../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [NgIf],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  // Input: Store Name wird von Parent Component übergeben
  @Input() storeName: string = '';
  
  // Output: Wenn Sidebar Toggle geklickt wird
  @Output() toggleSidebar = new EventEmitter<void>();
  
  // User Dropdown state
  isUserMenuOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  // Sidebar Toggle Function
  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  // User Menu Toggle
  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  // Close User Menu (when clicking outside)
  closeUserMenu() {
    this.isUserMenuOpen = false;
  }

  // Get User Display Name
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

  // Get User Email
  getUserEmail(): string {
    return this.authService.getUserEmail() || 'user@example.com';
  }

  // Logout Function
  onLogout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err) => console.error('Logout failed:', err)
    });
  }

  // Go to Store Selection
  changeStore() {
    this.router.navigate(['/select-store']);
  }
}