import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addOutline, chevronForwardOutline, chevronDownOutline, location, notificationsOutline, heart, heartOutline, timeOutline, pawOutline } from 'ionicons/icons';
import { finalize, Subscription } from 'rxjs';
import { AuthService } from '../../auth/service/auth';
import { CurrentUser } from '../../auth/models/current-user.model';
import { BottomNavigationComponent } from '../../shared/bottom-navigation/bottom-navigation.component';
import { Animal, Animals } from '../animals/animals';
import { Coordinates, currentPosition, ReportDetail, Reports, statusLabel } from '../reports/reports';
import { Shelter, Shelters, shelterMap } from '../shelters/shelters';
import { NotificationResponse } from '../notifications/notifications.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-landing-home', templateUrl: './home.component.html', styleUrl: './home.component.scss',
  imports: [RouterLink, DatePipe, DecimalPipe, IonContent, IonIcon, BottomNavigationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnDestroy {
  readonly animals = inject(Animals);
  private readonly reports = inject(Reports);
  private readonly shelters = inject(Shelters);
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private requests = new Subscription();
  private shelterRequest?: Subscription;
  private generation = 0;
  readonly user = signal<CurrentUser | null>(null);
  readonly recent = signal<ReportDetail[]>([]);
  readonly adoptable = signal<Animal[]>([]);
  readonly refuges = signal<Shelter[]>([]);
  readonly unread = signal(false);
  readonly point = signal<Coordinates | undefined>(undefined);
  readonly locating = signal(false);
  readonly locationError = signal('');
  readonly errors = signal({ user: '', reports: '', animals: '', shelters: '', notifications: '' });
  readonly loading = signal({ reports: true, animals: true, shelters: true });
  readonly locationLabel = computed(() => this.point() ? 'Autour de moi' : this.user()?.profile?.governorate || this.user()?.profile?.address || 'Activer ma localisation');
  readonly icons = { addOutline, chevronForwardOutline, chevronDownOutline, location, notificationsOutline, heart, heartOutline, timeOutline, pawOutline };
  readonly statusLabel = statusLabel;
  readonly shelterMap = shelterMap;
  ionViewWillEnter(): void { this.load(); }
  ionViewWillLeave(): void { this.generation++; this.requests.unsubscribe(); this.shelterRequest?.unsubscribe(); this.locating.set(false); }
  ngOnDestroy(): void { this.ionViewWillLeave(); }
  load(): void {
    this.ionViewWillLeave(); this.requests = new Subscription();
    this.user.set(null); this.recent.set([]); this.adoptable.set([]); this.unread.set(false);
    this.errors.set({ user: '', reports: '', animals: '', shelters: '', notifications: '' });
    this.loading.set({ reports: true, animals: true, shelters: true });
    this.requests.add(this.auth.currentUser().subscribe({ next: user => this.user.set(user), error: (e: unknown) => this.fail('user', e) }));
    this.requests.add(this.reports.list().pipe(finalize(() => this.done('reports'))).subscribe({
      next: items => this.recent.set([...items].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')).slice(0, 3)), error: (e: unknown) => this.fail('reports', e),
    }));
    this.requests.add(this.animals.list().pipe(finalize(() => this.done('animals'))).subscribe({ next: items => this.adoptable.set(items.slice(0, 8)), error: (e: unknown) => this.fail('animals', e) }));
    this.requests.add(this.http.get<NotificationResponse[]>(`${environment.apiUrl}/notifications/`).subscribe({ next: items => this.unread.set(items.some(item => !item.is_read)), error: (e: unknown) => this.fail('notifications', e) }));
    this.loadShelters();
  }
  private done(key: 'reports' | 'animals' | 'shelters'): void { this.loading.update(state => ({ ...state, [key]: false })); }
  private fail(key: keyof ReturnType<typeof this.errors>, error: unknown): void { this.errors.update(state => ({ ...state, [key]: this.auth.errorMessage(error) })); }
  private loadShelters(): void {
    this.shelterRequest?.unsubscribe(); this.refuges.set([]); this.loading.update(state => ({ ...state, shelters: true }));
    this.errors.update(state => ({ ...state, shelters: '' }));
    this.shelterRequest = this.shelters.list(this.point()).pipe(finalize(() => this.done('shelters'))).subscribe({ next: items => this.refuges.set(items.slice(0, 2)), error: (e: unknown) => this.fail('shelters', e) });
  }
  async locate(): Promise<void> {
    if (this.locating()) return;
    const generation = this.generation;
    this.locating.set(true); this.locationError.set('');
    try { const point = await currentPosition(); if (generation === this.generation) { this.point.set(point); this.loadShelters(); } }
    catch { if (generation === this.generation) this.locationError.set('Position indisponible. Autorisez la localisation et réessayez.'); }
    finally { if (generation === this.generation) this.locating.set(false); }
  }
}
