import { spawn } from 'child_process';
import { chromium } from 'playwright';

async function testPreviewInternal() {
  console.log('Testing npm run preview to verify /internal renders 404 Not Found...');
  
  // Start vite preview on port 4173
  const preview = spawn('npx', ['vite', 'preview', '--port', '4173'], {
    stdio: 'pipe',
  });

  await new Promise((resolve) => setTimeout(resolve, 1500));

  try {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();
    
    // Navigate to /internal on preview build
    await page.goto('http://127.0.0.1:4173/internal', { waitUntil: 'networkidle' });
    
    // Assert 404 page is rendered
    await page.waitForSelector('text=Page Not Found (404)');
    console.log('   ✓ SUCCESS: Production preview build correctly renders 404 Not Found on /internal!');

    await browser.close();
  } finally {
    preview.kill('SIGTERM');
  }
}

testPreviewInternal().catch((err) => {
  console.error('Preview verification failed:', err);
  process.exit(1);
});

