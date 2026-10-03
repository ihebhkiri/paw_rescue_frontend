import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, OnChanges, output, signal, SimpleChanges } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonIcon } from '@ionic/angular';
import { arrowBackOutline, arrowForwardOutline, cloudUploadOutline, informationCircleOutline } from 'ionicons/icons';

interface VerificationField {
  name: string;
  label: string;
  placeholder: string;
  control: FormControl<string>;
  type?: 'tel' | 'email';
  options?: readonly string[];
}

const FIELD_NAME_MAPPING: Record<string, string> = {
  orderNumber: 'license_number',
  clinic: 'clinic_name',
  organization: 'name',
  officialEmail: 'official_email',
  representative: 'representative_name',
};

@Component({
  selector: 'app-verification',
  imports: [ReactiveFormsModule, IonIcon],
  templateUrl: './verification.component.html',
  styleUrl: './verification.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificationComponent implements OnChanges {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly role = input.required<'VETERINARIAN' | 'SHELTER'>();
  readonly preview = input(false);
  readonly busy = input(false);
  readonly submitted = output<FormData>();
  readonly goBack = output<void>();
  readonly confirmed = output<void>();
  readonly icons = { arrowBackOutline, arrowForwardOutline, cloudUploadOutline, informationCircleOutline };
  readonly feedback = signal('');
  readonly document = signal<File | null>(null);
  readonly documentError = signal('');
  readonly governorates = [
    'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa', 'Jendouba', 'Kairouan',
    'Kasserine', 'Kébili', 'Le Kef', 'Mahdia', 'La Manouba', 'Médenine', 'Monastir',
    'Nabeul', 'Sfax', 'Sidi Bouzid', 'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan',
  ];
  private readonly governorate: VerificationField = {
    name: 'governorate', label: 'Gouvernorat', placeholder: 'Sélectionnez un gouvernorat', options: this.governorates,
    control: new FormControl('', { nonNullable: true, validators: [Validators.required, control => this.governorates.includes(control.value) ? null : { option: true }] }),
  };
  private readonly phone: VerificationField = {
    name: 'phone', label: 'Téléphone', placeholder: '+216 XX XXX XXX', type: 'tel',
    control: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^(?:\+216[ .-]?)?(?:\d[ .-]?){7}\d$/)] }),
  };
  readonly veterinarianFields: readonly VerificationField[] = [
    { name: 'orderNumber', label: 'Numéro d’inscription à l’Ordre', placeholder: 'Ex. 12345', control: this.requiredText() },
    this.governorate,
    { name: 'clinic', label: 'Clinique / Cabinet', placeholder: 'Nom de votre clinique ou cabinet', control: this.requiredText() },
    this.phone,
  ];
  readonly shelterFields: readonly VerificationField[] = [
    { name: 'organization', label: 'Nom officiel de l’organisation', placeholder: 'Nom du refuge ou de l’association', control: this.requiredText() },
    { name: 'structure', label: 'Type de structure', placeholder: 'Sélectionnez un type de structure', options: ['Refuge', 'Association'], control: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^(Refuge|Association)$/)] }) },
    { name: 'rne', label: 'Numéro RNE', placeholder: 'Ex. 1234567A', control: this.requiredText() },
    this.governorate,
    { name: 'address', label: 'Adresse du siège', placeholder: 'Adresse complète', control: this.requiredText() },
    this.phone,
    { name: 'officialEmail', label: 'Email officiel', placeholder: 'contact@organisation.tn', type: 'email', control: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }) },
    { name: 'representative', label: 'Nom du représentant légal', placeholder: 'Nom et prénom', control: this.requiredText() },
  ];
  readonly fields = computed(() => this.role() === 'VETERINARIAN' ? this.veterinarianFields : this.shelterFields);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['role'] && !changes['role'].firstChange) {
      this.document.set(null);
      this.documentError.set('');
      this.feedback.set('');
      const input = this.host.nativeElement.querySelector<HTMLInputElement>('#verification-document');
      if (input) input.value = '';
    }
  }

  fieldError(field: VerificationField): string {
    if (!field.control.touched || field.control.valid) return '';
    if (field.control.hasError('required') || !field.control.value.trim()) return 'Ce champ est obligatoire.';
    if (field.type === 'tel') return 'Saisissez 8 chiffres, avec éventuellement l’indicatif +216.';
    if (field.type === 'email') return 'Saisissez une adresse e-mail valide.';
    return 'Saisissez une valeur valide.';
  }

  selectDocument(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0) ?? null;
    this.document.set(null);
    this.documentError.set('');
    this.feedback.set('');
    if (!file) return;
    // Client-side checks are UX only; the future upload API must inspect the actual file content.
    if (!/\.(pdf|jpe?g|png)$/i.test(file.name) || (file.type && !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type))) {
      this.documentError.set('Choisissez un document PDF, JPG ou PNG.');
    } else if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      this.documentError.set('Le document doit être non vide et ne pas dépasser 5 Mo.');
    } else {
      this.document.set(file);
    }
    if (!this.document()) input.value = '';
  }

  submit(): void {
    if (this.busy()) return;
    this.feedback.set('');
    this.fields().forEach(field => field.control.markAsTouched());
    if (!this.document()) this.documentError.set(this.documentError() || 'Ajoutez votre justificatif.');
    if (this.fields().some(field => field.control.invalid) || !this.document()) {
      const invalid = this.fields().find(field => field.control.invalid);
      this.host.nativeElement.querySelector<HTMLElement>(invalid ? `#verification-${invalid.name}` : '#verification-document')?.focus();
      return;
    }
    if (this.preview()) {
      this.confirmed.emit();
      return;
    }
    const data = new FormData();
    for (const field of this.fields()) {
      const backendName = FIELD_NAME_MAPPING[field.name] ?? field.name;
      data.set(backendName, field.control.value.trim());
    }
    data.set('verification_document', this.document()!);
    this.submitted.emit(data);
  }

  private requiredText(): FormControl<string> {
    return new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] });
  }
}
