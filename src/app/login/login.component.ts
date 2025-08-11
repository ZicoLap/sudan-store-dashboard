import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { collection, collectionData, Firestore } from '@angular/fire/firestore';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  email = signal<string>('');
  password = signal<string>('');
  products$: any;
  private destroyRef = inject(DestroyRef);

  constructor(private authService: AuthService, firestore: Firestore) {
     const productsRef = collection(firestore, 'products');
    this.products$ = collectionData(productsRef, { idField: 'id' });
    
    this.products$.subscribe((data: any) => {
      console.log('Firestore products:', data);
    });
  }

  ngOnInit() {
 
  }

  onSubmit() {
    // Handle login logic here
   const loginSubscription = this.authService.login(this.email(), this.password()).subscribe({
      next: (userCredential) => console.log('Login successful', userCredential),
      error: (err) => console.error('Login failed', err)
    });

    this.destroyRef.onDestroy(() => {
      loginSubscription.unsubscribe();
      console.log('Component destroyed');
      this.products$.unsubscribe();

    });
  }
}
