import { Component, DestroyRef, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  private destroyRef = inject(DestroyRef);

  form = new FormGroup({
    email: new FormControl('', { validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { validators: [Validators.required, Validators.minLength(6)] })
  });

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    if (this.form.valid) {
      const email = this.form.get('email')?.value ?? '';
      const password = this.form.get('password')?.value ?? '';

      if (email && password) {
        this.authService.login(email, password)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              console.log('Login successful');
              this.router.navigate(['/select-store']);
            },
            error: (err) => console.error('Login failed', err)
          });
      }
    }
  }
}
