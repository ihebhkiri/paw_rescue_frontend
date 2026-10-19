import { CurrentUser } from '../../../auth/models/current-user.model';
import { BottomNavigationComponent } from '../../../shared/bottom-navigation/bottom-navigation.component';
import { ChangeDetectionStrategy, Component, inject, input, OnDestroy, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonInput, IonSelect, IonSelectOption, IonSkeletonText, IonTextarea, IonToggle } from '@ionic/angular';
import { arrowBackOutline, cameraOutline, checkmarkOutline, closeOutline, createOutline, informationCircleOutline } from 'ionicons/icons';
import { finalize, forkJoin, of, Subscription, switchMap } from 'rxjs';
import { AuthService } from '../../../auth/service/auth';
import { Animals, ManagedAnimal, Species, animalAge } from '../animals';

interface PhotoPreview { url: string; file?: File; }
export const ANIMAL_STATUSES = [
  { value: 'in_shelter', label: 'Au refuge' }, { value: 'rescued', label: 'Secouru' },
  { value: 'stray', label: 'Errant' }, { value: 'reserved', label: 'Réservé' }, { value: 'adopted', label: 'Adopté' },
] as const;

@Component({
  selector: 'app-animal-form', templateUrl: './animal-form.component.html', styleUrl: './animal-form.component.scss',
  imports: [BottomNavigationComponent, ReactiveFormsModule, RouterLink, IonButton, IonContent, IonIcon, IonInput, IonSelect, IonSelectOption, IonSkeletonText, IonTextarea, IonToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimalFormComponent implements OnDestroy {
  readonly id = input<string>();
  private readonly api = inject(Animals);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly content = viewChild(IonContent);
  private request?: Subscription;
  private mutation?: Subscription;
  readonly loading = signal(true);
  readonly allowed = signal(false);
  readonly shelter = signal<CurrentUser['profile']>(null);
  readonly loadError = signal('');
  readonly error = signal('');
  readonly photoError = signal('');
  readonly saving = signal(false);
  readonly step = signal(0);
  readonly photos = signal<PhotoPreview[]>([]);
  readonly species = signal<Species[]>([]);
  readonly saved = signal<ManagedAnimal | null>(null);
  readonly icons = { arrowBackOutline, cameraOutline, checkmarkOutline, closeOutline, createOutline, informationCircleOutline };
  readonly statuses = ANIMAL_STATUSES;
  readonly steps = ['Photos', 'Informations', 'Description', 'Disponibilité', 'Récapitulatif'];
  readonly age = animalAge;
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)] }),
    species: new FormControl<number | null>(null, Validators.required),
    breed: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)] }),
    estimated_age_months: new FormControl<number | null>(null, [Validators.required, Validators.min(0), Validators.max(2147483647), Validators.pattern(/^\d+$/)]),
    sex: new FormControl<'M' | 'F' | 'unknown'>('unknown', { nonNullable: true, validators: Validators.required }),
    weight_kg: new FormControl<number | null>(null, [Validators.min(0.01), Validators.max(9999.99), Validators.pattern(/^\d+(\.\d{1,2})?$/)]),
    color: new FormControl('', { nonNullable: true, validators: Validators.maxLength(100) }),
    size: new FormControl<'small' | 'medium' | 'large' | ''>('', { nonNullable: true, validators: Validators.required }),
    health_notes: new FormControl('', { nonNullable: true, validators: Validators.maxLength(2000) }),
    behavior: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(500), Validators.pattern(/\S/)] }),
    status: new FormControl<ManagedAnimal['status']>('in_shelter', { nonNullable: true, validators: Validators.required }),
    is_adoptable: new FormControl(false, { nonNullable: true }),
  });
  readonly fields = this.form.controls;

  ionViewWillEnter(): void { this.load(); }
  ionViewWillLeave(): void { this.request?.unsubscribe(); this.mutation?.unsubscribe(); this.allowed.set(false); this.clearPhotos(); }
  ngOnDestroy(): void { this.ionViewWillLeave(); }
  load(): void {
    this.request?.unsubscribe(); this.clearPhotos(); this.form.reset(); this.form.enable(); this.saved.set(null); this.step.set(0);
    this.loading.set(true); this.allowed.set(false); this.loadError.set(''); this.error.set(''); this.photoError.set('');
    this.request = forkJoin({ user: this.auth.currentUser(), species: this.api.species() }).subscribe({
      next: ({ user, species }) => {
        this.species.set(species);
        this.shelter.set(user.role === 'refuge' ? user.profile : null);
        if (user.role !== 'refuge') { this.loading.set(false); this.loadError.set('Cet écran est réservé aux refuges et associations.'); return; }
        if (this.id()) {
          this.request = this.api.mine().pipe(
            switchMap(items => items.some(item => String(item.id) === this.id()) ? this.api.managedDetail(this.id()!) : of(null)),
            finalize(() => this.loading.set(false)),
          ).subscribe({
            next: animal => {
              if (!animal) { this.loadError.set('Animal introuvable ou accès non autorisé.'); return; }
              this.form.patchValue({ ...animal, health_notes: animal.health_notes ?? '', weight_kg: animal.weight_kg === null ? null : Number(animal.weight_kg) });
              this.statusChanged();
              this.photos.set((animal.photos ?? []).map(photo => ({ url: photo.image })));
              this.allowed.set(true);
            }, error: (error: unknown) => this.loadError.set(this.auth.errorMessage(error)),
          });
        } else { this.allowed.set(true); this.loading.set(false); }
      }, error: (error: unknown) => { this.loading.set(false); this.loadError.set(this.auth.errorMessage(error)); },
    });
  }
  private clearPhotos(): void {
    this.photos().forEach(photo => { if (photo.file) URL.revokeObjectURL(photo.url); }); this.photos.set([]);
  }
  choosePhotos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []); input.value = '';
    if (this.saving()) return;
    this.photoError.set('');
    if (this.photos().length + files.length > 5) { this.photoError.set('Vous pouvez ajouter au maximum 5 photos.'); return; }
    if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      this.photoError.set('Choisissez des images JPG, PNG ou WEBP de 5 Mo maximum chacune.'); return;
    }
    this.photos.update(photos => [...photos, ...files.map(file => ({ file, url: URL.createObjectURL(file) }))]);
  }
  removePhoto(index: number): void {
    const photo = this.photos()[index];
    if (!photo?.file || this.saving()) return;
    URL.revokeObjectURL(photo.url); this.photos.update(photos => photos.filter((_, i) => i !== index));
  }
  go(step: number): void { this.step.set(step); this.error.set(''); void this.content()?.scrollToTop(0); }
  back(): void { if (!this.saving()) { if (this.step() > 0) this.go(this.step() - 1); else void this.router.navigateByUrl('/animals/manage'); } }
  statusChanged(): void {
    if (this.fields.status.value !== 'in_shelter') { this.fields.is_adoptable.setValue(false); this.fields.is_adoptable.disable(); }
    else this.fields.is_adoptable.enable();
  }
  next(): void {
    if (this.saving() || !this.allowed()) return;
    if (this.step() === 0 && !this.photos().length) { this.photoError.set('Ajoutez au moins une photo de l’animal.'); return; }
    const names: (keyof typeof this.fields)[] = this.step() === 1 ? ['name', 'species', 'breed', 'estimated_age_months', 'sex', 'weight_kg', 'color', 'size'] : this.step() === 2 ? ['behavior', 'status', 'health_notes'] : [];
    names.forEach(name => this.fields[name].markAsTouched());
    if (names.some(name => this.fields[name].invalid)) { this.error.set('Vérifiez les champs indiqués avant de continuer.'); return; }
    if (this.step() < 4) this.go(this.step() + 1); else this.submit();
  }
  invalid(name: keyof typeof this.fields): boolean { return this.fields[name].touched && this.fields[name].invalid; }
  speciesName(): string { return this.species().find(s => s.id === this.fields.species.value)?.name ?? 'Espèce non renseignée'; }
  statusLabel(): string { return this.statuses.find(s => s.value === this.fields.status.value)?.label ?? ''; }
  submit(): void {
    if (this.step() !== 4 || this.saving() || !this.allowed() || this.form.invalid || !this.photos().length || !this.species().some(s => s.id === this.fields.species.value)) return;
    this.statusChanged();
    const values = this.form.getRawValue();
    const data = new FormData();
    Object.entries(values).forEach(([key, value]) => data.append(key, value === null ? '' : String(value).trim()));
    this.photos().forEach(photo => { if (photo.file) data.append('photos', photo.file, photo.file.name); });
    this.saving.set(true); this.error.set('');
    this.mutation = this.api.save(data, this.id() ? Number(this.id()) : undefined).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: saved => { this.saved.set(saved); this.form.markAsPristine(); void this.content()?.scrollToTop(0); },
      error: (error: unknown) => this.error.set(this.auth.errorMessage(error)),
    });
  }
}
