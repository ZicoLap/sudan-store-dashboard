import { Injectable, OnDestroy } from '@angular/core';
import { Auth, onAuthStateChanged, signInWithEmailAndPassword, signOut, authState, setPersistence, browserSessionPersistence } from '@angular/fire/auth';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  user$: Observable<any>;
  private unsubscribeAuth?: () => void;

  constructor(private auth: Auth) {
    this.user$ = authState(this.auth);
    this.unsubscribeAuth = onAuthStateChanged(this.auth, user => {
      console.log('Firebase Auth user:', user);
    });
  }

  ngOnDestroy() {
    this.unsubscribeAuth?.();
  }

  /** Return Observable instead of Promise */
  login(email: string, password: string): Observable<any> {
    return from(  setPersistence(this.auth, browserSessionPersistence).then(() =>
        signInWithEmailAndPassword(this.auth, email, password)
      ));
  }

  /** Return Observable instead of Promise */
  logout(): Observable<void> {
    return from(signOut(this.auth));
  }

  getCurrentUser() {
    return this.auth.currentUser;
  }

  getUserId() {
    return this.auth.currentUser?.uid ?? null;
  }

  getUserEmail() {
    return this.auth.currentUser?.email ?? null;
  }

  /** Reactive auth status */
  isAuthenticated$(): Observable<boolean> {
    return this.user$.pipe(map(user => !!user));
  }
}
