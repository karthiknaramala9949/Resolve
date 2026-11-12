const { chromium } = require('playwright');

async function runBrowserTests() {
  console.log('Starting Playwright End-to-End Real Browser Verification on http://127.0.0.1:3000 ...\n');

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
    // Scenario 1: Fresh browser, no cookies -> `/` displays landing page
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:3000/');
      await page.waitForLoadState('networkidle');
      const url = page.url();
      const title = await page.title();
      const hasHeading = await page.locator('h1').innerText();
      const passed = url === 'http://127.0.0.1:3000/' && hasHeading.includes('Turn paperwork into proof');
      record('Scenario 1: Fresh browser, no cookies -> `/` displays landing page', passed, `URL: ${url}, Title: "${title}"`);
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 2: Existing expired session cookie -> `/` displays landing page
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      await context.addCookies([
        { name: 'resolve_session', value: 'expired_invalid_token.bad_signature', domain: '127.0.0.1', path: '/' },
        { name: 'better-auth.session_token', value: 'expired_token_123', domain: '127.0.0.1', path: '/' },
      ]);
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:3000/');
      await page.waitForLoadState('networkidle');
      const url = page.url();
      const passed = url === 'http://127.0.0.1:3000/';
      record('Scenario 2: Existing expired session cookie -> `/` displays landing page', passed, `URL: ${url}`);
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 3: Valid authenticated session -> `/` still displays landing page
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      await context.addCookies([
        { name: 'resolve_session', value: 'valid_test_token.valid_signature', domain: '127.0.0.1', path: '/' },
        { name: 'better-auth.session_token', value: 'valid_test_token_12345678', domain: '127.0.0.1', path: '/' },
      ]);
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:3000/');
      await page.waitForLoadState('networkidle');
      const url = page.url();
      const passed = url === 'http://127.0.0.1:3000/';
      record('Scenario 3: Valid authenticated session -> `/` still displays landing page', passed, `URL: ${url}`);
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 4: Refresh `/` -> remains on `/`
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:3000/');
      await page.waitForLoadState('networkidle');
      await page.reload();
      await page.waitForLoadState('networkidle');
      const url = page.url();
      const passed = url === 'http://127.0.0.1:3000/';
      record('Scenario 4: Refresh `/` -> remains on `/`', passed, `URL: ${url}`);
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 5: Click Login / Sign In -> `/login` (displays login page, NOT app)
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:3000/');
      await page.waitForLoadState('networkidle');

      const loginLink = page.locator('header a[href="/login"]').first();
      await loginLink.click();
      await page.waitForURL('**/login');

      const url = page.url();
      const hasLoginForm = await page.locator('input[type="password"]').count() > 0;
      const passed = url.includes('/login') && hasLoginForm;
      record('Scenario 5: Click Sign in -> `/login` displays login page (not app)', passed, `URL: ${url}, Form present: ${hasLoginForm}`);
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 6: Click Get Started -> `/login` displays login page
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:3000/');
      await page.waitForLoadState('networkidle');

      const getStartedBtn = page.locator('header a:has-text("Get started")').first();
      await getStartedBtn.click();
      await page.waitForURL('**/login');

      const url = page.url();
      const hasLoginForm = await page.locator('input[type="password"]').count() > 0;
      const passed = url.includes('/login') && hasLoginForm;
      record('Scenario 6: Click Get Started -> `/login` displays login page', passed, `URL: ${url}, Form present: ${hasLoginForm}`);
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 7: Open `/app/overview` without login -> redirects to `/login`
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:3000/app/overview');
      await page.waitForLoadState('networkidle');

      const url = page.url();
      const passed = url.includes('/login') && url.includes('next=');
      record('Scenario 7: Open `/app/overview` without login -> redirects to `/login`', passed, `URL: ${url}`);
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 8: Open `/login` directly -> login page displays
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:3000/login');
      await page.waitForLoadState('networkidle');

      const url = page.url();
      const hasPasswordInput = await page.locator('input[type="password"]').count() > 0;
      const passed = url.includes('/login') && hasPasswordInput;
      record('Scenario 8: Open `/login` directly -> login page displays', passed, `URL: ${url}, Password input present: ${hasPasswordInput}`);
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 9: Open `/signup` directly -> signup page displays
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:3000/signup');
      await page.waitForLoadState('networkidle');

      const url = page.url();
      const hasSignupInput = await page.locator('input[type="password"]').count() > 0;
      const passed = url.includes('/signup') && hasSignupInput;
      record('Scenario 9: Open `/signup` directly -> signup page displays', passed, `URL: ${url}`);
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 10: Refresh `/login` -> remains on `/login`
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:3000/login');
      await page.waitForLoadState('networkidle');
      await page.reload();
      await page.waitForLoadState('networkidle');

      const url = page.url();
      const passed = url.includes('/login');
      record('Scenario 10: Refresh `/login` -> remains on `/login`', passed, `URL: ${url}`);
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 11: Even with existing cookie, open `/login` -> displays login page (NOT app)
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      await context.addCookies([
        { name: 'better-auth.session_token', value: 'any_session_token_12345678', domain: '127.0.0.1', path: '/' },
        { name: 'resolve_session', value: 'any_session_token.signature', domain: '127.0.0.1', path: '/' },
      ]);
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:3000/login');
      await page.waitForLoadState('networkidle');

      const url = page.url();
      const hasPasswordInput = await page.locator('input[type="password"]').count() > 0;
      const passed = url.includes('/login') && hasPasswordInput && !url.includes('/app/overview');
      record('Scenario 11: Visiting `/login` with cookies renders login form, does NOT redirect to `/app/overview`', passed, `URL: ${url}`);
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 12: No redirect loops between `/`, `/login`, and `/app/overview`
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      let redirectCount = 0;
      page.on('response', (response) => {
        if ([301, 302, 307, 308].includes(response.status())) {
          redirectCount++;
        }
      });

      await page.goto('http://127.0.0.1:3000/');
      await page.waitForLoadState('networkidle');

      await page.goto('http://127.0.0.1:3000/login');
      await page.waitForLoadState('networkidle');

      await page.goto('http://127.0.0.1:3000/app/overview');
      await page.waitForLoadState('networkidle');

      const passed = redirectCount <= 1; // Only unauthenticated /app/overview -> /login is expected
      record('Scenario 12: No redirect loops between `/`, `/login`, and `/app/overview`', passed, `Total redirects observed: ${redirectCount}`);
      await context.close();
    }

  } finally {
    await browser.close();
  }

  const allPassed = results.every(r => r.passed);
  console.log(`\n========================================`);
  console.log(`REAL BROWSER TEST SUMMARY: ${results.filter(r => r.passed).length}/${results.length} PASSED`);
  console.log(`========================================`);
  if (!allPassed) {
    process.exit(1);
  }
}

runBrowserTests().catch((err) => {
  console.error('Fatal error running browser tests:', err);
  process.exit(1);
});
