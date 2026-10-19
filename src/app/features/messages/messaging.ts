import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { AuthService } from '../../auth/service/auth';
import { environment } from '../../../environments/environment';
import { AdoptionStatus } from '../adoptions/adoptions';

export interface ChatMessage { id: number; sender: number; body: string; is_read: boolean; created_at: string; }
export interface Conversation {
  id: number; status: 'pending' | 'accepted' | 'blocked';
  refuge: number | null; refuge_name: string | null; veterinaire: number | null; veterinaire_name: string | null;
  participant: number; participant_name: string; requested_by: number | null; blocked_by: number | null;
  report: number | null; animal: number | null; needs_response: boolean; photo: string | null;
  last_message: ChatMessage | null; messages: ChatMessage[]; unread_count: number;
  created_at: string; updated_at: string;
  adoption: { id: number; animal: number; animal_name: string; status: AdoptionStatus; photo: string | null } | null;
}
export type ConversationEvent =
  | { type: 'message.created'; conversation_id: number; message: ChatMessage }
  | { type: 'conversation.created' | 'conversation.accepted' | 'conversation.blocked' | 'conversation.read'; conversation_id: number };

@Injectable({ providedIn: 'root' })
export class Messaging {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly url = `${environment.apiUrl}/messaging/conversations/`;
  private listRequest?: Subscription;
  private readonly changes = new Subject<number | null>();
  readonly events = this.changes.asObservable();
  readonly items = signal<Conversation[]>([]);
  readonly userId = signal<number | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly connection = signal<'connecting' | 'connected' | 'offline'>('offline');
  readonly unread = computed(() => this.items().reduce((sum, item) => sum + item.unread_count, 0));

  constructor() {
    effect(onCleanup => {
      const tokens = this.auth.tokens();
      this.items.set([]); this.userId.set(null); this.error.set('');
      if (!tokens) return;
      const identity = this.auth.currentUser().subscribe({
        next: user => this.userId.set(user.id),
        error: error => this.error.set(this.auth.errorMessage(error)),
      });
      let stopped = false;
      let socket: WebSocket | undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let delay = 1000;
      const connect = () => {
        if (stopped) return;
        this.connection.set('connecting');
        const url = new URL(environment.websocketUrl, this.document.baseURI);
        url.protocol = url.protocol === 'https:' || url.protocol === 'wss:' ? 'wss:' : 'ws:';
        url.searchParams.set('token', tokens.access);
        const retry = () => {
          if (stopped) return;
          this.connection.set('offline');
          timer = setTimeout(connect, delay);
          delay = Math.min(delay * 2, 30000);
        };
        try { socket = new WebSocket(url); } catch { retry(); return; }
        socket.onopen = () => {
          delay = 1000; this.connection.set('connected'); this.refresh(); this.changes.next(null);
        };
        socket.onmessage = event => {
          let data: unknown;
          try { data = JSON.parse(event.data); } catch { return; }
          if (!data || typeof data !== 'object' || !('type' in data) || !('conversation_id' in data)) return;
          if (!['message.created', 'conversation.created', 'conversation.accepted', 'conversation.blocked', 'conversation.read'].includes(String(data.type))) return;
          if (typeof data.conversation_id !== 'number' || !Number.isSafeInteger(data.conversation_id) || data.conversation_id <= 0) return;
          this.refresh(); this.changes.next(data.conversation_id);
        };
        socket.onerror = () => this.connection.set('offline');
        socket.onclose = retry;
      };
      this.refresh(); connect();
      onCleanup(() => {
        stopped = true; clearTimeout(timer); identity.unsubscribe(); this.listRequest?.unsubscribe();
        if (socket) { socket.onclose = null; socket.onmessage = null; socket.onopen = null; socket.close(); }
        this.items.set([]); this.userId.set(null); this.loading.set(false); this.connection.set('offline');
      });
    });
  }

  name(item: Conversation): string {
    return item.participant === this.userId() ? item.refuge_name || item.veterinaire_name || 'Interlocuteur' : item.participant_name;
  }

  refresh(): void {
    if (!this.auth.getAccessToken()) return;
    this.listRequest?.unsubscribe(); this.loading.set(true); this.error.set('');
    this.listRequest = this.http.get<Conversation[]>(this.url).subscribe({
      next: items => { this.items.set(items); this.loading.set(false); },
      error: error => { this.error.set(this.auth.errorMessage(error)); this.loading.set(false); },
    });
  }

  detail(id: string) { return this.http.get<Conversation>(`${this.url}${id}/`); }
  openAdoption(id: number) { return this.http.post<Conversation>(this.url, { adoption_request: id }); }
  send(id: number, body: string) { return this.http.post<ChatMessage>(`${this.url}${id}/messages/`, { body }); }
  decide(id: number, action: 'accept' | 'block') { return this.http.post<Conversation>(`${this.url}${id}/${action}/`, {}); }
  read(item: Conversation): void {
    this.listRequest?.unsubscribe(); this.loading.set(false);
    this.items.update(items => [item, ...items.filter(other => other.id !== item.id)].sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
    this.refresh();
  }
}
