const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Log all API calls and responses
  page.on('response', response => {
    console.log(\[API] \ \\);
    console.log(\[API] Status: \\);
    if (response.headers()['content-type'] && response.headers()['content-type'].includes('application/json')) {
      response.json().then(body => {
        console.log(\[API] Response Body: \\);
      }).catch(() => {});
    }
  });

  page.on('request', request => {
    console.log(\[REQUEST] \ \\);
    if (request.postDataJSON()) {
      console.log(\[REQUEST] Body: \\);
    }
  });

  // Capture console logs and errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(\[CONSOLE ERROR] \\);
    } else if (msg.type() === 'warn') {
      console.log(\[CONSOLE WARN] \\);
    }
  });

  page.on('pageerror', error => {
    console.log(\[PAGE ERROR] \\);
  });

  try {
    console.log('=== REGISTRATION TEST START ===\n');
    
    // Step 1: Open the application
    console.log('[TEST] Opening http://localhost:5173');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    console.log('[TEST] Page loaded successfully');

    // Step 2: Wait and take screenshot to see the page
    await page.waitForTimeout(1000);
    
    // Look for register button/link
    const registerSelectors = [
      'text=/Register a School Admin/i',
      'text=/Register/i',
      'button:has-text("Register a School Admin")',
      'a:has-text("Register")',
      '[data-testid="register-button"]'
    ];

    let registerClicked = false;
    for (const selector of registerSelectors) {
      try {
        if (await page.isVisible(selector)) {
          console.log(\[TEST] Found register button with selector: \\);
          await page.click(selector);
          registerClicked = true;
          await page.waitForTimeout(1000);
          break;
        }
      } catch (e) {
        // Continue searching
      }
    }

    if (!registerClicked) {
      console.log('[TEST] Could not find register button. Available elements:');
      const buttons = await page.locator('button, a').all();
      for (let i = 0; i < Math.min(buttons.length, 10); i++) {
        const text = await buttons[i].textContent();
        console.log(\  - \\);
      }
    }

    // Step 3: Fill in the registration form
    console.log('\n[TEST] Filling registration form');
    
    // Find and fill school name
    const schoolNameSelectors = [
      'input[name="schoolName"]',
      'input[placeholder*="School Name"]',
      'input[placeholder*="school"]',
      'input:nth-of-type(1)'
    ];

    let schoolNameFilled = false;
    for (const selector of schoolNameSelectors) {
      try {
        if (await page.isVisible(selector)) {
          console.log(\[TEST] Found school name input: \\);
          await page.fill(selector, 'Pioneer Tech Academy');
          schoolNameFilled = true;
          break;
        }
      } catch (e) {}
    }
    if (!schoolNameFilled) console.log('[TEST] Warning: Could not fill school name');

    // Find and fill location
    const locationSelectors = [
      'input[name="location"]',
      'input[placeholder*="Location"]',
      'input[placeholder*="location"]',
      'input:nth-of-type(2)'
    ];

    let locationFilled = false;
    for (const selector of locationSelectors) {
      try {
        if (await page.isVisible(selector)) {
          console.log(\[TEST] Found location input: \\);
          await page.fill(selector, 'New York City');
          locationFilled = true;
          break;
        }
      } catch (e) {}
    }
    if (!locationFilled) console.log('[TEST] Warning: Could not fill location');

    // Find and fill password
    const passwordSelectors = [
      'input[name="password"]',
      'input[type="password"]',
      'input[placeholder*="Password"]',
      'input:nth-of-type(3)'
    ];

    let passwordFilled = false;
    for (const selector of passwordSelectors) {
      try {
        if (await page.isVisible(selector)) {
          console.log(\[TEST] Found password input: \\);
          await page.fill(selector, 'Pioneer2024');
          passwordFilled = true;
          break;
        }
      } catch (e) {}
    }
    if (!passwordFilled) console.log('[TEST] Warning: Could not fill password');

    // Step 4: Submit the form
    console.log('\n[TEST] Submitting form');
    const submitSelectors = [
      'button:has-text("Register")',
      'button:has-text("Submit")',
      'button[type="submit"]',
      'button:nth-of-type(1)'
    ];

    let submitted = false;
    for (const selector of submitSelectors) {
      try {
        if (await page.isVisible(selector)) {
          console.log(\[TEST] Found submit button: \\);
          await page.click(selector);
          submitted = true;
          break;
        }
      } catch (e) {}
    }
    if (!submitted) console.log('[TEST] Warning: Could not find submit button');

    // Wait for response
    await page.waitForTimeout(2000);

    // Step 5: Check for school ID and redirect
    const currentUrl = page.url();
    console.log(\\n[TEST] Current URL after submission: \\);

    let schoolId = null;
    
    // Try to find school ID in response or page
    try {
      const bodyText = await page.locator('body').textContent();
      const schoolIdMatch = bodyText?.match(/school[_-]?id["\s:]*["']?([a-zA-Z0-9\-_]+)["']?/i);
      if (schoolIdMatch) {
        schoolId = schoolIdMatch[1];
        console.log(\[TEST] Found School ID: \\);
      }
    } catch (e) {}

    // Check if redirected to login
    if (currentUrl.includes('login')) {
      console.log('[TEST] SUCCESS: Redirected to login page');
    } else {
      console.log('[TEST] NOTICE: Not on login page');
    }

    // If we got a school ID, test login
    if (schoolId) {
      console.log('\n=== LOGIN TEST START ===\n');
      console.log('[TEST] School ID for login: ' + schoolId);
      
      // Fill login form
      const loginEmailSelectors = [
        'input[name="schoolId"]',
        'input[name="email"]',
        'input[placeholder*="School ID"]',
        'input:nth-of-type(1)'
      ];

      for (const selector of loginEmailSelectors) {
        try {
          if (await page.isVisible(selector)) {
            console.log(\[TEST] Filling login field: \\);
            await page.fill(selector, schoolId);
            break;
          }
        } catch (e) {}
      }

      const loginPasswordSelectors = [
        'input[name="password"]',
        'input[type="password"]',
        'input[placeholder*="Password"]',
        'input:nth-of-type(2)'
      ];

      for (const selector of loginPasswordSelectors) {
        try {
          if (await page.isVisible(selector)) {
            console.log(\[TEST] Filling password field: \\);
            await page.fill(selector, 'Pioneer2024');
            break;
          }
        } catch (e) {}
      }

      // Submit login
      const loginSubmitSelectors = [
        'button:has-text("Login")',
        'button:has-text("Sign In")',
        'button[type="submit"]'
      ];

      for (const selector of loginSubmitSelectors) {
        try {
          if (await page.isVisible(selector)) {
            console.log(\[TEST] Clicking login button: \\);
            await page.click(selector);
            break;
          }
        } catch (e) {}
      }

      await page.waitForTimeout(2000);
      const loginUrl = page.url();
      console.log(\[TEST] URL after login: \\);
      
      if (loginUrl.includes('dashboard') || !loginUrl.includes('login')) {
        console.log('[TEST] SUCCESS: Logged in successfully');
      } else {
        console.log('[TEST] FAILURE: Login redirect not detected');
      }
    } else {
      console.log('\n[TEST] Could not extract School ID for login test');
    }

    console.log('\n=== TEST COMPLETE ===');

  } catch (error) {
    console.log(\\n[ERROR] Test failed: \\);
    console.log(error.stack);
  } finally {
    await browser.close();
  }
})();
