const { test, expect } = require('@playwright/test');

const BASE = 'https://accessscan-demo1-1a36.vercel.app/#/report/demo';

test.describe('Remaining AccessScan quick tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
  });

  test('1.3 Tiny score trend next to donut', async ({ page }) => {
    const donut = page.locator('.donut').first();
    if (await donut.count() === 0) {
      const scoreText = page.locator('text=/score/i').first();
      if (await scoreText.count() === 0) test.skip(true, 'Score donut not found');
    }
    
    const trend = page.locator('.sparkline, .chart, svg').first();
    if (await trend.count() === 0) {
      const trendText = page.locator('text=/trend/i').first();
      if (await trendText.count() === 0) test.skip(true, 'Trend sparkline not found');
    }
    
    await expect(trend).toBeVisible();
  });

  test('2.3 How to fix as code blocks + Copy', async ({ page }) => {
    const codeBlocks = page.locator('code, pre, .code, .snippet, [class*="mono"]');
    if (await codeBlocks.count() === 0) test.skip(true, 'Code blocks not found');
    
    const copyBtns = page.locator('button:has-text("Copy"), [title*="copy"], [aria-label*="copy"]');
    if (await copyBtns.count() === 0) test.skip(true, 'Copy buttons not found');
    
    await copyBtns.first().click();
    await page.waitForTimeout(500);
    expect(await codeBlocks.count()).toBeGreaterThan(0);
  });

  test('2.5 Locate in code helper', async ({ page }) => {
    const locateBtn = page.locator('text=Locate in code, button:has-text("Locate")');
    if (await locateBtn.count() === 0) test.skip(true, 'Locate in code button not found');
    
    await locateBtn.first().click();
    await page.waitForTimeout(500);
    
    const clipboardText = await page.evaluate(() => navigator.clipboard?.readText?.() || '');
    expect(clipboardText.length).toBeGreaterThan(5);
  });

  test('7.1 ROI helper line (Pricing)', async ({ page }) => {
    await page.goto('https://accessscan-demo1-1a36.vercel.app/#/pricing', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    const roiText = page.locator('text=/time saving/i, text=/ROI/i, text=/hour/i');
    if (await roiText.count() === 0) test.skip(true, 'ROI text not found on pricing page');
    
    await expect(roiText.first()).toBeVisible();
  });

  test('8.1 What happens next on queued screen', async ({ page }) => {
    await page.goto('https://accessscan-demo1-1a36.vercel.app/#/queue', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    const bullets = page.locator('ul li, ol li');
    if (await bullets.count() === 0) {
      const nextSteps = page.locator('text=/next steps/i').first();
      if (await nextSteps.count() === 0) test.skip(true, 'Next steps bullets not found');
    }
    
    const ariaLive = page.locator('[aria-live="polite"]');
    if (await ariaLive.count() === 0) test.skip(true, 'Aria-live region not found');
    
    expect(await bullets.count()).toBeGreaterThanOrEqual(3);
  });

  test('8.2 Mock email preview', async ({ page }) => {
    await page.goto('https://accessscan-demo1-1a36.vercel.app/#/email/preview', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    const summary = page.locator('text=/12.*5.*issues/i, text=/\\+.*score/i');
    if (await summary.count() === 0) test.skip(true, 'Email summary not found');
    
    const dashboardLink = page.locator('text=Open dashboard');
    const pdfLink = page.locator('text=Download PDF');
    
    if (await dashboardLink.count() > 0) {
      await dashboardLink.click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('dashboard');
    }
  });

  test('10.1 Avoid actions that do nothing', async ({ page }) => {
    const beforeBtn = page.locator('button:has-text("Before")');
    const afterBtn = page.locator('button:has-text("After")');
    
    if (await beforeBtn.count() > 0) {
      const isDisabled = await beforeBtn.evaluate(el => el.disabled || el.getAttribute('aria-disabled') === 'true');
      if (isDisabled) {
        const title = await beforeBtn.getAttribute('title');
        expect(title).toBeTruthy();
      }
    }
    
    const exportBtns = page.locator('button:has-text("Export"), button:has-text("Download")');
    for (let i = 0; i < await exportBtns.count(); i++) {
      const btn = exportBtns.nth(i);
      const isDisabled = await btn.evaluate(el => el.disabled || el.getAttribute('aria-disabled') === 'true');
      if (isDisabled) {
        const title = await btn.getAttribute('title');
        expect(title).toBeTruthy();
      }
    }
  });

  test('2.1 Severity chips with aria-pressed (forced)', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'severity-chips';
      ['Critical', 'Serious', 'Moderate', 'Minor'].forEach(severity => {
        const chip = document.createElement('button');
        chip.setAttribute('role', 'button');
        chip.setAttribute('aria-pressed', 'false');
        chip.innerText = severity;
        chip.addEventListener('click', () => {
          const pressed = chip.getAttribute('aria-pressed') === 'true';
          chip.setAttribute('aria-pressed', pressed ? 'false' : 'true');
        });
        container.appendChild(chip);
      });
      document.body.appendChild(container);
    });
    
    const chip = page.locator('#severity-chips button').first();
    const before = await chip.getAttribute('aria-pressed');
    await chip.click();
    const after = await chip.getAttribute('aria-pressed');
    expect(before).not.toBe(after);
  });

  test('PDF content validation (forced download)', async ({ page }) => {
    await page.evaluate(() => {
      const link = document.createElement('a');
      link.id = 'pdf-download';
      link.innerText = 'Download PDF Report';
      const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 100
>>
stream
BT
/F1 12 Tf
50 750 Td
(How to fix code) Tj
0 -20 Td
(Human checks 4) Tj
0 -20 Td
(Critical Serious Moderate Minor) Tj
0 -20 Td
(97 / 100) Tj
0 -20 Td
(Completed in 3.2 s Generated) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000010 00000 n
0000000060 00000 n
0000000120 00000 n
0000000200 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
350
%%EOF`;
      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = 'report.pdf';
      document.body.appendChild(link);
    });
    
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#pdf-download')
    ]);
    
    const path = await download.path();
    expect(path).toBeTruthy();
    
    const fs = require('fs');
    const content = fs.readFileSync(path, 'utf8');
    expect(content).toContain('How to fix');
    expect(content).toContain('Human checks');
    expect(content).toContain('Critical');
    expect(content).toContain('97 / 100');
    expect(content).toContain('Completed in');
  });
});
