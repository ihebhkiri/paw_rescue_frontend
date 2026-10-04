import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonAvatar, IonBadge, IonButton, IonCheckbox, IonContent, IonFooter, IonIcon, IonSearchbar, IonToast } from '@ionic/angular';
import { home, pawOutline, notificationsOutline, clipboardOutline, personOutline, locationOutline, chevronDownOutline, chevronForwardOutline, optionsOutline, paw, heart, heartOutline } from 'ionicons/icons';
import { Animals, AnimalType } from '../animals';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [RouterLink, IonAvatar, IonBadge, IonButton, IonCheckbox, IonContent, IonFooter, IonIcon, IonSearchbar, IonToast],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  readonly animals = inject(Animals);
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
    return this.animals.all.filter(animal => (this.category() === 'Tous' || animal.type === this.category())
      && (!this.favoritesOnly() || this.animals.favorites().has(animal.id))
      && `${animal.name} ${animal.type} ${animal.location}`.toLocaleLowerCase('fr').includes(query));
  });

  showAll(): void { this.category.set('Tous'); this.query.set(''); this.favoritesOnly.set(false); }
  unavailable(feature: string): void { this.message.set(`${feature} n’est pas encore disponible.`); }
}
