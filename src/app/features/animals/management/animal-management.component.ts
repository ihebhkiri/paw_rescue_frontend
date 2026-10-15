import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBadge, IonButton, IonCheckbox, IonContent, IonIcon, IonSearchbar, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonSkeletonText, IonToast } from '@ionic/angular';
import { addOutline, heart, heartOutline, ellipsisHorizontal, notificationsOutline, optionsOutline, pawOutline } from 'ionicons/icons';
import { finalize, Subscription, switchMap } from 'rxjs';
import { AuthService } from '../../../auth/service/auth';
import { Animals, ManagedAnimal, animalAge } from '../animals';
import { BottomNavigationComponent } from '../../../shared/bottom-navigation/bottom-navigation.component';

@Component({
  selector: 'app-animal-management', templateUrl: './animal-management.component.html', styleUrl: './animal-management.component.scss',
  imports: [RouterLink, IonBadge, IonButton, IonCheckbox, IonContent, IonIcon, IonSearchbar, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonSkeletonText, IonToast, BottomNavigationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimalManagementComponent implements OnDestroy {
  readonly animals = inject(Animals);
  private readonly auth = inject(AuthService);
  private request?: Subscription;
  private mutation?: Subscription;
  readonly shelter = signal(false);
  readonly items = signal<ManagedAnimal[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly message = signal('');
  readonly segment = signal<'mine' | 'adoptable'>('mine');
  readonly query = signal('');
  readonly filtersOpen = signal(false);
  readonly species = signal('');
  readonly favoritesOnly = signal(false);
  readonly menu = signal<number | null>(null);
  readonly saving = signal<number | null>(null);
  readonly icons = { addOutline, heart, heartOutline, ellipsisHorizontal, notificationsOutline, optionsOutline, pawOutline };
  readonly age = animalAge;
  readonly speciesNames = computed(() => [...new Set(this.items().map(a => a.species_name))]);
  readonly visible = computed(() => this.items().filter(a =>
    (this.segment() === 'mine' || a.is_adoptable && a.status === 'in_shelter') &&
    a.name.toLocaleLowerCase('fr').includes(this.query().trim().toLocaleLowerCase('fr')) &&
    (!this.species() || a.species_name === this.species()) &&
    (!this.favoritesOnly() || this.animals.favorites().has(a.id))));

  ionViewWillEnter(): void { this.load(); }
  ionViewWillLeave(): void { this.request?.unsubscribe(); this.mutation?.unsubscribe(); this.items.set([]); this.menu.set(null); this.shelter.set(false); }
  ngOnDestroy(): void { this.ionViewWillLeave(); }
  load(): void {
    this.request?.unsubscribe(); this.loading.set(true); this.error.set('');
    this.request = this.auth.currentUser().pipe(switchMap(user => {
      this.shelter.set(user.role === 'refuge');
      if (!this.shelter()) this.segment.set('adoptable');
      return this.shelter() ? this.animals.mine() : this.animals.catalogue();
    }), finalize(() => this.loading.set(false))).subscribe({ next: items => this.items.set(items), error: (error: unknown) => this.error.set(this.auth.errorMessage(error)) });
  }
  changeAvailability(animal: ManagedAnimal): void {
    if (!this.shelter() || this.saving() !== null) return;
    this.saving.set(animal.id); this.menu.set(null);
    this.mutation = this.animals.availability(animal).pipe(finalize(() => this.saving.set(null))).subscribe({
      next: updated => { this.items.update(items => items.map(a => a.id === updated.id ? updated : a)); this.message.set('Disponibilité mise à jour.'); },
      error: (error: unknown) => this.message.set(this.auth.errorMessage(error)),
    });
  }
}
