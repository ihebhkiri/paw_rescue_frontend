import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonIcon } from '@ionic/angular';
import { AuthLayoutComponent } from './layout/auth-layout.component';
import { RouterLink } from '@angular/router';
import {
  arrowForwardOutline, eyeOffOutline, eyeOutline, lockClosedOutline, logoApple, mailOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
  imports: [ReactiveFormsModule, IonIcon, AuthLayoutComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthComponent {
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
    rememberMe: new FormControl(false, { nonNullable: true }),
  });

  submit(): void {
    this.feedback.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.showUnavailable('La connexion');
  }

  showUnavailable(action: string): void {
    this.feedback.set(`${action} n’est pas encore disponible.`);
  }
}
