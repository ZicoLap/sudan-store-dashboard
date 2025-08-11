import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreService } from '../store/store.service';
import { Store } from '../store/store.model';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-store-dashboard',
  standalone: true,
  imports: [NgIf],
  templateUrl: './store-dashboard.component.html',
  styleUrls: ['./store-dashboard.component.css']
})
export class StoreDashboardComponent {

store?: Store;
loading = true;
notFound = false;

constructor(
  private route: ActivatedRoute,
  private storeService: StoreService,
  private router: Router
) {}

ngOnInit() {
  const storeId = this.route.snapshot.paramMap.get('id');
  if (!storeId) {
    this.notFound = true;
    this.loading = false;
    return;
  }

  this.storeService.getStoreById(storeId).subscribe(store => {
    this.store = store;
    this.loading = false;
    this.notFound = !store;
    console.log('Fetched store:', store);
  }, error => {
    this.notFound = true;
    this.loading = false;

  });
}

goBack() {
  this.router.navigate(['/']);
}

}
