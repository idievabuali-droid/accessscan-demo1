// playwright.config.js
// Basic Playwright config for running tests on your site

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  timeout: 30000,
  retries: 0,
  use: {
    headless: false, // Set to true if you don't want to see the browser
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  testDir: '.', // Current directory
};

module.exports = config;
