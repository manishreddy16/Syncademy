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
        console.log('RESPONSE BODY:', await response.text());
      } catch (e) {
        console.error('RESPONSE TEXT ERROR', e.message);
      }
    }
  });
  page.on('console', msg => console.log('PAGE CONSOLE:', msg.type(), msg.text()));

  await page.goto('http://localhost:5173/register-school', { waitUntil: 'domcontentloaded' });
  console.log('URL', page.url());
  console.log('INPUT COUNT', await page.locator('input').count());
  for (let i = 0; i < await page.locator('input').count(); i++) {
    console.log('INPUT', i, await page.locator('input').nth(i).evaluate(el => ({ type: el.type, value: el.value, name: el.name, placeholder: el.placeholder })));
  }

  await page.fill('input[type="text"] >> nth=0', 'Playwright Test School');
  await page.fill('input[type="text"] >> nth=1', 'Test City');
  await page.fill('input[type="password"]', 'Playwright123');
  await Promise.all([
    page.waitForResponse(response => response.url().includes('/auth/register-school') || response.url().includes('/auth/register-student') || response.url().includes('/auth/login'), { timeout: 10000 }).catch(e => console.log('waitForResponse failed', e.message)),
    page.click('button[type="submit"]'),
  ]);

  await page.waitForTimeout(3000);
  console.log('DONE');
  await browser.close();
})();
