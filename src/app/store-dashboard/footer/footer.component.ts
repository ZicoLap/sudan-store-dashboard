// src/app/shared/footer/footer.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  // Input: Ob Sidebar collapsed ist (für margin adjustment)
  @Input() sidebarCollapsed: boolean = false;

  // Current year for copyright
  currentYear = new Date().getFullYear();

  // Footer links (disabled for now, can be enabled later)
  footerLinks = [
    { label: 'Privacy Policy', url: '#', disabled: true },
    { label: 'Terms of Service', url: '#', disabled: true },
    { label: 'Support', url: '#', disabled: true },
    { label: 'Documentation', url: '#', disabled: true }
  ];

  // Handle link clicks
  onLinkClick(link: any) {
    if (link.disabled) {
      console.log('Link coming soon:', link.label);
      return;
    }
    // Handle enabled links
    window.open(link.url, '_blank');
  }

  // Get version info (you can update this as needed)
  getVersion(): string {
    return 'v1.0.0';
  }
}