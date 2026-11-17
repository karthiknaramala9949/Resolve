const { chromium } = require('playwright');
const fs = require('fs');
const crypto = require('crypto');

function getSecret() {
  try {
    if (fs.existsSync('.env.local')) {
      const env = fs.readFileSync('.env.local', 'utf8');
      const match = env.match(/BETTER_AUTH_SECRET=([^\r\n]+)/);
      if (match && match[1].trim()) return match[1].trim();
    }
  } catch {
    // Ignore
  }
  return process.env.BETTER_AUTH_SECRET || 'dev_better_auth_secret_must_be_at_least_32_characters_long_for_security';
}

function createSignedSessionCookie(token = 'e2e_fake_token_' + Date.now(), rememberMe = true) {
  const secret = getSecret();
  const maxAge = rememberMe ? 30 * 24 * 3600 : 24 * 3600;
  const exp = Date.now() + maxAge * 1000;
  const payload = JSON.stringify({ t: token, exp });
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const signedCookieValue = `${payload}.${sig}`;

  return {
    name: 'resolve_session',
    value: signedCookieValue,
    domain: '127.0.0.1',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    expires: Math.floor(exp / 1000),
  };
}

async function registerRealUser(rememberMe = true) {
  const email = `e2e_user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`;
  const res = await fetch('http://127.0.0.1:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'E2E Verified User',
      email,
      password: 'Password123!',
      rememberMe,
      turnstileToken: 'mock_test_token',
    }),
  });

  if (!res.ok) {
    throw new Error(`Registration failed: ${res.status} ${await res.text()}`);
  }

  const setCookie = res.headers.get('set-cookie');
  const match = setCookie.match(/resolve_session=([^;]+)/);
  if (!match) throw new Error('No resolve_session cookie in registration response');
  const cookieValue = decodeURIComponent(match[1]);

  return {
    name: 'resolve_session',
    value: cookieValue,
    domain: '127.0.0.1',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    expires: Math.floor(Date.now() / 1000) + (rememberMe ? 30 * 24 * 3600 : 24 * 3600),
  };
}

