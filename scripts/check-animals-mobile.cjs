// Run against ng serve with an installed Playwright or PLAYWRIGHT_MODULE.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const baseUrl = process.env.ANIMALS_TEST_URL || 'http://127.0.0.1:8100';
const output = 'tmp/animals-mobile';
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: process.env.ANIMALS_TEST_BROWSER || 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const screen = () => page.locator('ion-content:visible');
    async function open(path) {
      await page.goto(baseUrl + path);
      await screen().locator('h1').waitFor();
      await page.locator('ion-button.hydrated').first().waitFor();
      await page.waitForFunction(() => [...document.images].every(img => img.loading === 'lazy' || img.complete && img.naturalWidth > 0));
    }
    async function layout(name) {
      const dimensions = await screen().evaluate(async element => {
        const area = await element.getScrollElement();
        return { width: area.clientWidth, contentWidth: area.scrollWidth, height: area.clientHeight };
      });
      assert.ok(dimensions.height > 0);
      assert.ok(dimensions.contentWidth <= dimensions.width + 1, `${name}: horizontal overflow`);
      await screen().evaluate(element => element.scrollToBottom(0));
      assert.ok(await screen().evaluate(async element => {
        const area = await element.getScrollElement();
        return Math.abs(area.scrollHeight - area.clientHeight - area.scrollTop) <= 1;
      }), `${name}: bottom unreachable`);
      await screen().evaluate(element => element.scrollToTop(0));
      await page.screenshot({ path: `${output}/${name}.png` });
    }
    for (const width of [360, 390, 412, 430, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await open('/home');
      await layout(`${width}-home`);
      assert.equal(await page.locator('.animal-card').count(), 6);
      const columns = await page.locator('.animal-card').evaluateAll(cards => cards.slice(0, 2).map(card => card.getBoundingClientRect().top));
      assert.equal(columns[0], columns[1], 'two columns');
      const footer = await page.locator('ion-footer').boundingBox();
      assert.ok(footer.y + footer.height <= 844 && footer.y > 0, 'footer inside viewport');
      await open('/animals/max');
      await layout(`${width}-detail`);
      await screen().getByRole('button', { name: 'Demander l’adoption' }).scrollIntoViewIfNeeded();
      const action = await screen().locator('.adopt-button').boundingBox();
      assert.ok(action.y >= 0 && action.y + action.height <= 845, 'adoption action reachable');
      console.log(`PASS: home/detail layout ${width}px`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await open('/home');
    await page.getByRole('button', { name: 'Chats', exact: true }).click();
    assert.equal(await page.locator('.animal-card').count(), 3);
    await page.getByRole('button', { name: 'Autres', exact: true }).click();
    await page.getByRole('status').waitFor();
    await page.getByRole('button', { name: 'Voir tout', exact: true }).click();
    const search = page.locator('ion-searchbar input');
    await search.fill('max');
    await page.waitForFunction(() => document.querySelectorAll('.animal-card').length === 1);
    await search.fill('');
    await page.getByRole('button', { name: 'Filtres', exact: true }).click();
    await page.locator('ion-checkbox').click();
    await page.waitForFunction(() => document.querySelectorAll('.animal-card').length === 1);
    await page.locator('ion-checkbox').click();
    await page.getByRole('button', { name: 'Filtres', exact: true }).click();
    await page.getByRole('link', { name: 'Découvrir Max' }).click();
    await page.waitForURL('**/animals/max');
    await page.locator('app-home').waitFor({ state: 'hidden' });
    await screen().getByRole('heading', { name: 'Max', exact: true }).waitFor();
    await screen().getByRole('button', { name: 'Afficher la photo 2' }).click();
    assert.equal(await screen().locator('.photo-count').innerText(), '2/2');
    await screen().getByRole('button', { name: 'Afficher la photo 1' }).click();
    await screen().getByRole('button', { name: 'Retirer des favoris : Max' }).click();
    assert.equal(await screen().getByRole('button', { name: 'Ajouter aux favoris : Max' }).getAttribute('aria-pressed'), 'false');
    await screen().getByRole('button', { name: 'Demander l’adoption' }).click();
    await page.locator('ion-toast').filter({ hasText: 'Les demandes d’adoption ne sont pas encore disponibles.' }).waitFor();
    await screen().locator('ion-back-button').click();
    await page.waitForURL('**/home');
    await page.locator('app-animal-detail').waitFor({ state: 'hidden' });
    await screen().getByRole('button', { name: 'Ajouter aux favoris : Max' }).waitFor();
    await page.setViewportSize({ width: 390, height: 480 });
    await screen().locator('ion-searchbar input').fill('luna');
    await page.waitForFunction(() => document.querySelector('app-home .animal-card h2')?.textContent === 'Luna');
    await layout('390-reduced-height');
    await screen().getByRole('link', { name: 'Découvrir Luna' }).click();
    await page.waitForURL('**/animals/luna');
    await page.locator('app-home').waitFor({ state: 'hidden' });
    await screen().getByRole('button', { name: 'Demander l’adoption' }).scrollIntoViewIfNeeded();
    const reducedAction = await screen().locator('.adopt-button').boundingBox();
    assert.ok(reducedAction.y >= 0 && reducedAction.y + reducedAction.height <= 481, 'CTA reachable at reduced height');
    await open('/animals/missing');
    await page.getByRole('heading', { name: 'Animal introuvable' }).waitFor();
    await open('/auth');
    assert.match(page.url(), /\/auth$/);
    assert.deepEqual(errors, [], 'browser errors');
    console.log('PASS: categories, search, favorite filter, navigation, shared favorites, CTA feedback, unknown id, auth route');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
