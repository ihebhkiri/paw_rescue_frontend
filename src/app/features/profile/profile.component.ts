import { ChangeDetectionStrategy, Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IonAvatar, IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonSelect, IonSelectOption, IonTitle, IonToast, IonToolbar } from '@ionic/angular';
import { chevronBackOutline, chevronDownOutline, chevronForwardOutline, clipboardOutline, helpCircleOutline, logOutOutline, pawOutline, pencil, personOutline, settingsOutline } from 'ionicons/icons';
import { AuthService } from '../../auth/service/auth';

import { CurrentUser } from '../../auth/models/current-user.model';

const ROLE_LABELS: Record<CurrentUser['role'], string> = {
  citoyen: 'Citoyen', benevole: 'Bénévole', veterinaire: 'Vétérinaire', refuge: 'Refuge', admin: 'Administrateur',
};

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  imports: [RouterLink, IonAvatar, IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonSelect, IonSelectOption, IonTitle, IonToast, IonToolbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private request?: Subscription;
  private saveRequest?: Subscription;
  readonly user = signal<CurrentUser | null>(null);
  readonly name = computed(() => {
    const user = this.user();
    return user ? `${user.first_name} ${user.last_name}`.trim() || user.username : '';
  });
  readonly role = computed(() => { const user = this.user(); return user ? ROLE_LABELS[user.role] ?? user.role : ''; });
  readonly available = computed(() => this.user()?.profile?.is_available);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly icons = { chevronBackOutline, chevronDownOutline, chevronForwardOutline, logOutOutline, pencil, personOutline, pawOutline };
  readonly menu = [
    { label: 'Mes informations', icon: personOutline },
    { label: 'Mes missions', icon: clipboardOutline },
    { label: 'Paramètres', icon: settingsOutline },
    { label: 'Aide', icon: helpCircleOutline },
  ];

  ionViewWillEnter(): void { this.load(); }
  ionViewWillLeave(): void {
    this.request?.unsubscribe();
    this.saveRequest?.unsubscribe();
    this.user.set(null);
    this.message.set('');
  }
  ngOnDestroy(): void { this.ionViewWillLeave(); }

  load(): void {
    this.request?.unsubscribe();
    this.user.set(null);
    this.error.set('');
    this.loading.set(true);
    this.request = this.auth.currentUser().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: user => this.user.set(user),
      error: (error: unknown) => this.error.set(this.auth.errorMessage(error)),
    });
  }

  saveAvailability(available: boolean): void {
    if (this.saving() || this.user()?.role !== 'benevole' || this.available() === available) return;
    this.saving.set(true);
    this.message.set('');
    this.saveRequest = this.http.patch<CurrentUser>(`${environment.authApiUrl}/me/`, { profile: { is_available: available } })
      .pipe(finalize(() => this.saving.set(false))).subscribe({
        next: user => { this.user.set(user); this.message.set('Disponibilité enregistrée.'); },
        error: (error: unknown) => this.message.set(this.auth.errorMessage(error)),
      });
  }

  unavailable(label: string): void { this.message.set(`${label} : cette fonctionnalité n’est pas encore disponible.`); }

  logout(): void {
    this.ionViewWillLeave();
    this.auth.logout();
    void this.router.navigateByUrl('/auth', { replaceUrl: true });
  }
}
