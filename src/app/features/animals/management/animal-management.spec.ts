import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AnimalFormComponent } from './animal-form.component';
import { AnimalManagementComponent } from './animal-management.component';
import { environment } from '../../../../environments/environment';
import { ManagedAnimal } from '../animals';

const url = `${environment.apiUrl}/animals/`;
const me = `${environment.authApiUrl}/me/`;
const user = { id: 1, role: 'refuge', username: 'refuge', profile: null };
const animal: ManagedAnimal = { id: 4, name: 'Luna', species: 2, species_name: 'Chat', breed: 'Croisée', estimated_age_months: 8, sex: 'F', weight_kg: '7.20', color: 'Noir et blanc', size: 'small', behavior: 'Calme', status: 'in_shelter', is_adoptable: false, photos: [{ id: 1, image: '/cat.png', is_primary: true, order: 0 }] };

describe('Shelter animal management', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AnimalFormComponent, AnimalManagementComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); vi.restoreAllMocks(); });
  function form(role = 'refuge', id?: string) {
    const fixture = TestBed.createComponent(AnimalFormComponent);
    if (id) fixture.componentRef.setInput('id', id);
    fixture.componentInstance.ionViewWillEnter();
    http.expectOne(me).flush({ ...user, role });
    http.expectOne(url + 'species/').flush([{ id: 2, name: 'Chat' }]);
    if (id && role === 'refuge') {
      http.expectOne(url + '?mine=true').flush([{ ...animal, photos: undefined, primary_photo: '/cat.png' }]);
      if (id === String(animal.id)) http.expectOne(url + id + '/').flush(animal);
      else http.expectNone(url + id + '/');
    }
    fixture.detectChanges();
    return fixture;
  }
  function validForm(page: AnimalFormComponent) {
    page.form.patchValue({ ...animal, weight_kg: 7.2 });
    page.photos.set([{ url: '/preview.png', file: new File(['test'], 'cat.png', { type: 'image/png' }) }]);
  }
  it('requires a photo, valid fields and the final recap before making a single POST', () => {
    const page = form().componentInstance;
    page.next(); expect(page.step()).toBe(0); expect(page.photoError()).toContain('photo');
    page.photos.set([{ url: '/preview.png', file: new File(['test'], 'cat.png', { type: 'image/png' }) }]);
    page.next(); page.next(); expect(page.step()).toBe(1);
    validForm(page); page.next(); page.next(); page.next();
    expect(page.step()).toBe(4); http.expectNone(url);
    page.submit(); page.submit();
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    const body = request.request.body as FormData;
    expect(body.get('name')).toBe('Luna'); expect(body.get('species')).toBe('2');
    expect(body.has('refuge')).toBe(false); expect(body.getAll('photos').length).toBe(1);
    request.flush(animal); expect(page.saved()?.id).toBe(4);
  });
  it('retains inputs and photos after a failed save and allows a deliberate retry', () => {
    const page = form().componentInstance; validForm(page); page.go(4); page.submit();
    http.expectOne(url).flush({ photos: ['Image invalide'] }, { status: 400, statusText: 'Bad Request' });
    expect(page.saved()).toBeNull(); expect(page.error()).toContain('Image invalide');
    expect(page.fields.name.value).toBe('Luna'); expect(page.photos().length).toBe(1); expect(page.saving()).toBe(false);
    page.submit(); http.expectOne(url).flush(animal);
  });
  it('never offers creation to a volunteer, even by direct URL', () => {
    const fixture = form('benevole');
    expect(fixture.componentInstance.allowed()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('réservé');
    validForm(fixture.componentInstance); fixture.componentInstance.go(4); fixture.componentInstance.submit(); http.expectNone(url);
  });
  it('loads only owned data for editing and sends PATCH without duplicating existing photos', () => {
    const page = form('refuge', '4').componentInstance;
    expect(page.photos()).toEqual([{ url: '/cat.png' }]);
    expect(page.fields.name.value).toBe('Luna'); page.go(4); page.submit();
    const request = http.expectOne(url + '4/'); expect(request.request.method).toBe('PATCH');
    expect((request.request.body as FormData).getAll('photos')).toEqual([]); request.flush(animal);
    const forbidden = form('refuge', '99').componentInstance;
    expect(forbidden.allowed()).toBe(false); expect(forbidden.loadError()).toContain('non autorisé');
  });
  it('disables adoption for incompatible statuses', () => {
    const page = form().componentInstance;
    page.fields.is_adoptable.setValue(true); page.fields.status.setValue('rescued'); page.statusChanged();
    expect(page.fields.is_adoptable.value).toBe(false); expect(page.fields.is_adoptable.disabled).toBe(true);
    page.fields.status.setValue('in_shelter'); page.statusChanged(); expect(page.fields.is_adoptable.enabled).toBe(true);
  });
  it('rejects unsupported or excess photos and releases removed preview URLs', () => {
    const page = form().componentInstance;
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const file = new File(['x'], 'cat.png', { type: 'image/png' });
    page.photos.set(Array.from({ length: 5 }, (_, i) => ({ file, url: `blob:${i}` })));
    page.choosePhotos({ target: { files: [file], value: '' } } as unknown as Event);
    expect(page.photoError()).toContain('5 photos'); expect(page.photos().length).toBe(5);
    page.removePhoto(0); expect(revoke).toHaveBeenCalledWith('blob:0');
    page.choosePhotos({ target: { files: [new File(['x'], 'bad.txt', { type: 'text/plain' })], value: '' } } as unknown as Event);
    expect(page.photoError()).toContain('JPG');
  });
  it('lists owned non-adoptable animals, filters adoption, and updates availability after success', () => {
    const fixture = TestBed.createComponent(AnimalManagementComponent); const page = fixture.componentInstance;
    page.ionViewWillEnter(); http.expectOne(me).flush(user); http.expectOne(url + '?mine=true').flush([animal]);
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Ajouter un animal'); expect(page.visible().length).toBe(1);
    page.segment.set('adoptable'); expect(page.visible().length).toBe(0);
    page.changeAvailability(animal); expect(page.visible().length).toBe(0);
    http.expectOne(url + '4/make-adoptable/').flush({ ...animal, is_adoptable: true }); expect(page.visible().length).toBe(1);
  });
  it('shows only the public adoption catalogue for citizens and reloads on return', () => {
    const fixture = TestBed.createComponent(AnimalManagementComponent); const page = fixture.componentInstance;
    page.ionViewWillEnter(); http.expectOne(me).flush({ ...user, role: 'citoyen' }); http.expectOne(url + 'adoptable/').flush([{ ...animal, is_adoptable: true }]);
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).not.toContain('Ajouter un animal'); expect(page.visible().length).toBe(1);
    page.ionViewWillLeave(); page.ionViewWillEnter(); http.expectOne(me).flush(user); http.expectOne(url + '?mine=true').flush([]);
    expect(page.shelter()).toBe(true); expect(page.items()).toEqual([]);
  });
});
