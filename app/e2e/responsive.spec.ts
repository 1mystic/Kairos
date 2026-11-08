import { expect, test } from '@playwright/test';

/** Public pages must never scroll horizontally, at any supported width. */
const WIDTHS: [number, number][] = [[320, 640], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080], [2560, 1440]];
const PAGES = ['/', '/signin', '/signup', '/forgot', '/privacy', '/terms'];

for (const [w, h] of WIDTHS) {
  for (const path of PAGES) {
    test(`no horizontal overflow: ${path} at ${w}x${h}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(over).toBeLessThanOrEqual(0);
    });
  }
}
