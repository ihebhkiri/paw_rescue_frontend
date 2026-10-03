// Run against ng serve. Use an installed Playwright or PLAYWRIGHT_MODULE pointing to one.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const baseUrl = process.env.AUTH_TEST_URL || 'http://127.0.0.1:8100';
const output = 'tmp/auth-mobile';
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: process.env.AUTH_TEST_BROWSER || 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const screen = () => page.locator('ion-content:visible');
    const input = id => screen().locator(`#${id} input`);
    const button = text => screen().getByRole('button', { name: text, exact: true });
    async function open(path) {
      await page.goto(baseUrl + path);
      await screen().locator('h1').waitFor();
      await screen().locator('ion-select').first().locator('button').waitFor();
    }
    async function layout(name) {
      const scroll = await screen().evaluate(async element => {
        const area = await element.getScrollElement();
        return { width: area.clientWidth, contentWidth: area.scrollWidth, height: area.clientHeight, contentHeight: area.scrollHeight };
      });
      assert.ok(scroll.height > 0, `${name}: content has no height`);
      assert.ok(scroll.contentWidth <= scroll.width + 1, `${name}: horizontal overflow ${JSON.stringify(scroll)}`);
      const badControls = await screen().locator('ion-button, ion-input, ion-select, ion-checkbox, ion-radio').evaluateAll(elements => elements.filter(element => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && (box.height < 44 || box.left < -1 || box.right > innerWidth + 1);
      }).map(element => element.tagName + ':' + element.textContent.trim()));
      assert.deepEqual(badControls, [], `${name}: clipped or undersized controls`);
      await screen().evaluate(element => element.scrollToBottom(0));
      const position = await screen().evaluate(async element => {
        const area = await element.getScrollElement();
        return Math.abs(area.scrollHeight - area.clientHeight - area.scrollTop);
      });
      assert.ok(position <= 1, `${name}: cannot scroll to bottom`);
      await screen().evaluate(element => element.scrollToTop(0));
    }

    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      for (const [name, path] of [
        ['login', '/auth'], ['signup', '/auth/register'], ['roles', '/auth/register?preview=volunteer'],
        ['vet', '/auth/register?preview=vet-verification'], ['shelter', '/auth/register?preview=shelter-verification'],
        ['vet-pending', '/auth/register?preview=vet-confirmation'], ['shelter-pending', '/auth/register?preview=shelter-confirmation'],
      ]) {
        await open(path);
        await layout(`${width}-${name}`);
        if (width === 390 || width === 1280) await page.screenshot({ path: `${output}/${width}-${name}.png` });
      }
      console.log(`PASS: layout ${width}px`);
    }

    // Real controls and native form submission, with mocked HTTP only (no real accounts).
    await page.setViewportSize({ width: 390, height: 844 });
    let loginRequests = 0;
    await page.route('**/token/', async route => {
      loginRequests++;
      assert.deepEqual(route.request().postDataJSON(), { email: 'person@example.com', password: 'test-password' });
      await route.fulfill({ status: loginRequests === 1 ? 400 : 200, contentType: 'application/json', body: JSON.stringify(loginRequests === 1 ? { non_field_errors: ['Identifiants invalides.'] } : { access: 'test-access', refresh: 'test-refresh' }) });
    });
    await open('/auth');
    await button('Se connecter').click();
    await screen().getByText('Saisissez une adresse e-mail valide.').waitFor();
    assert.equal(loginRequests, 0);
    await input('email').fill('person@example.com');
    await input('password').fill('test-password');
    await button('Afficher le mot de passe').click();
    await screen().locator('#password input[type="text"]').waitFor();
    assert.equal(await input('password').getAttribute('type'), 'text');
    await button('Masquer le mot de passe').click();
    await screen().locator('#password input[type="password"]').waitFor();
    assert.equal(await input('password').inputValue(), 'test-password');
    await button('Se connecter').click();
    await screen().getByText('Identifiants invalides.').waitFor();
    assert.equal(await input('password').inputValue(), 'test-password');
    await input('password').press('Enter');
    await screen().getByText('Connexion réussie.').waitFor();
    assert.equal(loginRequests, 2);

    for (const role of ['VOLUNTEER', 'VETERINARIAN', 'SHELTER']) {
      let requests = 0;
      await page.route('**/register/', async route => {
        requests++;
        const body = route.request().postData();
        assert.ok(body.includes(role === 'VOLUNTEER' ? 'benevole' : role === 'SHELTER' ? 'refuge' : 'veterinaire'));
        if (role !== 'VOLUNTEER') assert.ok(body.includes('verification_document'));
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ user: { id: 1, profile: role === 'VOLUNTEER' ? null : { verification_status: 'pending' } } }) });
      });
      await open('/auth/register');
      for (const [field, value] of Object.entries({ firstName: 'Élodie', lastName: 'Le Gall', email: 'elodie@example.com', password: 'test-password', confirmPassword: 'test-password' })) {
        await input(`register-${field}`).fill(value);
      }
      await input('register-confirmPassword').fill('different');
      await button('Continuer').click();
      await screen().getByText('Les mots de passe doivent être identiques.', { exact: true }).waitFor();
      assert.equal(await input('register-confirmPassword').getAttribute('aria-describedby'), 'confirmPassword-error');
      assert.equal(requests, 0);
      await input('register-confirmPassword').fill('test-password');
      await screen().locator('ion-checkbox').click();
      await button('Continuer').click();
      await screen().locator('ion-radio').first().waitFor();
      await screen().locator('ion-radio').first().click();
      await screen().locator(`ion-radio[value="${role}"]`).click();
      await screen().locator(`ion-radio[value="${role}"][aria-checked="true"]`).waitFor();
      assert.equal(await screen().locator('ion-radio[aria-checked="true"]').count(), 1);
      await button('Retour').click();
      assert.equal(await input('register-firstName').inputValue(), 'Élodie');
      await button('Continuer').click();
      assert.equal(await screen().locator('ion-radio[aria-checked="true"]').getAttribute('value'), role);
      await button(role === 'VOLUNTEER' ? 'Créer un compte' : 'Continuer').click();
      if (role !== 'VOLUNTEER') {
        await screen().locator('app-verification:visible').waitFor();
        await button('Soumettre pour vérification').click();
        assert.equal(requests, 0);
        assert.ok(await screen().locator('app-verification ion-input input').first().evaluate(element => element === document.activeElement));
        for (const control of await screen().locator('app-verification ion-input').all()) {
          const type = await control.locator('input').getAttribute('type');
          await control.locator('input').fill(type === 'tel' ? '20123456' : type === 'email' ? 'contact@example.com' : 'Information professionnelle');
        }
        for (const select of await screen().locator('app-verification ion-select').all()) {
          await select.click();
          await page.locator('ion-alert').getByRole('radio').first().click();
          await page.locator('ion-alert').getByRole('button', { name: 'Valider', exact: true }).click();
          await page.locator('ion-alert').waitFor({ state: 'detached' });
        }
        await screen().locator('input[type=file]').setInputFiles({ name: 'proof.pdf', mimeType: 'application/pdf', buffer: Buffer.from('test proof') });
        // A reduced viewport checks reachability; it does not emulate a physical keyboard.
        await page.setViewportSize({ width: 390, height: 360 });
        await layout(`${role}-reduced-height`);
        await button('Soumettre pour vérification').click();
      }
      await screen().getByRole('heading', { name: role === 'VOLUNTEER' ? 'Compte créé' : 'Compte en cours de vérification', exact: true }).waitFor();
      assert.equal(requests, 1);
      await screen().getByRole('link', { name: 'Aller à la page de connexion' }).click();
      await screen().getByRole('heading', { name: 'Connexion', exact: true }).waitFor();
      await page.unroute('**/register/');
      await page.setViewportSize({ width: 390, height: 844 });
      console.log(`PASS: signup ${role}`);
    }
    await page.emulateMedia({ colorScheme: 'dark' });
    await open('/auth/register?preview=vet-verification');
    await screen().locator('#verification-governorate').click();
    await page.locator('ion-alert').waitFor();
    const palette = await page.locator('ion-alert').evaluate(element => ({
      background: getComputedStyle(element.querySelector('.alert-wrapper')).backgroundColor,
      text: getComputedStyle(element.querySelector('.alert-radio-label')).color,
    }));
    assert.deepEqual(palette, { background: 'rgb(255, 255, 255)', text: 'rgb(11, 22, 45)' });
    await page.locator('ion-alert').getByRole('button', { name: 'Annuler', exact: true }).click();
    assert.deepEqual(errors, [], 'Browser runtime errors');
    console.log('PASS: 28 viewport/screens, login errors/success, 3 signup flows, exclusive roles, back navigation, upload, selects, reduced-height scroll, runtime errors.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
