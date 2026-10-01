import {
  afterNextRender, ChangeDetectionStrategy, Component, ElementRef,
  computed, inject, Injector, isDevMode, signal, viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { IonIcon } from '@ionic/angular';
import {
  arrowBackOutline, arrowForwardOutline, checkmarkOutline, eyeOffOutline,
  eyeOutline, informationCircleOutline, lockClosedOutline, mailOutline, personOutline, timeOutline,
} from 'ionicons/icons';
import { AuthLayoutComponent } from '../layout/auth-layout.component';
import { VerificationComponent } from './verification.component';

type RegistrationRole = 'VOLUNTEER' | 'VETERINARIAN' | 'SHELTER';
type AccountFieldName = 'firstName' | 'lastName' | 'email' | 'password' | 'confirmPassword';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, IonIcon, AuthLayoutComponent, VerificationComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly stepTitle = viewChild<ElementRef<HTMLElement>>('stepTitle');
  readonly currentStep = signal<1 | 2 | 3 | 'confirmation'>(1);
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
  readonly roles: ReadonlyArray<{ value: RegistrationRole; title: string; description: string }> = [
    { value: 'VOLUNTEER', title: 'Bénévole', description: 'Je donne de mon temps' },
    { value: 'VETERINARIAN', title: 'Vétérinaire', description: 'Je soigne et j’accompagne' },
    { value: 'SHELTER', title: 'Refuge / Association', description: 'Je gère un refuge ou une association' },
  ];
  readonly account = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: Validators.required }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: Validators.required }),
    acceptTerms: new FormControl(false, { nonNullable: true, validators: Validators.requiredTrue }),
  }, {
    validators: group => group.get('password')?.value === group.get('confirmPassword')?.value
      ? null : { passwordMismatch: true },
  });
  readonly form = new FormGroup({
    account: this.account,
    selectedRole: new FormControl<RegistrationRole | null>(null, Validators.required),
  });
  readonly selectedRole = toSignal(this.form.controls.selectedRole.valueChanges, { initialValue: null });
  readonly professional = computed(() => this.selectedRole() === 'VETERINARIAN' || this.selectedRole() === 'SHELTER');
  readonly roleInformation = computed(() => {
    switch (this.selectedRole()) {
      case 'VOLUNTEER': return 'Le compte bénévole ne nécessite pas de vérification supplémentaire.';
      case 'VETERINARIAN': return 'Les comptes vétérinaires nécessitent une vérification professionnelle avant l’activation complète.';
      case 'SHELTER': return 'Les comptes refuge ou association nécessitent une vérification de l’organisation.';
      default: return 'Choisissez le rôle qui correspond à votre engagement.';
    }
  });
  readonly title = computed(() => {
    if (this.currentStep() === 'confirmation') return 'Compte en cours de vérification';
    if (this.currentStep() === 3) return this.selectedRole() === 'VETERINARIAN'
      ? 'Vérification vétérinaire' : 'Vérification de l’organisation';
    return 'Créer un compte';
  });
  readonly subtitle = computed(() => {
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
    this.goToStep(this.currentStep() === 3 ? 2 : 1);
  }

  submit(): void {
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
    if (this.professional()) {
      this.goToStep(3);
      return;
    }
    // Integrate the registration API here when available; never persist passwords locally.
    this.feedback.set('La création de compte n’est pas encore disponible. Aucun compte n’a été créé.');
  }

  showLegalUnavailable(): void {
    this.feedback.set('Les conditions d’utilisation et la politique de confidentialité ne sont pas encore disponibles.');
  }

  confirmPreview(): void {
    if (this.preview && this.professional()) this.goToStep('confirmation');
  }

  contactTeam(): void {
    this.feedback.set('Le canal de contact de notre équipe n’est pas encore disponible.');
  }

  private goToStep(step: 1 | 2 | 3 | 'confirmation'): void {
    this.feedback.set('');
    this.currentStep.set(step);
    afterNextRender(() => {
      this.host.nativeElement.scrollTop = 0;
      this.stepTitle()?.nativeElement.focus({ preventScroll: true });
    }, { injector: this.injector });
  }
}
