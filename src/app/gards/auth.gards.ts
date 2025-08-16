// In src/app/gards/auth.gards.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.authService.isAuthenticated$().pipe(
      take(1),
      map(isAuth => {
        if (isAuth) {
          return true;
        }
        this.router.navigate(['/']);
        return false;
      })
    );
  }
}