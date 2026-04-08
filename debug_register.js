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
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('console', msg => console.log('PAGE CONSOLE:', msg.type(), msg.text()));

  await page.goto('http://localhost:5173/register-school');
  await page.fill('input[name="name"]', 'Playwright Test School');
  await page.fill('input[name="location"]', 'Test City');
  await page.fill('input[type="password"]', 'Playwright123');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(5000);
  console.log('DONE');
  await browser.close();
})();