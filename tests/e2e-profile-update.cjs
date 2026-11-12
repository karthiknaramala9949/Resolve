const { chromium } = require('playwright');

async function testProfileUpdate() {
  console.log('Testing Profile update and User-Profile synchronization on http://127.0.0.1:3000 ...\n');

  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleMessages = [];
    page.on('console', (msg) => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });

    // 1. Log in with user credentials
    await page.goto('http://127.0.0.1:3000/login');
    await page.waitForLoadState('networkidle');

    await page.locator('input#identifier, input[type="text"]').first().fill('naramalakarthik143@gmail.com');
    await page.locator('input#password').fill('Naramala@143'); // or default
    await page.locator('button[type="submit"]').click();

    await page.waitForTimeout(1500);

    // 2. Go to /app/profile
    await page.goto('http://127.0.0.1:3000/app/profile');
    await page.waitForLoadState('networkidle');

    console.log('Profile page loaded. Current URL:', page.url());

    // Check if name input exists
    const nameInput = page.locator('input#name, input[name="name"]').first();
    const saveButton = page.locator('button:has-text("Save changes")').first();

    const nameCount = await nameInput.count();
    const btnCount = await saveButton.count();
    console.log(`Name input found: ${nameCount > 0}, Save button found: ${btnCount > 0}`);

    if (nameCount > 0 && btnCount > 0) {
      await nameInput.fill('Karthik Naramala');
      await saveButton.click();
      await page.waitForTimeout(2000);

      const toastCount = await page.locator('.toast, [role="status"], [role="alert"]').count();
      console.log(`Toasts or alerts found: ${toastCount}`);
    }

    console.log('\nRelevant console logs:');
    consoleMessages.filter(m => m.includes('setup') || m.includes('Error') || m.includes('404')).forEach(m => console.log(m));

    await context.close();
  } finally {
    await browser.close();
  }
}

testProfileUpdate().catch(console.error);

