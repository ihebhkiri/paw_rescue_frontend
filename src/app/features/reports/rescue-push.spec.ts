import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { vi } from 'vitest';
import { AuthService } from '../../auth/service/auth';
import { environment } from '../../../environments/environment';
import { RescuePush } from './rescue-push';

vi.mock('@capacitor-firebase/messaging', () => ({ FirebaseMessaging: {
  addListener: vi.fn(), checkPermissions: vi.fn(), requestPermissions: vi.fn(), getToken: vi.fn(), deleteToken: vi.fn(),
} }));

describe('Native rescue push lifecycle', () => {
  const tokens = signal<{ access: string; refresh: string } | null>(null);
  let http: HttpTestingController;
  const remove = vi.fn().mockResolvedValue(undefined);
  const settle = async () => { for (let index = 0; index < 10; index++) await Promise.resolve(); };
  beforeEach(() => {
    vi.clearAllMocks();
    environment.rescuePushEnabled = true;
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    tokens.set({ access: 'test', refresh: 'test' });
    vi.mocked(FirebaseMessaging.addListener).mockResolvedValue({ remove });
    vi.mocked(FirebaseMessaging.checkPermissions).mockResolvedValue({ receive: 'prompt' });
    vi.mocked(FirebaseMessaging.getToken).mockResolvedValue({ token: 'fcm-device-token' });
    vi.mocked(FirebaseMessaging.deleteToken).mockResolvedValue();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), { provide: AuthService, useValue: { tokens } }] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); environment.rescuePushEnabled = false; vi.restoreAllMocks(); });

  it('does not register after permission refusal', async () => {
    const push = TestBed.inject(RescuePush); TestBed.tick(); await settle();
    vi.mocked(FirebaseMessaging.requestPermissions).mockResolvedValue({ receive: 'denied' });
    await push.enable();
    expect(FirebaseMessaging.getToken).not.toHaveBeenCalled(); expect(push.message()).toContain('refusées');
  });

  it('persists FCM token only after consent and removes listeners/token on logout', async () => {
    const push = TestBed.inject(RescuePush); TestBed.tick(); await settle();
    vi.mocked(FirebaseMessaging.requestPermissions).mockResolvedValue({ receive: 'granted' });
    const enabled = push.enable(); await settle();
    const request = http.expectOne(`${environment.authApiUrl}/me/`);
    expect(request.request.body).toEqual({ fcm_token: 'fcm-device-token' }); request.flush({}); await enabled;
    expect(push.message()).toContain('activées');
    tokens.set(null); TestBed.tick(); await settle();
    expect(remove).toHaveBeenCalledTimes(2); expect(FirebaseMessaging.deleteToken).toHaveBeenCalledOnce();
  });

  it('ignores a token obtained after logout', async () => {
    const push = TestBed.inject(RescuePush); TestBed.tick(); await settle();
    vi.mocked(FirebaseMessaging.requestPermissions).mockResolvedValue({ receive: 'granted' });
    let finish!: (result: { token: string }) => void;
    vi.mocked(FirebaseMessaging.getToken).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const enabled = push.enable(); await settle(); tokens.set(null); TestBed.tick();
    finish({ token: 'late-token' }); await enabled;
    http.expectNone(`${environment.authApiUrl}/me/`);
  });
});
