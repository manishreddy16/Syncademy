import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('request', request => {
    if (request.url().includes('/auth/register-school') || request.url().includes('/auth/register-student') || request.url().includes('/auth/login')) {
      console.log('REQUEST:', request.method(), request.url());
      console.log('REQUEST HEADERS:', JSON.stringify(request.headers(), null, 2));
      if (request.postData()) console.log('REQUEST BODY:', request.postData());
    }
  });
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.method(), request.url(), request.failure()?.errorText);
  });
  page.on('response', async response => {
    if (response.url().includes('/auth/register-school') || response.url().includes('/auth/register-student') || response.url().includes('/auth/login')) {
      console.log('RESPONSE:', response.status(), response.url());
      try {
        const text = await response.text();
        console.log('RESPONSE BODY:', text);
      } catch (e) {
        console.error('RESPONSE TEXT ERROR', e.message);
      }
    }
  });
  page.on('console', msg => console.log('PAGE CONSOLE:', msg.type(), msg.text()));

  await page.goto('http://localhost:5173/register-school', { waitUntil: 'domcontentloaded' });
  console.log('URL', page.url());
  const inputs = page.locator('input');
  const count = await inputs.count();
  console.log('INPUT COUNT', count);
  for (let i = 0; i < count; i++) {
    const el = inputs.nth(i);
    const info = await el.evaluate((node) => ({ type: node.type, value: node.value, name: node.name, placeholder: node.placeholder }));
    console.log('INPUT', i, info);
  }

  await inputs.nth(0).fill('Playwright Test School');
  await inputs.nth(1).fill('Test City');
  await page.fill('input[type="password"]', 'Playwright123');

  await Promise.all([
    page.waitForResponse(response => response.url().includes('/auth/register-school') || response.url().includes('/auth/register-student') || response.url().includes('/auth/login'), { timeout: 10000 }).catch(e => console.log('waitForResponse failed', e.message)),
    page.click('button[type="submit"]'),
  ]);

  await page.waitForTimeout(3000);
  console.log('DONE');
  await browser.close();
})();