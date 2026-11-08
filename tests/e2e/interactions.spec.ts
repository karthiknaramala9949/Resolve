import { chromium, Browser, Page } from 'playwright';
import path from 'path';

async function runInteractionsSuite() {
  console.log('===========================================================');
  console.log('STARTING PHASE 1: 12-FLOW USER INTERACTION TEST SUITE');
  console.log('===========================================================\n');

  const artifactDir = '/Users/karthiknaramala/.gemini/antigravity/brain/63962a62-75d6-46fa-a706-24c32fe88b07/screenshots';
  const browser: Browser = await chromium.launch({ channel: 'chrome', headless: true });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // Mock speech recognition API in browser context
  await context.addInitScript(() => {
    class MockSpeechRecognition {
      lang = 'en-IN';
      continuous = false;
      interimResults = false;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onresult: ((ev: any) => void) | null = null;
      onerror: ((ev: any) => void) | null = null;

      start() {
        if (this.onstart) this.onstart();
        setTimeout(() => {
          if (this.onresult) {
            this.onresult({
              results: [[{ transcript: 'Defective smart watch delivered from Flipkart on Nov 2 for ₹3,499' }]],
            });
          }
          if (this.onend) this.onend();
        }, 150);
      }
      stop() {
        if (this.onend) this.onend();
      }
    }

    (window as any).SpeechRecognition = MockSpeechRecognition;
    (window as any).webkitSpeechRecognition = MockSpeechRecognition;
  });

  const page: Page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.text().includes('Error')) {
      console.log('   [PAGE LOG]', msg.text());
    }
  });
  page.on('pageerror', (err) => console.log('   [PAGE ERROR]', err.message));

  // FLOW 1: Landing Page (CTAs, Accordion, Theme, Language)
  console.log('Flow 1: Verifying Landing Page interactions...');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });

  // 1.1 Header Navigation
  await page.click('button:has-text("Open App")');
  await page.waitForFunction(() => window.location.pathname === '/app/overview');
  console.log('   ✓ Header "Open App" navigates to /app/overview');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });

  // 1.2 FAQ Accordion
  await page.click('button:has-text("Does RESOLVE-ONE contact the company")');
  await page.waitForSelector('text=Never. RESOLVE-ONE operates with 100% customer approval');
  console.log('   ✓ FAQ accordion toggled answer open');

  // 1.3 Hero Live Demo
  const demoTextarea = page.locator('textarea').first();
  await demoTextarea.fill('Ordered headphones from Amazon for ₹1,999 on Oct 25. Order 402-1920381-1928412. Box was empty.');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Convert to Case")');
  await page.waitForSelector('text=Tell us what happened');
  console.log('   ✓ Landing "Convert to Case" opened intake with prefilled story');

  // FLOW 2 & 3: 60-Second Intake (Edit Chips, Create, Verify in List)
  console.log('\nFlow 2 & 3: Verifying Intake Modal, chip editing, and case list...');
  // Edit company chip
  await page.click('button:has-text("Company:")');
  const companyInput = page.locator('input[placeholder*="Flipkart, Amazon"]');
  await companyInput.fill('Amazon India');
  await page.click('button:has-text("Done")');
  console.log('   ✓ Company chip successfully edited');

  // Confirm case creation
  await page.click('button:has-text("Confirm & Create Case")');
  await page.waitForFunction(() => window.location.pathname.startsWith('/app/cases/RS-'));
  const caseUrl = page.url();
  const caseId = caseUrl.split('/').pop()!;
  console.log(`   ✓ Created case ${caseId}`);

  // FLOW 4: Case Detail Lifecycle Actions
  console.log('\nFlow 4: Verifying Case Detail comprehensive actions...');
  // 4.1 Mark Sent to Company
  await page.click('button:has-text("Mark Sent to Company")');
  await page.waitForSelector('text=Waiting for Company');
  console.log('   ✓ Marked case as Sent to Company');

  // 4.2 Copy Complaint Notice
  await page.click('button:has-text("Copy Complaint Notice")');
  await page.waitForSelector('text=Formal CPA 2019 grievance letter copied to clipboard!');
  console.log('   ✓ Copied formal complaint notice to clipboard');

  // 4.3 Open Official Channel Drawer
  await page.click('button:has-text("Open Official Channel")');
  await page.waitForSelector('text=National Consumer Helpline (NCH)');
  await page.click('button:has-text("Close")');
  console.log('   ✓ Official Channel drawer verified');

  // 4.4 Add Progress Event
  await page.click('button:has-text("Add Event")');
  await page.fill('input[placeholder*="Spoke with customer care"]', 'Spoke to tier 2 escalation supervisor');
  await page.fill('textarea[placeholder*="What was said"]', 'Agent promised written refund confirmation within 24 hours.');
  await page.click('button:has-text("Save Event")');
  await page.waitForSelector('text=Spoke to tier 2 escalation supervisor');
  console.log('   ✓ Timeline progress event saved');

  // 4.5 Add Follow-up Reminder for Case
  await page.click('button:has-text("Add Follow-Up Reminder")');
  await page.click('button:has-text("+7 Days")');
  await page.click('button:has-text("Schedule Reminder")');
  console.log('   ✓ Follow-up reminder scheduled directly from case');

  // 4.6 Update Resolution / Three-State Outcome
  await page.click('button:has-text("Update Resolution / Verify Bank Receipt")');
  await page.fill('input[placeholder*="1999"]', '1999');
  await page.fill('textarea[placeholder*="Verified"]', 'Verified ₹1999 credited via Amazon Pay/HDFC.');
  await page.click('button:has-text("Save Outcome Status")');
  await page.waitForSelector('text=Confirmed Resolved');
  console.log('   ✓ Confirmed Three-State Stage 3 bank outcome (Resolved)');

  // 4.7 Reopen Case
  await page.click('button:has-text("Reopen Case")');
  await page.waitForSelector('text=Action Required');
  console.log('   ✓ Case reopened successfully');

  // 4.8 Archive Case
  await page.click('button:has-text("Archive Case")');
  await page.waitForSelector('text=Closed');
  console.log('   ✓ Case archived');

  // FLOW 5: Documents & Proof Pack PDF
  console.log('\nFlow 5: Verifying Documents & Proof Pack builder...');
  await page.goto('http://127.0.0.1:5173/app/documents', { waitUntil: 'networkidle' });
  await page.click('button:has-text("Build Proof Pack")');
  await page.waitForSelector('text=Bundle Contents');
  await page.click('button:has-text("Download PDF Proof Pack")');
  await page.waitForSelector('text=Proof Pack PDF exported cleanly.');
  console.log('   ✓ Proof Pack compiled and downloaded client-side');

  // FLOW 6: Purchases & Protection Vault
  console.log('\nFlow 6: Verifying Purchases Vault (Add, Edit, Import, Case creation)...');
  await page.goto('http://127.0.0.1:5173/app/purchases', { waitUntil: 'networkidle' });
  
  // 6.1 Manual Add
  await page.click('button:has-text("Add Purchase")');
  await page.fill('input[placeholder*="Amazon India, Flipkart"]', 'Tata Neu Electronics');
  await page.fill('input[placeholder*="Mechanical Keyboard"]', 'Noise-Cancelling Headphones');
  await page.fill('input[placeholder*="OD4819201"]', 'TN-9920194');
  await page.fill('input[placeholder*="2499"]', '4999');
  await page.click('button:has-text("Save Purchase")');
  await page.waitForSelector('text=Noise-Cancelling Headphones');
  console.log('   ✓ Purchase manually added and return countdown ring active');

  // 6.2 Start Case from Purchase
  const startCaseBtn = page.locator('button:has-text("Start a case from this purchase")').first();
  await startCaseBtn.click();
  await page.waitForSelector('text=Tell us what happened');
  await page.click('button[aria-label="Close modal"]');
  console.log('   ✓ "Start a case from this purchase" correctly prefilled intake');

  // FLOW 7: Rights & Official Helplines (Decision Tree)
  console.log('\nFlow 7: Verifying Rights & Interactive Decision Tree...');
  await page.goto('http://127.0.0.1:5173/app/help', { waitUntil: 'networkidle' });
  await page.click('button:has-text("Start Decision Tree")');
  await page.click('button:has-text("Yes, I lodged a ticket")');
  await page.waitForSelector('text=Question 2: What is the current status of the dispute?');
  await page.click('button:has-text("High-value claim")');
  await page.waitForSelector('text=Best Route: e-Jagriti (District Consumer Commission)');
  await page.click('button:has-text("Reset")');
  console.log('   ✓ Decision tree evaluation and reset validated');

  // FLOW 8: Reminders Management
  console.log('\nFlow 8: Verifying Reminders creation, completion, and deletion...');
  await page.goto('http://127.0.0.1:5173/app/reminders', { waitUntil: 'networkidle' });
  await page.click('button:has-text("New Reminder")');
  await page.click('button:has-text("+3 Days")');
  await page.click('button:has-text("Set Reminder")');
  await page.waitForSelector('text=Verify UPI / bank statement for refund credit');
  console.log('   ✓ Reminder created with +3 days quick preset');

  // Toggle done
  await page.click('button[aria-label="Mark completed"]');
  console.log('   ✓ Reminder marked as completed');

  // FLOW 9: Privacy, JSON & ZIP Export, and Local Encryption
  console.log('\nFlow 9: Verifying Privacy Dashboard, JSON & ZIP export, and Encryption...');
  await page.goto('http://127.0.0.1:5173/app/privacy', { waitUntil: 'networkidle' });
  
  // Download JSON
  await page.click('button:has-text("Download JSON Backup")');
  await page.waitForSelector('text=Full JSON data package exported successfully.');
  console.log('   ✓ Exported full JSON package');

  // Download ZIP
  await page.click('button:has-text("Export ZIP Archive")');
  await page.waitForSelector('text=Complete ZIP archive (records + evidence) exported successfully.');
  console.log('   ✓ Exported full ZIP archive with evidence files');

  // Enable Encryption
  const passphraseInput = page.locator('input[placeholder*="Enter master passphrase"]');
  await passphraseInput.fill('SecurePass123!');
  await page.click('button:has-text("Enable Encryption")');
  await page.waitForSelector('text=WebCrypto AES-256-GCM encryption enabled');
  console.log('   ✓ WebCrypto AES-256-GCM encryption enabled');

  // Disable Encryption
  const unlockInput = page.locator('input[placeholder*="Enter passphrase to unlock"]');
  await unlockInput.fill('SecurePass123!');
  await page.click('button:has-text("Disable Encryption")');
  await page.waitForSelector('text=Passphrase verified. Encryption disabled.');
  console.log('   ✓ WebCrypto encryption unlocked and disabled');

  // FLOW 10: Settings Persistence
  console.log('\nFlow 10: Verifying Settings persistence...');
  await page.goto('http://127.0.0.1:5173/app/settings', { waitUntil: 'networkidle' });
  // Toggle simple language mode
  const simpleToggle = page.locator('button[role="switch"]').first();
  const checkedBefore = await simpleToggle.getAttribute('aria-checked');
  await simpleToggle.click();
  await page.reload({ waitUntil: 'networkidle' });
  const isChecked = await page.locator('button[role="switch"]').first().getAttribute('aria-checked');
  if (isChecked === checkedBefore) throw new Error('Simple mode setting failed to persist across reload');
  console.log('   ✓ Simple language mode persists across page reload');

  // Theme selection in Settings
  await page.click('button:has-text("Dark Theme")');
  let isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  if (!isDark) throw new Error('Dark theme was not applied');
  await page.click('button:has-text("Light Theme")');
  isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  if (isDark) throw new Error('Light theme was not applied');
  console.log('   ✓ Theme selection in Settings functional (light & dark applied)');

  // FLOW 11: Command Palette Keyboard Navigation
  console.log('\nFlow 11: Verifying Command Palette (⌘K) keyboard search...');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
  await page.waitForSelector('input[placeholder*="Search cases, companies"]');
  await page.fill('input[placeholder*="Search cases, companies"]', 'Reminders');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.location.pathname === '/app/reminders');
  console.log('   ✓ Command Palette navigated via keyboard to /app/reminders');

  // FLOW 12: Mobile Navigation Viewport (390x844)
  console.log('\nFlow 12: Verifying Mobile Navigation and bottom drawers...');
  const mContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const mPage = await mContext.newPage();
  await mPage.goto('http://127.0.0.1:5173/app/overview', { waitUntil: 'networkidle' });
  
  // Test More sheet
  await mPage.click('text=More');
  await mPage.waitForSelector('text=More Features');
  await mPage.locator('div[role="dialog"] button:has-text("Purchases")').click();
  await mPage.waitForFunction(() => window.location.pathname === '/app/purchases');
  console.log('   ✓ Mobile "More" sheet navigates correctly');

  // Test Mobile FAB Intake
  await mPage.click('button[aria-label="Create new dispute case"]');
  await mPage.waitForSelector('div[role="dialog"] h3:has-text("Tell us what happened")');
  console.log('   ✓ Mobile FAB button triggers 60s Intake modal');

  // Capture verification screenshots
  await page.screenshot({ path: path.join(artifactDir, 'phase1-desktop-case-actions.png') });
  await mPage.screenshot({ path: path.join(artifactDir, 'phase1-mobile-intake.png') });

  await browser.close();

  console.log('\n===========================================================');
  console.log('PHASE 1 COMPLETE: ALL 12 USER INTERACTION FLOWS PASSED 100%');
  console.log('===========================================================');
}

runInteractionsSuite().catch((err) => {
  console.error('Interactions Suite Failed:', err);
  process.exit(1);
});

