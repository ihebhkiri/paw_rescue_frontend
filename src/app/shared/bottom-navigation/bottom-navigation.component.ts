import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonFooter, IonIcon, IonToast } from '@ionic/angular';
import { homeOutline, pawOutline, notificationsOutline, clipboardOutline, personOutline } from 'ionicons/icons';

@Component({
  selector: 'app-bottom-navigation',
  templateUrl: './bottom-navigation.component.html',
  styleUrl: './bottom-navigation.component.scss',
  imports: [RouterLink, IonFooter, IonIcon, IonToast],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavigationComponent {
  readonly active = input<'notifications' | 'profile'>('profile');
  readonly message = signal('');
  readonly icons = { homeOutline, pawOutline, notificationsOutline, clipboardOutline, personOutline };
}
