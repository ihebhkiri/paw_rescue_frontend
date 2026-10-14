import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResponse, SignupResponse } from '../models/auth-response.model';
import { SignupRequest } from '../models/auth-request.model';
import { CurrentUser } from '../models/current-user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = signal<LoginResponse | null>(this.restoreSession());
  readonly tokens = this.session.asReadonly();

  getAccessToken(): string | null {
    try { return localStorage.getItem('access_token'); }
    catch { return null; }
  }

  private restoreSession(): LoginResponse | null {
    try {
      const access = this.getAccessToken();
      const refresh = localStorage.getItem('refresh_token');
      return access && refresh ? { access, refresh } : null;
    } catch { return null; }
  }

  currentUser() { return this.http.get<CurrentUser>(`${environment.authApiUrl}/me/`); }

  logout(): void {
    this.session.set(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.authApiUrl}/token/`, { email: email.trim(), password }).pipe(
      map(response => {
        if (!response || typeof response.access !== 'string' || !response.access || typeof response.refresh !== 'string' || !response.refresh) {
          throw new Error('Réponse de connexion invalide.');
        }
        return response;
      }),
      tap(response => {
        try {
          localStorage.setItem('refresh_token', response.refresh);
          localStorage.setItem('access_token', response.access);
        } catch (error) {
          this.logout();
          throw error;
        }
        this.session.set(response);
      }),
    );
  }

  signup(body: SignupRequest | FormData): Observable<SignupResponse> {
    // Signup never opens a session, even when Django returns tokens.
    return this.http.post<SignupResponse>(`${environment.authApiUrl}/register/`, body).pipe(
      map(response => {
        if (!response?.user || typeof response.user.id !== 'number') throw new Error('Réponse d’inscription invalide.');
        return response;
      }),
    );
  }

  errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) return 'Votre session a expiré. Veuillez vous reconnecter.';
      if (error.status === 0) return 'Le serveur est inaccessible. Vérifiez votre connexion et réessayez.';
      const body: unknown = error.error;
      if (error.status >= 400 && error.status < 500 && body && typeof body === 'object') {
        const messages = Object.values(body).flat().filter((value): value is string => typeof value === 'string');
        if (messages.length) return messages.join(' ');
      }
    }
    return 'La demande a échoué. Veuillez réessayer.';
  }
}
