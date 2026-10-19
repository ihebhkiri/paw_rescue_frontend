const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const frontend = path.resolve(__dirname, '..');
const backend = path.resolve(frontend, '../backend');
const output = path.join(frontend, 'tmp/home-flow');
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
    animal = Animal.objects.create(name=name, species=species, refuge=refuge, estimated_age_months=24, sex='F', status='in_shelter', is_adoptable=True, breed='Croisée', size='small', behavior='Calme et sociable')
    with open(os.path.join(sys.argv[4], name.lower() + '.webp'), 'rb') as photo:
        AnimalPhoto.objects.create(animal=animal, image=File(photo, name=name.lower()+'.webp'), is_primary=True)
for index, name in enumerate(['luna', 'rocky', 'mimi']):
    report = Report.objects.create(reporter=citizen, species=species, type='injured' if index == 0 else 'stray', severity='critical' if index == 0 else 'mild', description='Animal près du parc', latitude=36.81, longitude=10.18, address_text=['Ariana', 'La Marsa', 'Tunis Centre'][index], assigned_refuge=refuge)
    with open(os.path.join(sys.argv[4], name + '.webp'), 'rb') as photo:
        ReportPhoto.objects.create(report=report, image=File(photo, name=name+'.webp'))
from adoptions.models import AdoptionRequest
for animal in Animal.objects.filter(refuge=refuge)[:2]:
    AdoptionRequest.objects.create(animal=animal, applicant=citizen, refuge=refuge, message='Accueil adapté')
