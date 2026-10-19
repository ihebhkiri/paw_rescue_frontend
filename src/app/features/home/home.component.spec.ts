import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { HomeComponent } from './home.component';
import { environment } from '../../../environments/environment';
import { routes } from '../../app.routes';

describe('Home integration', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HomeComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('uses account data and keeps sections usable when one API fails', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.componentInstance.ionViewWillEnter();
    http.expectOne(`${environment.authApiUrl}/me/`).flush({ first_name: 'Amira', profile: null });
    http.expectOne(`${environment.apiUrl}/reports/`).flush({ detail: 'Erreur' }, { status: 500, statusText: 'Server Error' });
    http.expectOne(`${environment.apiUrl}/animals/adoptable/`).flush([]);
    http.expectOne(`${environment.apiUrl}/shelters/`).flush([]);
    http.expectOne(`${environment.apiUrl}/notifications/`).flush([{ is_read: false }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Bonjour Amira');
    expect(fixture.nativeElement.textContent).toContain('Aucun animal disponible');
    expect(fixture.componentInstance.errors().reports).toBeTruthy();
    expect(fixture.componentInstance.unread()).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('ion-tab-button').length).toBe(5);
  });

  it('keeps static animal routes ahead of details and an exact legacy redirect', () => {
    const paths = routes.map(route => route.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of ['animals/add', 'animals/manage', 'animals/new']) expect(paths.indexOf(path)).toBeLessThan(paths.indexOf('animals/:id'));
    expect(routes.find(route => route.path === 'animals/new')).toMatchObject({ redirectTo: 'animals/add', pathMatch: 'full' });
    expect(routes.find(route => route.path === 'home')?.loadComponent).not.toBe(routes.find(route => route.path === 'animals')?.loadComponent);
  });
});
