import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonAvatar, IonBadge, IonButton, IonContent, IonIcon, IonItem, IonLabel, IonList, IonSearchbar, IonSpinner } from '@ionic/angular';
import { personCircleOutline } from 'ionicons/icons';
import { BottomNavigationComponent } from '../../shared/bottom-navigation/bottom-navigation.component';
import { ADOPTION_LABELS } from '../adoptions/adoptions';
import { Messaging } from './messaging';

@Component({
  selector: 'app-message-list', templateUrl: './message-list.component.html', styleUrl: './messages.scss',
  imports: [DatePipe, RouterLink, IonAvatar, IonBadge, IonButton, IonContent, IonIcon, IonItem, IonLabel, IonList, IonSearchbar, IonSpinner, BottomNavigationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageListComponent {
  readonly chat = inject(Messaging);
  readonly query = signal('');
  readonly icon = personCircleOutline;
  readonly labels = ADOPTION_LABELS;
  readonly visible = computed(() => {
    const query = this.query().trim().toLocaleLowerCase('fr');
    return this.chat.items().filter(item => `${this.chat.name(item)} ${item.adoption?.animal_name || ''}`.toLocaleLowerCase('fr').includes(query));
  });
  ionViewWillEnter(): void { this.chat.refresh(); }
}
