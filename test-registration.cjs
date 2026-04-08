const { chromium } = require('playwright');

(async () => {
  let browser;
  try {
    console.log('Starting registration form test...\n');
    
    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    // Collect all console messages throughout the test
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push('[' + msg.type().toUpperCase() + '] ' + msg.text());
    });
    
    // Log network errors
    page.on('requestfailed', request => {
      console.log('   ✗ Network error: ' + request.url());
    });
    
    // Step 1: Navigate to home
    console.log('1. Navigating to http://localhost:5173');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('   ✓ Page loaded');
    await page.waitForTimeout(1000);
    
    // Step 2: Navigate to register page
    console.log('\n2. Navigating to register page');
    const currentUrl = page.url();
    console.log('   Current URL: ' + currentUrl);
    
    // Try clicking register link first
    const links = await page.locator('a, button').all();
    let foundRegister = false;
    for (const link of links) {
      const text = await link.textContent().catch(() => '');
      if (text.toLowerCase().includes('register') || text.toLowerCase().includes('sign up')) {
        console.log('   Found register link: "' + text.trim() + '"');
        await link.click();
        foundRegister = true;
        break;
      }
    }
    
    if (!foundRegister) {
      console.log('   Register link not found, navigating directly...');
      await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle', timeout: 30000 });
    }
    
    await page.waitForTimeout(1500);
    const registerUrl = page.url();
    console.log('   ✓ Register URL: ' + registerUrl);
    
    // Step 3: Fill the form
    console.log('\n3. Filling registration form');
    
    // Get all inputs and their details
    const inputs = await page.locator('input').all();
    console.log('   Found ' + inputs.length + ' input fields:');
    
    for (let i = 0; i < inputs.length; i++) {
      const type = await inputs[i].getAttribute('type').catch(() => 'text');
      const name = await inputs[i].getAttribute('name').catch(() => '');
      const placeholder = await inputs[i].getAttribute('placeholder').catch(() => '');
      console.log('     [' + i + '] type=' + type + ', name=' + name + ', placeholder=' + placeholder);
    }
    
    // Try to fill based on position/attributes
    if (inputs.length >= 3) {
      // First input - School Name
      await inputs[0].fill('Apex Academy');
      console.log('   ✓ Filled input[0] with "Apex Academy"');
      
      // Second input - Location
      await inputs[1].fill('Downtown');
      console.log('   ✓ Filled input[1] with "Downtown"');
      
      // Password inputs
      const passwordInputs = await page.locator('input[type="password"]').all();
      if (passwordInputs.length > 0) {
        await passwordInputs[0].fill('AcademyPass123');
        console.log('   ✓ Filled password[0] with "AcademyPass123"');
      }
      if (passwordInputs.length > 1) {
        await passwordInputs[1].fill('AcademyPass123');
        console.log('   ✓ Filled password[1] with "AcademyPass123" (confirm)');
      }
    }
    
    await page.waitForTimeout(500);
    
    // Step 4: Submit form
    console.log('\n4. Submitting registration form');
    const buttons = await page.locator('button').all();
    let submitButton = null;
    for (const btn of buttons) {
      const text = await btn.textContent().catch(() => '');
      if (text.toLowerCase().includes('submit') || text.toLowerCase().includes('register') || 
          text.toLowerCase().includes('sign up') || text.toLowerCase().includes('create')) {
        console.log('   Found submit button: "' + text.trim() + '"');
        submitButton = btn;
        break;
      }
    }
    
    if (submitButton) {
      await submitButton.click();
      console.log('   ✓ Clicked submit button');
      
      // Wait for navigation/response
      await page.waitForTimeout(2500);
      
      const postUrl = page.url();
      console.log('   URL after submission: ' + postUrl);
      
      // Check page content for messages
      const pageContent = await page.content();
      if (pageContent.includes('success') || pageContent.includes('Success')) {
        console.log('   ✓ Success message visible');
      }
      if (pageContent.includes('error') || pageContent.includes('Error')) {
        console.log('   ✗ Error message visible');
      }
      
      if (postUrl.includes('login') || postUrl.includes('signin')) {
        console.log('   ✓ Redirected to login page');
      }
    } else {
      console.log('   ✗ Submit button not found');
    }
    
    // Step 5: Test Login
    console.log('\n5. Testing login with School ID: 5, Password: AcademyPass123');
    
    const loginInputs = await page.locator('input').all();
    if (loginInputs.length >= 2) {
      await loginInputs[0].fill('5');
      console.log('   ✓ Filled School ID: 5');
      
      await loginInputs[1].fill('AcademyPass123');
      console.log('   ✓ Filled Password: AcademyPass123');
    }
    
    const loginButtons = await page.locator('button').all();
    let loginButton = null;
    for (const btn of loginButtons) {
      const text = await btn.textContent().catch(() => '');
      if (text.toLowerCase().includes('login') || text.toLowerCase().includes('sign in') || 
          text.toLowerCase().includes('submit')) {
        loginButton = btn;
        break;
      }
    }
    
    if (loginButton) {
      await loginButton.click();
      console.log('   ✓ Clicked login button');
      
      await page.waitForTimeout(3000);
      
      const finalUrl = page.url();
      console.log('   Final URL after login: ' + finalUrl);
      
      if (finalUrl.includes('dashboard') || finalUrl.includes('home') || finalUrl.includes('school')) {
        console.log('   ✓ Successfully accessed dashboard/home page');
      } else if (finalUrl.includes('login') || finalUrl.includes('signin')) {
        console.log('   ✗ Login failed - still on login page');
      }
    }
    
    // Step 6: Report console logs
    console.log('\n6. Browser console logs:');
    if (consoleLogs.length > 0) {
      for (const log of consoleLogs) {
        console.log('   ' + log);
      }
    } else {
      console.log('   (No console messages)');
    }
    
    await browser.close();
    console.log('\n✓ Test completed successfully');
    
  } catch (error) {
    console.error('Error during test:', error.message);
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
    process.exit(1);
  }
})();
