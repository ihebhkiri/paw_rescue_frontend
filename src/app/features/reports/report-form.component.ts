import { ChangeDetectionStrategy, Component, inject, signal, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonBackButton, IonButton, IonContent } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { finalize, Subscription } from 'rxjs';
import { AuthService } from '../../auth/service/auth';
import { Animals, Species } from '../animals/animals';
import { Coordinates, currentPosition, Reports } from './reports';

@Component({
  selector: 'app-report-form', templateUrl: './report-form.component.html', styleUrl: './rescue.scss',
  imports: [ReactiveFormsModule, IonBackButton, IonButton, IonContent], changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportFormComponent implements OnDestroy {
  private readonly api = inject(Reports);
  private readonly animals = inject(Animals);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private requests = new Subscription();
  private generation = 0;
  private file: File | null = null;
  readonly native = Capacitor.isNativePlatform();
  readonly sources = CameraSource;
  readonly species = signal<Species[]>([]);
  readonly position = signal<Coordinates | null>(null);
  readonly locating = signal(false);
  readonly picking = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly gpsError = signal('');
  readonly preview = signal('');
  readonly submitted = signal(false);
  readonly form = this.fb.group({
    species: this.fb.control<number | null>(null, Validators.required),
    type: this.fb.nonNullable.control<'stray' | 'injured'>('injured'),
    severity: this.fb.nonNullable.control('moderate'),
    description: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(5000), Validators.pattern(/\S/)]),
    address_text: this.fb.nonNullable.control('', Validators.maxLength(255)),
  });
  ionViewWillEnter(): void {
    this.loadSpecies();
    if (!this.position()) void this.locate();
  }
  loadSpecies(): void {
    this.requests.add(this.animals.species().subscribe({ next: value => this.species.set(value), error: (error: unknown) => this.error.set(this.auth.errorMessage(error)) }));
  }
  ionViewWillLeave(): void {
    this.generation++; this.requests.unsubscribe(); this.requests = new Subscription(); this.locating.set(false); this.picking.set(false);
  }
  ngOnDestroy(): void { this.ionViewWillLeave(); if (this.preview()) URL.revokeObjectURL(this.preview()); }
  async locate(): Promise<void> {
    if (this.locating()) return;
    const generation = this.generation;
    this.locating.set(true); this.gpsError.set(''); this.position.set(null);
    try { const value = await currentPosition(); if (generation === this.generation) this.position.set(value); }
    catch { if (generation === this.generation) this.gpsError.set('Position indisponible. Activez la localisation et autorisez son accès, puis réessayez.'); }
    finally { if (generation === this.generation) this.locating.set(false); }
  }
  selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.setPhoto(input.files[0]);
  }
  async choose(source: CameraSource): Promise<void> {
    if (this.picking()) return;
    const generation = this.generation;
    this.picking.set(true); this.error.set('');
    try {
      const photo = await Camera.getPhoto({ source, resultType: CameraResultType.Uri, quality: 85, width: 1600, height: 1600 });
      if (!photo.webPath) throw new Error('Photo absente');
      const blob = await (await fetch(photo.webPath)).blob();
      if (generation === this.generation) this.setPhoto(new File([blob], `animal.${photo.format}`, { type: blob.type || `image/${photo.format}` }));
    } catch { if (generation === this.generation) this.error.set('Aucune photo ajoutée. Vérifiez les autorisations ou choisissez une photo dans la galerie.'); }
    finally { if (generation === this.generation) this.picking.set(false); }
  }
  private setPhoto(file: File): void {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.error.set('Choisissez une image JPG, PNG ou WEBP de 5 Mo maximum.'); return;
    }
    if (this.preview()) URL.revokeObjectURL(this.preview());
    this.file = file; this.preview.set(URL.createObjectURL(file)); this.error.set('');
  }
  submit(): void {
    this.submitted.set(true); this.form.markAllAsTouched();
    const point = this.position();
    if (this.form.invalid || !point || !this.file || this.saving()) return;
    const value = this.form.getRawValue();
    const data = new FormData();
    data.append('photos', this.file);
    data.append('species', String(value.species)); data.append('type', value.type);
    data.append('severity', value.type === 'injured' ? value.severity : '');
    data.append('description', value.description.trim()); data.append('address_text', value.address_text.trim());
    data.append('latitude', String(point.latitude)); data.append('longitude', String(point.longitude));
    this.saving.set(true); this.error.set('');
    this.requests.add(this.api.create(data).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: report => { void this.router.navigate(['/signalements', report.id], { replaceUrl: true }); },
      error: (error: unknown) => this.error.set(this.auth.errorMessage(error)),
    }));
  }
}
