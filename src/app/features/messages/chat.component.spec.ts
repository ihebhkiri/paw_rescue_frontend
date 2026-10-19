import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ChatComponent } from './chat.component';
import { Conversation } from './messaging';
import { environment } from '../../../environments/environment';

const url = `${environment.apiUrl}/messaging/conversations/15/`;
const conversation: Conversation = { id: 15, status: 'accepted', refuge: 2, refuge_name: 'Refuge', veterinaire: null, veterinaire_name: null, participant: 7, participant_name: 'Nora', requested_by: 7, blocked_by: null, report: null, animal: 3, needs_response: false, photo: null, last_message: null, messages: [], unread_count: 0, created_at: '', updated_at: '', adoption: { id: 42, animal: 3, animal_name: 'Milo', status: 'pending', photo: null } };

describe('Conversation screen', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [ChatComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function open(item = conversation) {
    const fixture = TestBed.createComponent(ChatComponent); fixture.componentRef.setInput('id', '15'); fixture.detectChanges();
    const page = fixture.componentInstance; page.ionViewWillEnter(); http.expectOne(url).flush(item); return page;
  }
  it('blocks whitespace and double sends, keeps failed text and uses authoritative history', () => {
    const page = open(); page.draft.set('  '); page.send(); http.expectNone(url + 'messages/');
    page.draft.set('Bonjour'); page.send(); page.send();
    const post = http.expectOne(url + 'messages/'); expect(post.request.body).toEqual({ body: 'Bonjour' });
    post.flush({}, { status: 500, statusText: 'Error' }); expect(page.draft()).toBe('Bonjour'); expect(page.saving()).toBe(false);
    page.send(); const message = { id: 1, sender: 7, body: 'Bonjour', is_read: false, created_at: '2026-10-15T10:00:00Z' };
    http.expectOne(url + 'messages/').flush(message); expect(page.draft()).toBe('');
    http.expectOne(url).flush({ ...conversation, messages: [message] }); expect(page.item()?.messages).toHaveLength(1);
  });
  it('does not send until accepted and cancels detail loading on departure', () => {
    const page = open({ ...conversation, status: 'pending' }); page.draft.set('Bonjour'); page.send(); http.expectNone(url + 'messages/');
    page.load(); const pending = http.expectOne(url); page.ionViewWillLeave(); expect(pending.cancelled).toBe(true); expect(page.item()).toBeNull();
  });
});
