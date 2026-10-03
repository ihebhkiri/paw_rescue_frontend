import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResponse, SignupResponse } from '../models/auth-response.model';
import { SignupRequest } from '../models/auth-request.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = signal<LoginResponse | null>(null);
  readonly tokens = this.session.asReadonly();

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.authApiUrl}/token/`, { email: email.trim(), password }).pipe(
      map(response => {
        if (!response || typeof response.access !== 'string' || !response.access || typeof response.refresh !== 'string' || !response.refresh) {
          throw new Error('Réponse de connexion invalide.');
        }
        return response;
      }),
      tap(response => this.session.set(response)),
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
