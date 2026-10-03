import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let page: HTMLElement;
  const validAccount = {
    firstName: 'Élodie', lastName: 'Le Gall', email: 'elodie@example.com',
    password: 'test-password', confirmPassword: 'test-password', acceptTerms: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    page = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('blocks incomplete, whitespace-only, mismatched and unaccepted account information', () => {
    expect(page.querySelector('.error')).toBeNull();
    component.continue();
    fixture.detectChanges();
    expect(component.currentStep()).toBe(1);
    expect(component.account.touched).toBe(true);
    expect(component.form.controls.selectedRole.touched).toBe(false);
    expect(page.querySelectorAll('.error').length).toBeGreaterThan(0);

    const invalidAccounts = [
      { ...validAccount, firstName: '   ' },
      { ...validAccount, lastName: '' },
      { ...validAccount, email: 'invalid' },
      { ...validAccount, password: '', confirmPassword: '' },
      { ...validAccount, confirmPassword: 'different' },
      { ...validAccount, acceptTerms: false },
    ];
    for (const account of invalidAccounts) {
      component.account.setValue(account);
      component.continue();
      expect(component.currentStep()).toBe(1);
    }
    component.account.setValue(validAccount);
    component.continue();
    expect(component.currentStep()).toBe(2);
  });

  it('keeps data and the exclusive role when going back, and never creates a fake account', () => {
    component.account.setValue(validAccount);
    component.continue();
    fixture.detectChanges();
    expect(page.querySelectorAll('input[type="radio"]:checked')).toHaveLength(0);
    component.submit();
    fixture.detectChanges();
    expect(page.querySelector('#role-error')).not.toBeNull();
    expect(component.feedback()).toBe('');

    const radios = page.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    radios[0].click();
    radios[1].click();
    fixture.detectChanges();
    expect(page.querySelectorAll('input[type="radio"]:checked')).toHaveLength(1);
    expect(component.form.controls.selectedRole.value).toBe('VETERINARIAN');
    component.back();
    fixture.detectChanges();
    expect(component.account.getRawValue()).toEqual(validAccount);
    component.continue();
    fixture.detectChanges();
    expect(component.form.controls.selectedRole.value).toBe('VETERINARIAN');
    component.submit();
    expect(component.currentStep()).toBe(3);
    expect(component.feedback()).toBe('');

    component.account.controls.password.setValue('changed');
    component.submit();
    expect(component.currentStep()).toBe(1);
    expect(component.feedback()).toBe('');
  });

  for (const role of ['VOLUNTEER', 'SHELTER', 'VETERINARIAN'] as const) {
    it(`submits ${role} to Django and waits for success`, () => {
      component.account.setValue(validAccount);
      component.continue();
      component.form.controls.selectedRole.setValue(role);
      fixture.detectChanges();
      component.submit();
      if (role !== 'VOLUNTEER') {
        expect(component.currentStep()).toBe(3);
        const data = new FormData();
        data.set('verification_document', new File(['proof'], 'proof.pdf'));
        component.signup(data);
      }
      expect(component.busy()).toBe(true);
      component.submit();
      const http = TestBed.inject(HttpTestingController);
      const request = http.expectOne(`${environment.authApiUrl}/register/`);
      const body = request.request.body;
      expect(body instanceof FormData ? body.get('role') : body.role).toBe(
        role === 'VOLUNTEER' ? 'benevole' : role === 'SHELTER' ? 'refuge' : 'veterinaire');
      request.flush({ user: { id: 1, profile: role === 'VOLUNTEER' ? null : { verification_status: 'pending' } } });
      fixture.detectChanges();
      expect(component.currentStep()).toBe(role === 'VOLUNTEER' ? 'created' : 'confirmation');
      expect(page.querySelector('.stepper')).toBeNull();
      expect(page.querySelector('.confirmation a')?.getAttribute('href')).toBe('/auth');
      expect(component.busy()).toBe(false);
      http.verify();
    });
  }

  it('preserves account values after a rejected signup', () => {
    component.account.setValue(validAccount);
    component.continue();
    component.form.controls.selectedRole.setValue('VOLUNTEER');
    component.submit();
    TestBed.inject(HttpTestingController).expectOne(`${environment.authApiUrl}/register/`).flush(
      { email: ['Adresse déjà utilisée.'] }, { status: 400, statusText: 'Bad Request' });
    expect(component.account.getRawValue()).toEqual(validAccount);
    expect(component.feedback()).toBe('Adresse déjà utilisée.');
    expect(component.busy()).toBe(false);
    expect(component.form.enabled).toBe(true);
  });

  it('toggles passwords independently and keeps accessible input labels', () => {
    component.account.setValue(validAccount);
    fixture.detectChanges();
    const password = page.querySelector<HTMLInputElement>('#register-password')!;
    const confirmation = page.querySelector<HTMLInputElement>('#register-confirmPassword')!;
    page.querySelector<HTMLButtonElement>('[aria-label="Afficher : Mot de passe"]')!.click();
    fixture.detectChanges();
    expect(password.type).toBe('text');
    expect(confirmation.type).toBe('password');
    expect(password.value).toBe(validAccount.password);
    page.querySelector<HTMLButtonElement>('[aria-label="Afficher : Confirmer le mot de passe"]')!.click();
    fixture.detectChanges();
    expect(confirmation.type).toBe('text');
    expect(confirmation.value).toBe(validAccount.confirmPassword);
    component.showLegalUnavailable();
    fixture.detectChanges();
    expect(page.querySelector('[role="status"]')!.textContent).toContain('ne sont pas encore disponibles');
    expect(page.querySelector('a[routerLink="/auth"]')).not.toBeNull();
  });
});

describe('Registration confirmation previews', () => {
  for (const role of ['vet', 'shelter']) {
    it(`shows the ${role} confirmation without a numbered step and links to login`, async () => {
      await TestBed.configureTestingModule({
        imports: [RegisterComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), {
          provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ preview: `${role}-confirmation` }) } },
        }],
      }).compileComponents();
      const fixture = TestBed.createComponent(RegisterComponent);
      fixture.detectChanges();
      const page: HTMLElement = fixture.nativeElement;
      expect(page.querySelector('h1')?.textContent).toBe('Compte en cours de vérification');
      expect(page.querySelector('.stepper')).toBeNull();
      expect(page.querySelector('.confirmation a.primary')?.getAttribute('href')).toBe('/auth');
      expect(page.textContent).toContain('1 à 3 jours ouvrés');
      expect(page.textContent).toContain('Aperçu de démonstration');
      expect(page.querySelector('.welcome')?.textContent).toContain(role === 'vet' ? 'vétérinaire' : 'refuge / association');
    });
  }
});
