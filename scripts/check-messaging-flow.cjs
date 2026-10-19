const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const frontend = path.resolve(__dirname, '..');
const backend = path.resolve(frontend, '../backend');
const output = path.join(frontend, 'tmp/messaging-flow');
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
from shelters.models import Refuge
from animals.models import Animal, AnimalPhoto, Species
from django.core.files import File
volunteer = User.objects.create_user(username='volunteer', email='volunteer@adoption.test', password='AdoptionTest123!', role='benevole', first_name='Oussama')
owner = User.objects.create_user(username='refuge', email='refuge@adoption.test', password='AdoptionTest123!', role='refuge')
refuge = Refuge.objects.create(user=owner, name='Refuge de Tunis', latitude=36.8, longitude=10.2, is_verified=True)
species = Species.objects.create(name='Chien')
Species.objects.create(name='Chat')
for name, asset in [('Milo', 'max.webp'), ('Luna', 'luna.webp'), ('Nala', 'mimi.webp')]:
    animal = Animal.objects.create(name=name, species=species, refuge=refuge, sex='M', estimated_age_months=18, behavior='Calme et affectueux', is_adoptable=True)
    with open(os.path.join(sys.argv[4], asset), 'rb') as source:
        AnimalPhoto.objects.create(animal=animal, image=File(source, name=asset), is_primary=True)
from adoptions.models import AdoptionRequest
AdoptionRequest.objects.create(applicant=volunteer, animal=Animal.objects.get(pk=1), refuge=refuge)
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
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const response = await context.request.post(base + '/api/auth/token/', { data: { email, password: 'AdoptionTest123!' } });
      assert.equal(response.status(), 200, await response.text());
      const tokens = await response.json();
      await context.addInitScript(tokens => { localStorage.setItem('access_token', tokens.access); localStorage.setItem('refresh_token', tokens.refresh); }, tokens);
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      return page;
    }
    const applicant = await login('volunteer@adoption.test');
    const refuge = await login('refuge@adoption.test');
    let applicantSockets = 0;
    let refugeSockets = 0;
    applicant.on('websocket', () => applicantSockets++);
    refuge.on('websocket', () => refugeSockets++);
    await applicant.goto(base + '/adoptions/1');
    await applicant.getByRole('button', { name: 'Ouvrir la conversation' }).click();
    await applicant.waitForURL('**/messages/*');
    const chatUrl = applicant.url();
    await applicant.getByText('En attente de l’acceptation de votre interlocuteur.').waitFor();
    await refuge.goto(base + '/messages');
    await refuge.locator('ion-item').filter({ hasText: 'Oussama' }).click();
    await refuge.waitForURL(chatUrl);
    await refuge.getByRole('button', { name: 'Accepter la conversation' }).click();
    await applicant.locator('ion-textarea textarea').waitFor();
    await applicant.locator('ion-textarea textarea').fill('Bonjour, Milo est-il disponible ?');
    await applicant.getByRole('button', { name: 'Envoyer', exact: true }).click();
    await refuge.locator('.chat-messages p').filter({ hasText: 'Bonjour, Milo est-il disponible ?' }).waitFor();
    assert.equal(await refuge.locator('.chat-messages li').count(), 1);
    await refuge.locator('ion-textarea textarea').fill('Oui, avec plaisir !');
    await refuge.getByRole('button', { name: 'Envoyer', exact: true }).click();
    await applicant.locator('.chat-messages p').filter({ hasText: 'Oui, avec plaisir !' }).waitFor();
    assert.equal(await applicant.locator('.chat-messages li').count(), 2);
    for (const width of [360, 768, 1280]) {
      await applicant.setViewportSize({ width, height: 900 });
      assert.equal(await applicant.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await applicant.screenshot({ path: path.join(output, `chat-${width}.png`) });
    }
    await refuge.locator('ion-back-button').click();
    await refuge.waitForURL('**/messages');
    await applicant.locator('ion-textarea textarea').fill('Merci pour votre réponse.');
    await applicant.getByRole('button', { name: 'Envoyer', exact: true }).click();
    await refuge.locator('ion-item ion-badge').filter({ hasText: '1' }).waitFor();
    await refuge.locator('ion-tab-button[tab=messages] ion-badge').filter({ hasText: '1' }).waitFor();
    await refuge.screenshot({ path: path.join(output, 'list-unread.png') });
    await refuge.locator('ion-item').filter({ hasText: 'Oussama' }).click();
    await refuge.waitForURL(chatUrl);
    await refuge.locator('.chat-messages p').filter({ hasText: 'Merci pour votre réponse.' }).waitFor();
    await refuge.locator('ion-back-button').click();
    await refuge.locator('ion-item ion-badge').waitFor({ state: 'hidden' });
    await refuge.locator('ion-tab-button[tab=adoptions]').click();
    await refuge.waitForURL('**/adoptions');
    await refuge.locator('.request-card').first().click();
    await refuge.getByRole('button', { name: 'Ouvrir la conversation' }).click();
    await refuge.waitForURL(chatUrl);
    assert.equal(applicantSockets, 1); assert.equal(refugeSockets, 1);
    assert.deepEqual(errors, []);
    console.log('Messaging E2E passed: same conversation, acceptance, real WebSocket both directions, no duplicates, unread/read, shared socket, responsive screenshots.');
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

