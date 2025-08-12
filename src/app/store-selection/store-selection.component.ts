import { Component, inject, OnInit, signal } from '@angular/core';
import { StoreService } from '../store/store.service';
import { Store } from '../store/store.model';
import { NgForOf } from '@angular/common';
import { FormsModule, NgModel } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-store-selection',
  standalone: true,
  imports: [NgForOf, FormsModule],
  templateUrl: './store-selection.component.html',
  styleUrls: ['./store-selection.component.css'],
})
export class StoreSelectionComponent implements OnInit {
selectedLanguage: any;

onContact() {
throw new Error('Method not implemented.');
}


/*   stores: Store[] = []; */
  imageUrl = signal('');
  storeName = signal('');
  storeLogo = signal('');

  stores = signal<Store[] | null>(null);

  constructor(private storeService: StoreService, private router: Router, private authService: AuthService) {}

  ngOnInit() {
    this.storeService.getUserStores().subscribe({
      next: (stores) => {
        
        console.log('User stores:', stores);
        this.stores.set(stores);
      },
      error: (err) => console.error('Error fetching user stores:', err),
    });
  }

  goToStoreDashboard(storeId: string) {
  this.router.navigate(['/store', storeId]);
}

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err) => console.error('Logout failed', err)
    });
  }
}
