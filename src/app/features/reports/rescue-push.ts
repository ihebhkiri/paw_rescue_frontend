import { effect, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/service/auth';

export function reportIdFromPush(data: unknown): number | null {
  if (!data || typeof data !== 'object' || !('report_id' in data)) return null;
  const value = data.report_id;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

@Injectable({ providedIn: 'root' })
export class RescuePush {
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly native = Capacitor.isNativePlatform();
  readonly busy = signal(false);
  readonly message = signal('');
  private generation = 0;
  private handles: PluginListenerHandle[] = [];
  private active = false;
  private cleanup = Promise.resolve();

  constructor() {
    effect(() => {
      const active = !!this.auth.tokens();
      if (!this.native || !environment.rescuePushEnabled || active === this.active) return;
      this.active = active;
      const generation = ++this.generation;
      if (active) void this.start(generation);
      else {
        const handles = this.handles.splice(0);
        this.cleanup = Promise.all(handles.map(handle => handle.remove()))
          .then(() => FirebaseMessaging.deleteToken()).catch(() => { this.message.set('Désactivation push non confirmée. Vérifiez votre connexion.'); });
      }
    });
  }

  private async start(generation: number): Promise<void> {
    await this.cleanup;
    if (generation !== this.generation) return;
    try {
      const handles = await Promise.all([
        FirebaseMessaging.addListener('notificationActionPerformed', event => {
          const id = reportIdFromPush(event.notification.data);
          if (id && this.active) void this.router.navigate(['/signalements', id]);
        }),
        FirebaseMessaging.addListener('tokenReceived', event => {
          if (this.active) void this.saveToken(event.token).catch(() => this.message.set('Enregistrement push impossible. Réessayez.'));
        }),
      ]);
      if (generation !== this.generation) { await Promise.all(handles.map(handle => handle.remove())); return; }
      this.handles = handles;
      if ((await FirebaseMessaging.checkPermissions()).receive === 'granted') await this.register(generation);
    } catch { this.message.set('Notifications push indisponibles. La liste des missions reste accessible.'); }
  }

  private saveToken(token: string): Promise<unknown> {
    return firstValueFrom(this.http.patch(`${environment.authApiUrl}/me/`, { fcm_token: token }));
  }

  private async register(generation: number): Promise<void> {
    const { token } = await FirebaseMessaging.getToken();
    if (generation !== this.generation || !this.active) return;
    await this.saveToken(token);
  }

  async enable(): Promise<void> {
    if (!environment.rescuePushEnabled) { this.message.set('La configuration Firebase de cette application reste à activer. Utilisez la liste des missions.'); return; }
    if (this.busy() || !this.active) return;
    this.busy.set(true);
    const generation = this.generation;
    try {
      const permission = await FirebaseMessaging.requestPermissions();
      if (permission.receive !== 'granted') { this.message.set('Notifications refusées. Vous pouvez consulter les missions dans cette liste.'); return; }
      await this.register(generation);
      if (generation === this.generation) this.message.set('Notifications activées sur cet appareil.');
    } catch { this.message.set('Activation impossible. Vérifiez la connexion et la configuration Firebase.'); }
    finally { this.busy.set(false); }
  }
}
