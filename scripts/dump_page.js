const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const url = 'https://accessscan-demo1-1a36.vercel.app/#/report/demo';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const html = await page.content();
  const text = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync('scripts/page_dump.html', html);
  fs.writeFileSync('scripts/page_text.txt', text, 'utf8');
  console.log('Wrote scripts/page_dump.html and scripts/page_text.txt');
  await browser.close();
})();
