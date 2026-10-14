import { ChangeDetectionStrategy, Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { IonBackButton, IonButton, IonContent, IonIcon, IonToast } from '@ionic/angular';
import { chevronBackOutline, clipboardOutline, homeOutline, mapOutline, medicalOutline, notifications, paw, pawOutline, personOutline, shieldCheckmarkOutline, chatbubbleOutline } from 'ionicons/icons';
import { finalize, Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/service/auth';
import { BottomNavigationComponent } from '../../shared/bottom-navigation/bottom-navigation.component';

type NotificationCategory = 'REPORT' | 'MISSION' | 'ADOPTION' | 'MESSAGE' | 'SYSTEM';
export interface NotificationResponse {
  id: number;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  data?: { adoption_id?: unknown };
}
interface NotificationItem extends NotificationResponse {
  category: NotificationCategory;
  timestamp: string;
  icon: string;
  tone: 'report' | 'mission' | 'adoption' | 'system';
}

function notificationFromResponse(item: NotificationResponse): NotificationItem {
  const date = new Date(item.created_at);
  let category: NotificationCategory = 'SYSTEM';
  let icon = shieldCheckmarkOutline;
  let tone: NotificationItem['tone'] = 'system';
  if (['new_report', 'new_emergency'].includes(item.type)) { category = 'REPORT'; icon = medicalOutline; tone = 'report'; }
  else if (item.type === 'mission_assigned') { category = 'MISSION'; icon = clipboardOutline; tone = 'mission'; }
  else if (item.type === 'adoption_update') { category = 'ADOPTION'; icon = paw; tone = 'adoption'; }
  else if (['new_message', 'request_accepted', 'conversation_blocked'].includes(item.type)) { category = 'MESSAGE'; icon = chatbubbleOutline; }
  return { ...item, category, icon, tone, timestamp: Number.isNaN(date.getTime()) ? 'Date non disponible' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date) };
}

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
  imports: [BottomNavigationComponent, RouterLink, IonBackButton, IonButton, IonContent, IonIcon, IonToast],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsComponent implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private request?: Subscription;
  private readRequest?: Subscription;
  readonly selectedFilter = signal<NotificationCategory | 'ALL'>('ALL');
  readonly items = signal<readonly NotificationItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly readingId = signal<number | null>(null);
  readonly message = signal('');
  readonly icons = { chevronBackOutline, clipboardOutline, homeOutline, mapOutline, notifications, pawOutline, personOutline };
  readonly filters = [
    { value: 'ALL', label: 'Toutes' }, { value: 'REPORT', label: 'Signalements' },
    { value: 'MISSION', label: 'Missions' }, { value: 'ADOPTION', label: 'Adoptions' },
    { value: 'MESSAGE', label: 'Messages' }, { value: 'SYSTEM', label: 'Système' },
  ] as const;
  readonly visibleItems = computed(() => this.items().filter(item => this.selectedFilter() === 'ALL' || item.category === this.selectedFilter()));

  ionViewWillEnter(): void { this.load(); }
  ionViewWillLeave(): void {
    this.request?.unsubscribe();
    this.readRequest?.unsubscribe();
    this.items.set([]);
    this.message.set('');
  }
  ngOnDestroy(): void { this.ionViewWillLeave(); }

  load(): void {
    this.request?.unsubscribe();
    this.readRequest?.unsubscribe();
    this.items.set([]);
    this.error.set('');
    this.loading.set(true);
    this.request = this.http.get<NotificationResponse[]>(`${environment.apiUrl}/notifications/`)
      .pipe(finalize(() => this.loading.set(false))).subscribe({
        next: items => this.items.set(items.map(notificationFromResponse)),
        error: (error: unknown) => this.error.set(this.auth.errorMessage(error)),
      });
  }

  markRead(item: NotificationItem): void {
    if (this.readingId() !== null) return;
    this.message.set('');
    if (item.is_read) { if (!this.openAdoption(item)) this.unavailable('Le détail de cette notification'); return; }
    this.readingId.set(item.id);
    this.readRequest = this.http.post<NotificationResponse>(`${environment.apiUrl}/notifications/${item.id}/read/`, {})
      .pipe(finalize(() => this.readingId.set(null))).subscribe({
        next: updated => {
          this.items.update(items => items.map(current => current.id === updated.id ? notificationFromResponse(updated) : current));
          if (!this.openAdoption(updated)) this.message.set('Notification marquée comme lue. Son écran de détail n’est pas encore disponible.');
        },
        error: (error: unknown) => this.message.set(this.auth.errorMessage(error)),
      });
  }

  private openAdoption(item: NotificationResponse): boolean {
    const id = item.data?.adoption_id;
    if (item.type !== 'adoption_update' || typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) return false;
    void this.router.navigate(['/adoptions', id]);
    return true;
  }

  unavailable(feature: string): void { this.message.set(`${feature} n’est pas encore disponible.`); }
}
