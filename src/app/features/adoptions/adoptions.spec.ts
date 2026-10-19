import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { AdoptionRequestComponent } from './adoption-request.component';
import { AdoptionListComponent } from './adoption-list.component';
import { AdoptionDetailComponent } from './adoption-detail.component';
import { AdoptionRequest } from './adoptions';
import { Animal } from '../animals/animals';

const url = `${environment.apiUrl}/adoptions/`;
const me = `${environment.authApiUrl}/me/`;
const user = { id: 7, first_name: 'Oussama', last_name: '', username: 'oussama', role: 'benevole', photo: null, profile: { is_available: true } };
const animal: Animal = { id: 21, name: 'Milo', age: '18 mois', species: 'Chien', type: 'Chien', gender: 'Mâle', images: [], refuge: 'Refuge Tunis', character: 'Calme', adoptable: true, adoptionStatus: 'Disponible à l’adoption' };
const adoption: AdoptionRequest = {
  id: 11, animal: 21,
  animal_details: { id: 21, name: 'Milo', species_name: 'Chien', estimated_age_months: 18, sex: 'M', behavior: 'Calme', is_adoptable: true, photos: [] },
  applicant: 7, applicant_name: 'Oussama', applicant_email: 'o@example.test', applicant_phone: '',
  refuge: 3, refuge_name: 'Refuge Tunis', message: 'Bonjour', status: 'pending', created_at: '2026-10-13T10:00:00Z', reviewed_at: null, review_note: '', can_review: false, can_cancel: true,
};

