import { expect, test } from '@playwright/test';

test('the compact presentation page renders its live demo on one copy of Vue', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/foundations/compact-presentation');
  await expect(page.locator('.vp-doc h1')).toContainText('Compact presentation');
  const demo = page.locator('.vp-doc .compact-demo');
  await expect(demo).toBeVisible();
  // The demo works: its button opens the sheet dialog of the shared overlay host.
  await demo.getByRole('button', { name: 'Edit compact contact', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Compact contact' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('the mobile docs still open at /mobile/, also inside a PhoneFrame', async ({ page }) => {
  await page.goto('/mobile/#/form');
  await expect(page.locator('html')).toHaveClass(/coar-mobile/);
  await expect(page.getByPlaceholder('Event name')).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/guide/mobile');
  const frame = page.frameLocator('iframe.coar-phone-frame__viewport').first();
  await page.locator('iframe.coar-phone-frame__viewport').first().scrollIntoViewIfNeeded();
  await expect(frame.getByPlaceholder('Event name')).toBeVisible();
});
