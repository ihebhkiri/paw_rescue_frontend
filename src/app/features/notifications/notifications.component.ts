import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonContent, IonFooter, IonIcon, IonToast } from '@ionic/angular';
import { chevronBackOutline, clipboardOutline, homeOutline, mapOutline, medicalOutline, notifications, paw, pawOutline, personOutline, shieldCheckmarkOutline } from 'ionicons/icons';

type NotificationCategory = 'REPORT' | 'MISSION' | 'SYSTEM';

interface NotificationItem {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  timestamp: string;
  icon: string;
  tone: 'report' | 'mission' | 'adoption' | 'system';
  targetId?: string;
}

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
  imports: [RouterLink, IonBackButton, IonContent, IonFooter, IonIcon, IonToast],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsComponent {
  readonly selectedFilter = signal<NotificationCategory | 'ALL'>('ALL');
  readonly message = signal('');
  readonly icons = { chevronBackOutline, clipboardOutline, homeOutline, mapOutline, notifications, pawOutline, personOutline };
  readonly filters = [
    { value: 'ALL', label: 'Toutes' }, { value: 'REPORT', label: 'Signalements' },
    { value: 'MISSION', label: 'Missions' }, { value: 'SYSTEM', label: 'Système' },
  ] as const;
  // Local preview data, matching the existing animal screens; no server read state is implied.
  readonly items: readonly NotificationItem[] = [
    { id: 'report-1', category: 'REPORT', title: 'Nouveau signalement', message: 'Animal blessé à 1,2 km', timestamp: 'Il y a 10 min', icon: medicalOutline, tone: 'report', targetId: 'chat-blesse' },
    { id: 'mission-1', category: 'MISSION', title: 'Mission disponible', message: 'Besoin d’un bénévole', timestamp: 'Il y a 30 min', icon: clipboardOutline, tone: 'mission' },
    { id: 'adoption-1', category: 'SYSTEM', title: 'Demande d’adoption', message: 'Votre demande a été acceptée', timestamp: 'Il y a 2 h', icon: paw, tone: 'adoption' },
    { id: 'system-1', category: 'SYSTEM', title: 'Compte validé', message: 'Votre compte vétérinaire est maintenant vérifié', timestamp: 'Il y a 1 jour', icon: shieldCheckmarkOutline, tone: 'system' },
  ];
  readonly visibleItems = computed(() => this.items.filter(item => this.selectedFilter() === 'ALL' || item.category === this.selectedFilter()));

  unavailable(feature: string): void {
    this.message.set(`${feature} n’est pas encore disponible.`);
  }
}
