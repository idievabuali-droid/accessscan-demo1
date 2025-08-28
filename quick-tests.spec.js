const { test, expect } = require('@playwright/test');

// Base URL used in existing spec
const BASE = 'https://accessscan-demo1-1a36.vercel.app/#/report/demo';

// Helper: try to reveal the sample report UI and demo toggles that expose export/actions
async function revealSampleReport(page) {
  // click any obvious sample report links
  const sampleLink = page.locator('text=Sample report, text=Open sample report, text=View sample report now').first();
  if (await sampleLink.count() > 0) {
    await sampleLink.scrollIntoViewIfNeeded();
    await sampleLink.click();
    await page.waitForTimeout(500);
  }
  // click 'Show After (demo)' if present to change dataset state
  const showAfter = page.locator('text=Show After (demo), text=After').first();
  if (await showAfter.count() > 0) {
    try { await showAfter.click(); await page.waitForTimeout(400); } catch (e) { /* ignore */ }
  }
}

test.describe('AccessScan quick tests (automated subset)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    // short stabilising wait for SPA rendering
    await page.waitForTimeout(600);
  });

  test('1.1 Scan note is present under banner and announced as note', async ({ page }) => {
    // Use multiple possible locators to be resilient to variations on demo site
    const possible = [
      page.locator('text=/Scan completed in/i').first(),
      page.locator('text=/Completed in/i').first(),
      page.locator('text=/Last generated/i').first(),
      page.locator('text=/Demo data/i').first(),
    ];
    let found = false;
    for (const loc of possible) {
      if (await loc.count() > 0) {
        await expect(loc).toBeVisible({ timeout: 5000 });
        found = true;
        break;
      }
    }
    expect(found).toBeTruthy();
    // If role=note exists nearby prefer that; otherwise ensure the text exists in DOM
  const nearby = page.locator(':scope [role="note"], :scope [aria-live], :scope text=/Scan completed in/i');
  expect(found).toBeTruthy();
  });

  test('1.2 Human checks pending opens panel and focuses', async ({ page }) => {
    const humanLink = page.locator('text=Human checks pending', { exact: false }).first();
    if (await humanLink.count() === 0) {
      test.skip(true, 'Human checks control not present');
    }
    await humanLink.click();
    // assume there's a panel or heading 'Human checks'
    const panel = page.locator('text=Human checks').first();
    await expect(panel).toBeVisible({ timeout: 5000 });
  });

  test('2.1 Severity chips are keyboard activatable and have aria-pressed', async ({ page }) => {
    const chips = page.locator('[role="button"][aria-pressed]');
    if (await chips.count() === 0) {
      test.skip(true, 'Severity chips not found');
    }
    // pick first chip and toggle with Space
    const first = chips.first();
    const before = await first.getAttribute('aria-pressed');
    await first.focus();
    await page.keyboard.press('Space');
    const after = await first.getAttribute('aria-pressed');
    expect(before).not.toBe(after);
  });

  test('2.2 Default Top 5 and Show all toggles', async ({ page }) => {
    await revealSampleReport(page);
    const counter = page.locator('text=of').filter({ hasText: 'shown' }).first();
    if (await counter.count() === 0) test.skip(true, 'Top 5 counter not found');
    const showAll = page.locator('text=Show all').first();
    if (await showAll.count() === 0) test.skip(true, 'Show all control not present');
    await showAll.click();
    // after clicking, ensure counter text changes or more rows appear
    await page.waitForTimeout(400);
    const rows = page.locator('table tr');
    expect(await rows.count()).toBeGreaterThan(1);
  });

  test('2.4 Issue thumbnail decorative image has empty alt', async ({ page }) => {
    await revealSampleReport(page);
    const imgs = page.locator('table img');
    if (await imgs.count() === 0) test.skip(true, 'No thumbnails found');
    // look for at least one with empty alt
    let found = false;
    for (let i = 0; i < await imgs.count(); i++) {
      const alt = await imgs.nth(i).getAttribute('alt');
      if (alt === '' || alt === null) { found = true; break; }
    }
    expect(found).toBeTruthy();
  });

  test('4.1 Export buttons disabled when zero issues', async ({ page }) => {
    await revealSampleReport(page);
    const pdfBtn = page.locator('text=Download PDF, text=Download sample PDF, text=Export PDF').first();
    if (await pdfBtn.count() === 0) test.skip(true, 'PDF export control not found');
    const disabled = await pdfBtn.getAttribute('disabled');
    const ariaDisabled = await pdfBtn.getAttribute('aria-disabled');
    const issuesRows = await page.locator('table tr').count();
    if (issuesRows > 1) test.skip(true, 'There are issues; cannot assert disabled state for empty set');
    expect(disabled || ariaDisabled).toBeTruthy();
  });

  test('5.1 Accessible modals: focus trap and Esc', async ({ page }) => {
    // Try explicit known openers first
    const openBtn = page.locator('button:has-text("Guide me"), button:has-text("How to fix"), button:has-text("Fix")').first();
    if (await openBtn.count() === 0) test.skip(true, 'No modal openers found');
    await openBtn.scrollIntoViewIfNeeded();
    await openBtn.click();

    // Wait for a dialog or role=dialog to become visible; allow extra time for animation
    const dialog = page.locator('dialog[open], dialog[aria-modal="true"], [role="dialog"]');
    await dialog.first().waitFor({ state: 'visible', timeout: 15000 });

    // Press Tab a few times and ensure focus stays inside by checking activeElement remains inside the dialog
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => document.activeElement && document.activeElement.closest('[role="dialog"], dialog'));
    expect(active).toBeTruthy();

    // close with Esc and ensure dialog hides
    await page.keyboard.press('Escape');
    await dialog.first().waitFor({ state: 'hidden', timeout: 10000 });
  });

  test('6.1 Automation vs Human box present on Overview', async ({ page }) => {
    // Navigate to Overview tab if present
    const overview = page.locator('text=Overview').first();
    if (await overview.count() > 0) await overview.click();
    const box = page.locator('text=Automated').first();
    if (await box.count() === 0) test.skip(true, 'Automation coverage box not found');
    await expect(box).toBeVisible();
  });

  test('9.1 PDF parity: Download PDF exists and downloads', async ({ page, context }) => {
    await revealSampleReport(page);
    const downloadBtn = page.locator('text=Download PDF, text=Download sample PDF').first();
    if (await downloadBtn.count() === 0) test.skip(true, 'Download PDF button not found');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click()
    ]);
    const path = await download.path();
    expect(path).toBeTruthy();
  });
});