foreign_owner = User.objects.create_user(username='foreign', role='refuge')
foreign_refuge = Refuge.objects.create(user=foreign_owner, name='Autre refuge', is_verified=True)
Animal.objects.create(name='Animal étranger', species=species, refuge=foreign_refuge, status='in_shelter')
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
    await citizen.goto(base + '/home');
    await citizen.getByRole('heading', { name: 'Bonjour Sarah' }).waitFor();
    await citizen.getByRole('heading', { name: 'Luna', exact: true }).waitFor();
    await citizen.locator('button.location').click();
    await citizen.getByText('Autour de moi', { exact: true }).waitFor();
    await citizen.waitForFunction(() => Array.from(document.querySelectorAll('app-landing-home img')).every(img => img.complete && img.naturalWidth > 0));
    for (const width of [360, 768, 1280]) {
      await citizen.setViewportSize({ width, height: 1100 });
      assert.ok(await citizen.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await citizen.screenshot({ path: path.join(output, 'home-' + width + '.png'), fullPage: true });
      await citizen.locator('app-landing-home ion-content').evaluate(el => el.scrollToBottom(0));
      await citizen.screenshot({ path: path.join(output, 'home-bottom-' + width + '.png'), fullPage: true });
      await citizen.locator('app-landing-home ion-content').evaluate(el => el.scrollToTop(0));
    }
    for (const [label, route] of [['Animaux', '/animals'], ['Missions', '/signalements'], ['Messages', '/messages'], ['Profil', '/profile'], ['Accueil', '/home']]) {
      await citizen.locator('ion-tab-button:visible').filter({ hasText: label }).click();
      await citizen.waitForURL(base + route);
      await citizen.waitForFunction(() => [...document.querySelectorAll('ion-tab-button')].filter(el => el.checkVisibility()).length === 5);
      await citizen.locator('ion-tab-button.tab-selected:visible').filter({ hasText: label }).waitFor();
    }
    await citizen.goto(base + '/animals');
    await citizen.getByRole('heading', { name: 'Luna', exact: true }).waitFor();
    await citizen.locator('ion-searchbar input').fill('Mimi');
    await citizen.getByRole('heading', { name: 'Mimi', exact: true }).waitFor();
    assert.equal(await citizen.locator('.animal-card').count(), 1);
    await citizen.locator('.animal-card a').click();
    await citizen.waitForURL(/\/animals\/\d+$/);
    await citizen.locator('ion-back-button').click();
    await citizen.waitForURL(base + '/animals');
    await citizen.goto(base + '/animals/add');
    await citizen.getByText('Cet écran est réservé aux refuges et associations.').waitFor();
    await citizen.goto(base + '/refuges?latitude=36.8123&longitude=10.1923');
    await citizen.getByRole('heading', { name: 'Refuge Les Pattes Heureuses' }).waitFor();
    const owner = await login('shelter@rescue.test');
    await owner.goto(base + '/home');
    await owner.locator('app-refuge-home .animal').first().waitFor();
    assert.deepEqual(await owner.locator('.stat strong').allTextContents(), ['3', '4', '2', '0']);
    assert.ok(!(await owner.locator('app-refuge-home').innerText()).includes('Animal étranger'));
    await owner.waitForFunction(() => [...document.querySelectorAll('app-refuge-home img')].every(img => img.complete && img.naturalWidth));
    for (const width of [360, 768, 940]) {
      await owner.setViewportSize({ width, height: 1672 });
      assert.ok(await owner.locator('app-refuge-home ion-content').evaluate(async el => { const scroll = await el.getScrollElement(); return scroll.scrollWidth <= scroll.clientWidth; }));
      await owner.screenshot({ path: path.join(output, 'refuge-home-' + width + '.png') });
    }
    for (const [selector, route] of [['.actions a:nth-child(1)', '/animals/add'], ['.actions a:nth-child(2)', '/signalements'], ['.actions a:nth-child(3)', '/adoptions'], ['.bell', '/notifications'], ['.location', '/profile']]) {
      await owner.locator('app-refuge-home ' + selector).click();
      await owner.waitForURL(base + route);
      await owner.goto(base + '/home');
      await owner.locator('app-refuge-home .animal').first().waitFor();
    }
    for (const selector of ['.report', '.compact', '.animal .card']) {
      await owner.locator('app-refuge-home ' + selector).first().click();
      await owner.waitForURL(/\/(signalements|adoptions|animals)\/\d+$/);
      await owner.goto(base + '/home');
      await owner.locator('app-refuge-home .animal').first().waitFor();
    }
    await owner.goto(base + '/animals/new');
    await owner.waitForURL(base + '/animals/add');
    await owner.getByRole('heading', { name: 'Ajouter un animal' }).waitFor();
    await owner.screenshot({ path: path.join(output, 'add-photos-390.png') });
    await owner.locator('input[type=file]').setInputFiles(path.join(frontend, 'src/assets/images/animals/luna.webp'));
    await owner.getByRole('button', { name: 'Suivant', exact: true }).click();
    await owner.getByLabel('Nom de l’animal *').fill('Nala');
    await owner.locator('ion-select[formControlName=species]').click();
    await owner.getByRole('radio', { name: 'Chat' }).click();
    await owner.getByRole('button', { name: 'Choisir', exact: true }).click();
    await owner.getByLabel('Race *', { exact: true }).fill('Croisée');
    await owner.getByLabel('Âge estimé (en mois) *').fill('12');
    await owner.getByText('Petite', { exact: true }).click();
    await owner.getByRole('button', { name: 'Suivant', exact: true }).click();
    await owner.getByLabel('Notes de santé (facultatif)').fill('Contrôle conseillé');
    await owner.getByLabel('Comportement / Description *').fill('Calme et sociable');
    await owner.getByRole('button', { name: 'Suivant', exact: true }).click();
    await owner.getByRole('heading', { name: 'Refuge et localisation' }).waitFor();
    await owner.getByRole('switch').click();
    await owner.getByRole('button', { name: 'Vérifier les informations' }).click();
    for (const width of [360, 768, 1280]) {
      await owner.setViewportSize({ width, height: 1100 });
      assert.ok(await owner.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await owner.screenshot({ path: path.join(output, 'add-' + width + '.png'), fullPage: true });
    }
    const saving = owner.waitForResponse(r => r.url().endsWith('/api/animals/') && r.request().method() === 'POST');
    await owner.getByRole('button', { name: 'Créer l’animal', exact: true }).click();
    const response = await saving;
    assert.equal(response.status(), 201, await response.text());
    const animal = await response.json();
    assert.equal(animal.health_notes, 'Contrôle conseillé');
    await owner.getByRole('heading', { name: 'Animal ajouté avec succès !' }).waitFor();
    await owner.getByRole('link', { name: 'Retour aux animaux' }).click();
    await owner.waitForURL(base + '/animals/manage');
    assert.deepEqual(errors, []);
    console.log('Home, 5 tabs, catalogue/search/back, legacy add redirect, role denial and real animal publication passed. Screenshots: ' + output);
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


