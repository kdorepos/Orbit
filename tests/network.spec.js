import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

test.describe('Network Metrics', () => {
  test('should show network activity when downloading', async ({ page, context }) => {
    // Go to dashboard
    await page.goto(BASE_URL);

    // Wait for connection
    await expect(page.locator('.connection-status.connected')).toBeVisible({ timeout: 10000 });

    // Wait for initial network data to load
    await expect(page.locator('.network-card')).toBeVisible();
    await page.waitForTimeout(3000); // Allow initial stats to populate

    // Get initial download speed text
    const downloadSpeedLocator = page.locator('.network-stat.rx .stat-speed').first();
    await expect(downloadSpeedLocator).toBeVisible();

    // Take screenshot before download
    await page.screenshot({ path: 'tests/screenshots/network-before-download.png' });

    // Start a download in background (100MB test file)
    const downloadPromise = context.request.get('http://speedtest.tele2.net/10MB.zip', {
      timeout: 30000
    }).catch(() => null);

    // Wait for network activity to be reflected (check multiple times)
    let sawActivity = false;
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(2000);

      const speedText = await downloadSpeedLocator.textContent();
      console.log(`Network speed reading ${i + 1}: ${speedText}`);

      // Check if speed is above 0.01 MB/s
      const speedMatch = speedText.match(/([\d.]+)\s*MB\/s/);
      if (speedMatch) {
        const speed = parseFloat(speedMatch[1]);
        if (speed > 0.01) {
          sawActivity = true;
          console.log(`Detected network activity: ${speed} MB/s`);
          break;
        }
      }
    }

    // Take screenshot showing network activity
    await page.screenshot({ path: 'tests/screenshots/network-during-download.png' });

    // Wait for download to complete or timeout
    await downloadPromise;

    expect(sawActivity).toBe(true);
  });

  test('should display network interfaces with stats', async ({ page }) => {
    await page.goto(BASE_URL);

    // Wait for network card
    await expect(page.locator('.network-card')).toBeVisible();
    await expect(page.locator('.network-card h2')).toContainText('Network');

    // Wait for network interfaces to appear
    await expect(page.locator('.network-interface').first()).toBeVisible({ timeout: 10000 });

    // Verify interface has download and upload stats
    const networkInterface = page.locator('.network-interface').first();
    await expect(networkInterface.locator('.stat-label:has-text("Download")')).toBeVisible();
    await expect(networkInterface.locator('.stat-label:has-text("Upload")')).toBeVisible();
    await expect(networkInterface.locator('.stat-speed').first()).toBeVisible();
    await expect(networkInterface.locator('.stat-total').first()).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/network-interface-stats.png' });
  });

  test('should show cumulative total bytes', async ({ page }) => {
    await page.goto(BASE_URL);

    // Wait for network stats
    await expect(page.locator('.network-interface').first()).toBeVisible({ timeout: 10000 });

    // Get total bytes text
    const totalRxLocator = page.locator('.network-stat.rx .stat-total').first();
    await expect(totalRxLocator).toBeVisible();

    const totalText = await totalRxLocator.textContent();
    console.log(`Total received: ${totalText}`);

    // Should show "Total: X.XX GB" or "Total: X.XX MB" etc.
    expect(totalText).toMatch(/Total:\s+[\d.]+\s+(B|KB|MB|GB|TB)/);

    await page.screenshot({ path: 'tests/screenshots/network-totals.png' });
  });
});
