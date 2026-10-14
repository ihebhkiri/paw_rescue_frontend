import { ChangeDetectionStrategy, Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonCheckbox, IonContent, IonFooter, IonIcon, IonSearchbar, IonToast } from '@ionic/angular';
import { home, pawOutline, notificationsOutline, clipboardOutline, personOutline, locationOutline, chevronDownOutline, chevronForwardOutline, optionsOutline, paw, heart, heartOutline } from 'ionicons/icons';
import { Animal, Animals, AnimalType } from '../animals';
import { Subscription, finalize } from 'rxjs';
import { AuthService } from '../../../auth/service/auth';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [RouterLink, IonButton, IonCheckbox, IonContent, IonFooter, IonIcon, IonSearchbar, IonToast],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnDestroy {
  readonly animals = inject(Animals);
  private readonly auth = inject(AuthService);
  private request?: Subscription;
  readonly all = signal<readonly Animal[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly query = signal('');
  readonly category = signal<AnimalType | 'Tous'>('Tous');
  readonly filtersOpen = signal(false);
  readonly favoritesOnly = signal(false);
  readonly message = signal('');
  readonly icons = { home, pawOutline, notificationsOutline, clipboardOutline, personOutline, locationOutline, chevronDownOutline, chevronForwardOutline, optionsOutline, paw, heart, heartOutline };
  readonly categories = [
    { value: 'Tous', label: 'Tous', emoji: '' }, { value: 'Chien', label: 'Chiens', emoji: '🐶' },
    { value: 'Chat', label: 'Chats', emoji: '🐱' }, { value: 'Autre', label: 'Autres', emoji: '' },
  ] as const;
  readonly visibleAnimals = computed(() => {
    const query = this.query().trim().toLocaleLowerCase('fr');
    return this.all().filter(animal => (this.category() === 'Tous' || animal.type === this.category())
      && (!this.favoritesOnly() || this.animals.favorites().has(animal.id))
      && `${animal.name} ${animal.species} ${animal.refuge}`.toLocaleLowerCase('fr').includes(query));
  });

  ionViewWillEnter(): void { this.load(); }
  ionViewWillLeave(): void { this.request?.unsubscribe(); this.all.set([]); this.message.set(''); }
  ngOnDestroy(): void { this.ionViewWillLeave(); }

  load(): void {
    this.request?.unsubscribe();
    this.all.set([]);
    this.error.set('');
    this.loading.set(true);
    this.request = this.animals.list().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: items => this.all.set(items),
      error: (error: unknown) => this.error.set(this.auth.errorMessage(error)),
    });
  }

  showAll(): void { this.category.set('Tous'); this.query.set(''); this.favoritesOnly.set(false); }
  unavailable(feature: string): void { this.message.set(`${feature} n’est pas encore disponible.`); }
}
