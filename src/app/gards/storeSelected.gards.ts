/* // store-selected.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { StoreService } from '../store/store.service';

@Injectable({ providedIn: 'root' })
export class StoreSelectedGuard implements CanActivate {
  constructor(private storeService: StoreService, private router: Router) {}

  canActivate(): boolean {
    if (this.storeService.getSelectedStore()) {
      return true;
    }
    this.router.navigate(['/select-store']);
    return false;
  }
}
 */