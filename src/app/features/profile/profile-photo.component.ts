import { ChangeDetectionStrategy, Component, inject, OnDestroy, output, signal } from '@angular/core';
import { IonButton, IonIcon, IonModal, IonSpinner } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { cameraOutline, imageOutline, closeOutline } from 'ionicons/icons';
import { finalize, Subscription } from 'rxjs';
import { AuthService } from '../../auth/service/auth';

@Component({
  selector: 'app-profile-photo',
  templateUrl: './profile-photo.component.html',
  styleUrl: './profile-photo.component.scss',
  imports: [IonButton, IonIcon, IonModal, IonSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePhotoComponent implements OnDestroy {
  private readonly auth = inject(AuthService);
  private upload?: Subscription;
  private generation = 0;
  private file?: File;
  private source = CameraSource.Photos;
  readonly updated = output<string>();
  readonly step = signal<'closed' | 'source' | 'preview' | 'confirm'>('closed');
  readonly preview = signal('');
  readonly picking = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly sources = CameraSource;
  readonly icons = { cameraOutline, imageOutline, closeOutline };

  open(): void { this.error.set(''); this.step.set('source'); }

  close(): void {
    this.generation++;
    this.step.set('closed');
    this.picking.set(false);
    this.error.set('');
    this.clearPreview();
  }

  ngOnDestroy(): void { this.upload?.unsubscribe(); this.close(); }

  async choose(source = this.source): Promise<void> {
    if (this.picking() || this.saving()) return;
    this.source = source;
    this.picking.set(true);
    this.error.set('');
    const generation = this.generation;
    let sourceUrl: string | undefined;
    try {
      const photo = await Camera.getPhoto({
        quality: 90, allowEditing: false, resultType: CameraResultType.Uri,
        source, webUseInput: true, saveToGallery: false, width: 1600, height: 1600,
      });
      sourceUrl = photo.webPath;
      if (generation !== this.generation) return;
      if (!photo.webPath) throw new Error('Image indisponible.');
      const response = await fetch(photo.webPath);
      if (!response.ok) throw new Error('Impossible de lire la photo.');
      const file = await this.crop(await response.blob());
      if (generation !== this.generation) return;
      this.clearPreview();
      this.file = file;
      this.preview.set(URL.createObjectURL(file));
      this.step.set('preview');
    } catch (error: unknown) {
      if (generation !== this.generation) return;
      const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
      if (/cancel|annul|no image picked/i.test(message)) return;
      this.error.set(/permission|denied|access/i.test(message)
        ? 'Accès refusé. Autorisez la caméra ou les photos dans les réglages de votre appareil.'
        : 'Impossible de préparer la photo. Réessayez avec une autre image.');
    } finally {
      if (sourceUrl?.startsWith('blob:')) URL.revokeObjectURL(sourceUrl);
      if (generation === this.generation) this.picking.set(false);
    }
  }

  validate(): void {
    if (!this.file || this.saving() || this.picking() || this.step() !== 'confirm') return;
    this.saving.set(true);
    this.error.set('');
    this.upload = this.auth.uploadPhoto(this.file).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: user => {
        if (!user.photo) { this.error.set('La photo enregistrée est indisponible. Réessayez.'); return; }
        this.updated.emit(user.photo);
        this.saving.set(false);
        this.close();
      },
      error: (error: unknown) => this.error.set(this.auth.errorMessage(error)),
    });
  }

  private clearPreview(): void {
    if (this.preview()) URL.revokeObjectURL(this.preview());
    this.preview.set('');
    this.file = undefined;
  }

  private async crop(blob: Blob): Promise<File> {
    const url = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      if (!side) throw new Error('Image vide.');
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = Math.min(side, 1024);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Recadrage indisponible.');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
      const cropped = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Image invalide.')), 'image/jpeg', 0.9));
      if (cropped.size > 5 * 1024 * 1024) throw new Error('Photo trop volumineuse.');
      return new File([cropped], 'profile.jpg', { type: 'image/jpeg' });
    } finally { URL.revokeObjectURL(url); }
  }
}
