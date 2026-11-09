import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = '/Users/karthiknaramala/.gemini/antigravity/brain/63962a62-75d6-46fa-a706-24c32fe88b07/screenshots';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  // Desktop (1440x900)
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const desktopPage = await desktopContext.newPage();

  console.log('Navigating to overview in Hindi (desktop)...');
  await desktopPage.goto('http://127.0.0.1:3000/app/overview', { waitUntil: 'networkidle' });
  // Click Hindi language button
  await desktopPage.click('button:has-text("हिन्दी")');
  await desktopPage.waitForTimeout(400);
  await desktopPage.screenshot({ path: path.join(outDir, 'milestone6-desktop-hindi.png') });

  console.log('Switching to Telugu (desktop)...');
  await desktopPage.click('button:has-text("తెలుగు")');
  await desktopPage.waitForTimeout(400);
  await desktopPage.screenshot({ path: path.join(outDir, 'milestone6-desktop-telugu.png') });

  console.log('Navigating to Privacy (desktop)...');
  await desktopPage.goto('http://127.0.0.1:3000/app/privacy', { waitUntil: 'networkidle' });
  await desktopPage.screenshot({ path: path.join(outDir, 'milestone6-desktop-privacy.png') });

  // Mobile (390x844)
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();

  console.log('Navigating to Privacy in Telugu (mobile)...');
  await mobilePage.goto('http://127.0.0.1:3000/app/privacy', { waitUntil: 'networkidle' });
  await mobilePage.screenshot({ path: path.join(outDir, 'milestone6-mobile-privacy.png') });

  await browser.close();
  console.log('Milestone 6 screenshots captured successfully.');
}

capture().catch((err) => {
  console.error('Capture error:', err);
  process.exit(1);
});
