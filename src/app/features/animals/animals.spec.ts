import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AnimalResponse, Animals } from './animals';
import { HomeComponent } from './home/home.component';
import { AnimalDetailComponent } from './detail/animal-detail.component';
import { AuthService } from '../../auth/service/auth';
import { environment } from '../../../environments/environment';

const url = `${environment.apiUrl}/animals/`;
const animal: AnimalResponse = { id: 21, name: 'Animal réel', species_name: 'Chien', estimated_age_months: 0, sex: 'unknown', behavior: '', refuge_name: 'Refuge test', is_adoptable: true, primary_photo: null };

describe('Dynamic animals', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [HomeComponent, AnimalDetailComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); localStorage.clear(); });

  function home() {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    fixture.componentInstance.ionViewWillEnter();
    return fixture;
  }
  function detail(id = '21') {
    const fixture = TestBed.createComponent(AnimalDetailComponent);
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    fixture.componentInstance.ionViewWillEnter();
    return fixture;
  }

  it('loads the real catalogue, handles missing photos, and filters species/search/favorites', () => {
    const fixture = home();
    const page = fixture.componentInstance;
    http.expectOne(`${url}adoptable/`).flush([animal, { ...animal, id: 22, species_name: 'Chat', name: 'Félix' }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Animal réel');
    expect(fixture.nativeElement.textContent).toContain('Photo non disponible');
    expect(page.all()[0].age).toBe('0 mois');
    expect(page.all()[0].gender).toBe('Inconnu');
    page.category.set('Chat');
    expect(page.visibleAnimals().map(value => value.id)).toEqual([22]);
    page.showAll();
    page.query.set('REFUGE TEST');
    expect(page.visibleAnimals().length).toBe(2);
    page.animals.toggleFavorite(21);
    page.favoritesOnly.set(true);
    expect(page.visibleAnimals().map(value => value.id)).toEqual([21]);
  });

  it('distinguishes loading, an empty catalogue and network failures', () => {
    const fixture = home();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Chargement des animaux');
    expect(fixture.nativeElement.textContent).not.toContain('Aucun animal trouvé');
    http.expectOne(`${url}adoptable/`).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Aucun animal trouvé');
    fixture.componentInstance.load();
    http.expectOne(`${url}adoptable/`).error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('serveur est inaccessible');
    expect(fixture.nativeElement.textContent).not.toContain('Aucun animal trouvé');
  });

  it('loads a detail directly and never invents medical data or photos', () => {
    const fixture = detail();
    http.expectOne(`${url}21/`).flush({ ...animal, estimated_age_months: null, photos: [] });
    fixture.detectChanges();
    http.expectOne(`${environment.authApiUrl}/me/`).flush({ id: 7, role: 'benevole' });
    http.expectOne(`${environment.apiUrl}/adoptions/?animal=21`).flush([]);
    expect(fixture.nativeElement.textContent).toContain('Âge non renseigné');
    expect(fixture.nativeElement.textContent).toContain('Comportement non renseigné');
    expect(fixture.nativeElement.textContent).toContain('Refuge test');
    expect(fixture.nativeElement.textContent).not.toContain('Vacciné');
    expect(fixture.nativeElement.querySelector('.photo-count')).toBeNull();
    expect(fixture.nativeElement.querySelector('.hero-photo img')).toBeNull();
  });

  it('cancels obsolete detail requests when the route id changes and refreshes on reentry', () => {
    const fixture = detail();
    const first = http.expectOne(`${url}21/`);
    fixture.componentRef.setInput('id', '22');
    fixture.detectChanges();
    expect(first.cancelled).toBe(true);
    http.expectOne(`${url}22/`).flush({ ...animal, id: 22, photos: [{ id: 1, image: '/media/a.png', order: 0, is_primary: true }] });
    expect(fixture.componentInstance.animal()?.id).toBe(22);
    fixture.componentInstance.photoIndex.set(1);
    fixture.componentInstance.ionViewWillLeave();
    expect(fixture.componentInstance.animal()).toBeNull();
    fixture.componentInstance.ionViewWillEnter();
    expect(fixture.componentInstance.photoIndex()).toBe(0);
    http.expectOne(`${url}22/`).flush({ ...animal, id: 22 });
  });

  it('distinguishes not found from expired authentication', () => {
    const fixture = detail();
    http.expectOne(`${url}21/`).flush({}, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Animal introuvable');
    fixture.componentInstance.load();
    http.expectOne(`${url}21/`).flush({}, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('session a expiré');
    expect(fixture.nativeElement.textContent).not.toContain('Animal introuvable');
  });

  it('rejects legacy demo identifiers without sending a request', () => {
    const fixture = detail('max');
    fixture.detectChanges();
    http.expectNone(request => request.url.startsWith(url));
    expect(fixture.nativeElement.textContent).toContain('Animal introuvable');
  });

  it('clears cached page data and resets favorites between authenticated sessions', () => {
    const fixture = home();
    const page = fixture.componentInstance;
    const auth = TestBed.inject(AuthService);
    const animals = TestBed.inject(Animals);
    http.expectOne(`${url}adoptable/`).flush([animal]);
    auth.login('first@example.test', 'password').subscribe();
    http.expectOne(`${environment.authApiUrl}/token/`).flush({ access: 'first', refresh: 'refresh-first' });
    animals.toggleFavorite(21);
    expect(animals.favorites().has(21)).toBe(true);
    page.ionViewWillLeave();
    auth.logout();
    auth.login('second@example.test', 'password').subscribe();
    http.expectOne(`${environment.authApiUrl}/token/`).flush({ access: 'second', refresh: 'refresh-second' });
    expect(animals.favorites().size).toBe(0);
    expect(page.all()).toEqual([]);
    page.ionViewWillEnter();
    const pending = http.expectOne(`${url}adoptable/`);
    fixture.destroy();
    expect(pending.cancelled).toBe(true);
  });
});
