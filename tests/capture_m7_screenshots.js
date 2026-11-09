import { chromium } from 'playwright';
import path from 'path';

async function capture() {
  const artifactDir = '/Users/karthiknaramala/.gemini/antigravity/brain/63962a62-75d6-46fa-a706-24c32fe88b07/screenshots';
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  // 1. Desktop Landing Page (Full Hero + Demo)
  const dContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const dPage = await dContext.newPage();
  await dPage.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await dPage.waitForTimeout(600);
  await dPage.screenshot({ path: path.join(artifactDir, 'milestone7-desktop-landing-hero.png'), fullPage: false });

  // Scroll down to showcase Trust & Honesty Manifesto + 3-step guide
  await dPage.evaluate(() => window.scrollBy(0, 800));
  await dPage.waitForTimeout(400);
  await dPage.screenshot({ path: path.join(artifactDir, 'milestone7-desktop-landing-trust.png'), fullPage: false });

  // Scroll down to FAQ accordion
  await dPage.evaluate(() => window.scrollBy(0, 800));
  await dPage.waitForTimeout(400);
  await dPage.screenshot({ path: path.join(artifactDir, 'milestone7-desktop-landing-faq.png'), fullPage: false });

  // 2. Mobile Landing Page (390x844)
  const mContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mPage = await mContext.newPage();
  await mPage.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await mPage.waitForTimeout(600);
  await mPage.screenshot({ path: path.join(artifactDir, 'milestone7-mobile-landing.png'), fullPage: false });

  await browser.close();
  console.log('Milestone 7 screenshots captured successfully.');
}

capture().catch(console.error);