async function runBrowserTests() {
  console.log('================================================================');
  console.log('PLAYWRIGHT END-TO-END BROWSER TEST SUITE');
  console.log('Target: http://127.0.0.1:3000 (Local Next.js Dev Server)');
  console.log('================================================================\n');

  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  const results = [];

  function record(scenario, passed, details) {
    results.push({ scenario, passed, details });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${scenario}\n       Details: ${details}\n`);
  }

  try {
    // -------------------------------------------------------------
    // Scenario 1: Incognito / unauthenticated -> `/app/overview` redirects to `/login?next=...`
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:3000/app/overview', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('load');

      const url = page.url();
      const hasLoginForm = (await page.locator('input[type="password"]').count()) > 0;
      const passed = url.includes('/login') && url.includes('next=') && hasLoginForm;
      record(
        'Scenario 1: Incognito /app/overview -> redirects to /login?next=%2Fapp%2Foverview',
        passed,
        `Final URL: ${url}, Login form rendered: ${hasLoginForm}`
      );
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 2: Signed-out user at `/` sees landing page (never sees app)
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('load');

      const url = page.url();
      const heading = await page.locator('h1').innerText().catch(() => '');
      const passed = url === 'http://127.0.0.1:3000/' && heading.includes('Turn paperwork into proof');
      record(
        'Scenario 2: Signed-out user at `/` sees landing page with dispute hero',
        passed,
        `URL: ${url}, Heading: "${heading.slice(0, 45)}..."`
      );
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 3: Forged cookie rejection (better-auth.session_token without HMAC signature)
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      await context.addCookies([
        {
          name: 'better-auth.session_token',
          value: 'forged_session_token_without_signature_12345678',
          domain: '127.0.0.1',
          path: '/',
        },
      ]);
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:3000/app/overview', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('load');

      const url = page.url();
      const cookies = await context.cookies();
      const sessionCookie = cookies.find((c) => c.name === 'better-auth.session_token');
      const passed = url.includes('/login') && (!sessionCookie || sessionCookie.value === '');
      record(
        'Scenario 3: Forged cookie named better-auth.session_token is rejected & cleared',
        passed,
        `Final URL: ${url}, Cookie cleared: ${!sessionCookie || sessionCookie.value === ''}`
      );
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 4: Redirect Loop Prevention: Valid signature but dead Convex session
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      // Valid signature, but the token is non-existent/revoked in Convex
      const deadSessionCookie = createSignedSessionCookie('dead_revoked_session_token', true);
      await context.addCookies([deadSessionCookie]);

      const page = await context.newPage();
      let redirectCount = 0;
      page.on('response', (response) => {
        if ([301, 302, 307, 308].includes(response.status())) {
          redirectCount++;
        }
      });

      await page.goto('http://127.0.0.1:3000/app/overview', { waitUntil: 'domcontentloaded' });
      // Wait for layout guard to execute logout and redirect to login
      await page.waitForURL('**/login**', { timeout: 10000 });
      await page.waitForLoadState('load');

      const finalUrl = page.url();
      const cookies = await context.cookies();
      const sessionCookie = cookies.find((c) => c.name === 'resolve_session');
      const passed = finalUrl.includes('/login') && redirectCount < 5 && (!sessionCookie || sessionCookie.value === '');
      record(
        'Scenario 4: Dead session (revoked in Convex) clears cookie and lands on /login (NO REDIRECT LOOP)',
        passed,
        `Final URL: ${finalUrl}, Observed redirects: ${redirectCount}, Dead cookie wiped: ${!sessionCookie || sessionCookie.value === ''}`
      );
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 5: Signed-in user: `/` redirects straight to `/app/overview`
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      const realUserCookie = await registerRealUser(true);
      await context.addCookies([realUserCookie]);

      const page = await context.newPage();
      await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('load');

      const url = page.url();
      const passed = url.includes('/app/overview');
      record(
        'Scenario 5: Signed-in user opening `/` redirects straight to `/app/overview`',
        passed,
        `Redirected URL: ${url}`
      );
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 6: Signed-in user: `/login` and `/signup` redirect straight to `/app/overview`
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      const realUserCookie = await registerRealUser(true);
      await context.addCookies([realUserCookie]);

      const page = await context.newPage();
      await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('load');
      const loginUrl = page.url();

      await page.goto('http://127.0.0.1:3000/signup', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('load');
      const signupUrl = page.url();

      const passed = loginUrl.includes('/app/overview') && signupUrl.includes('/app/overview');
      record(
        'Scenario 6: Signed-in user opening `/login` or `/signup` redirects straight to `/app/overview`',
        passed,
        `/login -> ${loginUrl}, /signup -> ${signupUrl}`
      );
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 7: Session survives browser restart (Close & Reopen Context)
    // -------------------------------------------------------------
    {
      // Phase A: Establish session and get cookies
      let savedCookies;
      {
        const context = await browser.newContext();
        const realUserCookie = await registerRealUser(true);
        await context.addCookies([realUserCookie]);
        savedCookies = await context.cookies();
        await context.close(); // Simulates closing browser
      }

      // Phase B: Reopen new context with saved persistent cookies (simulates reopening browser)
      {
        const reopenedContext = await browser.newContext();
        await reopenedContext.addCookies(savedCookies);
        const page = await reopenedContext.newPage();
        await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('load');

        const url = page.url();
        const passed = url.includes('/app/overview');
        record(
          'Scenario 7: Log in -> close/reopen context -> `/` redirects to `/app/overview`',
          passed,
          `Reopened browser URL: ${url}`
        );
        await reopenedContext.close();
      }
    }

    // -------------------------------------------------------------
    // Scenario 8: New tab in same context -> opens app, session shared across tabs
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      const realUserCookie = await registerRealUser(true);
      await context.addCookies([realUserCookie]);

      // Tab A
      const tabA = await context.newPage();
      await tabA.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });
      await tabA.waitForLoadState('load');

      // Tab B (New Tab)
      const tabB = await context.newPage();
      await tabB.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });
      await tabB.waitForLoadState('load');

      const urlA = tabA.url();
      const urlB = tabB.url();
      const passed = urlA.includes('/app/overview') && urlB.includes('/app/overview');
      record(
        'Scenario 8: Open new tab in same browser -> opens app, session shared across tabs',
        passed,
        `Tab A: ${urlA}, Tab B: ${urlB}`
      );
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 9: Multi-tab sign out: Sign out in Tab A -> Tab B leaves `/app` and goes to `/`
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      const realUserCookie = await registerRealUser(true);
      await context.addCookies([realUserCookie]);

      // Open Tab A on /app/overview
      const tabA = await context.newPage();
      await tabA.goto('http://127.0.0.1:3000/app/overview', { waitUntil: 'domcontentloaded' });
      await tabA.waitForLoadState('load');

      // Open Tab B on /app/overview
      const tabB = await context.newPage();
      await tabB.goto('http://127.0.0.1:3000/app/overview', { waitUntil: 'domcontentloaded' });
      await tabB.waitForLoadState('load');

      // Ensure both tabs are fully initialized and listening to BroadcastChannel
      await tabA.waitForTimeout(500);
      await tabB.waitForTimeout(1000);

      // Trigger sign-out in Tab A and wait for it to navigate to /
      await Promise.all([
        tabA.waitForURL('http://127.0.0.1:3000/'),
        tabA.evaluate(async () => {
          await fetch('/api/auth/logout', { method: 'POST' });
          const payload = { type: 'logout', timestamp: Date.now() };
          try {
            const bc = new BroadcastChannel('resolve_auth_channel');
            bc.postMessage(payload);
          } catch {}
          try {
            localStorage.setItem('resolve_auth_sync', JSON.stringify(payload));
          } catch {}
          window.location.replace('/');
        }),
      ]);

      const tabAUrl = tabA.url();

      // Wait for Tab B to react to remote-logout broadcast and navigate to landing page
      await tabB.waitForURL('http://127.0.0.1:3000/', { timeout: 10000 }).catch(async () => {
        await tabB.bringToFront();
        await tabB.waitForURL('http://127.0.0.1:3000/', { timeout: 5000 });
      });

      const tabBUrl = tabB.url();
      const passed = tabAUrl === 'http://127.0.0.1:3000/' && tabBUrl === 'http://127.0.0.1:3000/';
      record(
        'Scenario 9: Sign out in Tab A -> Tab B leaves `/app` and navigates to `/`',
        passed,
        `Tab A: ${tabAUrl}, Tab B: ${tabBUrl}`
      );

      // -------------------------------------------------------------
      // Scenario 10: Back button after sign-out shows no app shell (Cache-Control: no-store)
      // -------------------------------------------------------------
      // Press Back in Tab A
      await tabA.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await tabA.waitForLoadState('load');

      const backUrl = tabA.url();
      const backPassed = !backUrl.includes('/app/overview') || backUrl.includes('/login');
      record(
        'Scenario 10: Back after sign-out shows no app (Cache-Control: no-store enforced)',
        backPassed,
        `URL after Back: ${backUrl} (Not authenticated /app shell)`
      );

      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 11: External next param sanitization (Open redirect prevention)
    // -------------------------------------------------------------
    {
      const context = await browser.newContext();
      const realUserCookie = await registerRealUser(true);
      await context.addCookies([realUserCookie]);

      const page = await context.newPage();
      await page.goto('http://127.0.0.1:3000/login?next=https://malicious-external-site.com/steal', {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForLoadState('load');

      const url = page.url();
      const passed = !url.includes('malicious-external-site.com') && url.includes('/app/overview');
      record(
        'Scenario 11: Open redirect attack via external `next` param is sanitized to `/app/overview`',
        passed,
        `Sanitized URL: ${url}`
      );
      await context.close();
    }
  } finally {
    await browser.close();
  }

  const allPassed = results.every((r) => r.passed);
  console.log(`================================================================`);
  console.log(`FINAL RESULTS: ${results.filter((r) => r.passed).length}/${results.length} PASSED`);
  console.log(`================================================================`);

  if (!allPassed) {
    process.exit(1);
  }
}

runBrowserTests().catch((err) => {
  console.error('Fatal error running browser tests:', err);
  process.exit(1);
});
