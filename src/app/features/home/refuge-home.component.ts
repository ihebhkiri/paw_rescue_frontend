import { ChangeDetectionStrategy, Component, computed, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { addOutline, chevronForwardOutline, chevronDownOutline, location, notificationsOutline, heart, heartOutline, timeOutline, paw, pawOutline, warningOutline, clipboardOutline } from 'ionicons/icons';
import { AuthService } from '../../auth/service/auth';
import { CurrentUser } from '../../auth/models/current-user.model';
import { Animals, ManagedAnimal, animalAge } from '../animals/animals';
import { Reports, ReportDetail, statusLabel } from '../reports/reports';
import { Adoptions, AdoptionRequest, ADOPTION_LABELS } from '../adoptions/adoptions';
import { NotificationResponse } from '../notifications/notifications.component';
import { BottomNavigationComponent } from '../../shared/bottom-navigation/bottom-navigation.component';
import { environment } from '../../../environments/environment';

type Section = 'reports' | 'animals' | 'adoptions' | 'notifications';
@Component({
  selector: 'app-refuge-home', templateUrl: './refuge-home.component.html', styleUrl: './refuge-home.component.scss',
  imports: [RouterLink, IonContent, IonIcon, BottomNavigationComponent], changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RefugeHomeComponent implements OnInit, OnDestroy {
  readonly user = input.required<CurrentUser>();
  readonly animals = inject(Animals);
  private readonly reports = inject(Reports);
  private readonly adoptions = inject(Adoptions);
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private requests = new Subscription();
  readonly reportsData = signal<ReportDetail[] | null>(null);
  readonly animalsData = signal<ManagedAnimal[] | null>(null);
  readonly adoptionsData = signal<AdoptionRequest[] | null>(null);
  readonly unread = signal(false);
  readonly errors = signal<Record<Section, string>>({ reports: '', animals: '', adoptions: '', notifications: '' });
  readonly icons = { addOutline, chevronForwardOutline, chevronDownOutline, location, notificationsOutline, heart, heartOutline, timeOutline, paw, pawOutline, warningOutline, clipboardOutline };
  readonly animalAge = animalAge;
  readonly adoptionLabels = ADOPTION_LABELS;
  readonly statusLabel = statusLabel;
  readonly housed = computed(() => this.animalsData()?.filter(animal => ['in_shelter', 'reserved'].includes(animal.status)) ?? []);
  readonly pendingAdoptions = computed(() => this.adoptionsData()?.filter(item => item.status === 'pending') ?? []);
  readonly stats = computed(() => {
    const now = new Date();
    const monthly = this.adoptionsData()?.filter(item => {
      const date = new Date(item.reviewed_at ?? '');
      return item.status === 'approved' && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }).length;
    return [
      { label: 'Signalements en attente', count: this.reportsData()?.filter(item => item.status === 'pending').length, icon: warningOutline, tone: 'pink' },
      { label: 'Animaux hébergés', count: this.animalsData() === null ? undefined : this.housed().length, icon: paw, tone: 'blue' },
      { label: "Demandes d’adoption", count: this.adoptionsData() === null ? undefined : this.pendingAdoptions().length, icon: heart, tone: 'yellow' },
      { label: 'Adoptions ce mois', count: monthly, icon: paw, tone: 'green' },
    ];
  });
  readonly priority = computed(() => {
    const rank = (severity: string) => severity === 'critical' ? 0 : severity === 'moderate' ? 1 : 2;
    return (this.reportsData() ?? []).filter(item => !['rescued', 'cancelled'].includes(item.status))
      .sort((a, b) => rank(a.severity) - rank(b.severity) || (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .slice(0, 3).map(item => ({ ...item, time: this.relativeTime(item.created_at) }));
  });
  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.requests.unsubscribe(); }
  load(): void {
    this.requests.unsubscribe(); this.requests = new Subscription();
    this.reportsData.set(null); this.animalsData.set(null); this.adoptionsData.set(null); this.unread.set(false);
    this.errors.set({ reports: '', animals: '', adoptions: '', notifications: '' });
    this.requests.add(this.reports.list().subscribe({ next: items => this.reportsData.set(items), error: (e: unknown) => this.fail('reports', e) }));
    this.requests.add(this.animals.mine().subscribe({ next: items => this.animalsData.set(items), error: (e: unknown) => this.fail('animals', e) }));
    this.requests.add(this.adoptions.list().subscribe({ next: items => this.adoptionsData.set(items), error: (e: unknown) => this.fail('adoptions', e) }));
    this.requests.add(this.http.get<NotificationResponse[]>(`${environment.apiUrl}/notifications/`).subscribe({ next: items => this.unread.set(items.some(item => !item.is_read)), error: (e: unknown) => this.fail('notifications', e) }));
  }
  private fail(section: Section, error: unknown): void { this.errors.update(current => ({ ...current, [section]: this.auth.errorMessage(error) })); }
  private relativeTime(value?: string): string {
    const date = Date.parse(value ?? '');
    if (!Number.isFinite(date)) return 'Date non renseignée';
    const minutes = Math.max(0, Math.floor((Date.now() - date) / 60000));
    return minutes < 1 ? 'À l’instant' : minutes < 60 ? `Il y a ${minutes} min` : minutes < 1440 ? `Il y a ${Math.floor(minutes / 60)} h` : new Intl.DateTimeFormat('fr-FR').format(date);
  }
}
