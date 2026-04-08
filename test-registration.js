const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.createContext();
  const page = await context.newPage();
  
  console.log('Starting registration form test...\n');
  
  // Navigate to home page
  console.log('1. Navigating to http://localhost:5173');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  
  // Look for register link
  console.log('2. Looking for register link...');
  await page.waitForTimeout(1000);
  
  // Try to find and click register link
  const registerLink = await page.locator('a, button', { hasText: /register|sign up/i }).first();
  const registerLinkExists = await registerLink.isVisible().catch(() => false);
  
  if (registerLinkExists) {
    console.log('   Found register link, clicking...');
    await registerLink.click();
  } else {
    console.log('   Checking URL paths for register route...');
    await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle' });
  }
  
  await page.waitForTimeout(1000);
  
  // Check current URL
  const currentUrl = page.url();
  console.log('   Current URL:', currentUrl);
  
  // Fill in the registration form
  console.log('\n3. Filling registration form...');
  try {
    // School Name
    const schoolNameInput = await page.locator('input[placeholder*="chool"], input[name*="school"], input[placeholder*="name"]').first();
    if (await schoolNameInput.isVisible().catch(() => false)) {
      await schoolNameInput.fill('Apex Academy');
      console.log('   ✓ Filled School Name: "Apex Academy"');
    }
    
    // Location
    const locationInput = await page.locator('input[placeholder*="ocation"], input[name*="location"]').first();
    if (await locationInput.isVisible().catch(() => false)) {
      await locationInput.fill('Downtown');
      console.log('   ✓ Filled Location: "Downtown"');
    }
    
    // Password
    const passwordInputs = await page.locator('input[type="password"]').all();
    if (passwordInputs.length > 0) {
      await passwordInputs[0].fill('AcademyPass123');
      console.log('   ✓ Filled Password: "AcademyPass123"');
    }
    
    // Confirm Password (if exists)
    if (passwordInputs.length > 1) {
      await passwordInputs[1].fill('AcademyPass123');
      console.log('   ✓ Filled Confirm Password: "AcademyPass123"');
    }
    
  } catch (error) {
    console.log('   Error filling form:', error.message);
  }
  
  await page.waitForTimeout(500);
  
  // Check form fields visibility
  const allInputs = await page.locator('input').all();
  console.log('   Found ' + allInputs.length + ' input fields on the form');
  
  // Submit the form
  console.log('\n4. Submitting registration form...');
  const submitButton = await page.locator('button', { hasText: /submit|register|sign up|create/i }).first();
  const submitExists = await submitButton.isVisible().catch(() => false);
  
  let registrationSchoolId = null;
  
  if (submitExists) {
    console.log('   Found submit button, clicking...');
    
    // Listen for network responses
    page.on('response', response => {
      if (response.url().includes('register') || response.url().includes('school')) {
        console.log('   Network response:', response.status(), response.url());
      }
    });
    
    page.on('requestfailed', request => {
      console.log('   Network error:', request.url());
    });
    
    await submitButton.click();
    
    // Wait for response or error
    await page.waitForTimeout(2000);
    
    // Check for success message
    const successMessage = await page.locator('text=/success|registered|congratulations/i').first().isVisible().catch(() => false);
    const errorMessage = await page.locator('text=/error|failed|invalid/i').first().isVisible().catch(() => false);
    
    if (successMessage) {
      console.log('   ✓ Success message displayed');
    }
    if (errorMessage) {
      console.log('   ✗ Error message displayed');
    }
    
    // Check for redirect to login
    await page.waitForTimeout(2000);
    const finalUrl = page.url();
    console.log('   Final URL:', finalUrl);
    
    if (finalUrl.includes('login') || finalUrl.includes('signin')) {
      console.log('   ✓ Redirected to login page');
    }
  }
  
  // Get console logs
  console.log('\n5. Browser console logs:');
  page.on('console', msg => {
    console.log('   [' + msg.type() + '] ' + msg.text());
  });
  
  // Try login
  console.log('\n6. Testing login...');
  
  // Typically School ID would be returned from API
  // Let's check if we can extract it from the page or assume ID 5
  const schoolIdToTest = '5';
  
  console.log('   Attempting login with School ID: "' + schoolIdToTest + '" and password: "AcademyPass123"');
  
  const schoolIdInput = await page.locator('input[placeholder*="ID"], input[placeholder*="chool"], input[name*="id"]').first();
  if (await schoolIdInput.isVisible().catch(() => false)) {
    await schoolIdInput.fill(schoolIdToTest);
  }
  
  const passwordInput = await page.locator('input[type="password"]').first();
  if (await passwordInput.isVisible().catch(() => false)) {
    await passwordInput.fill('AcademyPass123');
  }
  
  const loginButton = await page.locator('button', { hasText: /login|sign in|submit/i }).first();
  if (await loginButton.isVisible().catch(() => false)) {
    await loginButton.click();
    console.log('   Clicked login button');
  }
  
  await page.waitForTimeout(3000);
  
  // Check results
  const dashboardUrl = page.url();
  console.log('   Final URL after login:', dashboardUrl);
  
  if (dashboardUrl.includes('dashboard') || dashboardUrl.includes('home')) {
    console.log('   ✓ Successfully accessed dashboard');
  } else if (dashboardUrl.includes('login') || dashboardUrl.includes('signin')) {
    console.log('   ✗ Login failed - still on login page');
  }
  
  await page.waitForTimeout(2000);
  await browser.close();
  console.log('\n✓ Test completed');
})();
