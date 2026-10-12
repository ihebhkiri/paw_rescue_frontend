import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService } from './service/auth';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonButton, IonCheckbox, IonContent, IonIcon, IonInput, IonSpinner } from '@ionic/angular';
import { AuthLayoutComponent } from './layout/auth-layout.component';
import { Router, RouterLink } from '@angular/router';
import {
  arrowForwardOutline, eyeOffOutline, eyeOutline, lockClosedOutline, logoApple, mailOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
  imports: [ReactiveFormsModule, IonButton, IonCheckbox, IonContent, IonIcon, IonInput, IonSpinner, AuthLayoutComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly busy = signal(false);
  readonly icons = {
    arrowForwardOutline, eyeOffOutline, eyeOutline, lockClosedOutline, logoApple, mailOutline,
  };
  readonly passwordVisible = signal(false);
  readonly feedback = signal('');
  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    rememberMe: new FormControl({ value: false, disabled: true }, { nonNullable: true }),
  });

  submit(): void {
    if (this.busy()) return;
    this.feedback.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        this.form.controls.password.reset();
        this.passwordVisible.set(false);
        this.feedback.set('Connexion réussie.');
        void this.router.navigateByUrl('/home');
      },
      error: (error: unknown) => this.feedback.set(this.auth.errorMessage(error)),
    });
  }

  showUnavailable(action: string): void {
    this.feedback.set(`${action} n’est pas encore disponible.`);
  }
}
