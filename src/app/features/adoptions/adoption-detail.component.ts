import { ChangeDetectionStrategy, Component, computed, inject, input, OnChanges, OnDestroy, signal } from '@angular/core';
import { DatePipe, registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { IonAvatar, IonItem, IonLabel, IonBackButton, IonButton, IonContent, IonIcon, IonSkeletonText, IonToast, AlertController } from '@ionic/angular';
import { call, chatbubblesOutline, person, pawOutline } from 'ionicons/icons';
import { Messaging } from '../messages/messaging';
import { finalize, Subscription } from 'rxjs';
import { AuthService } from '../../auth/service/auth';
import { Adoptions, AdoptionRequest, AdoptionAction, ADOPTION_LABELS } from './adoptions';
import { BottomNavigationComponent } from '../../shared/bottom-navigation/bottom-navigation.component';

registerLocaleData(localeFr);

@Component({
  selector: 'app-adoption-detail',
  templateUrl: './adoption-detail.component.html',
  styleUrls: ['./adoptions.scss', './adoption-detail.component.scss'],
  imports: [DatePipe, RouterLink, IonAvatar, IonItem, IonLabel, IonBackButton, IonButton, IonContent, IonIcon, IonSkeletonText, IonToast, BottomNavigationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdoptionDetailComponent implements OnChanges, OnDestroy {
  readonly id = input.required<string>();
  private readonly api = inject(Adoptions);
  private readonly chat = inject(Messaging);
  private readonly router = inject(Router);
  private conversationRequest?: Subscription;
  readonly openingChat = signal(false);
  readonly isApplicant = computed(() => this.item()?.applicant === this.chat.userId());
  private readonly auth = inject(AuthService);
  private readonly alerts = inject(AlertController);
  private request?: Subscription;
  private mutation?: Subscription;
  private alert?: HTMLIonAlertElement;
  private active = false;
  readonly item = signal<AdoptionRequest | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly confirming = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly phoneVisible = signal(false);
  readonly labels = ADOPTION_LABELS;
  readonly icons = { pawOutline, call, chatbubblesOutline, person };

  ionViewWillEnter(): void { this.active = true; this.load(); }
  ionViewWillLeave(): void {
    this.active = false;
    this.conversationRequest?.unsubscribe();
    this.request?.unsubscribe(); this.mutation?.unsubscribe();
    void this.alert?.dismiss(); this.item.set(null); this.message.set('');
  }
  ngOnChanges(): void { if (this.active) this.load(); }
  ngOnDestroy(): void { this.ionViewWillLeave(); }

  load(): void {
    this.conversationRequest?.unsubscribe();
    this.phoneVisible.set(false);
    this.request?.unsubscribe();
    this.item.set(null); this.error.set('');
    if (!/^[1-9]\d*$/.test(this.id())) { this.loading.set(false); this.error.set('Demande introuvable.'); return; }
    this.loading.set(true);
    this.request = this.api.detail(this.id()).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: item => this.item.set(item),
      error: (error: unknown) => this.error.set(error instanceof HttpErrorResponse && error.status === 404 ? 'Demande introuvable ou accès non autorisé.' : this.auth.errorMessage(error)),
    });
  }

  async confirm(action: AdoptionAction): Promise<void> {
    const item = this.item();
    if (!item || item.status !== 'pending' || this.saving() || this.confirming()) return;
    if (action === 'cancel' ? !item.can_cancel : !item.can_review) return;
    this.confirming.set(true);
    const title = action === 'approve' ? 'Confirmer l’acceptation' : action === 'reject' ? 'Confirmer le refus' : 'Annuler la demande';
    try {
      this.alert = await this.alerts.create({
        header: title,
        message: action === 'approve' ? 'Confirmer l’acceptation de cette demande d’adoption ? Les autres demandes en attente pour cet animal seront refusées.' : action === 'reject' ? 'Confirmer le refus de cette demande ?' : 'Confirmer l’annulation de votre demande ?',
        buttons: [{ text: 'Retour', role: 'cancel' }, { text: 'Confirmer', role: 'confirm' }],
      });
      if (!this.active || this.item()?.id !== item.id) return;
      await this.alert.present();
      const result = await this.alert.onDidDismiss();
      if (result.role === 'confirm' && this.active && this.item()?.id === item.id) this.decide(item, action);
    } finally { this.confirming.set(false); }
  }

  openChat(): void {
    const item = this.item();
    if (!item || this.openingChat()) return;
    this.openingChat.set(true);
    this.conversationRequest = this.chat.openAdoption(item.id).pipe(finalize(() => this.openingChat.set(false))).subscribe({
      next: conversation => { void this.router.navigate(['/messages', conversation.id]); },
      error: error => this.message.set(this.auth.errorMessage(error)),
    });
  }

  private decide(item: AdoptionRequest, action: AdoptionAction): void {
    if (this.saving() || this.item()?.status !== 'pending') return;
    this.saving.set(true); this.message.set('');
    this.mutation = this.api.decide(item.id, action).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: updated => { this.item.set(updated); this.message.set(`Demande ${this.labels[updated.status].toLocaleLowerCase('fr')}.`); },
      error: (error: unknown) => { this.message.set(this.auth.errorMessage(error)); this.load(); },
    });
  }
}
