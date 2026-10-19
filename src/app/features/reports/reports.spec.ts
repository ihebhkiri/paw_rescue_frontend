import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { Geolocation } from '@capacitor/geolocation';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { ReportFormComponent } from './report-form.component';
import { ReportDetailComponent } from './report-detail.component';
import { ReportListComponent } from './report-list.component';
import { mapsUrl, ReportDetail } from './reports';
import { reportIdFromPush } from './rescue-push';

vi.mock('@capacitor/geolocation', () => ({ Geolocation: { getCurrentPosition: vi.fn() } }));
const url = `${environment.apiUrl}/reports/`;
const report: ReportDetail = {
  id: 42, reporter: 1, species_name: 'Chat', type: 'injured', severity: 'critical', description: 'Chat blessé',
  latitude: 36.8123, longitude: 10.1923, address_text: 'Près du parc', status: 'pending', distance_km: 1.2,
  photos: [{ id: 1, image: '/media/chat.jpg' }],
  mission: { id: 12, status: 'open', accepted_at: null, assigned_to_me: false, response: 'pending' },
};

describe('Rescue workflow', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
    vi.mocked(Geolocation.getCurrentPosition).mockResolvedValue({ timestamp: 1, coords: { latitude: 36.8123, longitude: 10.1923, accuracy: 5, altitude: null, altitudeAccuracy: null, heading: null, speed: null, magneticHeading: null, trueHeading: null, headingAccuracy: null, course: null } });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:photo');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });
  afterEach(() => { http.verify(); vi.restoreAllMocks(); });

  it('requires a photo, species, description and GPS then sends persisted values once', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ReportFormComponent), page = fixture.componentInstance;
    page.submit(); http.expectNone(url);
    await page.locate();
    page.form.patchValue({ species: 4, description: ' Chat blessé ' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [new File(['photo'], 'cat.jpg', { type: 'image/jpeg' })] });
    page.selectFile({ target: input } as unknown as Event);
    page.submit(); page.submit();
    const request = http.expectOne(url), data = request.request.body as FormData;
    expect(data.get('latitude')).toBe('36.8123'); expect(data.get('longitude')).toBe('10.1923');
    expect(data.get('description')).toBe('Chat blessé'); expect(data.get('species')).toBe('4');
    expect(data.get('photos')).toBeInstanceOf(File);
    request.flush(report);
    expect(navigate).toHaveBeenCalledWith(['/signalements', 42], { replaceUrl: true });
  });

  it('handles GPS refusal and ignores a late GPS result after departure', async () => {
    const page = TestBed.createComponent(ReportFormComponent).componentInstance;
    vi.mocked(Geolocation.getCurrentPosition).mockRejectedValueOnce(new Error('denied'));
    await page.locate(); expect(page.position()).toBeNull(); expect(page.gpsError()).toContain('autorisez');
    let finish!: (value: Awaited<ReturnType<typeof Geolocation.getCurrentPosition>>) => void;
    vi.mocked(Geolocation.getCurrentPosition).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const pending = page.locate(); page.ionViewWillLeave();
    finish({ timestamp: 1, coords: { latitude: 0, longitude: 0, accuracy: 1, altitude: null, altitudeAccuracy: null, heading: null, speed: null, magneticHeading: null, trueHeading: null, headingAccuracy: null, course: null } });
    await pending; expect(page.position()).toBeNull();
  });

  it('handles a competing acceptance and exposes navigation only after the server assigns it', () => {
    const fixture = TestBed.createComponent(ReportDetailComponent), page = fixture.componentInstance;
    fixture.componentRef.setInput('id', '42'); page.ionViewWillEnter();
    http.expectOne(url + '42/').flush(report);
    page.respond('accepted'); page.respond('accepted');
    http.expectOne(`${environment.apiUrl}/missions/12/response/`).flush({ detail: 'Mission déjà acceptée.' }, { status: 409, statusText: 'Conflict' });
    expect(page.error()).toContain('déjà acceptée'); expect(page.report()?.mission?.assigned_to_me).toBe(false);
    page.load();
    http.expectOne(url + '42/').flush({ ...report, status: 'accepted', mission: { ...report.mission, status: 'accepted', assigned_to_me: true } });
    fixture.detectChanges();
    expect(page.canRespond()).toBe(false);
    expect(page.itinerary()).toBe('https://www.google.com/maps/dir/?api=1&destination=36.8123,10.1923&travelmode=driving');
    expect(fixture.nativeElement.textContent).toContain('Démarrer l’itinéraire');
  });

  it('refuses only the selected proposal and navigates back after success', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ReportDetailComponent), page = fixture.componentInstance;
    fixture.componentRef.setInput('id', '42'); page.load(); http.expectOne(url + '42/').flush(report);
    page.respond('refused');
    const request = http.expectOne(`${environment.apiUrl}/missions/12/response/`);
    expect(request.request.body).toEqual({ response: 'refused' }); request.flush({ response: 'refused' });
    expect(navigate).toHaveBeenCalledWith('/signalements');
  });

  it('distinguishes empty missions from offline errors', () => {
    const fixture = TestBed.createComponent(ReportListComponent), page = fixture.componentInstance;
    page.load(); http.expectOne(`${environment.authApiUrl}/me/`).flush({ role: 'benevole' }); http.expectOne(url).flush([]);
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Aucune mission disponible');
    page.load(); http.expectOne(`${environment.authApiUrl}/me/`).flush({ role: 'benevole' }); http.expectOne(url).error(new ProgressEvent('error'));
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('serveur est inaccessible');
    expect(fixture.nativeElement.textContent).not.toContain('Aucune mission disponible');
  });

  it('uses exact coordinates for Maps and validates push identifiers', () => {
    expect(mapsUrl({ latitude: 0, longitude: -179 })).toContain('destination=0,-179');
    expect(reportIdFromPush({ report_id: '42' })).toBe(42);
    for (const value of [null, {}, { report_id: '../other' }, { report_id: -1 }, { report_id: true }]) expect(reportIdFromPush(value)).toBeNull();
  });

  it('requires confirmation and completes once, then hides mission actions', () => {
    const fixture = TestBed.createComponent(ReportDetailComponent), page = fixture.componentInstance;
    fixture.componentRef.setInput('id', '42'); page.load();
    http.expectOne(url + '42/').flush({ ...report, status: 'accepted', mission: { ...report.mission, status: 'accepted', assigned_to_me: true } });
    fixture.detectChanges();
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('ion-button')) as HTMLElement[];
    buttons.find(button => button.textContent?.includes('Terminer la mission'))!.click();
    expect(page.confirmingCompletion()).toBe(true);
    http.expectNone(`${environment.apiUrl}/missions/12/complete/`);
    page.completeButtons[1].handler?.(); page.complete();
    const request = http.expectOne(`${environment.apiUrl}/missions/12/complete/`);
    expect(request.request.body).toEqual({ outcome: 'rescued' });
    request.flush({ status: 'completed', completed_at: '2026-10-18T12:00:00Z' });
    http.expectOne(url + '42/').flush({ ...report, status: 'rescued', mission: { ...report.mission, status: 'completed', assigned_to_me: true, completed_at: '2026-10-18T12:00:00Z' } });
    fixture.detectChanges();
    expect(page.canComplete()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Mission terminée');
    expect(fixture.nativeElement.textContent).not.toContain('Démarrer l’itinéraire');
    page.complete(); http.expectNone(`${environment.apiUrl}/missions/12/complete/`);
  });

  it('keeps the active mission on completion failure and rejects non-assignee UI actions', () => {
    const fixture = TestBed.createComponent(ReportDetailComponent), page = fixture.componentInstance;
    fixture.componentRef.setInput('id', '42'); page.load();
    http.expectOne(url + '42/').flush({ ...report, mission: { ...report.mission, status: 'accepted', assigned_to_me: false } });
    page.complete(); http.expectNone(`${environment.apiUrl}/missions/12/complete/`);
    page.report.set({ ...report, mission: { ...report.mission!, status: 'accepted', assigned_to_me: true } });
    page.complete();
    http.expectOne(`${environment.apiUrl}/missions/12/complete/`).flush({ detail: 'Réessayez.' }, { status: 409, statusText: 'Conflict' });
    expect(page.canComplete()).toBe(true); expect(page.saving()).toBe(false); expect(page.error()).toContain('Réessayez');
  });

  it('filters available, assigned and completed missions without extra HTTP and combines search', () => {
    const fixture = TestBed.createComponent(ReportListComponent), page = fixture.componentInstance;
    page.load();
    http.expectOne(`${environment.authApiUrl}/me/`).flush({ id: 9, role: 'benevole' });
    http.expectOne(url).flush([
      { ...report, id: 1, address_text: 'Ariana', mission: { ...report.mission, can_accept: true } },
      { ...report, id: 2, mission: { ...report.mission, can_accept: false } },
      { ...report, id: 3, mission: { ...report.mission, status: 'accepted', assigned_to_me: true } },
      { ...report, id: 4, mission: { ...report.mission, status: 'completed', assigned_to_me: true, completed_at: '2026-10-12T10:00:00Z' } },
      { ...report, id: 5, mission: { ...report.mission, status: 'cancelled', assigned_to_me: true } },
      { ...report, id: 6, mission: { ...report.mission, status: 'completed', assigned_to_me: false } },
    ]);
    expect(page.visible().map(item => item.id)).toEqual([1]);
    page.query.set('ARIANA'); expect(page.visible().length).toBe(1);
    page.query.set('absent'); expect(page.visible().length).toBe(0);
    page.query.set(''); page.selected.set('mine'); expect(page.visible().map(item => item.id)).toEqual([3]);
    page.selected.set('completed'); expect(page.visible().map(item => item.id)).toEqual([4]);
    expect(page.visible()[0].date).toContain('2026');
    http.expectNone(url);
    page.ionViewWillLeave(); expect(page.visible()).toEqual([]);
  });
});
