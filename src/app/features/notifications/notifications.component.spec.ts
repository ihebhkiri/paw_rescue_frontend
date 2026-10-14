import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NotificationsComponent, NotificationResponse } from './notifications.component';
import { environment } from '../../../environments/environment';

const url = `${environment.apiUrl}/notifications/`;
const item: NotificationResponse = { id: 12, type: 'new_message', title: 'Un message réel', body: 'Bonjour', is_read: false, created_at: '2026-10-12T10:00:00Z' };

describe('Dynamic notifications', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [NotificationsComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function open() {
    const fixture = TestBed.createComponent(NotificationsComponent);
    fixture.detectChanges();
    fixture.componentInstance.ionViewWillEnter();
    return fixture;
  }

  it('renders real content, filters server types, and retains unknown types in System', () => {
    const fixture = open();
    const page = fixture.componentInstance;
    http.expectOne(url).flush([item, { ...item, id: 13, type: 'future_type' }, { ...item, id: 14, type: 'new_report' }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Un message réel');
    expect(fixture.nativeElement.textContent).toContain('2026');
    expect(fixture.nativeElement.querySelector('[href*="signalements"]')).toBeNull();
    page.selectedFilter.set('MESSAGE');
    expect(page.visibleItems().map(value => value.id)).toEqual([12]);
    page.selectedFilter.set('SYSTEM');
    expect(page.visibleItems().map(value => value.id)).toEqual([13]);
    page.selectedFilter.set('REPORT');
    expect(page.visibleItems().map(value => value.id)).toEqual([14]);
  });

  it('marks read after confirmation and prevents duplicate writes', () => {
    const fixture = open();
    const page = fixture.componentInstance;
    http.expectOne(url).flush([item]);
    page.markRead(page.items()[0]);
    page.markRead(page.items()[0]);
    expect(page.items()[0].is_read).toBe(false);
    const save = http.expectOne(`${url}12/read/`);
    expect(save.request.method).toBe('POST');
    save.flush({ ...item, is_read: true });
    expect(page.items()[0].is_read).toBe(true);
    expect(page.readingId()).toBeNull();
    page.markRead(page.items()[0]);
    http.expectNone(`${url}12/read/`);
  });

  it('retains unread state on failure and permits retry', () => {
    const page = open().componentInstance;
    http.expectOne(url).flush([item]);
    page.markRead(page.items()[0]);
    http.expectOne(`${url}12/read/`).flush({}, { status: 500, statusText: 'Error' });
    expect(page.items()[0].is_read).toBe(false);
    expect(page.readingId()).toBeNull();
    page.markRead(page.items()[0]);
    http.expectOne(`${url}12/read/`).flush({ ...item, is_read: true });
  });

  it('distinguishes empty and error states, and reloads on reentry', () => {
    const fixture = open();
    const page = fixture.componentInstance;
    http.expectOne(url).flush([], { status: 200, statusText: 'OK' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Aucune notification');
    page.ionViewWillLeave();
    expect(page.items()).toEqual([]);
    page.ionViewWillEnter();
    http.expectOne(url).error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('serveur est inaccessible');
    expect(fixture.nativeElement.textContent).not.toContain('Aucune notification');
    page.load();
    const pending = http.expectOne(url);
    fixture.destroy();
    expect(pending.cancelled).toBe(true);
  });
});
