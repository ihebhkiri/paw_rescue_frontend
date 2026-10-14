const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const frontend = path.resolve(__dirname, '..');
const backend = path.resolve(frontend, '../backend');
const output = path.join(frontend, 'tmp/adoption-flow');
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
settings.SECRET_KEY = 'isolated-adoption-e2e-test-key-with-more-than-32-characters'
settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
import django
django.setup()
from django.core.management import call_command
call_command('migrate', verbosity=0, interactive=False)
from accounts.models import User
from shelters.models import Refuge
from animals.models import Animal, Species
volunteer = User.objects.create_user(username='volunteer', email='volunteer@adoption.test', password='AdoptionTest123!', role='benevole', first_name='Oussama')
owner = User.objects.create_user(username='refuge', email='refuge@adoption.test', password='AdoptionTest123!', role='refuge')
refuge = Refuge.objects.create(user=owner, name='Refuge de Tunis', latitude=36.8, longitude=10.2, is_verified=True)
species = Species.objects.create(name='Chien')
for name in ['Milo', 'Luna', 'Nala']:
    Animal.objects.create(name=name, species=species, refuge=refuge, sex='M', estimated_age_months=18, behavior='Calme et affectueux', is_adoptable=True)
call_command('runserver', '127.0.0.1:' + sys.argv[3], use_reloader=False, verbosity=0)
`);
  const python = process.env.ADOPTION_PYTHON || path.join(backend, '.venv/Scripts/python.exe');
  const api = spawn(python, [bootstrap, backend, database, String(apiPort)], { cwd: backend, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  api.stderr.on('data', chunk => { logs += chunk; });
  api.stdout.on('data', chunk => { logs += chunk; });
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname.startsWith('/api/')) {
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
    const volunteer = await login('volunteer@adoption.test');
    const refuge = await login('refuge@adoption.test');
    async function open(page, route, selector, text) {
      await page.goto(base + route);
      await page.locator(selector).filter({ hasText: text }).waitFor();
    }
    async function screenshot(page, label) {
      for (const width of [360, 768, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(async () => {
          await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
        });
        const dimensions = await page.locator('ion-content').last().evaluate(async element => {
          const area = await element.getScrollElement(); return { width: area.clientWidth, scrollWidth: area.scrollWidth };
        });
        assert.ok(dimensions.scrollWidth <= dimensions.width + 1, `${label} overflow ${width}`);
        await page.screenshot({ path: path.join(output, `${label}-${width}.png`) });
      }
      await page.setViewportSize({ width: 390, height: 844 });
    }
    const postCount = () => calls.filter(call => call.method === 'POST' && call.path === '/api/adoptions/').length;
    async function submit(page, id, name) {
      await open(page, `/animals/${id}`, 'app-adoption-request', 'Demander l’adoption');
      await page.getByRole('button', { name: 'Demander l’adoption', exact: true }).click();
      await page.locator('ion-modal input, ion-modal textarea').first().fill(`Je souhaite accueillir ${name}.`);
      await page.getByRole('button', { name: 'Envoyer la demande', exact: true }).click();
      try { await page.locator('app-adoption-request .success').waitFor(); }
      catch (error) {
        console.error('Submission diagnostics', calls, await page.locator('body').innerText(), errors, logs);
        await page.screenshot({ path: path.join(output, 'submission-failure.png') });
        throw error;
      }
    }
    await open(volunteer, '/profile', 'app-profile', 'Demandes d’adoption');
    await volunteer.getByRole('link', { name: 'Demandes d’adoption', exact: true }).click();
    await volunteer.locator('app-adoption-list .empty').waitFor();
    await submit(volunteer, 1, 'Milo');
    assert.equal(postCount(), 1);
    await open(volunteer, '/animals/1', 'app-adoption-request', 'Demande en attente');
    assert.equal(await volunteer.getByRole('button', { name: 'Demander l’adoption', exact: true }).count(), 0);
    await open(refuge, '/notifications', 'app-notifications', 'Oussama souhaite adopter Milo');
    await refuge.locator('.notification-row').filter({ hasText: 'Oussama souhaite adopter Milo' }).click();
    await refuge.waitForURL('**/adoptions/1');
    await refuge.getByRole('button', { name: 'Accepter la demande', exact: true }).waitFor();
    await screenshot(refuge, 'refuge-detail');
    await open(volunteer, '/adoptions', 'app-adoption-list', 'Milo');
    await screenshot(volunteer, 'my-requests');
    await open(volunteer, '/animals/2', 'app-adoption-request', 'Demander l’adoption');
    await volunteer.getByRole('button', { name: 'Demander l’adoption', exact: true }).click();
    await volunteer.locator('ion-modal textarea').waitFor();
    assert.equal(postCount(), 1, 'opening the modal must not send a request');
    await screenshot(volunteer, 'request-modal');
    await volunteer.getByRole('button', { name: 'Annuler', exact: true }).click();
    await volunteer.locator('ion-modal').waitFor({ state: 'hidden' });
    assert.equal(postCount(), 1, 'cancel must not send a request');
    async function decide(page, button, confirm) {
      await page.getByRole('button', { name: button, exact: true }).click();
      await page.locator('ion-alert').waitFor();
      await page.getByRole('button', { name: confirm ? 'Confirmer' : 'Retour', exact: true }).click();
      await page.locator('ion-alert').waitFor({ state: 'hidden' });
    }
    await decide(refuge, 'Accepter la demande', false);
    await refuge.getByRole('button', { name: 'Accepter la demande', exact: true }).waitFor();
    await decide(refuge, 'Accepter la demande', true);
    await refuge.locator('.status.approved').waitFor();
    assert.equal(await refuge.getByRole('button', { name: 'Refuser la demande', exact: true }).count(), 0);
    await open(volunteer, '/notifications', 'app-notifications', 'Demande acceptée');
    await volunteer.locator('.notification-row').filter({ hasText: 'Demande acceptée' }).click();
    await volunteer.waitForURL('**/adoptions/1');
    await volunteer.locator('.status.approved').waitFor();
    assert.equal(await volunteer.getByRole('button', { name: 'Accepter la demande', exact: true }).count(), 0);
    await open(refuge, '/adoptions', 'app-adoption-list', 'Demandes reçues');
    await refuge.locator('.empty').waitFor();
    await refuge.getByRole('button', { name: 'Acceptées', exact: true }).click();
    await refuge.locator('.request-card').filter({ hasText: 'Milo' }).waitFor();
    console.log('PASS real Django creation, no duplicate, notification links, confirmed acceptance, history');
    await submit(volunteer, 2, 'Luna');
    await open(refuge, '/adoptions/2', 'app-adoption-detail', 'Luna');
    await decide(refuge, 'Refuser la demande', true);
    await refuge.locator('.status.rejected').waitFor();
    await open(volunteer, '/notifications', 'app-notifications', 'Demande refusée');
    await volunteer.locator('.notification-row').filter({ hasText: 'Demande refusée' }).click();
    await volunteer.waitForURL('**/adoptions/2');
    await volunteer.locator('.status.rejected').waitFor();
    await submit(volunteer, 3, 'Nala');
    await open(volunteer, '/adoptions/3', 'app-adoption-detail', 'Nala');
    await decide(volunteer, 'Annuler ma demande', true);
    await volunteer.locator('.status.cancelled').waitFor();
    assert.equal(await volunteer.getByRole('button', { name: 'Annuler ma demande', exact: true }).count(), 0);
    console.log('PASS real Django rejection, result notification and applicant cancellation');
    assert.deepEqual(errors, [], 'no uncaught browser errors');
    console.log('PASS screenshots 360/768/1280px, no horizontal overflow');
  } finally {
    if (browser) await browser.close();
    if (server.listening) await new Promise(resolve => server.close(resolve));
    api.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
