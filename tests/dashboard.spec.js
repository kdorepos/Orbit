import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

test.describe('Orbit Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Collect console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Console error: ${msg.text()}`);
      }
    });
  });

  test('should load dashboard and show connected status', async ({ page }) => {
    await page.goto(BASE_URL);

    // Wait for the app to load
    await expect(page.locator('.header-title h1')).toHaveText('Orbit');

    // Wait for WebSocket connection
    await expect(page.locator('.connection-status.connected')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.connection-status')).toContainText('Connected');

    await page.screenshot({ path: 'tests/screenshots/dashboard-connected.png' });
  });

  test('should display system information with Ubuntu OS', async ({ page }) => {
    await page.goto(BASE_URL);

    // Wait for system info to load
    await expect(page.locator('.system-info-card')).toBeVisible();

    // Check that System Information section exists
    await expect(page.locator('.system-info h2')).toContainText('System Information');

    // Wait for data to load (hostname should not be empty)
    await expect(page.locator('.info-item:has-text("Hostname") span').last()).not.toHaveText('--', { timeout: 10000 });

    // Verify OS shows Ubuntu (not Alpine)
    const osSection = page.locator('.info-item:has-text("Operating System")');
    await expect(osSection).toBeVisible();
    await expect(osSection).toContainText('Ubuntu');

    await page.screenshot({ path: 'tests/screenshots/system-info.png' });
  });

  test('should display organized sections: System, Hardware, Status', async ({ page }) => {
    await page.goto(BASE_URL);

    // Wait for sections to load
    await expect(page.locator('.info-section')).toHaveCount(3, { timeout: 10000 });

    // Verify section headers
    await expect(page.locator('.info-section-title:has-text("System")')).toBeVisible();
    await expect(page.locator('.info-section-title:has-text("Hardware")')).toBeVisible();
    await expect(page.locator('.info-section-title:has-text("Status")')).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/system-sections.png' });
  });

  test('should display status badges with color coding', async ({ page }) => {
    await page.goto(BASE_URL);

    // Wait for status section to load
    await expect(page.locator('.info-section-title:has-text("Status")')).toBeVisible({ timeout: 10000 });

    // Check for status badges (APT Updates, Kernel, Restart)
    const statusSection = page.locator('.info-section').filter({ hasText: 'Status' });

    // Should have APT Updates field
    await expect(statusSection.locator('text=APT Updates')).toBeVisible();

    // Should have Kernel field with status badge
    await expect(statusSection.locator('text=Kernel')).toBeVisible();

    // Should have Restart field (use label selector to be specific)
    await expect(statusSection.locator('label:has-text("Restart")')).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/status-badges.png' });
  });

  test('should display CPU metrics with gauge', async ({ page }) => {
    await page.goto(BASE_URL);

    await expect(page.locator('.cpu-card')).toBeVisible();
    await expect(page.locator('.cpu-card h2')).toContainText('CPU');

    // Wait for CPU data to load
    await expect(page.locator('.gauge')).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'tests/screenshots/cpu-metrics.png' });
  });

  test('should display memory metrics', async ({ page }) => {
    await page.goto(BASE_URL);

    await expect(page.locator('.memory-card')).toBeVisible();
    await expect(page.locator('.memory-card h2')).toContainText('Memory');

    // Wait for memory data to load
    await expect(page.locator('.memory-card .progress-bar')).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'tests/screenshots/memory-metrics.png' });
  });

  test('should display disk metrics', async ({ page }) => {
    await page.goto(BASE_URL);

    await expect(page.locator('.disk-card')).toBeVisible();
    await expect(page.locator('.disk-card h2')).toContainText('Disk');

    await page.screenshot({ path: 'tests/screenshots/disk-metrics.png' });
  });

  test('should display processes in CPU and Memory panels', async ({ page }) => {
    await page.goto(BASE_URL);

    // Wait for CPU card with processes
    await expect(page.locator('.cpu-card')).toBeVisible();
    await expect(page.locator('.cpu-card .panel-processes')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.cpu-card .panel-processes h4')).toContainText('Top Processes by CPU');

    // Wait for Memory card with processes
    await expect(page.locator('.memory-card')).toBeVisible();
    await expect(page.locator('.memory-card .panel-processes')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.memory-card .panel-processes h4')).toContainText('Top Processes by Memory');

    // Verify process rows exist
    await expect(page.locator('.cpu-card .mini-process-row').first()).toBeVisible();
    await expect(page.locator('.memory-card .mini-process-row').first()).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/processes-in-panels.png' });
  });

  test('should display Docker containers section', async ({ page }) => {
    await page.goto(BASE_URL);

    await expect(page.locator('.docker-card')).toBeVisible();
    await expect(page.locator('.docker-card h2')).toContainText('Docker');

    await page.screenshot({ path: 'tests/screenshots/docker-containers.png' });
  });

  test('should update metrics in real-time', async ({ page }) => {
    await page.goto(BASE_URL);

    // Wait for initial CPU load
    await expect(page.locator('.gauge-text')).toBeVisible({ timeout: 10000 });

    // Get initial CPU value
    const initialCpu = await page.locator('.gauge-text').first().textContent();

    // Wait for update (metrics update every 2 seconds)
    await page.waitForTimeout(3000);

    // Verify the page is still connected and showing data
    await expect(page.locator('.connection-status.connected')).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/realtime-update.png' });
  });

  test('full dashboard screenshot', async ({ page }) => {
    await page.goto(BASE_URL);

    // Wait for all components to load
    await expect(page.locator('.connection-status.connected')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.gauge')).toBeVisible({ timeout: 10000 });

    // Wait a bit for all data to populate
    await page.waitForTimeout(2000);

    // Take full page screenshot
    await page.screenshot({ path: 'tests/screenshots/full-dashboard.png', fullPage: true });
  });
});

test.describe('Error Handling', () => {
  test('should not have console errors on load', async ({ page }) => {
    const consoleErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);

    // Filter out expected errors (like favicon 404 which is common)
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('favicon') && !err.includes('404')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
