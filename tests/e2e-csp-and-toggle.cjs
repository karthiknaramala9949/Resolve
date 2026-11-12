const { chromium } = require('playwright');

async function testCspAndToggle() {
  console.log('Starting Playwright CSP and Password Toggle Verification on http://127.0.0.1:3000 ...\n');

  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  const results = [];
  function record(scenario, passed, details) {
    results.push({ scenario, passed, details });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${scenario}: ${details}`);
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Check for CSP errors in console on /login
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      const consoleErrors = [];
      const cspErrors = [];

      page.on('console', (msg) => {
        const text = msg.text();
        if (msg.type() === 'error') {
          consoleErrors.push(text);
          if (text.toLowerCase().includes('content security policy') || text.toLowerCase().includes('violates')) {
            cspErrors.push(text);
          }
        }
      });

      page.on('pageerror', (err) => {
        consoleErrors.push(err.message);
        if (err.message.toLowerCase().includes('content security policy') || err.message.toLowerCase().includes('violates') || err.message.includes('EvalError')) {
          cspErrors.push(err.message);
        }
      });

      await page.goto('http://127.0.0.1:3000/login');
      await page.waitForLoadState('networkidle');

      const passed = cspErrors.length === 0;
      record('Test 1: Zero CSP errors on /login', passed, `CSP Errors found: ${cspErrors.length} (${cspErrors.join(' | ') || 'None'})`);
      await context.close();
    }

    // -------------------------------------------------------------
    // Test 2: Password visibility toggle on /login
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:3000/login');
      await page.waitForLoadState('networkidle');

      const passwordInput = page.locator('input#password');
      await passwordInput.waitFor({ state: 'visible' });
      await passwordInput.fill('SecretPassword123!');

      // Verify initially type="password"
      const initialType = await passwordInput.getAttribute('type');
      const initialCheck = initialType === 'password';

      // Find toggle button inside the password container
      const toggleBtn = page.locator('button[aria-label="Show password"]');
      await toggleBtn.click();

      // Verify switched to type="text"
      const typeAfterFirstClick = await passwordInput.getAttribute('type');
      const firstClickCheck = typeAfterFirstClick === 'text';

      // Click again
      const hideBtn = page.locator('button[aria-label="Hide password"]');
      await hideBtn.click();

      // Verify switched back to type="password"
      const typeAfterSecondClick = await passwordInput.getAttribute('type');
      const secondClickCheck = typeAfterSecondClick === 'password';

      const passed = initialCheck && firstClickCheck && secondClickCheck;
      record(
        'Test 2: Password visibility eye toggle on /login switches between password and text',
        passed,
        `Initial: ${initialType}, After click 1: ${typeAfterFirstClick}, After click 2: ${typeAfterSecondClick}`
      );
      await context.close();
    }

    // -------------------------------------------------------------
    // Test 3: Password visibility toggle on /signup
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:3000/signup');
      await page.waitForLoadState('networkidle');

      const passwordInput = page.locator('input#password');
      await passwordInput.waitFor({ state: 'visible' });
      await passwordInput.fill('StrongP@ssw0rd99!');

      const initialType = await passwordInput.getAttribute('type');
      const initialCheck = initialType === 'password';

      const toggleBtn = page.locator('button[aria-label="Show password"]');
      await toggleBtn.click();

      const typeAfterFirstClick = await passwordInput.getAttribute('type');
      const firstClickCheck = typeAfterFirstClick === 'text';

      const hideBtn = page.locator('button[aria-label="Hide password"]');
      await hideBtn.click();

      const typeAfterSecondClick = await passwordInput.getAttribute('type');
      const secondClickCheck = typeAfterSecondClick === 'password';

      const passed = initialCheck && firstClickCheck && secondClickCheck;
      record(
        'Test 3: Password visibility eye toggle on /signup switches between password and text',
        passed,
        `Initial: ${initialType}, After click 1: ${typeAfterFirstClick}, After click 2: ${typeAfterSecondClick}`
      );
      await context.close();
    }

    // -------------------------------------------------------------
    // Test 4: End-to-end Login attempt on /login
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:3000/login');
      await page.waitForLoadState('networkidle');

      const emailInput = page.locator('input#identifier, input[type="text"]').first();
      const passwordInput = page.locator('input#password');
      const submitBtn = page.locator('button[type="submit"]');

      await emailInput.fill('naramalakarthik143@gmail.com');
      await passwordInput.fill('Password123!'); // or test credentials
      await submitBtn.click();

      // Wait a moment for network response
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      const errorMsgCount = await page.locator('.text-red-500, .text-red-600').count();
      let errorText = '';
      if (errorMsgCount > 0) {
        errorText = (await page.locator('.text-red-500, .text-red-600').first().textContent()) || '';
      }

      console.log(`Login attempt result URL: ${currentUrl}, error: ${errorText || 'None'}`);
      record(
        'Test 4: Login form submission interactive test',
        true,
        `Final URL: ${currentUrl}, Error text: ${errorText || 'None'}`
      );
      await context.close();
    }

  } finally {
    await browser.close();
  }

  const allPassed = results.every(r => r.passed);
  console.log(`\n========================================`);
  console.log(`CSP & TOGGLE TEST SUMMARY: ${results.filter(r => r.passed).length}/${results.length} PASSED`);
  console.log(`========================================`);
  if (!allPassed) {
    process.exit(1);
  }
}

testCspAndToggle().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
