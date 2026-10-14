import { ChangeDetectionStrategy, Component, computed, inject, input, OnChanges, OnDestroy, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonModal, IonSkeletonText, IonTextarea, IonTitle, IonToolbar } from '@ionic/angular';
import { finalize, forkJoin, Subscription } from 'rxjs';
import { AuthService } from '../../auth/service/auth';
import { CurrentUser } from '../../auth/models/current-user.model';
import { Animal } from '../animals/animals';
import { Adoptions, AdoptionRequest } from './adoptions';

@Component({
  selector: 'app-adoption-request',
  templateUrl: './adoption-request.component.html',
  styleUrl: './adoption-request.component.scss',
  imports: [ReactiveFormsModule, RouterLink, IonButton, IonContent, IonHeader, IonModal, IonSkeletonText, IonTextarea, IonTitle, IonToolbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdoptionRequestComponent implements OnChanges, OnDestroy {
  readonly animal = input.required<Animal>();
  private readonly api = inject(Adoptions);
  private readonly auth = inject(AuthService);
  private request?: Subscription;
  private mutation?: Subscription;
  readonly user = signal<CurrentUser | null>(null);
  readonly requests = signal<readonly AdoptionRequest[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly submitError = signal('');
  readonly sending = signal(false);
  readonly modalOpen = signal(false);
  readonly sent = signal(false);
  readonly message = new FormControl('', { nonNullable: true });
  readonly requester = computed(() => ['benevole', 'citoyen'].includes(this.user()?.role ?? ''));
  readonly pending = computed(() => this.requests().find(item => item.applicant === this.user()?.id && item.status === 'pending'));

  ngOnChanges(): void { this.sent.set(false); this.modalOpen.set(false); this.message.reset(); this.mutation?.unsubscribe(); this.load(); }
  ngOnDestroy(): void { this.request?.unsubscribe(); this.mutation?.unsubscribe(); this.modalOpen.set(false); }

  load(): void {
    this.request?.unsubscribe();
    this.user.set(null); this.requests.set([]); this.error.set(''); this.loading.set(true);
    this.request = forkJoin({ user: this.auth.currentUser(), items: this.api.list(this.animal().id) })
      .pipe(finalize(() => this.loading.set(false))).subscribe({
        next: ({ user, items }) => { this.user.set(user); this.requests.set(items); },
        error: (error: unknown) => this.error.set(this.auth.errorMessage(error)),
      });
  }

  open(): void {
    if (!this.loading() && !this.error() && this.requester() && !this.pending() && this.animal().adoptable) {
      this.submitError.set(''); this.modalOpen.set(true);
    }
  }

  submit(): void {
    if (!this.modalOpen() || this.sending() || !this.requester() || this.pending() || !this.animal().adoptable) return;
    this.sending.set(true); this.submitError.set('');
    this.mutation = this.api.create(this.animal().id, this.message.value.trim()).pipe(finalize(() => this.sending.set(false))).subscribe({
      next: created => {
        this.requests.update(items => [...items, created]);
        this.sending.set(false); this.modalOpen.set(false); this.sent.set(true); this.message.reset();
      },
      error: (error: unknown) => {
        this.submitError.set(this.auth.errorMessage(error));
        // Reconcile an existing request after a duplicate or an uncertain network response.
        this.request?.unsubscribe();
        this.request = this.api.list(this.animal().id).subscribe({
          next: items => { this.requests.set(items); if (this.pending()) this.modalOpen.set(false); },
          error: () => { /* Keep the original actionable error and the message for retry. */ },
        });
      },
    });
  }
}
