import { expect, test, type Page } from '@playwright/test';

async function openRenderer(page: Page) {
  await page.goto('/auth-customization-lab');
  await page.getByRole('button', { name: 'Renderer', exact: true }).click();
}

test.describe('Auth Customization Lab', () => {
  test('keeps the login view and values after an API rejection', async ({ page }) => {
    await openRenderer(page);

    await page.getByRole('textbox', { name: 'Benutzername', exact: true }).fill('invalid');
    const password = page.locator('.renderer-frame input[type="password"]');
    await password.fill('demo-password');
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

    await expect(page.getByRole('alert')).toContainText('Invalid username or password.');
    await expect(page).toHaveURL(/\/auth-customization-lab$/);
    await expect(page.getByRole('textbox', { name: 'Benutzername', exact: true })).toHaveValue(
      'invalid',
    );
    await expect(password).toHaveValue('demo-password');
  });

  test('turns a slow request into a retryable timeout without navigation', async ({ page }) => {
    await openRenderer(page);

    await page.getByRole('textbox', { name: 'Benutzername', exact: true }).fill('slow');
    await page.locator('.renderer-frame input[type="password"]').fill('demo-password');
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

    await expect(page.getByRole('alert')).toContainText('request timed out', { timeout: 4_000 });
    await expect(page).toHaveURL(/\/auth-customization-lab$/);
    await expect(page.getByRole('textbox', { name: 'Benutzername', exact: true })).toHaveValue(
      'slow',
    );
  });

  test('renders every slot and keeps the compact fixture horizontally stable', async ({ page }) => {
    await openRenderer(page);
    await page.getByLabel('Viewport').selectOption('compact');

    for (const [slot, marker] of [
      ['Login', 'Anmelden'],
      ['Forgot password', 'Link senden'],
      ['Logout', 'Abgemeldet'],
    ] as const) {
      await page.getByRole('button', { name: slot, exact: true }).click();
      await expect(page.getByText(marker, { exact: true }).first()).toBeVisible();

      const frame = page.locator('.renderer-frame');
      const dimensions = await frame.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
    }
  });

  test('exposes the actual Builder, JSON and hand-off matrix', async ({ page }) => {
    await page.goto('/auth-customization-lab');

    await page.getByRole('button', { name: 'Builder', exact: true }).click();
    await expect(page.getByText('Edit the same JSON rendered above.')).toBeVisible();

    await page.getByRole('button', { name: 'JSON', exact: true }).click();
    await expect(page.locator('pre')).toContainText('"type": "page"');
    await expect(page.locator('pre')).toContainText('"auth:login"');

    await page.getByRole('button', { name: 'Use cases & gaps', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'PageBuilder hand-off matrix' })).toBeVisible();
    await expect(page.getByText('Responsive overrides', { exact: true })).toBeVisible();
    await expect(page.getByText('Schema-positioned form feedback', { exact: true })).toBeVisible();
  });
});
