const { test, expect } = require('@playwright/test');
const fs = require('fs');
const pdf = require('pdf-parse');

const BASE = 'https://accessscan-demo1-1a36.vercel.app/#/report/demo';

test('9.1 PDF parity: content and structure checks', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Try to find the Download PDF control with fallbacks
  let downloadBtn = page.locator('text=Download PDF, text=Download sample PDF').first();
  if (await downloadBtn.count() === 0) {
    // Try opening sample report links or menu toggles that reveal export actions
    const sample = page.locator('text=Open sample report, text=View sample report now, text=Sample report').first();
    if (await sample.count() > 0) { await sample.click(); await page.waitForTimeout(600); }
    // try menu button
    const menu = page.locator('button:has-text("Report"), button:has-text("Export"), button:has-text("Share")').first();
    if (await menu.count() > 0) { await menu.click(); await page.waitForTimeout(400); }
    downloadBtn = page.locator('text=Download PDF').first();
  }

  if (await downloadBtn.count() === 0) test.skip(true, 'Download PDF button not found after fallbacks');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    downloadBtn.click()
  ]);

  const path = await download.path();
  expect(path).toBeTruthy();

  const data = fs.readFileSync(path);
  const parsed = await pdf(data);
  const text = parsed.text || '';

  // Checks from the quick-tests PDFs
  const checks = [];
  checks.push({ name: 'How to fix present', pass: /how to fix/i.test(text) });
  checks.push({ name: 'Human checks section present', pass: /human checks/i.test(text) });
  checks.push({ name: 'Severity words present', pass: /critical/i.test(text) && /serious/i.test(text) && /moderate/i.test(text) && /minor/i.test(text) });
  // severity ordering: Critical should appear before Minor
  const ci = text.search(/critical/i);
  const mi = text.search(/minor/i);
  checks.push({ name: 'Severity order (Critical before Minor)', pass: ci >= 0 && mi >= 0 && ci < mi });
  // header contains Completed or Generated
  checks.push({ name: 'Header includes Completed/Generated', pass: /completed in/i.test(text) || /generated/i.test(text) });
  // numeric score pattern like '97 / 100' or '97/100'
  checks.push({ name: 'Score present as number/100', pass: /\d+\s*\/\s*100/.test(text) });

  // Report results
  const failed = checks.filter(c => !c.pass);
  for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'}: ${c.name}`);

  expect(failed.length, `Failed checks: ${failed.map(f=>f.name).join(', ')}`).toBe(0);
});
