import { ChangeDetectionStrategy, Component, inject, input, signal, OnChanges, OnDestroy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButton, IonContent, IonIcon, IonToast } from '@ionic/angular';
import { arrowForwardOutline, calendarOutline, documentTextOutline, femaleOutline, heart, heartOutline, locationOutline, maleOutline, ellipsisVertical, paw, pawOutline } from 'ionicons/icons';
import { finalize, Subscription } from 'rxjs';
import { Animal, Animals } from '../animals';
import { AuthService } from '../../../auth/service/auth';
import { AdoptionRequestComponent } from '../../adoptions/adoption-request.component';

@Component({
  selector: 'app-animal-detail',
  templateUrl: './animal-detail.component.html',
  styleUrl: './animal-detail.component.scss',
  imports: [AdoptionRequestComponent, RouterLink, IonBackButton, IonButton, IonContent, IonIcon, IonToast],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimalDetailComponent implements OnChanges, OnDestroy {
  readonly id = input.required<string>();
  readonly animals = inject(Animals);
  private readonly auth = inject(AuthService);
  private request?: Subscription;
  private active = false;
  readonly animal = signal<Animal | null>(null);
  readonly photoIndex = signal(0);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly message = signal('');
  readonly icons = { arrowForwardOutline, calendarOutline, documentTextOutline, femaleOutline, heart, heartOutline, locationOutline, maleOutline, ellipsisVertical, paw, pawOutline };

  ionViewWillEnter(): void { this.active = true; this.load(); }
  ionViewWillLeave(): void {
    this.active = false;
    this.request?.unsubscribe();
    this.animal.set(null);
    this.message.set('');
  }
  ngOnChanges(): void { if (this.active) this.load(); }
  ngOnDestroy(): void { this.ionViewWillLeave(); }

  load(): void {
    this.request?.unsubscribe();
    this.animal.set(null);
    this.photoIndex.set(0);
    this.error.set('');
    if (!/^[1-9]\d*$/.test(this.id())) { this.loading.set(false); return; }
    this.loading.set(true);
    this.request = this.animals.detail(this.id()).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: animal => this.animal.set(animal),
      error: (error: unknown) => {
        if (!(error instanceof HttpErrorResponse && error.status === 404)) this.error.set(this.auth.errorMessage(error));
      },
    });
  }
}
