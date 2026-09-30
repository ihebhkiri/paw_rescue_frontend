import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthComponent } from './auth.component';

describe('AuthComponent', () => {
  let fixture: ComponentFixture<AuthComponent>;
  let component: AuthComponent;
  let page: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AuthComponent] }).compileComponents();
    fixture = TestBed.createComponent(AuthComponent);
    component = fixture.componentInstance;
    page = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('validates only after interaction and never reports a successful login without a backend', () => {
    expect(page.querySelector('.error')).toBeNull();
    page.querySelector<HTMLButtonElement>('.sign-in')!.click();
    fixture.detectChanges();
    expect(page.querySelectorAll('.error')).toHaveLength(2);
    expect(component.feedback()).toBe('');

    component.form.setValue({ email: 'incorrect', password: 'test-password', rememberMe: true });
    component.submit();
    expect(component.form.controls.email.hasError('email')).toBe(true);
    expect(component.feedback()).toBe('');

    component.form.controls.email.setValue('person@example.com');
    component.submit();
    fixture.detectChanges();
    expect(component.form.valid).toBe(true);
    expect(page.querySelector('.error')).toBeNull();
    expect(page.querySelector('[role="status"]')!.textContent).toContain('La connexion n’est pas encore disponible.');
  });

  it('toggles password visibility without losing the value and binds rememberMe', () => {
    const password = page.querySelector<HTMLInputElement>('#password')!;
    password.value = 'a-test-password';
    password.dispatchEvent(new Event('input'));
    const toggle = page.querySelector<HTMLButtonElement>('.visibility')!;
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
    page.querySelector<HTMLInputElement>('[type="checkbox"]')!.click();
    expect(component.form.controls.rememberMe.value).toBe(true);
  });
});
