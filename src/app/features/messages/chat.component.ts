import { ChangeDetectionStrategy, Component, inject, input, OnChanges, OnDestroy, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonAvatar, IonBackButton, IonButton, IonContent, IonFooter, IonIcon, IonSpinner, IonTextarea } from '@ionic/angular';
import { personCircleOutline, sendOutline } from 'ionicons/icons';
import { finalize, Subscription } from 'rxjs';
import { AuthService } from '../../auth/service/auth';
import { ADOPTION_LABELS } from '../adoptions/adoptions';
import { Conversation, Messaging } from './messaging';

@Component({
  selector: 'app-chat', templateUrl: './chat.component.html', styleUrl: './messages.scss',
  imports: [DatePipe, RouterLink, FormsModule, IonAvatar, IonBackButton, IonButton, IonContent, IonFooter, IonIcon, IonSpinner, IonTextarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent implements OnChanges, OnDestroy {
  readonly id = input.required<string>();
  readonly chat = inject(Messaging);
  private readonly auth = inject(AuthService);
  private readonly content = viewChild(IonContent);
  private request?: Subscription;
  private mutation?: Subscription;
  private events?: Subscription;
  private active = false;
  private frame?: number;
  readonly item = signal<Conversation | null>(null);
  readonly draft = signal('');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly labels = ADOPTION_LABELS;
  readonly icons = { personCircleOutline, sendOutline };

  ionViewWillEnter(): void {
    this.active = true; this.load();
    this.events?.unsubscribe();
    this.events = this.chat.events.subscribe(id => { if (id === null || id === Number(this.id())) this.load(); });
  }
  ionViewWillLeave(): void {
    this.active = false; this.events?.unsubscribe(); this.request?.unsubscribe(); this.mutation?.unsubscribe();
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.item.set(null); this.draft.set(''); this.error.set('');
  }
  ngOnDestroy(): void { this.ionViewWillLeave(); }
  ngOnChanges(): void { if (this.active) { this.item.set(null); this.draft.set(''); this.load(); } }

  load(): void {
    this.request?.unsubscribe();
    if (!/^[1-9]\d*$/.test(this.id())) { this.error.set('Conversation introuvable.'); return; }
    this.loading.set(!this.item());
    this.request = this.chat.detail(this.id()).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: item => {
        const last = this.item()?.messages.at(-1)?.id;
        this.item.set(item); this.chat.read(item); this.error.set('');
        if (last !== item.messages.at(-1)?.id) {
          if (this.frame !== undefined) cancelAnimationFrame(this.frame);
          this.frame = requestAnimationFrame(() => { if (this.active) void this.content()?.scrollToBottom(150); });
        }
      },
      error: error => this.error.set(this.auth.errorMessage(error)),
    });
  }

  send(): void {
    const item = this.item(); const body = this.draft().trim();
    if (!item || item.status !== 'accepted' || !body || this.saving()) return;
    this.saving.set(true); this.error.set('');
    this.mutation = this.chat.send(item.id, body).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => { this.draft.set(''); this.load(); this.chat.refresh(); },
      error: error => this.error.set(this.auth.errorMessage(error)),
    });
  }

  decide(action: 'accept' | 'block'): void {
    const item = this.item();
    if (!item || this.saving()) return;
    this.saving.set(true); this.error.set('');
    this.mutation = this.chat.decide(item.id, action).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => { this.load(); this.chat.refresh(); },
      error: error => this.error.set(this.auth.errorMessage(error)),
    });
  }
}