describe('Adoption flow', () => {
  let http: HttpTestingController;
  let role: string;
  const present = vi.fn();
  beforeEach(() => {
    role = 'cancel';
    TestBed.configureTestingModule({
      imports: [AdoptionRequestComponent, AdoptionListComponent, AdoptionDetailComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: AlertController, useValue: { create: async () => ({ present, onDidDismiss: async () => ({ role }), dismiss: vi.fn() }) } }],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); vi.clearAllMocks(); });

  function requestForm(items: AdoptionRequest[] = [], currentUser = user) {
    const fixture = TestBed.createComponent(AdoptionRequestComponent);
    fixture.componentRef.setInput('animal', animal);
    fixture.detectChanges();
    http.expectOne(me).flush(currentUser);
    http.expectOne(`${url}?animal=21`).flush(items);
    fixture.detectChanges();
    return fixture;
  }

  it('requires explicit modal confirmation and posts only animal/message, once', () => {
    const fixture = requestForm();
    const page = fixture.componentInstance;
    page.submit();
    http.expectNone(url);
    page.open();
    expect(page.modalOpen()).toBe(true);
    http.expectNone(url);
    page.message.setValue('  Bonjour  ');
    page.submit(); page.submit();
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ animal: 21, message: 'Bonjour' });
    request.flush(adoption);
    fixture.detectChanges();
    expect(page.modalOpen()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Demande d’adoption envoyée');
    expect(fixture.nativeElement.textContent).toContain('Voir mes demandes');
    expect(page.pending()?.id).toBe(11);
  });

  it('restores pending state from the API and blocks another submission', () => {
    const fixture = requestForm([adoption]);
    expect(fixture.nativeElement.textContent).toContain('Demande en attente');
    fixture.componentInstance.open();
    fixture.componentInstance.submit();
    expect(fixture.componentInstance.modalOpen()).toBe(false);
    http.expectNone(url);
  });

  it('keeps the message on error and reconciles a request already created on the server', () => {
    const fixture = requestForm();
    const page = fixture.componentInstance;
    page.open(); page.message.setValue('Mon message'); page.submit();
    http.expectOne(url).flush({ detail: 'Une demande existe déjà.' }, { status: 400, statusText: 'Bad Request' });
    expect(page.message.value).toBe('Mon message');
    expect(page.submitError()).toContain('existe déjà');
    http.expectOne(`${url}?animal=21`).flush([adoption]);
    expect(page.pending()?.id).toBe(11);
    expect(page.modalOpen()).toBe(false);
  });

  it('allows retry after a failed POST with no request persisted', () => {
    const page = requestForm().componentInstance;
    page.open(); page.message.setValue('Mon message'); page.submit();
    http.expectOne(url).flush({}, { status: 500, statusText: 'Error' });
    http.expectOne(`${url}?animal=21`).flush([]);
    expect(page.modalOpen()).toBe(true);
    expect(page.sending()).toBe(false);
    page.submit();
    http.expectOne(url).flush(adoption);
    expect(page.sent()).toBe(true);
  });

  it('does not offer applicant actions to refuges', () => {
    const fixture = requestForm([], { ...user, role: 'refuge' });
    fixture.componentInstance.open();
    fixture.componentInstance.submit();
    expect(fixture.nativeElement.textContent).not.toContain('Demander l’adoption');
    expect(fixture.nativeElement.textContent).toContain('demandes reçues');
    http.expectNone(url);
  });

  it('cancels requests when the animal changes or the form is destroyed', () => {
    const fixture = TestBed.createComponent(AdoptionRequestComponent);
    fixture.componentRef.setInput('animal', animal); fixture.detectChanges();
    const oldMe = http.expectOne(me);
    const oldRequests = http.expectOne(`${url}?animal=21`);
    fixture.componentRef.setInput('animal', { ...animal, id: 22 }); fixture.detectChanges();
    expect(oldMe.cancelled).toBe(true); expect(oldRequests.cancelled).toBe(true);
    const newMe = http.expectOne(me);
    const newRequests = http.expectOne(`${url}?animal=22`);
    fixture.destroy();
    expect(newMe.cancelled).toBe(true); expect(newRequests.cancelled).toBe(true);
  });

  it('lists own requests, filters history, and reloads after returning', () => {
    const fixture = TestBed.createComponent(AdoptionListComponent);
    const page = fixture.componentInstance;
    page.ionViewWillEnter();
    http.expectOne(me).flush(user);
    http.expectOne(url).flush([adoption, { ...adoption, id: 12, status: 'approved' }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Mes demandes');
    expect(page.visible().map(item => item.id)).toEqual([11]);
    page.selected.set('approved');
    expect(page.visible().map(item => item.id)).toEqual([12]);
    page.ionViewWillLeave(); expect(page.items()).toEqual([]);
    page.ionViewWillEnter();
    http.expectOne(me).flush({ ...user, role: 'refuge' }); http.expectOne(url).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Demandes reçues');
    expect(fixture.nativeElement.textContent).toContain('Aucune demande');
  });

  function detail(item = adoption) {
    const fixture = TestBed.createComponent(AdoptionDetailComponent);
    fixture.componentRef.setInput('id', '11'); fixture.detectChanges();
    fixture.componentInstance.ionViewWillEnter();
    http.expectOne(`${url}11/`).flush(item);
    fixture.detectChanges();
    return fixture;
  }

  it('never lets an applicant review their request and allows cancel only after confirmation', async () => {
    const fixture = detail();
    const page = fixture.componentInstance;
    expect(fixture.nativeElement.textContent).not.toContain('Accepter la demande');
    await page.confirm('approve'); http.expectNone(`${url}11/approve/`);
    await page.confirm('cancel'); http.expectNone(`${url}11/cancel/`);
    role = 'confirm'; await page.confirm('cancel');
    http.expectOne(`${url}11/cancel/`).flush({ ...adoption, status: 'cancelled', can_cancel: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Annulée');
    expect(fixture.nativeElement.textContent).not.toContain('Annuler ma demande');
  });

  it('renders real applicant contacts, role, photo and a French date below the message', async () => {
    const fixture = detail({ ...adoption, applicant_role: 'Bénévole', applicant_photo: '/media/avatar.jpg', applicant_phone: '+21612345678' });
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.applicant-identity strong')?.textContent).toContain('Oussama');
    expect(element.querySelector('.applicant-identity p')?.textContent).toContain('Bénévole');
    expect(element.querySelector('ion-avatar img')?.getAttribute('src')).toBe('/media/avatar.jpg');
    const phoneButton = element.querySelector<HTMLIonButtonElement>('.contact-button[aria-controls="applicant-phone"]')!;
    const phone = element.querySelector<HTMLParagraphElement>('#applicant-phone')!;
    expect(phone.hidden).toBe(true);
    expect(phoneButton.href).toBeFalsy();
    phoneButton.click();
    fixture.detectChanges();
    expect(phone.hidden).toBe(false);
    expect(phone.textContent).toContain('+21612345678');
    expect(phoneButton.getAttribute('aria-expanded')).toBe('true');
    phoneButton.click();
    fixture.detectChanges();
    expect(phone.hidden).toBe(true);
    expect(element.querySelector('.contact-button[aria-label="Ouvrir la conversation"]')).not.toBeNull();
    expect(element.querySelector('.applicant-message + time')?.textContent).toMatch(/13 oct\. 2026 à \d{2}:00/);
  });

  it('handles missing contacts, photo, role and blank message without invented data', () => {
    const fixture = detail({ ...adoption, applicant_email: ' ', message: '  ' });
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.contact-button[aria-controls="applicant-phone"]')).toBeNull();
    expect(element.querySelector('#applicant-phone')).toBeNull();
    expect(element.querySelector('ion-avatar ion-icon')).not.toBeNull();
    expect(element.querySelector('.applicant-identity p')).toBeNull();
    expect(element.querySelector('.applicant-message')?.textContent).toBe('Aucun message ajouté.');
  });

  it('confirms a refuge decision and removes all decision actions after success', async () => {
    const fixture = detail({ ...adoption, can_review: true, can_cancel: false });
    const page = fixture.componentInstance;
    await page.confirm('approve'); http.expectNone(`${url}11/approve/`);
    role = 'confirm'; await page.confirm('approve');
    await page.confirm('reject');
    const request = http.expectOne(`${url}11/approve/`);
    expect(page.item()?.status).toBe('pending');
    request.flush({ ...adoption, status: 'approved', can_review: false, can_cancel: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Acceptée');
    expect(fixture.nativeElement.textContent).not.toContain('Refuser la demande');
    await page.confirm('reject'); http.expectNone(`${url}11/reject/`);
  });

  it('reloads authoritative state after a stale decision is rejected', async () => {
    const page = detail({ ...adoption, can_review: true, can_cancel: false }).componentInstance;
    role = 'confirm'; await page.confirm('reject');
    http.expectOne(`${url}11/reject/`).flush({ detail: 'Cette demande n’est plus en attente.' }, { status: 400, statusText: 'Bad Request' });
    http.expectOne(`${url}11/`).flush({ ...adoption, status: 'cancelled', can_review: false, can_cancel: false });
    expect(page.item()?.status).toBe('cancelled');
    expect(page.message()).toContain('plus en attente');
  });

  it('opens the adoption conversation once and navigates to the returned ID', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const page = detail().componentInstance; page.openChat(); page.openChat();
    const request = http.expectOne(`${environment.apiUrl}/messaging/conversations/`);
    expect(request.request.body).toEqual({ adoption_request: 11 });
    request.flush({ id: 15 });
    expect(navigate).toHaveBeenCalledWith(['/messages', 15]);
    expect(page.openingChat()).toBe(false);
  });
});
