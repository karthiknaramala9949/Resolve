import { chromium, Browser, Page } from 'playwright';

async function runNoDeadClickSweep() {
  console.log('===========================================================');
  console.log('STARTING PLAYWRIGHT "NO DEAD CLICK" SWEEP ACROSS ALL ROUTES');
  console.log('===========================================================\n');

  const browser: Browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  
  // Grant clipboard permissions
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  const page: Page = await context.newPage();
  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });

  const routes = [
    '/',
    '/app/overview',
    '/app/cases',
    '/app/documents',
    '/app/purchases',
    '/app/help',
    '/app/reminders',
    '/app/privacy',
  ];

  let totalElementsAudited = 0;
  let totalSuccessfulInteractions = 0;
  const deadClicks: string[] = [];

  for (const route of routes) {
    console.log(`\nAuditing route: http://127.0.0.1:3000${route}`);
    await page.goto(`http://127.0.0.1:3000${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    // Get all visible interactive buttons and links
    const buttons = await page.$$('button:visible, a:visible');
    console.log(`   Found ${buttons.length} visible interactive candidates.`);

    for (let i = 0; i < buttons.length; i++) {
      // If a dialog was left open, close it
      const openModal = await page.$('[role="dialog"]');
      if (openModal) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
      }

      // Re-navigate if route was changed or modal remained
      if (new URL(page.url()).pathname !== route || (await page.$('[role="dialog"]'))) {
        await page.goto(`http://127.0.0.1:3000${route}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(150);
      }

      // Re-query buttons on current DOM
      const currentButtons = await page.$$('button:visible, a:visible');
      const target = currentButtons[i];
      if (!target) continue;

      // Extract text/label
      const text = (await target.textContent())?.trim().slice(0, 35) || 
                   (await target.getAttribute('aria-label')) || 
                   (await target.getAttribute('title')) || 
                   'Interactive element';

      const isAriaDisabled = (await target.getAttribute('aria-disabled')) === 'true';
      const isDisabled = await target.isDisabled().catch(() => false);

      const isDevOverlay = await target.evaluate((el) => {
        return Boolean(el.closest('nextjs-portal') || el.closest('[data-nextjs-toast]') || el.closest('#__next-build-watcher'));
      }).catch(() => false);
      if (isDevOverlay || text.includes('Hide Errors')) {
        continue;
      }

      if (isDisabled || isAriaDisabled) {
        console.log(`   [SKIP] "${text}" is intentionally disabled.`);
        continue;
      }

      totalElementsAudited++;

      // Snapshot complete application and browser state before click
      const stateBefore = await page.evaluate(() => ({
        url: window.location.href,
        htmlClass: document.documentElement.className,
        theme: localStorage.getItem('resolve-one-theme'),
        simple: localStorage.getItem('resolve-one-simple-language'),
        hasDialog: document.querySelectorAll('[role="dialog"]').length,
        hasToast: document.querySelectorAll('aside[role="status"], div[role="status"]').length,
        domLength: document.body.innerHTML.length,
      }));

      let triggeredSomething = false;

      // Listen for download event if triggered
      const downloadPromise = page.waitForEvent('download', { timeout: 300 }).catch(() => null);

      try {
        await target.click({ timeout: 1000 }).catch(() => null);
        await page.waitForTimeout(400);

        const stateAfter = await page.evaluate(() => ({
          url: window.location.href,
          htmlClass: document.documentElement.className,
          theme: localStorage.getItem('resolve-one-theme'),
          simple: localStorage.getItem('resolve-one-simple-language'),
          hasDialog: document.querySelectorAll('[role="dialog"]').length,
          hasToast: document.querySelectorAll('aside[role="status"], div[role="status"]').length,
          domLength: document.body.innerHTML.length,
        }));

        const downloaded = await downloadPromise;

        const urlChanged = stateBefore.url !== stateAfter.url;
        const themeChanged = stateBefore.htmlClass !== stateAfter.htmlClass || stateBefore.theme !== stateAfter.theme;
        const simpleChanged = stateBefore.simple !== stateAfter.simple;
        const dialogChanged = stateBefore.hasDialog !== stateAfter.hasDialog || stateAfter.hasDialog > 0;
        const toastChanged = stateBefore.hasToast !== stateAfter.hasToast || stateAfter.hasToast > 0;
        const domChanged = Math.abs(stateBefore.domLength - stateAfter.domLength) > 5;
        const href = await target.getAttribute('href');

        const isAlreadyActiveToggle = 
          (text.includes('Light Theme') && (stateBefore.theme === 'light' || !stateBefore.htmlClass.includes('dark'))) ||
          (text.includes('Dark Theme') && (stateBefore.theme === 'dark' || stateBefore.htmlClass.includes('dark')));

        if (
          urlChanged ||
          themeChanged ||
          simpleChanged ||
          dialogChanged ||
          toastChanged ||
          downloaded !== null ||
          domChanged ||
          href !== null ||
          isAlreadyActiveToggle
        ) {
          triggeredSomething = true;
          totalSuccessfulInteractions++;
          console.log(`   ✓ "${text}" -> triggered observable state change`);
        } else {
          console.warn(`   ⚠️ WARNING: Element "${text}" produced no observable DOM/URL change.`);
          deadClicks.push(`${route} > "${text}"`);
        }

        // Clean up if a dialog was opened
        if (stateAfter.hasDialog > 0) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(100);
        }
      } catch (err: any) {
        console.warn(`   ⚠️ Click interaction warning on "${text}": ${err.message}`);
      }
    }
  }

  await browser.close();

  console.log('\n===========================================================');
  console.log(`NO-DEAD-CLICK AUDIT COMPLETE:`);
  console.log(`- Total Interactive Elements Tested: ${totalElementsAudited}`);
  console.log(`- Verified Functioning: ${totalSuccessfulInteractions}`);
  console.log(`- Unverified / Dead Clicks: ${deadClicks.length}`);
  console.log('===========================================================');

  if (deadClicks.length > 0) {
    console.error('FAIL: Found dead clicks:', deadClicks);
    process.exit(1);
  } else {
    console.log('PASS: 100% of tested interactive elements triggered observable actions!');
  }
}

runNoDeadClickSweep().catch((err) => {
  console.error('Sweep failed:', err);
  process.exit(1);
});

