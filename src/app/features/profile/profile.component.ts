import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonAvatar, IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonSelect, IonSelectOption, IonTitle, IonToast, IonToolbar } from '@ionic/angular';
import { chevronBackOutline, chevronDownOutline, chevronForwardOutline, clipboardOutline, helpCircleOutline, logOutOutline, pawOutline, pencil, personOutline, settingsOutline } from 'ionicons/icons';
import { AuthService } from '../../auth/service/auth';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  imports: [IonAvatar, IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonSelect, IonSelectOption, IonTitle, IonToast, IonToolbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  // Demo identity until the existing authentication contract exposes a current user.
  readonly name = 'Amira Ben Ali';
  readonly role = 'Bénévole';
  readonly available = signal(true);
  readonly message = signal('');
  readonly icons = { chevronBackOutline, chevronDownOutline, chevronForwardOutline, logOutOutline, pencil };
  readonly menu = [
    { label: 'Mes informations', icon: personOutline },
    { label: 'Mes missions', icon: clipboardOutline },
    { label: 'Mes demandes d’adoption', icon: pawOutline },
    { label: 'Paramètres', icon: settingsOutline },
    { label: 'Aide', icon: helpCircleOutline },
  ];

  unavailable(label: string): void { this.message.set(`${label} : cette fonctionnalité n’est pas encore disponible.`); }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/auth', { replaceUrl: true });
  }
}
