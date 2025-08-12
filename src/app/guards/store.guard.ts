import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { StoreService } from '../store/store.service';

@Injectable({
  providedIn: 'root'
})
export class StoreGuard {
  constructor(
    private storeService: StoreService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    const storeId = route.paramMap.get('storeId');
    
    if (!storeId) {
      console.error('StoreGuard: No store ID in route');
      this.router.navigate(['/select-store']);
      return of(false);
    }

    console.log('StoreGuard: Verifying store access for ID:', storeId);
    
    return this.storeService.getStoreById(storeId).pipe(
      map(store => {
        if (!store) {
          console.error('StoreGuard: Store not found for ID:', storeId);
          this.router.navigate(['/select-store']);
          return false;
        }
        console.log('StoreGuard: Access granted for store:', store.name);
        return true;
      }),
      catchError(error => {
        console.error('StoreGuard: Error verifying store access:', error);
        this.router.navigate(['/select-store']);
        return of(false);
      })
    );
  }
}
