import path from 'node:path';
import { expect, test } from '@playwright/test';

const distDir = path.resolve(process.cwd(), 'dist');

for (const pageName of ['popup.html', 'options.html', 'newTab.html']) {
  test(`${pageName} renders without fatal browser errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(`file://${path.join(distDir, pageName)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 10_000,
    });
    await expect(page.locator('#root')).toBeAttached();

    expect(errors).toEqual([]);
  });
}
