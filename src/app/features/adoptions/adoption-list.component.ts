import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButton, IonContent, IonIcon, IonSkeletonText } from '@ionic/angular';
import { pawOutline, chevronForwardOutline } from 'ionicons/icons';
import { finalize, forkJoin, Subscription } from 'rxjs';
import { AuthService } from '../../auth/service/auth';
import { CurrentUser } from '../../auth/models/current-user.model';
import { Adoptions, AdoptionRequest, AdoptionStatus, ADOPTION_LABELS } from './adoptions';
import { BottomNavigationComponent } from '../../shared/bottom-navigation/bottom-navigation.component';

@Component({
  selector: 'app-adoption-list',
  templateUrl: './adoption-list.component.html',
  styleUrl: './adoptions.scss',
  imports: [DatePipe, RouterLink, IonBackButton, IonButton, IonContent, IonIcon, IonSkeletonText, BottomNavigationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdoptionListComponent implements OnDestroy {
  private readonly api = inject(Adoptions);
  private readonly auth = inject(AuthService);
  private request?: Subscription;
  readonly user = signal<CurrentUser | null>(null);
  readonly items = signal<readonly AdoptionRequest[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly selected = signal<AdoptionStatus>('pending');
  readonly labels = ADOPTION_LABELS;
  readonly icons = { pawOutline, chevronForwardOutline };
  readonly received = computed(() => ['refuge', 'admin'].includes(this.user()?.role ?? ''));
  readonly allowed = computed(() => ['benevole', 'citoyen', 'refuge', 'admin'].includes(this.user()?.role ?? ''));
  readonly filters = [
    { value: 'pending', label: 'En attente' }, { value: 'approved', label: 'Acceptées' },
    { value: 'rejected', label: 'Refusées' }, { value: 'cancelled', label: 'Annulées' },
  ] as const;
  readonly visible = computed(() => this.items().filter(item => item.status === this.selected()));

  ionViewWillEnter(): void { this.load(); }
  ionViewWillLeave(): void { this.request?.unsubscribe(); this.items.set([]); this.user.set(null); }
  ngOnDestroy(): void { this.ionViewWillLeave(); }
  load(): void {
    this.request?.unsubscribe();
    this.items.set([]);
    this.user.set(null);
    this.error.set('');
    this.loading.set(true);
    this.request = forkJoin({ user: this.auth.currentUser(), items: this.api.list() }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: ({ user, items }) => { this.user.set(user); this.items.set(items); },
      error: (error: unknown) => this.error.set(this.auth.errorMessage(error)),
    });
  }
}
