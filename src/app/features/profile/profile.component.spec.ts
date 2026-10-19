import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ProfileComponent } from './profile.component';
import { CurrentUser } from '../../auth/models/current-user.model';
import { environment } from '../../../environments/environment';

const user: CurrentUser = { id: 7, first_name: 'Nora', last_name: 'Test', username: 'nora', role: 'benevole', photo: null, profile: { is_available: true } };
const url = `${environment.authApiUrl}/me/`;

describe('Dynamic profile', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ProfileComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function open() {
    const fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();
    fixture.componentInstance.ionViewWillEnter();
    return fixture;
  }

  it('loads the real identity with a neutral avatar and persists availability only after success', () => {
    const fixture = open();
    const page = fixture.componentInstance;
    expect(page.loading()).toBe(true);
    http.expectOne(url).flush(user);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nora Test');
    expect(fixture.nativeElement.querySelector('ion-avatar img')).toBeNull();
    page.saveAvailability(false);
    page.saveAvailability(false);
    const save = http.expectOne(url);
    expect(save.request.method).toBe('PATCH');
    expect(save.request.body).toEqual({ profile: { is_available: false } });
    expect(page.available()).toBe(true);
    expect(page.saving()).toBe(true);
    save.flush({ ...user, profile: { is_available: false } });
    expect(page.available()).toBe(false);
    expect(page.saving()).toBe(false);
  });

  it('restores the select and retains the saved availability when PATCH fails', () => {
    const fixture = open();
    http.expectOne(url).flush(user);
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('ion-select');
    select.value = false;
    select.dispatchEvent(new CustomEvent('ionChange', { detail: { value: false } }));
    expect(select.value).toBe(true);
    http.expectOne(url).flush({}, { status: 500, statusText: 'Error' });
    expect(fixture.componentInstance.available()).toBe(true);
    expect(fixture.componentInstance.saving()).toBe(false);
    expect(fixture.componentInstance.message()).toContain('échoué');
  });

  it('does not offer volunteer availability to other roles', () => {
    const fixture = open();
    http.expectOne(url).flush({ ...user, role: 'citoyen', profile: { address: '' } });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('ion-select')).toBeNull();
    fixture.componentInstance.saveAvailability(false);
    http.expectNone(url);
  });

  it('updates the avatar immediately without reloading the profile', () => {
    const fixture = open(); http.expectOne(url).flush(user);
    fixture.componentInstance.photoUpdated('/media/new.jpg'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('ion-avatar img').getAttribute('src')).toBe('/media/new.jpg');
    expect(fixture.componentInstance.available()).toBe(true);
    http.expectNone(url);
  });

  it('shows session expiry, allows retry, and clears data and pending writes on departure', () => {
    const fixture = open();
    const page = fixture.componentInstance;
    http.expectOne(url).flush({}, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('session a expiré');
    page.load();
    http.expectOne(url).flush(user);
    page.saveAvailability(false);
    const pending = http.expectOne(url);
    page.ionViewWillLeave();
    expect(pending.cancelled).toBe(true);
    expect(page.user()).toBeNull();
    page.ionViewWillEnter();
    http.expectOne(url).flush({ ...user, id: 8, first_name: 'Autre' });
    expect(page.name()).toBe('Autre Test');
  });
});
