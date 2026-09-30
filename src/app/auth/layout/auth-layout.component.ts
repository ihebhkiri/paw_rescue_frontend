import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { chevronDownOutline, globeOutline, heart, home, megaphone, paw } from 'ionicons/icons';

let nextLayoutId = 0;

@Component({
  selector: 'app-auth-layout',
  imports: [IonIcon],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.--hero-clip]': 'clipPath' },
})
export class AuthLayoutComponent {
  readonly variant = input<'login' | 'register'>('login');
  // Ionic keeps routed pages mounted, so each SVG clip needs its own id.
  readonly curveId = `auth-curve-${nextLayoutId++}`;
  readonly clipPath = `url(#${this.curveId})`;
  readonly icons = { chevronDownOutline, globeOutline, heart, home, megaphone, paw };
}
