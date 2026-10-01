// Run with NODE_PATH pointing to the installed Playwright package, with ng serve on port 4201.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const states = [
  ['volunteer', 'Bénévole — inscription rapide'],
  ['veterinarian', 'Vétérinaire — choix du rôle'],
  ['vet-verification', 'Vérification vétérinaire'],
  ['shelter-verification', 'Vérification refuge / association'],
  ['vet-confirmation', 'Confirmation vétérinaire'],
  ['shelter-confirmation', 'Confirmation refuge / association'],
];
const base = 'http://127.0.0.1:4201/auth/register';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1536, height: 1100 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const [state] of states) {
      await page.goto(`${base}?preview=${state}`);
      await page.locator('app-register h1').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.locator('app-register .auth-screen').screenshot({ path: path.join(__dirname, `${state}-desktop.png`) });
      const stepCount = await page.locator('.stepper li').count();
      assert.equal(stepCount, state.endsWith('confirmation') ? 0 : state === 'volunteer' ? 2 : 3);
      if (state.endsWith('confirmation')) {
        await page.getByRole('link', { name: 'Aller à la page de connexion' }).click();
        await page.waitForURL('**/auth');
      }
    }
    for (const width of [820, 390, 320]) {
      await page.setViewportSize({ width, height: width === 820 ? 1180 : 844 });
      for (const [state] of states) {
        await page.goto(`${base}?preview=${state}`);
        await page.locator('app-register h1').waitFor();
        assert.equal(await page.evaluate(() => {
          const screen = document.querySelector('app-register .auth-screen');
          return [...screen.querySelectorAll('input, select, button, h1, .role-card')].filter(element => {
            if (!element.getClientRects().length) return false;
            const rect = element.getBoundingClientRect();
            return rect.left < -1 || rect.right > innerWidth + 1;
          }).length;
        }), 0, `${state} overflows at ${width}px`);
        if (width === 390) {
          const height = await page.locator('app-register .auth-screen').evaluate(screen => Math.ceil(screen.getBoundingClientRect().height));
          await page.setViewportSize({ width, height });
          await page.locator('app-register .auth-screen').screenshot({ path: path.join(__dirname, `${state}-mobile.png`) });
          await page.setViewportSize({ width, height: 844 });
        }
      }
    }
    await page.setViewportSize({ width: 1536, height: 1040 });
    for (const role of ['vet', 'shelter']) {
      await page.goto(`${base}?preview=${role}-verification`);
      await page.getByRole('button', { name: 'Soumettre pour vérification' }).click();
      await page.locator('app-verification .error').first().waitFor();
      assert.ok(await page.locator('app-verification .error').count() > 0);
      for (const field of await page.locator('app-verification .fields input').all()) {
        const type = await field.getAttribute('type');
        await field.fill(type === 'tel' ? '+216 20 123 456' : type === 'email' ? 'contact@example.com' : 'Clinique / association démo');
      }
      for (const select of await page.locator('app-verification select').all()) await select.selectOption({ index: 1 });
      await page.locator('input[type=file]').setInputFiles({ name: 'justificatif.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 preview only') });
      await page.getByRole('button', { name: 'Retour', exact: true }).click();
      await page.getByRole('button', { name: 'Continuer', exact: true }).click();
      assert.equal(await page.locator('app-verification input[type=file]').evaluate(input => input.files[0].name), 'justificatif.pdf');
      await page.getByRole('button', { name: 'Soumettre pour vérification' }).click();
      await page.getByRole('heading', { name: 'Compte en cours de vérification' }).waitFor();
      assert.equal(await page.locator('.stepper').count(), 0);
      assert.equal(await page.locator('h1').evaluate(title => document.activeElement === title), true);
    }
    assert.deepEqual(errors, []);
    const cards = states.map(([state, title], i) => `<article><h2>${i + 1}. ${title}</h2><a href="${base}?preview=${state}" target="_blank" rel="noopener"><img src="${state}-desktop.png" alt="${title}"></a><a class="open" href="${base}?preview=${state}" target="_blank" rel="noopener">Ouvrir l’aperçu interactif →</a></article>`).join('\n');
    fs.writeFileSync(path.join(__dirname, 'professional-registration.html'), `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PawRescue AI — Parcours d’inscription</title><style>*{box-sizing:border-box}body{margin:0;padding:32px;font:16px/1.5 Arial,sans-serif;background:#edf4f0;color:#0b162d}h1{margin:0;font-size:30px}header p{color:#67748e;margin:6px 0 28px}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:26px}article{min-width:0;background:white;border:1px solid #d9e0eb;border-radius:18px;overflow:hidden}h2{font-size:17px;padding:16px 20px;margin:0}img{display:block;width:100%;border-block:1px solid #eaf2eb}.open{display:block;padding:14px 20px;color:#00816d;font-weight:bold}a:focus-visible{outline:3px solid #00816d}@media(max-width:800px){body{padding:16px}main{grid-template-columns:1fr}}</style><header><h1>PawRescue AI · Parcours d’inscription</h1><p>Six états de l’application Angular/Ionic · Aperçu de démonstration, sans création de compte ni envoi de document.</p></header><main>${cards}</main></html>`);
    console.log('Browser checks passed: six states, three responsive widths, validation, preserved values, confirmation focus and login navigation.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
