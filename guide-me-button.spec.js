const { test, expect } = require('@playwright/test');

test('Guide me button works on report demo (hash route)', async ({ page }) => {
  // Use the hash-based route so the SPA handles navigation (avoids server 404)
  await page.goto('https://accessscan-demo1-1a36.vercel.app/#/report/demo', { waitUntil: 'networkidle' });

  // Wait briefly for client-side rendering
  await page.waitForTimeout(500);

  // Try to locate the Guide me button (two fallback strategies)
  const guideBtn = page.locator('button:has-text("Guide me")');

  // If button isn't immediately present, try opening the sample report link first
  if (await guideBtn.count() === 0) {
    const sampleLink = page.locator('text=Open sample report, text=View sample report now, text=Sample report');
    if (await sampleLink.count() > 0) {
      await sampleLink.first().click();
      await page.waitForTimeout(500);
    }
  }

  // Ensure the button becomes visible, then click it
  await expect(guideBtn.first()).toBeVisible({ timeout: 10000 });
  await guideBtn.first().click();

  // Assert the guide modal/dialog shows up (target the specific dialog id to avoid matching multiple dialogs)
  await expect(page.locator('dialog#guideModal')).toBeVisible({ timeout: 5000 });
});
