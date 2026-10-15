import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonFooter, IonIcon } from '@ionic/angular';
import { homeOutline, pawOutline, notificationsOutline, clipboardOutline, personOutline } from 'ionicons/icons';

@Component({
  selector: 'app-bottom-navigation',
  templateUrl: './bottom-navigation.component.html',
  styleUrl: './bottom-navigation.component.scss',
  imports: [RouterLink, IonFooter, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavigationComponent {
  readonly active = input<'home' | 'animals' | 'adoptions' | 'notifications' | 'profile'>('profile');
  readonly icons = { homeOutline, pawOutline, notificationsOutline, clipboardOutline, personOutline };
}
