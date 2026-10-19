const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const frontend = path.resolve(__dirname, '..');
const backend = path.resolve(frontend, '../backend');
const output = path.join(frontend, 'tmp/rescue-flow');
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
Species.objects.create(name='Chat')
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
    const citizen = await login('citizen@rescue.test');
    await citizen.goto(base + '/signalements/nouveau');
    await citizen.getByLabel('Type d’animal').selectOption({ label: 'Chat' });
    await citizen.getByLabel('Description', { exact: true }).fill('Chat blessé près du parc — vérification réelle.');
    await citizen.locator('input[type=file]').setInputFiles(path.join(frontend, 'src/assets/images/animals/luna.webp'));
    await citizen.getByText('Position détectée :').waitFor();
    for (const width of [360, 768, 1280]) {
      await citizen.setViewportSize({ width, height: 1000 });
      assert.ok(await citizen.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await citizen.screenshot({ path: path.join(output, 'form-' + width + '.png'), fullPage: true });
    }
    const created = citizen.waitForResponse(response => response.url().endsWith('/api/reports/') && response.request().method() === 'POST');
    await citizen.getByRole('button', { name: 'Signaler', exact: true }).click();
    const creation = await created;
    assert.equal(creation.status(), 201, await creation.text());
    const report = await creation.json();
    assert.equal(report.latitude, 36.8123); assert.equal(report.longitude, 10.1923);
    assert.equal(report.status, 'pending'); assert.equal(report.photos.length, 1);
    await citizen.waitForURL(base + '/signalements/' + report.id);
    const a = await login('a@rescue.test'), b = await login('b@rescue.test');
    await a.goto(base + '/notifications');
    await a.locator('.notification-row').first().click();
    await a.waitForURL(base + '/signalements/' + report.id);
    await a.getByRole('button', { name: 'Refuser', exact: true }).click();
    await a.waitForURL(base + '/signalements');
    await a.getByText('Aucune mission disponible').waitFor();
    await b.goto(base + '/signalements');
    await b.locator('.view-mission').first().click();
    await b.getByRole('button', { name: 'Accepter la mission', exact: true }).click();
    await b.locator('ion-alert button').filter({ hasText: /^Accepter$/ }).click();
    await b.getByText('Cette mission vous est attribuée.').waitFor();
    const maps = b.locator('a[href*="google.com/maps/dir/"]');
    assert.equal(await maps.getAttribute('href'), 'https://www.google.com/maps/dir/?api=1&destination=36.8123,10.1923&travelmode=driving');
    assert.equal(await b.locator('iframe.map').getAttribute('src').then(value => value.includes('marker=36.8123,10.1923')), true);
    for (const width of [360, 768, 1280]) {
      await b.setViewportSize({ width, height: 1000 });
      assert.ok(await b.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await b.screenshot({ path: path.join(output, 'accepted-' + width + '.png'), fullPage: true });
    }
    await citizen.reload();
    await citizen.getByText('Cette mission a déjà été acceptée').waitFor();
    const completions = () => calls.filter(call => call.method === 'POST' && call.path.endsWith('/complete/')).length;
    await b.getByRole('button', { name: 'Terminer la mission', exact: true }).click();
    await b.locator('ion-alert button').filter({ hasText: 'Garder active' }).click();
    assert.equal(completions(), 0);
    await b.getByRole('button', { name: 'Terminer la mission', exact: true }).click();
    await b.locator('ion-alert button').filter({ hasText: 'Confirmer le secours' }).click();
    await b.getByText('Mission terminée — animal secouru.').waitFor();
    assert.equal(completions(), 1);
    assert.equal(await b.getByRole('button', { name: 'Terminer la mission', exact: true }).count(), 0);
    assert.equal(await b.locator('a[href*="google.com/maps/dir/"]').count(), 0);
    await b.screenshot({ path: path.join(output, 'completed.png'), fullPage: true });
    await b.getByRole('link', { name: 'Voir les signalements et missions' }).click();
    await b.waitForURL(base + '/signalements');
    await b.getByRole('button', { name: 'Terminées', exact: true }).click();
    await b.locator('.mission-card').first().waitFor();
    assert.equal(await b.locator('.mission-card').count(), 1);
    await b.getByRole('button', { name: 'Mes missions', exact: true }).click();
    await b.getByText('Vous n’avez pas de mission en cours.').waitFor();
    await citizen.reload();
    await citizen.getByText('Mission terminée — animal secouru.').waitFor();
    assert.deepEqual(errors, []);
    console.log('Rescue E2E passed: real multipart creation/GPS/photo, notification deep link, individual refusal, acceptance, exact Maps destination, confirmed completion and completed tab; 360/768/1280 screenshots without overflow.');
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


