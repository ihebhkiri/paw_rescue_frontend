import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { AuthService } from '../../auth/service/auth';
import { environment } from '../../../environments/environment';
import { Messaging } from './messaging';

class Socket {
  static instances: Socket[] = [];
  onopen?: () => void; onclose?: (() => void) | null; onerror?: () => void;
  onmessage?: ((event: { data: string }) => void) | null;
  close = vi.fn();
  constructor(readonly url: URL) { Socket.instances.push(this); }
}

describe('Messaging session', () => {
  let http: HttpTestingController;
  const tokens = signal<{ access: string; refresh: string } | null>(null);
  const list = `${environment.apiUrl}/messaging/conversations/`;
  beforeEach(() => {
    vi.stubGlobal('WebSocket', Socket); Socket.instances = []; tokens.set(null);
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'tokens').mockImplementation(tokens);
    vi.spyOn(auth, 'getAccessToken').mockImplementation(() => tokens()?.access || null);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); TestBed.resetTestingModule(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('shares one authenticated socket and closes it and pending requests on logout', () => {
    const service = TestBed.inject(Messaging); tokens.set({ access: 'jwt', refresh: 'refresh' }); TestBed.tick();
    http.expectOne(`${environment.authApiUrl}/me/`).flush({ id: 7 }); http.expectOne(list).flush([]);
    expect(Socket.instances).toHaveLength(1);
    expect(Socket.instances[0].url.pathname).toBe('/ws/messaging/');
    expect(Socket.instances[0].url.searchParams.get('token')).toBe('jwt');
    expect(TestBed.inject(Messaging)).toBe(service);
    tokens.set(null); TestBed.tick();
    expect(Socket.instances[0].close).toHaveBeenCalled(); expect(service.items()).toEqual([]); expect(service.userId()).toBeNull();
  });

  it('resynchronizes after reconnect and ignores unrelated or malformed events', () => {
    vi.useFakeTimers();
    const service = TestBed.inject(Messaging); tokens.set({ access: 'jwt', refresh: 'refresh' }); TestBed.tick();
    http.expectOne(`${environment.authApiUrl}/me/`).flush({ id: 7 }); http.expectOne(list).flush([]);
    const socket = Socket.instances[0]; const event = vi.fn(); service.events.subscribe(event);
    socket.onmessage?.({ data: '{' }); socket.onmessage?.({ data: '{"type":"notification.created"}' }); http.expectNone(list);
    socket.onmessage?.({ data: '{"type":"message.created","conversation_id":12}' });
    http.expectOne(list).flush([{ unread_count: 2 }]); expect(service.unread()).toBe(2); expect(event).toHaveBeenCalledWith(12);
    socket.onclose?.(); expect(service.connection()).toBe('offline'); vi.advanceTimersByTime(1000);
    expect(Socket.instances).toHaveLength(2); Socket.instances[1].onopen?.();
    http.expectOne(list).flush([]); expect(event).toHaveBeenCalledWith(null); expect(service.connection()).toBe('connected');
    tokens.set(null); TestBed.tick(); vi.advanceTimersByTime(30000); expect(Socket.instances).toHaveLength(2);
  });

  it('opens an adoption through the existing REST endpoint without client supplied parties', () => {
    const service = TestBed.inject(Messaging); service.openAdoption(42).subscribe();
    const request = http.expectOne(list); expect(request.request.method).toBe('POST'); expect(request.request.body).toEqual({ adoption_request: 42 }); request.flush({ id: 15 });
  });
});
