const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.PROFILE_TEST_URL || 'http://127.0.0.1:8101';
fs.mkdirSync('tmp/profile-mobile', { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const profile = () => page.locator('app-profile');
    async function open() {
      await page.goto(base + '/profile');
      await profile().locator('ion-select.hydrated').waitFor();
      await page.waitForFunction(() => document.querySelector('app-profile img')?.naturalWidth > 0);
    }
    async function checkLayout() {
      const scroll = await profile().locator('ion-content').evaluate(async element => {
        const area = await element.getScrollElement();
        return { width: area.clientWidth, scrollWidth: area.scrollWidth };
      });
      assert.ok(scroll.scrollWidth <= scroll.width + 1, 'no horizontal overflow');
      const controls = await profile().locator('ion-item, ion-select, ion-button, ion-back-button').evaluateAll(elements => elements.map(element => {
        const box = element.getBoundingClientRect();
        return { label: element.textContent, width: box.width, height: box.height, left: box.left, right: box.right };
      }));
      for (const control of controls) assert.ok(control.height >= 44 && control.width >= 44 && control.left >= 0 && control.right <= page.viewportSize().width + 1, JSON.stringify(control));
      const [avatar, name, edit] = await Promise.all(['ion-avatar', '.identity-text', '.edit'].map(selector => profile().locator(selector).boundingBox()));
      assert.ok(avatar.x + avatar.width <= name.x && name.x + name.width <= edit.x + 1, 'identity does not overlap');
      await profile().locator('ion-content').evaluate(element => element.scrollToBottom(0));
      const logout = await profile().locator('.logout').boundingBox();
      assert.ok(logout.y >= 0 && logout.y + logout.height <= page.viewportSize().height + 1, 'logout reachable');
      await profile().locator('ion-content').evaluate(element => element.scrollToTop(0));
    }
    for (const width of [360, 390, 412, 430, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await open();
      await checkLayout();
      await page.screenshot({ path: `tmp/profile-mobile/${width}.png` });
      console.log(`PASS: profile ${width}px`);
    }
    await page.setViewportSize({ width: 390, height: 480 });
    await profile().locator('h1').evaluate(element => element.textContent = 'Amira Ben Ali Nom particulièrement long');
    await checkLayout();
    await page.setViewportSize({ width: 390, height: 844 });
    await open();
    await profile().locator('ion-select').click();
    await page.getByRole('radio', { name: 'Indisponible', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmer', exact: true }).click();
    await page.locator('ion-alert').waitFor({ state: 'hidden' });
    assert.equal(await profile().locator('ion-select').evaluate(element => element.value), false);
    assert.equal(await profile().locator('.status-dot.unavailable').count(), 1);
    for (const label of ['Modifier le profil', 'Mes informations', 'Mes missions', 'Mes demandes d’adoption', 'Paramètres', 'Aide']) {
      await profile().getByRole('button', { name: label, exact: true }).click();
      await page.locator('ion-toast').filter({ hasText: 'cette fonctionnalité n’est pas encore disponible.' }).waitFor();
      assert.equal(page.url(), base + '/profile');
      await page.locator('ion-toast').evaluate(element => element.dismiss());
    }
    await profile().locator('ion-back-button').click();
    await page.waitForURL('**/home');
    await profile().waitFor({ state: 'hidden' });
    await page.getByRole('link', { name: 'Mon profil', exact: true }).click();
    await page.waitForURL('**/profile');
    await page.locator('app-home').waitFor({ state: 'hidden' });
    await profile().locator('ion-back-button').click();
    await page.waitForURL('**/home');
    await profile().waitFor({ state: 'hidden' });
    await page.getByRole('link', { name: 'Profil', exact: true }).click();
    await page.waitForURL('**/profile');
    await page.locator('app-home').waitFor({ state: 'hidden' });
    await profile().getByRole('button', { name: 'Se déconnecter', exact: true }).click();
    await page.waitForURL('**/auth');
    assert.deepEqual(errors, [], 'no browser errors');
    console.log('PASS: reduced height, long name, availability, menu feedback, back, both home links, logout redirect');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
