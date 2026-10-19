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
      await page.locator('ion-content').last().evaluate(element => element.scrollToTop(0));
      await page.waitForFunction(() => !document.querySelector('ion-button.ion-activated'));
      for (const width of [360, 768, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(async () => {
          await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
        });
        const dimensions = await page.locator('ion-content').last().evaluate(async element => {
          const area = await element.getScrollElement(); return { width: area.clientWidth, scrollWidth: area.scrollWidth };
        });
        assert.ok(dimensions.scrollWidth <= dimensions.width + 1, `${label} overflow ${width}`);
        await page.screenshot({ path: path.join(output, `${label}-${width}.png`), animations: 'disabled' });
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
    await open(volunteer, '/animals/manage', 'app-animal-management', 'À adopter');
    assert.equal(await volunteer.getByRole('link', { name: 'Ajouter un animal', exact: true }).count(), 0);
    await open(volunteer, '/animals/new', 'app-animal-form', 'réservé aux refuges');
    const creations = () => calls.filter(call => call.method === 'POST' && call.path === '/api/animals/').length;
    await open(refuge, '/animals/manage', 'app-animal-management .animal-list', 'Luna');
    await screenshot(refuge, 'management-list');
    await refuge.getByRole('link', { name: 'Ajouter un animal', exact: true }).click();
    await refuge.locator('input[type=file]').waitFor({ state: 'attached' });
    await refuge.getByRole('button', { name: 'Suivant', exact: true }).click();
    await refuge.getByText('Ajoutez au moins une photo de l’animal.').waitFor();
    const asset = path.join(frontend, 'src/assets/images/animals/luna.webp');
    await refuge.locator('input[type=file]').setInputFiles(asset);
    await refuge.locator('.main-photo img').waitFor();
    await screenshot(refuge, 'management-photos');
    await refuge.getByRole('button', { name: 'Suivant', exact: true }).click();
    await refuge.locator('ion-input[formcontrolname=name] input').fill('Luna nouvelle');
    await refuge.locator('ion-select[formcontrolname=species]').click();
    await refuge.getByRole('radio', { name: 'Chat', exact: true }).click();
    await refuge.getByRole('button', { name: 'Choisir', exact: true }).click();
    await refuge.locator('ion-input[formcontrolname=breed] input').fill('Croisée');
    await refuge.locator('ion-input[formcontrolname=estimated_age_months] input').fill('8');
    await refuge.getByRole('radio', { name: '♀ Femelle', exact: true }).check();
    await refuge.locator('ion-input[formcontrolname=weight_kg] input').fill('7.20');
    await refuge.locator('ion-input[formcontrolname=color] input').fill('Noir et blanc');
    await refuge.getByRole('radio', { name: 'Petite', exact: true }).check();
    await screenshot(refuge, 'management-information');
    await refuge.getByRole('button', { name: 'Suivant', exact: true }).click();
    await refuge.locator('ion-textarea textarea').fill('Énergique et curieuse. A besoin de sorties régulières et d’accompagnement pour son éducation.');
    await screenshot(refuge, 'management-description');
    await refuge.getByRole('button', { name: 'Suivant', exact: true }).click();
    await refuge.getByRole('switch', { name: 'Disponibilité à l’adoption' }).click();
    await refuge.locator('ion-toggle[aria-checked="true"]').waitFor();
    await screenshot(refuge, 'management-availability');
    await refuge.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
    await refuge.locator('dl').filter({ hasText: 'Luna nouvelle' }).waitFor();
    assert.equal(creations(), 0, 'no creation before the recap confirmation');
    await screenshot(refuge, 'management-recap');
    // The form must survive a backend failure without losing user input or photos.
    await refuge.route('**/api/animals/', async route => {
      if (route.request().method() === 'POST') await route.fulfill({ status: 503, json: { detail: 'Réessayez dans un instant.' } });
      else await route.continue();
    });
    await refuge.getByRole('button', { name: 'Créer l’animal', exact: true }).click();
    await refuge.getByText('La demande a échoué. Veuillez réessayer.', { exact: true }).waitFor();
    await refuge.unroute('**/api/animals/');
    const creation = refuge.waitForResponse(response => response.url().endsWith('/api/animals/') && response.request().method() === 'POST');
    await refuge.getByRole('button', { name: 'Créer l’animal', exact: true }).click();
    const response = await creation;
    assert.equal(response.status(), 201, await response.text());
    const created = await response.json();
    assert.equal(created.photos.length, 1);
    assert.equal(created.refuge, 1);
    assert.equal(created.is_adoptable, true);
    await refuge.getByText('Animal ajouté avec succès !', { exact: true }).waitFor();
    await screenshot(refuge, 'management-success');
    await refuge.getByRole('link', { name: 'Retour aux animaux', exact: true }).click();
    await refuge.locator('.animal-row').filter({ hasText: 'Luna nouvelle' }).waitFor();
    await screenshot(refuge, 'management-created-list');
    await refuge.getByRole('button', { name: 'Actions : Luna nouvelle', exact: true }).click();
    await refuge.getByRole('button', { name: 'Retirer de l’adoption', exact: true }).click();
    await refuge.locator('.animal-row').filter({ hasText: 'Luna nouvelle' }).getByText('Non adoptable', { exact: true }).waitFor();
    await refuge.locator('ion-segment-button[value="adoptable"]').click();
    assert.equal(await refuge.locator('.animal-row').filter({ hasText: 'Luna nouvelle' }).count(), 0);
    await refuge.locator('ion-segment-button[value="mine"]').click();
    await refuge.getByRole('button', { name: 'Actions : Luna nouvelle', exact: true }).click();
    await refuge.getByRole('link', { name: 'Modifier', exact: true }).click();
    await refuge.locator('.main-photo img').waitFor();
    await refuge.getByRole('button', { name: 'Suivant', exact: true }).click();
    await refuge.locator('ion-input[formcontrolname=name] input').fill('Luna modifiée');
    await refuge.getByRole('button', { name: 'Suivant', exact: true }).click();
    await refuge.getByRole('button', { name: 'Suivant', exact: true }).click();
    await refuge.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
    await refuge.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await refuge.getByText('Animal modifié avec succès !', { exact: true }).waitFor();
    await refuge.getByText('Luna modifiée a été enregistré dans votre refuge et n’est pas proposé à l’adoption.').waitFor();
    assert.equal(creations(), 1, 'editing does not create another animal');
    assert.deepEqual(errors, [], 'no uncaught browser errors after management flow');
    console.log('PASS shelter creation with real photo, recap, retry, success, own list, availability, edit and volunteer restriction');
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
