const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

// Exercise the production bundle against the Django response shapes, without a live account.
const root = path.resolve(__dirname, '../www');
const output = path.resolve(__dirname, '../tmp/dynamic-frontend');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png' };
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  let file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) && file !== root) { response.writeHead(403).end(); return; }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
  response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(response);
});

(async () => {
  fs.mkdirSync(output, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'test-access');
      localStorage.setItem('refresh_token', 'test-refresh');
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    const animal = { id: 21, name: 'Nala', species_name: 'Chat', estimated_age_months: 15, sex: 'F', behavior: 'Calme et curieuse', refuge_name: 'Refuge du parc', is_adoptable: true, primary_photo: null, photos: [] };
    let user = { id: 7, first_name: 'Nora', last_name: 'Test', username: 'nora', role: 'benevole', photo: null, profile: { is_available: true } };
    let notifications = [{ id: 12, type: 'new_message', title: 'Message du refuge', body: 'Votre contact vous a répondu.', created_at: '2026-10-12T10:00:00Z', is_read: false }];
    let profileReads = 0;
    let failSave = false;
    let failList = false;
    await page.route('**/api/**', async route => {
      const request = route.request();
      assert.equal(request.headers().authorization, 'Bearer test-access');
      const endpoint = new URL(request.url()).pathname;
      let data;
      let status = 200;
      if (endpoint === '/api/auth/me/') {
        if (request.method() === 'PATCH') {
          if (failSave) status = 500;
          else user = { ...user, profile: { ...user.profile, ...request.postDataJSON().profile } };
        } else profileReads++;
        data = user;
      } else if (endpoint === '/api/animals/adoptable/') { data = failList ? {} : [animal]; status = failList ? 503 : 200; }
      else if (endpoint === '/api/animals/21/') data = animal;
      else if (endpoint === '/api/adoptions/') data = [];
      else if (endpoint === '/api/notifications/') data = notifications;
      else if (endpoint === '/api/notifications/12/read/') {
        notifications = [{ ...notifications[0], is_read: true }]; data = notifications[0];
      } else { status = 404; data = {}; }
      await route.fulfill({ status, json: data });
    });
    async function open(route, selector, text) {
      await page.goto(base + route);
      await page.locator(selector).filter({ hasText: text }).waitFor();
    }
    for (const width of [360, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [route, selector, text, name] of [
        ['/animals', 'app-home .animal-card', 'Nala', 'home'],
        ['/animals/21', 'app-animal-detail h1', 'Nala', 'animal'],
        ['/profile', 'app-profile h1', 'Nora Test', 'profile'],
        ['/notifications', 'app-notifications .notification-row', 'Message du refuge', 'notifications'],
      ]) {
        await open(route, selector, text);
        const content = page.locator('ion-content').last();
        const dimensions = await content.evaluate(async element => {
          const area = await element.getScrollElement();
          return { width: area.clientWidth, scrollWidth: area.scrollWidth };
        });
        assert.ok(dimensions.scrollWidth <= dimensions.width + 1, `${name} overflows at ${width}px`);
        await page.screenshot({ path: path.join(output, `${name}-${width}.png`) });
        console.log(`PASS ${name} ${width}px`);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await open('/profile', 'app-profile h1', 'Nora Test');
    async function chooseAvailability(label) {
      await page.locator('app-profile ion-select').click();
      await page.getByRole('radio', { name: label, exact: true }).click();
      await page.getByRole('button', { name: 'Confirmer', exact: true }).click();
      await page.locator('ion-alert').waitFor({ state: 'hidden' });
      await page.locator('app-profile ion-select:not([aria-disabled="true"])').waitFor();
    }
    await chooseAvailability('Indisponible');
    assert.equal(user.profile.is_available, false);
    assert.equal(await page.locator('app-profile ion-select').evaluate(element => element.value), false);
    await page.locator('ion-toast').evaluate(element => element.dismiss());
    failSave = true;
    await chooseAvailability('Disponible');
    assert.equal(await page.locator('app-profile ion-select').evaluate(element => element.value), false);
    failSave = false;
    console.log('PASS profile PATCH success and rollback on error');
    await page.locator('ion-toast').evaluate(element => element.dismiss());
    const readsBeforeReturn = profileReads;
    await page.locator('app-profile ion-back-button').click();
    await page.waitForURL('**/animals');
    await page.locator('app-home .profile').click();
    await page.waitForURL('**/profile');
    await page.locator('app-profile h1').filter({ hasText: 'Nora Test' }).waitFor();
    assert.ok(profileReads > readsBeforeReturn, 'cached profile reloads on Ionic reentry');
    console.log('PASS Ionic reentry reload');
    await open('/notifications', '.notification-row', 'Non lue');
    await page.locator('.notification-row').click();
    await page.locator('.read-status').filter({ hasText: /^Lue$/ }).waitFor();
    assert.equal(notifications[0].is_read, true);
    assert.equal(new URL(page.url()).pathname, '/notifications');
    console.log('PASS persisted notification read, no demo navigation');
    await open('/animals/999', 'app-animal-detail', 'Animal introuvable');
    failList = true;
    await open('/animals', 'app-home [role="alert"]', 'échoué');
    failList = false;
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await page.locator('.animal-card').filter({ hasText: 'Nala' }).waitFor();
    console.log('PASS detail 404 and catalogue retry');
    animal.estimated_age_months = null;
    animal.sex = 'unknown';
    animal.name = 'Unnomparticulièrementlongsansespaces';
    animal.species_name = 'Espèce non renseignée';
    for (const [route, selector] of [['/animals', 'app-home'], ['/animals/21', 'app-animal-detail']]) {
      await open(route, selector, animal.name);
      const dimensions = await page.locator(`${selector} ion-content`).evaluate(async element => {
        const area = await element.getScrollElement();
        return { width: area.clientWidth, scrollWidth: area.scrollWidth };
      });
      assert.ok(dimensions.scrollWidth <= dimensions.width + 1, `${route} must wrap long or missing server values`);
    }
    console.log('PASS missing age and long server values');
    assert.deepEqual(errors, [], 'no uncaught browser errors');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
