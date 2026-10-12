import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth';
import { environment } from '../../../environments/environment';

describe('Auth HTTP contract', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); localStorage.clear(); vi.restoreAllMocks(); });

  it('logs in using email/password and retains tokens only after a valid response', () => {
    auth.login(' person@example.com ', 'password').subscribe();
    const request = http.expectOne(`${environment.authApiUrl}/token/`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'person@example.com', password: 'password' });
    expect(auth.tokens()).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    request.flush({ access: 'access-token', refresh: 'refresh-token' });
    expect(auth.tokens()).toEqual({ access: 'access-token', refresh: 'refresh-token' });
    expect(localStorage.getItem('access_token')).toBe('access-token');
    expect(localStorage.getItem('refresh_token')).toBe('refresh-token');
    const restored = TestBed.runInInjectionContext(() => new AuthService());
    expect(restored.tokens()).toEqual(auth.tokens());
  });

  it('rejects malformed login responses', () => {
    let failed = false;
    auth.login('person@example.com', 'password').subscribe({ error: () => failed = true });
    http.expectOne(`${environment.authApiUrl}/token/`).flush({ detail: 'Invalid' });
    expect(failed).toBe(true);
    expect(auth.tokens()).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  it('clears an authenticated session on logout without inventing a server request', () => {
    auth.login('person@example.com', 'password').subscribe();
    http.expectOne(`${environment.authApiUrl}/token/`).flush({ access: 'access-token', refresh: 'refresh-token' });
    expect(auth.tokens()).not.toBeNull();
    localStorage.setItem('theme', 'dark');
    auth.logout();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(auth.tokens()).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  it('sends multipart signup unchanged without creating a session', () => {
    const body = new FormData();
    body.set('role', 'veterinaire');
    body.set('verification_document', new File(['proof'], 'proof.pdf'));
    auth.signup(body).subscribe();
    const request = http.expectOne(`${environment.authApiUrl}/register/`);
    expect(request.request.body).toBe(body);
    expect(request.request.headers.has('Content-Type')).toBe(false);
    request.flush({ user: { id: 1 }, access: 'unused', refresh: 'unused' });
    expect(auth.tokens()).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });
  it('fails login and removes partial storage if the second write fails', () => {
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === 'access_token') throw new DOMException('Quota exceeded', 'QuotaExceededError');
      setItem.call(this, key, value);
    });
    let failed = false;
    auth.login('person@example.com', 'password').subscribe({ error: () => failed = true });
    http.expectOne(`${environment.authApiUrl}/token/`).flush({ access: 'access', refresh: 'refresh' });
    expect(failed).toBe(true);
    expect(auth.tokens()).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  it('treats inaccessible storage as no stored session', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError'); });
    expect(TestBed.runInInjectionContext(() => new AuthService()).tokens()).toBeNull();
    expect(auth.getAccessToken()).toBeNull();
  });
});
