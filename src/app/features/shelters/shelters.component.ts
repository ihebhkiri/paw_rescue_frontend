import { ChangeDetectionStrategy, Component, inject, OnDestroy, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { IonBackButton, IonButton, IonContent } from '@ionic/angular';
import { finalize, Subscription } from 'rxjs';
import { AuthService } from '../../auth/service/auth';
import { BottomNavigationComponent } from '../../shared/bottom-navigation/bottom-navigation.component';
import { currentPosition, Coordinates } from '../reports/reports';
import { Shelter, Shelters, shelterMap } from './shelters';

@Component({
  selector: 'app-shelters', templateUrl: './shelters.component.html', styleUrl: './shelters.component.scss',
  imports: [DecimalPipe, IonBackButton, IonButton, IonContent, BottomNavigationComponent], changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheltersComponent implements OnDestroy {
  private readonly api = inject(Shelters);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private request?: Subscription;
  private generation = 0;
  readonly items = signal<Shelter[]>([]);
  readonly loading = signal(false);
  readonly locating = signal(false);
  readonly error = signal('');
  readonly point = signal<Coordinates | undefined>(undefined);
  readonly map = shelterMap;
  ionViewWillEnter(): void {
    const params = this.route.snapshot.queryParamMap;
    const latitude = Number(params.get('latitude')), longitude = Number(params.get('longitude'));
    this.point.set(params.has('latitude') && params.has('longitude') && Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Number.isFinite(longitude) && Math.abs(longitude) <= 180 ? { latitude, longitude } : undefined);
    this.load();
  }
  ionViewWillLeave(): void { this.generation++; this.request?.unsubscribe(); this.locating.set(false); }
  ngOnDestroy(): void { this.ionViewWillLeave(); }
  load(): void {
    this.request?.unsubscribe(); this.loading.set(true); this.error.set(''); this.items.set([]);
    this.request = this.api.list(this.point()).pipe(finalize(() => this.loading.set(false))).subscribe({ next: items => this.items.set(items), error: (e: unknown) => this.error.set(this.auth.errorMessage(e)) });
  }
  async locate(): Promise<void> {
    if (this.locating()) return;
    const generation = this.generation; this.locating.set(true);
    try { const point = await currentPosition(); if (generation === this.generation) { this.point.set(point); this.load(); } }
    catch { if (generation === this.generation) this.error.set('Position indisponible. Autorisez la localisation et réessayez.'); }
    finally { if (generation === this.generation) this.locating.set(false); }
  }
}
