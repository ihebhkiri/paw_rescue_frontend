import { vi } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthComponent } from './auth.component';
import { provideRouter, Router } from '@angular/router';

describe('AuthComponent', () => {
  let fixture: ComponentFixture<AuthComponent>;
  let component: AuthComponent;
  let page: HTMLElement;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [AuthComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(AuthComponent);
    component = fixture.componentInstance;
    page = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('validates only after interaction and never reports a successful login without a backend', () => {
    expect(component.form.touched).toBe(false);
    page.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(component.form.controls.email.touched).toBe(true);
    expect(component.form.controls.password.touched).toBe(true);
    expect(page.querySelector<HTMLIonInputElement>('#email')!.errorText).toBe('Saisissez une adresse e-mail valide.');
    expect(page.querySelector<HTMLIonInputElement>('#password')!.errorText).toBe('Saisissez votre mot de passe.');
    expect(component.feedback()).toBe('');

    component.form.setValue({ email: 'incorrect', password: 'test-password', rememberMe: true });
    component.submit();
    expect(component.form.controls.email.hasError('email')).toBe(true);
    expect(component.feedback()).toBe('');

    component.form.controls.email.setValue('person@example.com');
    component.submit();
    fixture.detectChanges();
    expect(component.form.valid).toBe(true);
    expect(component.form.controls.email.valid).toBe(true);
    const request = TestBed.inject(HttpTestingController).expectOne(`${environment.authApiUrl}/token/`);
    expect(request.request.body).toEqual({ email: 'person@example.com', password: 'test-password' });
    request.flush({ non_field_errors: ['Identifiants invalides.'] }, { status: 400, statusText: 'Bad Request' });
    expect(component.feedback()).toBe('Identifiants invalides.');
    expect(component.busy()).toBe(false);
  });

  it('toggles password visibility without losing the value and binds rememberMe', () => {
    const password = page.querySelector<HTMLIonInputElement>('#password')!;
    password.value = 'a-test-password';
    password.dispatchEvent(new CustomEvent('ionInput', { detail: { value: password.value } }));
    password.dispatchEvent(new CustomEvent('ionBlur'));
    expect(component.form.controls.password.touched).toBe(true);
    const toggle = page.querySelector<HTMLIonButtonElement>('.visibility')!;
    expect(password.type).toBe('password');
    toggle.click();
    fixture.detectChanges();
    expect(password.type).toBe('text');
    expect(password.value).toBe('a-test-password');
    expect(toggle.getAttribute('aria-label')).toBe('Masquer le mot de passe');
    toggle.click();
    fixture.detectChanges();
    expect(password.type).toBe('password');
    expect(component.form.controls.password.value).toBe('a-test-password');
    expect(password.clearOnEdit).toBe(false);
    expect(page.querySelector<HTMLIonCheckboxElement>('ion-checkbox')!.disabled).toBe(true);
    expect(component.form.controls.rememberMe.disabled).toBe(true);
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('persists the session before navigating to home after successful login', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockImplementation(async url => {
      expect(url).toBe('/home');
      expect(localStorage.getItem('access_token')).toBe('access-token');
      return true;
    });
    component.form.patchValue({ email: 'person@example.com', password: 'password' });
    component.submit();
    TestBed.inject(HttpTestingController).expectOne(`${environment.authApiUrl}/token/`)
      .flush({ access: 'access-token', refresh: 'refresh-token' });
    expect(navigate).toHaveBeenCalledOnce();
    expect(component.form.controls.password.value).toBe('');
    expect(component.busy()).toBe(false);
  });
});
