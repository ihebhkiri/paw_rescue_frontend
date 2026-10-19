import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RefugeHomeComponent } from './refuge-home.component';
import { HomeComponent } from './home.component';
import { environment } from '../../../environments/environment';

const api = environment.apiUrl;
describe('Refuge Home', () => {
  let http: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] }); http = TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());
  it('loads only refuge datasets, counts before slicing and separates urgency from workflow', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.componentInstance.load();
    http.expectOne(`${environment.authApiUrl}/me/`).flush({ role: 'refuge', profile: { name: 'Refuge Béja', governorate: 'Béja' } });
    fixture.detectChanges();
    http.expectNone(`${api}/animals/adoptable/`); http.expectNone(`${api}/shelters/`);
    const reports = Array.from({ length: 5 }, (_, id) => ({ id, species_name: 'Chat', type: 'injured', status: id === 4 ? 'rescued' : 'pending', severity: id === 2 || id === 4 ? 'critical' : 'mild', created_at: '2026-10-19T10:00:00Z', photos: [] }));
    http.expectOne(`${api}/reports/`).flush(reports);
    http.expectOne(`${api}/animals/?mine=true`).flush(['in_shelter','reserved','adopted','stray'].map((status, id) => ({ id, name: 'Animal', status, sex: 'F', estimated_age_months: 24, photos: [] })));
    http.expectOne(`${api}/adoptions/`).flush([
      ...Array.from({ length: 3 }, (_, id) => ({ id, status: 'pending', animal_details: { name: 'Chat', photos: [] } })),
      { id: 4, status: 'approved', reviewed_at: new Date().toISOString() },
      { id: 5, status: 'approved', reviewed_at: '2000-01-01' },
      { id: 6, status: 'approved', reviewed_at: null },
    ]);
    http.expectOne(`${api}/notifications/`).flush([{ is_read: false }]);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(Array.from(element.querySelectorAll('.stat strong'), item => item.textContent?.trim())).toEqual(['4','2','3','1']);
    expect(element.querySelectorAll('.report').length).toBe(3);
    expect(element.querySelector('.report .badge')?.textContent).toBe('Urgent');
    expect(element.querySelectorAll('.animal').length).toBe(2);
    expect(element.textContent).toContain('Bonjour Refuge Béja');
    expect(element.textContent).not.toContain('Refuges proches');
    expect(element.querySelectorAll('ion-tab-button').length).toBe(5);
    fixture.componentInstance.ionViewWillLeave(); fixture.detectChanges();
    expect(element.querySelector('app-refuge-home')).toBeNull();
  });
  it('keeps missing counts unknown on failure and cancels pending requests on destruction', () => {
    const fixture = TestBed.createComponent(RefugeHomeComponent);
    fixture.componentRef.setInput('user', { role: 'refuge', profile: null }); fixture.detectChanges();
    http.expectOne(`${api}/reports/`).flush({}, { status: 500, statusText: 'Error' });
    http.expectOne(`${api}/animals/?mine=true`).flush([]);
    http.expectOne(`${api}/adoptions/`).flush([]);
    http.expectOne(`${api}/notifications/`).flush([]);
    fixture.detectChanges();
    expect(fixture.componentInstance.stats().map(item => item.count)).toEqual([undefined,0,0,0]);
    expect(fixture.nativeElement.textContent).toContain('Aucun animal hébergé');
    fixture.componentInstance.load();
    const pending = http.match(request => request.url.startsWith(api));
    fixture.destroy(); expect(pending.every(request => request.cancelled)).toBe(true);
  });
});
