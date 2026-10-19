const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const frontend = path.resolve(__dirname, '..');
const backend = path.resolve(frontend, '../backend');
const output = path.join(frontend, 'tmp/missions-screen');
const bundle = path.join(frontend, 'www');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png' };
const calls = [];

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const probe = http.createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const apiPort = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const database = path.join(output, `test-${Date.now()}.sqlite3`);
  const bootstrap = path.join(output, 'test-server.py');
  fs.writeFileSync(bootstrap, `import os, sys
sys.path.insert(0, sys.argv[1])
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
from django.conf import settings
settings.DATABASES['default']['NAME'] = sys.argv[2]
settings.MEDIA_ROOT = os.path.join(os.path.dirname(sys.argv[2]), 'media-' + os.path.basename(sys.argv[2]))
settings.SECRET_KEY = 'isolated-adoption-e2e-test-key-with-more-than-32-characters'
settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
import django
django.setup()
from django.core.management import call_command
call_command('migrate', verbosity=0, interactive=False)
from accounts.models import User
from accounts.models import BenevoleProfile
from animals.models import Species
settings.FCM_ENABLED = False
citizen = User.objects.create_user(username='citizen', email='citizen@rescue.test', password='RescueTest123!', role='citoyen')
for name in ['a', 'b']:
    user = User.objects.create_user(username=name, email=name + '@rescue.test', password='RescueTest123!', role='benevole')
    BenevoleProfile.objects.create(user=user, latitude=36.8123, longitude=10.1923)
species = Species.objects.create(name='Chat')
from shelters.models import Refuge
from animals.models import Animal, AnimalPhoto
from reports.models import Report, ReportPhoto
from django.core.files import File
citizen.first_name = 'Sarah'
citizen.save()
owner = User.objects.create_user(username='shelter', email='shelter@rescue.test', password='RescueTest123!', role='refuge')
refuge = Refuge.objects.create(user=owner, name='Refuge Les Pattes Heureuses', is_verified=True, governorate='Ariana', address='Ariana, Tunisie', latitude=36.82, longitude=10.18)
for index, name in enumerate(['Luna', 'Rocky', 'Mimi', 'Max']):
    animal = Animal.objects.create(name=name, species=species, refuge=refuge, estimated_age_months=24, sex='F', is_adoptable=True, breed='Croisée', size='small', behavior='Calme et sociable')
    with open(os.path.join(sys.argv[4], name.lower() + '.webp'), 'rb') as photo:
        AnimalPhoto.objects.create(animal=animal, image=File(photo, name=name.lower()+'.webp'), is_primary=True)
for index, name in enumerate(['luna', 'rocky', 'mimi']):
    report = Report.objects.create(reporter=citizen, species=species, type='injured' if index == 0 else 'stray', severity='critical' if index == 0 else 'mild', description='Animal près du parc', latitude=36.81, longitude=10.18, address_text=['Ariana', 'La Marsa', 'Tunis Centre'][index], assigned_refuge=refuge, status='pending' if index == 1 else 'rescued')
    with open(os.path.join(sys.argv[4], name + '.webp'), 'rb') as photo:
        ReportPhoto.objects.create(report=report, image=File(photo, name=name+'.webp'))
from missions.models import Mission, MissionResponse
from django.utils import timezone
volunteer = User.objects.get(username='a')
BenevoleProfile.objects.filter(user=volunteer).update(max_missions=10)
for index in range(7):
    report = Report.objects.create(reporter=citizen, species=species, type='injured' if index % 2 == 0 else 'stray', severity=['critical','moderate','','mild','mild','mild','mild'][index], description='Mission réelle de test', latitude=36.81, longitude=10.18, address_text=['Ariana','La Marsa','Tunis Centre','Sidi Bou Saïd','Manouba','Bizerte','Sousse'][index])
    name = ['luna','rocky','mimi','max','luna','mimi','rocky'][index]
    with open(os.path.join(sys.argv[4], name+'.webp'), 'rb') as photo:
        ReportPhoto.objects.create(report=report, image=File(photo, name=name+'.webp'))
    state = 'open' if index < 5 else 'accepted' if index == 5 else 'completed'
    mission = Mission.objects.create(report=report, type='transport' if index == 4 else 'medical_emergency' if index == 2 else 'rescue', target_latitude=36.81, target_longitude=10.18, status=state, assigned_benevole=volunteer if index >= 5 else None, completed_at=timezone.now() if index == 6 else None)
    MissionResponse.objects.create(mission=mission, user=volunteer, response='pending' if index < 5 else 'accepted')
call_command('runserver', '127.0.0.1:' + sys.argv[3], use_reloader=False, verbosity=0)
`);
  const python = process.env.ADOPTION_PYTHON || path.join(backend, '.venv/Scripts/python.exe');
  const api = spawn(python, [bootstrap, backend, database, String(apiPort), path.join(frontend, 'src/assets/images/animals')], { cwd: backend, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  api.stderr.on('data', chunk => { logs += chunk; });
  api.stdout.on('data', chunk => { logs += chunk; });
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname.startsWith('/api/') || pathname.startsWith('/media/')) {
      calls.push({ method: request.method, path: pathname });
      const proxy = http.request({ hostname: '127.0.0.1', port: apiPort, path: request.url, method: request.method, headers: { ...request.headers, host: `127.0.0.1:${apiPort}` } }, result => {
        response.writeHead(result.statusCode, result.headers); result.pipe(response);
      });
      proxy.on('error', () => response.writeHead(502).end());
      request.pipe(proxy); return;
    }
    let file = path.resolve(bundle, '.' + decodeURIComponent(pathname));
    if (!file.startsWith(bundle + path.sep) && file !== bundle) { response.writeHead(403).end(); return; }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(bundle, 'index.html');
    response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(response);
  });
  server.on('upgrade', (request, socket, head) => {
    const upstream = require('node:net').connect(apiPort, '127.0.0.1', () => {
      const headers = [];
      for (let i = 0; i < request.rawHeaders.length; i += 2) headers.push(request.rawHeaders[i] + ': ' + request.rawHeaders[i + 1]);
      upstream.write(`${request.method} ${request.url} HTTP/${request.httpVersion}\r\n${headers.join('\r\n')}\r\n\r\n`);
      if (head.length) upstream.write(head);
      socket.pipe(upstream).pipe(socket);
    });
    upstream.on('error', () => socket.destroy()); socket.on('error', () => upstream.destroy());
    socket.on('close', () => upstream.destroy());
  });
  let browser;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 90; attempt++) {
      if (api.exitCode !== null) throw new Error(`Django test server stopped: ${logs}`);
      try { const result = await fetch(`http://127.0.0.1:${apiPort}/api/health/`); if (result.ok) { ready = true; break; } } catch { /* Wait for migrations and startup. */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.ok(ready, `Django startup timed out: ${logs}`);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ channel: 'msedge', headless: true });

    const errors = [];
    async function login(email) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, geolocation: { latitude: 36.8123, longitude: 10.1923 }, permissions: ['geolocation'], reducedMotion: 'reduce' });
      const response = await context.request.post(base + '/api/auth/token/', { data: { email, password: 'RescueTest123!' } });
      assert.equal(response.status(), 200, await response.text());
      const tokens = await response.json();
      await context.addInitScript(tokens => { localStorage.setItem('access_token', tokens.access); localStorage.setItem('refresh_token', tokens.refresh); }, tokens);
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      return page;
    }
    const shelter = await login('shelter@rescue.test');
    await shelter.goto(base + '/signalements');
    await shelter.locator('.refuge-card').first().waitFor();
    assert.equal(await shelter.locator('.refuge-card').count(), 3);
    await shelter.waitForFunction(() => [...document.querySelectorAll('.refuge-card img')].every(img => img.complete && img.naturalWidth));
    for (const width of [360, 768, 1234]) {
      await shelter.setViewportSize({ width, height: 1274 });
      assert.ok(await shelter.locator('app-report-list ion-content').evaluate(async el => { const scroll = await el.getScrollElement(); return scroll.scrollWidth <= scroll.clientWidth; }));
      await shelter.screenshot({ path: path.join(output, 'refuge-' + width + '.png'), fullPage: true });
    }
    await shelter.getByRole('button', { name: 'Secouru 2', exact: true }).click();
    await shelter.waitForFunction(() => document.querySelectorAll('.refuge-card').length === 2);
    await shelter.getByRole('button', { name: 'En attente 1', exact: true }).click();
    await shelter.waitForFunction(() => document.querySelectorAll('.refuge-card').length === 1);
    await shelter.getByRole('button', { name: 'Tous 3', exact: true }).click();
    await shelter.waitForFunction(() => document.querySelectorAll('.refuge-card').length === 3);
    const newest = await shelter.locator('.refuge-card').first().getAttribute('href');
    await shelter.getByRole('combobox').selectOption('oldest');
    await shelter.waitForFunction(newest => document.querySelector('.refuge-card').getAttribute('href') !== newest, newest);
    await shelter.locator('.refuge-card').first().click();
    await shelter.waitForURL(/\/signalements\/\d+$/);
    await shelter.locator('app-report-detail ion-back-button').click();
    await shelter.waitForURL(base + '/signalements');
    await shelter.locator('.report-cta').click();
    await shelter.waitForURL(base + '/signalements/nouveau');
    const page = await login('a@rescue.test');
    page.setDefaultTimeout(20000);
    await page.goto(base + '/signalements');
    await page.locator('.mission-card').first().waitFor();
    assert.equal(await page.locator('.mission-card').count(), 5);
    await page.waitForFunction(() => [...document.querySelectorAll('.mission-card img')].every(img => img.complete && img.naturalWidth));
    for (const width of [360, 768, 1280]) {
      await page.setViewportSize({ width, height: 1100 });
      assert.ok(await page.locator('app-report-list ion-content').evaluate(async el => { const scroll = await el.getScrollElement(); return scroll.scrollWidth <= scroll.clientWidth; }));
      await page.screenshot({ path: path.join(output, 'missions-' + width + '.png'), fullPage: true });
    }
    const reads = calls.filter(call => call.path === '/api/reports/' && call.method === 'GET').length;
    await page.getByRole('button', { name: 'Mes missions', exact: true }).click();
    await page.locator('.mission-card').filter({ hasText: 'Bizerte' }).waitFor();
    assert.equal(await page.locator('.mission-card').count(), 1);
    await page.getByRole('button', { name: 'Terminées', exact: true }).click();
    await page.locator('.mission-card').filter({ hasText: 'Sousse' }).waitFor();
    await page.getByRole('button', { name: 'Disponibles', exact: true }).click();
    await page.getByRole('searchbox').fill('ariana');
    await page.locator('.mission-card').filter({ hasText: 'Ariana' }).waitFor();
    assert.equal(await page.locator('.mission-card').count(), 1);
    assert.equal(calls.filter(call => call.path === '/api/reports/' && call.method === 'GET').length, reads);
    await page.locator('.view-mission').click();
    await page.waitForURL(/\/signalements\/\d+$/);
    await page.locator('app-report-detail ion-back-button').click();
    await page.waitForURL(base + '/signalements');
    await page.locator('app-report-list').waitFor({ state: 'visible' });
    await page.getByRole('searchbox').fill('introuvable');
    await page.getByText('Aucune mission ne correspond à votre recherche.').waitFor();
    await page.getByRole('searchbox').fill('');
    await page.route('**/api/reports/', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
    await page.locator('summary').click();
    await page.getByRole('button', { name: 'Actualiser la liste' }).click();
    await page.locator('.state.error').waitFor();
    assert.equal(await page.locator('.mission-card').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS missions: 3 segments, search without HTTP, details/back, error/empty, 360/768/1280 screenshots and no overflow.');
  } catch (error) {
    if (browser) {
      for (const [index, context] of browser.contexts().entries()) {
        const page = context.pages()[0];
        if (page) {
          console.error('Browser diagnostics', page.url(), await page.locator('body').innerText());
          await page.screenshot({ path: path.join(output, `failure-${index}.png`) });
        }
      }
    }
    console.error(logs.slice(-4000));
    throw error;
  } finally {
    if (browser) await browser.close();
    if (server.listening) await new Promise(resolve => server.close(resolve));
    api.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });


