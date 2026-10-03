import {
  afterNextRender, ChangeDetectionStrategy, Component, ElementRef,
  computed, DestroyRef, inject, Injector, isDevMode, signal, viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService } from '../service/auth';
import { SignupRequest } from '../models/auth-request.model';
import { UserRole, toBackendRole } from '../models/user-role.model';
import { RegisterStep, ROLES } from '../models/register.model';
import { IonButton, IonCheckbox, IonContent, IonIcon, IonInput, IonRadio, IonRadioGroup, IonSpinner } from '@ionic/angular';
import {
  arrowBackOutline, arrowForwardOutline, checkmarkOutline, eyeOffOutline,
  eyeOutline, informationCircleOutline, lockClosedOutline, mailOutline, personOutline, timeOutline,
} from 'ionicons/icons';
import { AuthLayoutComponent } from '../layout/auth-layout.component';
import { VerificationComponent } from './verification.component';

type AccountFieldName = 'firstName' | 'lastName' | 'email' | 'password' | 'confirmPassword';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, IonButton, IonCheckbox, IonContent, IonIcon, IonInput, IonRadio, IonRadioGroup, IonSpinner, AuthLayoutComponent, VerificationComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly busy = signal(false);
  private readonly injector = inject(Injector);
  private readonly content = viewChild.required(IonContent);
  private readonly stepTitle = viewChild<ElementRef<HTMLElement>>('stepTitle');
  readonly currentStep = signal<RegisterStep>(1);
  private readonly requestedPreview = isDevMode() ? inject(ActivatedRoute).snapshot.queryParamMap.get('preview') : null;
  readonly preview = ['volunteer', 'veterinarian', 'vet-verification', 'shelter-verification', 'vet-confirmation', 'shelter-confirmation'].includes(this.requestedPreview ?? '') ? this.requestedPreview : null;
  readonly feedback = signal('');
  private readonly passwordVisible = signal(false);
  private readonly confirmPasswordVisible = signal(false);
  readonly icons = { arrowBackOutline, arrowForwardOutline, checkmarkOutline, eyeOffOutline, eyeOutline, informationCircleOutline, timeOutline, mailOutline };
  readonly accountFields: ReadonlyArray<{
    name: AccountFieldName; label: string; icon: string; autocomplete: 'given-name' | 'family-name' | 'email' | 'new-password';
  }> = [
    { name: 'firstName', label: 'Prénom', icon: personOutline, autocomplete: 'given-name' },
    { name: 'lastName', label: 'Nom', icon: personOutline, autocomplete: 'family-name' },
    { name: 'email', label: 'Adresse e-mail', icon: mailOutline, autocomplete: 'email' },
    { name: 'password', label: 'Mot de passe', icon: lockClosedOutline, autocomplete: 'new-password' },
    { name: 'confirmPassword', label: 'Confirmer le mot de passe', icon: lockClosedOutline, autocomplete: 'new-password' },
  ];
  readonly roles = ROLES;
  readonly account = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: Validators.required }),
    acceptTerms: new FormControl(false, { nonNullable: true, validators: Validators.requiredTrue }),
  }, {
    validators: group => group.get('password')?.value === group.get('confirmPassword')?.value
      ? null : { passwordMismatch: true },
  });
  readonly form = new FormGroup({
    account: this.account,
    selectedRole: new FormControl<UserRole | null>(null, Validators.required),
  });
  readonly selectedRole = toSignal(this.form.controls.selectedRole.valueChanges, { initialValue: null });
  readonly requiresVerification = computed(() => {
    const role = this.selectedRole();
    return role === 'VETERINARIAN' || role === 'SHELTER';
  });
  readonly roleInformation = computed(() => {
    switch (this.selectedRole()) {
      case 'VOLUNTEER': return "Le compte bénévole ne nécessite pas de vérification supplémentaire.";
      case 'VETERINARIAN': return "Les comptes vétérinaires nécessitent une vérification professionnelle avant l'activation complète.";
      case 'SHELTER': return "Les comptes refuge ou association nécessitent une vérification de l'organisation.";
      default: return 'Choisissez le rôle qui correspond à votre engagement.';
    }
  });
  readonly title = computed(() => {
    if (this.currentStep() === 'created') return 'Compte créé';
    if (this.currentStep() === 'confirmation') return 'Compte en cours de vérification';
    if (this.currentStep() === 3) return this.selectedRole() === 'VETERINARIAN'
      ? 'Vérification vétérinaire' : "Vérification de l'organisation";
    return 'Créer un compte';
  });
  readonly subtitle = computed(() => {
    if (this.currentStep() === 'created') return 'Votre inscription est terminée. Vous pouvez maintenant vous connecter.';
    if (this.currentStep() === 'confirmation') return `Merci pour votre inscription en tant que ${this.selectedRole() === 'VETERINARIAN' ? 'vétérinaire' : 'refuge / association'}.\nVotre compte est en cours de vérification par notre équipe.`;
    if (this.currentStep() === 3) return this.selectedRole() === 'VETERINARIAN'
      ? 'Merci de fournir vos informations professionnelles afin de valider votre compte.'
      : 'Merci de fournir les informations de votre refuge ou association afin de valider votre compte.';
    return 'Rejoignez la communauté PawRescue AI\net faites la différence pour les animaux.';
  });
  readonly isAccountOrRoleStep = computed(() => this.currentStep() === 1 || this.currentStep() === 2);
  readonly isConfirmationOrCreated = computed(() => this.currentStep() === 'confirmation' || this.currentStep() === 'created');
  readonly isProfessionalScreen = computed(() => this.currentStep() === 3 || this.currentStep() === 'confirmation');
  readonly stepAriaCurrent = computed(() => {
    const step = this.currentStep();
    if (step === 1 || step === 2 || step === 3) return 'step';
    return null;
  });

  constructor() {
    const state = this.preview;
    if (!state) return;
    this.form.controls.selectedRole.setValue(state.startsWith('shelter') ? 'SHELTER' : state === 'volunteer' ? 'VOLUNTEER' : 'VETERINARIAN');
    this.currentStep.set(state.endsWith('confirmation') ? 'confirmation' : state.endsWith('verification') ? 3 : 2);
  }

  fieldError(name: AccountFieldName): string {
    const control = this.account.controls[name];
    if (!control.touched) return '';
    if (control.hasError('required') || control.hasError('pattern')) return 'Ce champ est obligatoire.';
    if (control.hasError('email')) return 'Saisissez une adresse e-mail valide.';
    if (control.hasError('minlength')) return 'Le mot de passe doit contenir au moins 8 caractères.';
    if (name === 'confirmPassword' && this.account.hasError('passwordMismatch')) return 'Les mots de passe doivent être identiques.';
    return '';
  }

  isPassword(name: AccountFieldName): name is 'password' | 'confirmPassword' {
    return name === 'password' || name === 'confirmPassword';
  }

  inputType(name: AccountFieldName): 'text' | 'email' | 'password' {
    if (name === 'password') return this.passwordVisible() ? 'text' : 'password';
    if (name === 'confirmPassword') return this.confirmPasswordVisible() ? 'text' : 'password';
    return name === 'email' ? 'email' : 'text';
  }

  toggleVisibility(name: AccountFieldName): void {
    if (name === 'password') this.passwordVisible.update(v => !v);
    else if (name === 'confirmPassword') this.confirmPasswordVisible.update(v => !v);
  }

  continue(): void {
    this.feedback.set('');
    this.account.markAllAsTouched();
    if (this.account.invalid) return;
    this.goToStep(2);
  }

  back(): void {
    if (this.busy()) return;
    this.goToStep(this.currentStep() === 3 ? 2 : 1);
  }

  submit(): void {
    if (this.busy() || this.isConfirmationOrCreated()) return;
    if (this.currentStep() === 1) {
      this.continue();
      return;
    }
    this.form.markAllAsTouched();
    if (this.account.invalid && !this.preview) {
      this.goToStep(1);
      return;
    }
    if (this.form.controls.selectedRole.invalid) return;
    if (this.requiresVerification()) {
      this.goToStep(3);
      return;
    }
    if (this.preview) {
      this.feedback.set("Aperçu uniquement : aucun compte n'a été créé.");
      return;
    }
    this.submitRegistration();
  }

  submitRegistration(verificationData?: FormData): void {
    if (this.preview || this.busy() || this.isConfirmationOrCreated()) return;
    this.account.markAllAsTouched();
    if (this.account.invalid) { this.goToStep(1); return; }
    const role = this.selectedRole();
    if (!role || (this.requiresVerification() && !verificationData)) return;
    const account = this.account.getRawValue();
    const body: SignupRequest = {
      email: account.email.trim(),
      password: account.password,
      first_name: account.firstName.trim(),
      last_name: account.lastName.trim(),
      role: toBackendRole(role),
    };
    if (verificationData) for (const [key, value] of Object.entries(body)) verificationData.set(key, value);
    this.feedback.set('');
    this.busy.set(true);
    this.form.disable();
    this.auth.signup(verificationData ?? body).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => { this.busy.set(false); this.form.enable(); }),
    ).subscribe({
      next: response => {
        this.account.controls.password.reset();
        this.account.controls.confirmPassword.reset();
        this.goToStep(response.user.profile?.verification_status === 'pending' ? 'confirmation' : 'created');
      },
      error: (error: unknown) => this.feedback.set(this.auth.errorMessage(error)),
    });
  }

  showLegalUnavailable(): void {
    this.feedback.set("Les conditions d'utilisation et la politique de confidentialité ne sont pas encore disponibles.");
  }

  confirmPreview(): void {
    if (this.preview && this.requiresVerification()) this.goToStep('confirmation');
  }

  contactTeam(): void {
    this.feedback.set("Le canal de contact de notre équipe n'est pas encore disponible.");
  }

  private goToStep(step: RegisterStep): void {
    this.feedback.set('');
    this.currentStep.set(step);
    afterNextRender(() => {
      void this.content().scrollToTop(0);
      this.stepTitle()?.nativeElement.focus({ preventScroll: true });
    }, { injector: this.injector });
  }
}
