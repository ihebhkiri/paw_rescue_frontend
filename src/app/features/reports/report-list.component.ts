import { clipboardOutline, personOutline, checkmarkOutline, searchOutline, locationOutline, calendarOutline, chevronForwardOutline, pawOutline } from 'ionicons/icons';
import { BottomNavigationComponent } from '../../shared/bottom-navigation/bottom-navigation.component';
import { ChangeDetectionStrategy, Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon } from '@ionic/angular';
import { finalize, forkJoin, Subscription } from 'rxjs';
import { AuthService } from '../../auth/service/auth';
import { CurrentUser } from '../../auth/models/current-user.model';
import { currentPosition, ReportDetail, Reports, statusLabel } from './reports';
import { RescuePush } from './rescue-push';

@Component({
  selector: 'app-report-list', templateUrl: './report-list.component.html', styleUrl: './report-list.component.scss',
  imports: [BottomNavigationComponent, RouterLink, IonButton, IonContent, IonIcon], changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportListComponent implements OnDestroy {
  private readonly api = inject(Reports);
  private readonly auth = inject(AuthService);
  readonly push = inject(RescuePush);
  private requests = new Subscription();
  private generation = 0;
  readonly items = signal<ReportDetail[]>([]);
  readonly user = signal<CurrentUser | null>(null);
  readonly loading = signal(false);
  readonly locating = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly statusLabel = statusLabel;
  readonly selected = signal<'available' | 'mine' | 'completed'>('available');
  readonly query = signal('');
  readonly icons = { clipboardOutline, personOutline, checkmarkOutline, searchOutline, locationOutline, calendarOutline, chevronForwardOutline, pawOutline };
  readonly segments = [{ id: 'available', label: 'Disponibles', icon: clipboardOutline }, { id: 'mine', label: 'Mes missions', icon: personOutline }, { id: 'completed', label: 'Terminées', icon: checkmarkOutline }] as const;
  readonly cards = computed(() => this.items().map(item => ({
    ...item,
    title: item.mission?.type === 'transport' ? 'Transport vers un refuge' : item.mission?.type === 'medical_emergency' ? item.species_name + ' à soigner' : item.species_name + (item.type === 'injured' ? ' blessé à récupérer' : ' errant à mettre en sécurité'),
    badge: item.severity === 'critical' ? 'Urgent' : item.severity === 'moderate' ? 'Prioritaire' : item.severity === 'mild' ? 'Normal' : item.mission?.status === 'open' ? 'Nouveau' : statusLabel(item.mission?.status ?? item.status),
    tone: item.severity === 'critical' ? 'urgent' : item.severity === 'moderate' ? 'priority' : item.severity === 'mild' ? 'normal' : 'new',
    date: this.dateLabel(item.mission?.status === 'completed' ? item.mission.completed_at : item.mission?.created_at ?? item.created_at),
    distance: item.distance_km === null ? '' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(item.distance_km) + ' km',
  })));
  readonly visible = computed(() => {
    const query = this.query().trim().toLocaleLowerCase('fr');
    return this.cards().filter(item => {
      const mission = item.mission;
      const matches = this.selected() === 'available' ? mission?.can_accept === true
        : mission?.assigned_to_me && (this.selected() === 'completed' ? mission.status === 'completed' : ['accepted', 'en_route', 'on_site'].includes(mission.status));
      return matches && (!query || [item.title, item.address_text, item.description, item.species_name].some(text => text.toLocaleLowerCase('fr').includes(query)));
    });
  });
  readonly personal = computed(() => this.items().filter(item => this.user()?.role !== 'benevole' || item.reporter === this.user()?.id));
  private dateLabel(value?: string | null): string {
    if (!value) return 'Date non renseignée';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date non renseignée';
    return date.toDateString() === new Date().toDateString() ? 'Aujourd’hui' : new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }
  ionViewWillEnter(): void { this.load(); }
  ionViewWillLeave(): void { this.generation++; this.requests.unsubscribe(); this.requests = new Subscription(); this.locating.set(false); this.user.set(null); this.items.set([]); }
  ngOnDestroy(): void { this.ionViewWillLeave(); }
  load(): void {
    if (this.loading()) return;
    this.loading.set(true); this.error.set(''); this.items.set([]);
    this.requests.add(forkJoin({ user: this.auth.currentUser(), reports: this.api.list() }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: ({ user, reports }) => { this.user.set(user); this.items.set(reports); },
      error: (error: unknown) => this.error.set(this.auth.errorMessage(error)),
    }));
  }
  async locate(): Promise<void> {
    if (this.locating()) return;
    const generation = this.generation;
    this.locating.set(true); this.error.set(''); this.message.set('');
    try {
      const position = await currentPosition();
      if (generation !== this.generation) return;
      this.requests.add(this.api.updatePosition(position).pipe(finalize(() => this.locating.set(false))).subscribe({
        next: () => { this.message.set('Position enregistrée. Les propositions proches sont actualisées.'); this.load(); },
        error: (error: unknown) => this.error.set(this.auth.errorMessage(error)),
      }));
    } catch { if (generation === this.generation) { this.error.set('Position indisponible. Autorisez la localisation, puis réessayez.'); this.locating.set(false); } }
  }
}
