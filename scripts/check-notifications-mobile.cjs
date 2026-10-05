const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.NOTIFICATIONS_TEST_URL || 'http://127.0.0.1:8102';
const output = 'tmp/notifications-mobile';
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const notifications = () => page.locator('app-notifications');
    const detail = () => page.locator('app-report-detail');
    async function layout(root) {
      const dimensions = await root.locator('ion-content').evaluate(async element => {
        const scroll = await element.getScrollElement();
        return { width: scroll.clientWidth, scrollWidth: scroll.scrollWidth };
      });
      assert.ok(dimensions.scrollWidth <= dimensions.width + 1, 'no horizontal page overflow');
      const controls = await root.locator('button, ion-button, ion-back-button, nav a').evaluateAll(elements => elements.map(element => {
        const box = element.getBoundingClientRect();
        return { text: element.textContent, width: box.width, height: box.height };
      }));
      for (const box of controls) assert.ok(box.width >= 44 && box.height >= 44, JSON.stringify(box));
    }
    async function openNotifications() {
      await page.goto(base + '/notifications');
      await notifications().locator('ion-back-button.hydrated').waitFor();
      await page.getByRole('button', { name: 'Ouvrir le signalement', exact: false }).waitFor();
    }
    for (const width of [360, 390, 412, 430, 768, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await openNotifications();
      assert.equal(await notifications().locator('.notification-row').count(), 4);
      assert.equal(await notifications().locator('[aria-current="page"]').innerText(), 'Notifications');
      await layout(notifications());
      await page.screenshot({ path: `${output}/notifications-${width}.png` });
      await page.getByRole('button', { name: 'Ouvrir le signalement', exact: false }).click();
      await page.waitForURL('**/signalements/chat-blesse');
      await notifications().waitFor({ state: 'hidden' });
      await detail().locator('ion-button.hydrated').waitFor();
      await page.waitForFunction(() => document.querySelector('app-report-detail img')?.naturalWidth > 0);
      await layout(detail());
      assert.equal(await detail().locator('ion-footer').count(), 0);
      await detail().locator('ion-content').evaluate(element => element.scrollToBottom(0));
      const cta = await detail().locator('.participate').boundingBox();
      assert.ok(cta.y >= 0 && cta.y + cta.height <= 845, 'CTA reachable');
      await detail().locator('ion-content').evaluate(element => element.scrollToTop(0));
      await page.screenshot({ path: `${output}/detail-${width}.png` });
      await detail().locator('ion-back-button').click();
      await page.waitForURL('**/notifications');
      await detail().waitFor({ state: 'hidden' });
      console.log(`PASS: both screens, layout and navigation at ${width}px`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    for (const [name, count] of [['Signalements', 1], ['Missions', 1], ['Système', 2], ['Toutes', 4]]) {
      await notifications().getByRole('button', { name, exact: true }).first().click();
      await page.waitForFunction(expected => document.querySelectorAll('app-notifications .notification-row').length === expected, count);
      assert.equal(await notifications().locator('.notification-row').count(), count);
    }
    await notifications().getByRole('button', { name: 'Signalements', exact: true }).click();
    await page.getByRole('button', { name: 'Ouvrir le signalement', exact: false }).click();
    await notifications().waitFor({ state: 'hidden' });
    await detail().getByRole('button', { name: 'Participer à la mission', exact: true }).click();
    await page.locator('ion-toast').filter({ hasText: 'Aucune demande n’a été envoyée.' }).waitFor();
    await detail().locator('ion-toast').evaluate(element => element.dismiss());
    await page.setViewportSize({ width: 390, height: 480 });
    await detail().locator('ion-content').evaluate(element => element.scrollToBottom(0));
    const shortCta = await detail().locator('.participate').boundingBox();
    assert.ok(shortCta.y >= 0 && shortCta.y + shortCta.height <= 481, 'CTA reachable on short viewport');
    await detail().locator('ion-content').evaluate(element => element.scrollToTop(0));
    await detail().locator('ion-back-button').click();
    await detail().waitFor({ state: 'hidden' });
    assert.equal(await notifications().locator('.filters [aria-pressed="true"]').innerText(), 'Signalements');
    await page.goto(base + '/signalements/missing');
    await page.getByRole('heading', { name: 'Signalement introuvable' }).waitFor();
    assert.equal(await detail().locator('.participate').count(), 0);
    await detail().locator('ion-back-button').click();
    await page.waitForURL('**/notifications');
    await page.goto(base + '/home');
    await page.getByRole('link', { name: 'Notifications, 2 non lues' }).click();
    await page.waitForURL('**/notifications');
    await page.locator('app-home').waitFor({ state: 'hidden' });
    await notifications().getByRole('link', { name: 'Profil', exact: true }).click();
    await page.waitForURL('**/profile');
    assert.deepEqual(errors, [], 'no browser errors');
    console.log('PASS: filters, retained filter on return, participation feedback, short viewport, unknown id, home entry and profile link');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
