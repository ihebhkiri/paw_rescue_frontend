import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth';
import { environment } from '../../../environments/environment';

describe('Auth HTTP contract', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('logs in using email/password and retains tokens only after a valid response', () => {
    auth.login(' person@example.com ', 'password').subscribe();
    const request = http.expectOne(`${environment.authApiUrl}/token/`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'person@example.com', password: 'password' });
    expect(auth.tokens()).toBeNull();
    request.flush({ access: 'access-token', refresh: 'refresh-token' });
    expect(auth.tokens()).toEqual({ access: 'access-token', refresh: 'refresh-token' });
  });

  it('rejects malformed login responses', () => {
    let failed = false;
    auth.login('person@example.com', 'password').subscribe({ error: () => failed = true });
    http.expectOne(`${environment.authApiUrl}/token/`).flush({ detail: 'Invalid' });
    expect(failed).toBe(true);
    expect(auth.tokens()).toBeNull();
  });

  it('clears an authenticated session on logout without inventing a server request', () => {
    auth.login('person@example.com', 'password').subscribe();
    http.expectOne(`${environment.authApiUrl}/token/`).flush({ access: 'access-token', refresh: 'refresh-token' });
    expect(auth.tokens()).not.toBeNull();
    auth.logout();
    expect(auth.tokens()).toBeNull();
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
  });
});
