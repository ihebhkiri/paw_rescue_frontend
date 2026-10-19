import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonFooter, IonIcon, IonTabBar, IonTabButton, IonLabel, IonBadge } from '@ionic/angular';
import { chatbubblesOutline } from 'ionicons/icons';
import { Messaging } from '../../features/messages/messaging';
import { homeOutline, pawOutline, notificationsOutline, clipboardOutline, personOutline } from 'ionicons/icons';

@Component({
  selector: 'app-bottom-navigation',
  templateUrl: './bottom-navigation.component.html',
  styleUrl: './bottom-navigation.component.scss',
  imports: [RouterLink, IonFooter, IonIcon, IonTabBar, IonTabButton, IonLabel, IonBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavigationComponent {
  readonly active = input<'missions' | 'home' | 'animals' | 'adoptions' | 'messages' | 'notifications' | 'profile'>('profile');
  readonly chat = inject(Messaging);
  readonly icons = { chatbubblesOutline, homeOutline, pawOutline, notificationsOutline, clipboardOutline, personOutline };
}
