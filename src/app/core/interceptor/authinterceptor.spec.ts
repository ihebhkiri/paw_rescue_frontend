import { DOCUMENT } from '@angular/common';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../auth/service/auth';
import { environment } from '../../../environments/environment';
import { authInterceptor } from './authinterceptor';

for (const authApiUrl of ['http://localhost:8000/api/auth', '/api/auth']) {
  describe(`authInterceptor (${authApiUrl})`, () => {
    let http: HttpClient;
    let controller: HttpTestingController;
    let apiUrl: URL;
    const originalAuthUrl = environment.authApiUrl;

    beforeEach(() => {
      localStorage.clear();
      environment.authApiUrl = authApiUrl;
      TestBed.configureTestingModule({ providers: [
        provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      ] });
      http = TestBed.inject(HttpClient);
      controller = TestBed.inject(HttpTestingController);
      apiUrl = new URL('../', new URL(`${authApiUrl}/`, TestBed.inject(DOCUMENT).baseURI));
    });
    afterEach(() => {
      controller.verify();
      localStorage.clear();
      environment.authApiUrl = originalAuthUrl;
    });

    it('reads the current stored token on each API request and stops after logout', () => {
      const url = new URL('animals/', apiUrl).href;
      for (const token of [null, 'first', 'second', null]) {
        if (token) localStorage.setItem('access_token', token);
        else TestBed.inject(AuthService).logout();
        http.get(url).subscribe();
        const request = controller.expectOne(url);
        expect(request.request.headers.get('Authorization')).toBe(token ? `Bearer ${token}` : null);
        request.flush([]);
      }
    });

    it('preserves an existing authorization header and request body', () => {
      localStorage.setItem('access_token', 'stored');
      const url = new URL('reports/', apiUrl).href;
      const body = new FormData();
      body.set('description', 'Report');
      http.post(url, body, { headers: { authorization: 'Basic existing' } }).subscribe();
      const request = controller.expectOne(url);
      expect(request.request.headers.getAll('Authorization')).toEqual(['Basic existing']);
      expect(request.request.headers.has('Content-Type')).toBe(false);
      expect(request.request.body).toBe(body);
      request.flush({});
    });

    it('excludes auth endpoints, external origins, assets and misleading API prefixes', () => {
      localStorage.setItem('access_token', 'stored');
      const urls = [
        ...['token', 'token/refresh', 'register'].flatMap(endpoint =>
          [`${authApiUrl}/${endpoint}`, `${authApiUrl}/${endpoint}/?next=home`]),
        'https://external.example/api/animals/',
        `${apiUrl.protocol}//${apiUrl.hostname}.evil.example/api/animals/`,
        `${apiUrl.origin}/api-other/animals/`,
        `${apiUrl.origin}/assets/config.json`,
      ];
      for (const url of urls) {
        http.get(url).subscribe();
        const request = controller.expectOne(url);
        expect(request.request.headers.has('Authorization'), url).toBe(false);
        request.flush({});
      }
    });

    it('supports relative requests without sending tokens to a different development origin', () => {
      localStorage.setItem('access_token', 'stored');
      http.get('/api/animals/').subscribe();
      const request = controller.expectOne('/api/animals/');
      const sameOrigin = apiUrl.origin === new URL(TestBed.inject(DOCUMENT).baseURI).origin;
      expect(request.request.headers.get('Authorization')).toBe(sameOrigin ? 'Bearer stored' : null);
      request.flush([]);
    });
  });
}
