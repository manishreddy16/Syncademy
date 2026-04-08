import { chromium } from "playwright";

(async () => {
  console.log("Starting comprehensive Playwright test...\n");

  const browser = await chromium.launch({ headless: true }); // headless for faster testing
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs = [];
  const apiRequests = [];
  const apiResponses = [];

  page.on("console", msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === "error") {
      console.log(`[ERROR] ${msg.text()}`);
    }
  });
  
  page.on("request", req => {
    if (req.url().includes("api")) {
      apiRequests.push(req.url());
      console.log(`[REQUEST] ${req.method()} ${req.url()}`);
    }
  });

  page.on("response", async resp => {
    if (resp.url().includes("api")) {
      apiResponses.push({ status: resp.status(), url: resp.url() });
      console.log(`[RESPONSE] ${resp.status()} ${resp.url()}`);
      
      // Try to capture response body
      try {
        if (resp.url().includes("register")) {
          const body = await resp.text();
          console.log(`[RESPONSE BODY] ${body}`);
        }
      } catch (e) {
        // Response might be consumed
      }
    }
  });

  let schoolId = null;

  try {
    console.log("=== STEP 1: Navigate to http://localhost:5173 ===");
    await page.goto("http://localhost:5173", { waitUntil: "networkidle", timeout: 15000 });
    console.log("? Page loaded\n");

    console.log("=== STEP 2: Click Register School Admin link ===");
    await page.click("a:has-text('Register School Admin')");
    console.log("? Clicked register link");
    await page.waitForTimeout(1000);

    const registerPageUrl = page.url();
    console.log(`? Current URL: ${registerPageUrl}\n`);

    console.log("=== STEP 3: Fill form with provided data ===");
    const inputs = await page.locator("input").all();
    console.log(`Found ${inputs.length} input fields`);
    
    if (inputs.length >= 1) {
      await inputs[0].fill("Excel International School");
      console.log('? School Name: "Excel International School"');
    }
    if (inputs.length >= 2) {
      await inputs[1].fill("Silicon Valley");
      console.log('? Location: "Silicon Valley"');
    }
    if (inputs.length >= 3) {
      await inputs[2].fill("SecurePass999");
      console.log('? Password: "SecurePass999"');
    }
    console.log("");

    console.log("=== STEP 4: Submit form & capture response ===");
    
    // Wait for API response with timeout
    const responsePromise = page.waitForResponse(
      resp => resp.url().includes("api") && resp.url().includes("register"),
      { timeout: 5000 }
    ).catch(() => {
      console.log("? No API response captured within timeout");
      return null;
    });

    await page.click("button:has-text('Register')");
    console.log("? Clicked Register button");

    const apiResponse = await responsePromise;
    if (apiResponse) {
      const status = apiResponse.status();
      const url = apiResponse.url();
      console.log(`? API Response: ${status} ${url}`);
      
      try {
        const jsonData = await apiResponse.json();
        console.log(`? Response JSON: ${JSON.stringify(jsonData, null, 2)}`);
        schoolId = jsonData.schoolId || jsonData.data?.schoolId || jsonData.id;
        console.log(`? School ID extracted: ${schoolId}`);
      } catch (e) {
        console.log("? Could not parse response as JSON");
      }
    } else {
      console.log("? No registration API response received");
    }
    console.log("");

    await page.waitForTimeout(1500);

    console.log("=== STEP 5: Check for success message or redirect ===");
    const finalUrl = page.url();
    console.log(`Current URL: ${finalUrl}`);

    // Check for success message
    const pageContent = await page.content();
    if (pageContent.includes("success") || pageContent.includes("Success")) {
      console.log("? Success message found in page");
    } else if (pageContent.includes("error") || pageContent.includes("Error")) {
      console.log("? Error message found in page");
    } else {
      console.log("? No obvious success or error message found");
    }

    // Check if redirected to login
    if (finalUrl.includes("login")) {
      console.log("? Redirected to login page");
      console.log("");

      console.log("=== STEP 6-8: Test login with provided credentials ===");
      await page.waitForTimeout(1000);

      const loginInputs = await page.locator("input").all();
      console.log(`Found ${loginInputs.length} input fields on login page`);

      if (loginInputs.length >= 2) {
        await loginInputs[0].fill(schoolId ? schoolId.toString() : "1");
        console.log(`? School ID field filled with: "${schoolId || "1"}"`);
        
        await loginInputs[1].fill("SecurePass999");
        console.log('? Password field filled with: "SecurePass999"');
      }

      console.log("? Clicking Login button...");
      await page.click("button:has-text('Login')");

      await page.waitForTimeout(2000);

      const dashboardUrl = page.url();
      console.log(`After login URL: ${dashboardUrl}`);

      if (!dashboardUrl.includes("login")) {
        console.log("? Successfully redirected from login page (Dashboard access achieved)");
      } else {
        console.log("? Still on login page after login attempt");
      }
    } else {
      console.log("? Not redirected to login page");
    }

    console.log("\n=== TEST COMPLETE ===");
    console.log(`Total API Requests: ${apiRequests.length}`);
    console.log(`Total API Responses: ${apiResponses.length}`);
    console.log(`Console Errors: ${consoleLogs.filter(l => l.type === "error").length}`);

  } catch (error) {
    console.error(`\n? Test error: ${error.message}`);
  }

  await browser.close();
})();
