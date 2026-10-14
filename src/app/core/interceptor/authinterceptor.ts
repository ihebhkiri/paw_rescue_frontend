import { DOCUMENT } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../../auth/service/auth';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const baseUrl = inject(DOCUMENT).baseURI;
  const authUrl = new URL(`${environment.authApiUrl}/`, baseUrl);
  const apiUrl = new URL('../', authUrl);
  const requestUrl = new URL(request.url, baseUrl);
  const path = requestUrl.pathname.replace(/\/$/, '');
  const authPath = authUrl.pathname.replace(/\/$/, '');
  const isAuthEndpoint = ['token', 'token/refresh', 'register']
    .some(endpoint => path === `${authPath}/${endpoint}`);

  if (request.headers.has('Authorization') || requestUrl.origin !== apiUrl.origin ||
      !requestUrl.pathname.startsWith(apiUrl.pathname) || isAuthEndpoint) {
    return next(request);
  }

  const token = inject(AuthService).getAccessToken();
  return next(token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request);
};
