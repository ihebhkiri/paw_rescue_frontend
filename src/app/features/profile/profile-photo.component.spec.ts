import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Camera, CameraSource } from '@capacitor/camera';
import { vi } from 'vitest';
import { ProfilePhotoComponent } from './profile-photo.component';
import { environment } from '../../../environments/environment';

vi.mock('@capacitor/camera', () => ({ Camera: { getPhoto: vi.fn() }, CameraSource: { Camera: 'CAMERA', Photos: 'PHOTOS' }, CameraResultType: { Uri: 'uri' } }));

describe('Profile photo flow', () => {
  let http: HttpTestingController;
  const drawImage = vi.fn();
  const url = `${environment.authApiUrl}/me/`;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ProfilePhotoComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    vi.mocked(Camera.getPhoto).mockResolvedValue({ webPath: 'blob:original', format: 'jpeg', saved: false });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['image']) }));
    vi.stubGlobal('Image', class { src = ''; naturalWidth = 1600; naturalHeight = 1200; decode = async () => undefined; });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillRect: vi.fn(), drawImage } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob(['jpeg'], { type: 'image/jpeg' })));
  });
  afterEach(() => { http.verify(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

  function open() { const page = TestBed.createComponent(ProfilePhotoComponent).componentInstance; page.open(); return page; }

  it('crops centrally, waits for validation, posts only photo once and emits the server URL', async () => {
    const page = open();
    const updated = vi.fn(); page.updated.subscribe(updated);
    await page.choose(CameraSource.Photos);
    expect(page.step()).toBe('preview');
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 200, 0, 1200, 1200, 0, 0, 1024, 1024);
    page.validate(); http.expectNone(url);
    page.step.set('confirm'); page.validate(); page.validate();
    const request = http.expectOne(url);
    expect(request.request.method).toBe('PATCH');
    const data = request.request.body as FormData;
    expect(Array.from(data.keys())).toEqual(['photo']);
    expect((data.get('photo') as File).type).toBe('image/jpeg');
    expect(request.request.headers.has('Content-Type')).toBe(false);
    request.flush({ photo: '/media/users/photos/new.jpg' });
    expect(updated).toHaveBeenCalledWith('/media/users/photos/new.jpg');
    expect(page.step()).toBe('closed');
    expect(page.saving()).toBe(false);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });

  it('uses the camera options requested and repeats the same source', async () => {
    const page = open(); await page.choose(CameraSource.Camera); await page.choose();
    expect(Camera.getPhoto).toHaveBeenLastCalledWith(expect.objectContaining({ source: CameraSource.Camera, quality: 90, allowEditing: false, resultType: 'uri' }));
    expect(Camera.getPhoto).toHaveBeenCalledTimes(2);
    http.expectNone(url);
  });

  it('handles cancellation quietly and permission denial with a clear message', async () => {
    const page = open();
    vi.mocked(Camera.getPhoto).mockRejectedValueOnce(new Error('User cancelled photos app'));
    await page.choose(CameraSource.Photos);
    expect(page.error()).toBe(''); expect(page.picking()).toBe(false);
    vi.mocked(Camera.getPhoto).mockRejectedValueOnce(new Error('User denied access to camera'));
    await page.choose(CameraSource.Camera);
    expect(page.error()).toContain('Accès refusé');
    http.expectNone(url);
  });

  it('retains the preview on upload failure and allows retry', async () => {
    const page = open(); await page.choose(); page.step.set('confirm'); page.validate();
    http.expectOne(url).flush({}, { status: 500, statusText: 'Error' });
    expect(page.saving()).toBe(false); expect(page.preview()).toBe('blob:preview');
    expect(page.error()).not.toBe(''); page.validate();
    http.expectOne(url).flush({ photo: '/new.jpg' });
  });

  it('ignores a camera result after leaving the profile', async () => {
    const page = open();
    let finish!: (photo: Awaited<ReturnType<typeof Camera.getPhoto>>) => void;
    vi.mocked(Camera.getPhoto).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const pending = page.choose(); page.ngOnDestroy();
    finish({ webPath: 'blob:late', format: 'jpeg', saved: false }); await pending;
    expect(page.step()).toBe('closed'); expect(page.preview()).toBe('');
    expect(fetch).not.toHaveBeenCalled(); http.expectNone(url);
  });

  it('shows an error for an unreadable image without uploading', async () => {
    const page = open(); vi.mocked(fetch).mockRejectedValueOnce(new Error('read failed'));
    await page.choose(); expect(page.error()).toContain('Impossible');
    expect(page.picking()).toBe(false); http.expectNone(url);
  });
});
