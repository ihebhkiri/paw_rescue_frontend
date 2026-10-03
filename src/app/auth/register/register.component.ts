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
import { IonIcon } from '@ionic/angular';
import {
  arrowBackOutline, arrowForwardOutline, checkmarkOutline, eyeOffOutline,
  eyeOutline, informationCircleOutline, lockClosedOutline, mailOutline, personOutline, timeOutline,
} from 'ionicons/icons';
import { AuthLayoutComponent } from '../layout/auth-layout.component';
import { VerificationComponent } from './verification.component';

type AccountFieldName = 'firstName' | 'lastName' | 'email' | 'password' | 'confirmPassword';

const ROLES: ReadonlyArray<{ value: UserRole; title: string; description: string }> = [
  { value: 'VOLUNTEER', title: 'Bénévole', description: 'Je donne de mon temps' },
  { value: 'VETERINARIAN', title: 'Vétérinaire', description: "Je soigne et j'accompagne" },
  { value: 'SHELTER', title: 'Refuge / Association', description: 'Je gère un refuge ou une association' },
];

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, IonIcon, AuthLayoutComponent, VerificationComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly busy = signal(false);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly stepTitle = viewChild<ElementRef<HTMLElement>>('stepTitle');
  readonly currentStep = signal<1 | 2 | 3 | 'confirmation' | 'created'>(1);
  private readonly requestedPreview = isDevMode() ? inject(ActivatedRoute).snapshot.queryParamMap.get('preview') : null;
  readonly preview = ['volunteer', 'veterinarian', 'vet-verification', 'shelter-verification', 'vet-confirmation', 'shelter-confirmation'].includes(this.requestedPreview ?? '') ? this.requestedPreview : null;
  readonly feedback = signal('');
  readonly visibility = signal({ password: false, confirmPassword: false });
  readonly icons = { arrowBackOutline, arrowForwardOutline, checkmarkOutline, eyeOffOutline, eyeOutline, informationCircleOutline, timeOutline, mailOutline };
  readonly fields: ReadonlyArray<{
    name: AccountFieldName; label: string; icon: string; autocomplete: string;
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
  readonly isProfessional = computed(() => {
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

  inputType(name: AccountFieldName): string {
    if (this.isPassword(name)) return this.visibility()[name] ? 'text' : 'password';
    return name === 'email' ? 'email' : 'text';
  }

  toggleVisibility(name: AccountFieldName): void {
    if (this.isPassword(name)) this.visibility.update(value => ({ ...value, [name]: !value[name] }));
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
    if (this.busy() || this.currentStep() === 'confirmation' || this.currentStep() === 'created') return;
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
    if (this.isProfessional()) {
      this.goToStep(3);
      return;
    }
    if (this.preview) {
      this.feedback.set("Aperçu uniquement : aucun compte n'a été créé.");
      return;
    }
    this.signup();
  }

  signup(professionalData?: FormData): void {
    if (this.preview || this.busy() || this.currentStep() === 'created' || this.currentStep() === 'confirmation') return;
    this.account.markAllAsTouched();
    if (this.account.invalid) { this.goToStep(1); return; }
    const role = this.selectedRole();
    if (!role || (this.isProfessional() && !professionalData)) return;
    const account = this.account.getRawValue();
    const body: SignupRequest = {
      email: account.email.trim(),
      password: account.password,
      first_name: account.firstName.trim(),
      last_name: account.lastName.trim(),
      role: toBackendRole(role),
    };
    if (professionalData) for (const [key, value] of Object.entries(body)) professionalData.set(key, value);
    this.feedback.set('');
    this.busy.set(true);
    this.form.disable();
    this.auth.signup(professionalData ?? body).pipe(
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
    if (this.preview && this.isProfessional()) this.goToStep('confirmation');
  }

  contactTeam(): void {
    this.feedback.set("Le canal de contact de notre équipe n'est pas encore disponible.");
  }

  private goToStep(step: 1 | 2 | 3 | 'confirmation' | 'created'): void {
    this.feedback.set('');
    this.currentStep.set(step);
    afterNextRender(() => {
      this.host.nativeElement.scrollTop = 0;
      this.stepTitle()?.nativeElement.focus({ preventScroll: true });
    }, { injector: this.injector });
  }
}
