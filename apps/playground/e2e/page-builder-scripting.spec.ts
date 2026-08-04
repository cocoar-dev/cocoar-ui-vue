import { expect, test } from '@playwright/test';

test.describe('PageBuilder browser scripting spike', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/page-builder-scripting-spike');
  });

  test('renders fail-closed before SES is ready and reports its browser timing', async ({ page }) => {
    await expect(page.getByTestId('login-form')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeDisabled();
    await expect(page.getByTestId('runtime-status')).toHaveText('Runtime ready', { timeout: 15_000 });

    const readyText = await page.getByTestId('runtime-ready-ms').innerText();
    const readyMs = Number.parseFloat(readyText);
    expect(Number.isFinite(readyMs)).toBe(true);
  });

  test('confines guest globals, updates a generic binding and calls a host endowment', async ({ page }) => {
    await expect(page.getByTestId('runtime-status')).toHaveText('Runtime ready');

    const diagnostics = page.getByTestId('security-diagnostics');
    await expect(diagnostics).toContainText('typeof windowundefined');
    await expect(diagnostics).toContainText('typeof fetchundefined');
    await expect(diagnostics).toContainText('typeof postMessageundefined');
    await expect(diagnostics).toContainText('typeof endowments without a host grantundefined');
    await expect(diagnostics).toContainText('typeof endowments?.apiundefined');
    await expect(diagnostics).toContainText('Object.isFrozen(globalThis)true');
    await expect(diagnostics).toContainText("Function('return typeof fetch')()undefined");

    const region = page.locator('.login-frame [role="combobox"]');
    await expect(page.getByTestId('resource-status')).toContainText('success');
    await expect(region).toBeEnabled();
    await region.click();
    await page.getByRole('option', { name: 'Europe Central' }).click();

    await page.getByRole('textbox', { name: 'Username' }).fill('alice');
    const password = page.getByRole('textbox', { name: 'Password' });
    await password.fill('wrong');

    const submit = page.getByRole('button', { name: 'Sign in as alice' });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page.getByText('Invalid username or password.')).toBeVisible();

    await password.fill('secret123');
    await submit.click();
    await expect(page.getByTestId('action-result')).toHaveText('Authenticated alice.');
  });

  test('tracks dependencies and lets the newest async resource run win', async ({ page }) => {
    await expect(page.getByTestId('runtime-status')).toHaveText('Runtime ready');
    await expect(page.getByTestId('resource-status')).toContainText('success');

    await page.getByRole('textbox', { name: 'Username' }).fill('alice');
    await expect(page.getByTestId('last-bindings')).toContainText('login.submit.disabled');
    await expect(page.getByTestId('last-bindings')).not.toContainText('login.region.props');

    await page.getByTestId('load-slow').click();
    await expect(page.getByTestId('resource-status')).toContainText('pending');
    await page.waitForTimeout(150);
    await page.getByTestId('load-fast').click();
    await expect(page.getByTestId('resource-status')).toContainText('success');
    await expect(page.getByTestId('resource-status')).toContainText('fast');
    await expect(page.getByTestId('aborted-host-calls')).toContainText('1');

    const region = page.locator('.login-frame [role="combobox"]');
    await region.click();
    await expect(page.getByRole('option', { name: 'Europe Central (fast)' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Europe Central (slow)' })).toHaveCount(0);
  });

  test('creates and disposes one runtime session with each renderer mount', async ({ page }) => {
    await expect(page.getByTestId('runtime-status')).toHaveText('Runtime ready');
    const firstSession = await page.getByTestId('runtime-session').innerText();
    expect(firstSession).toContain('1 active host session');

    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await page.getByRole('link', { name: 'Scripting Spike', exact: true }).click();
    await expect(page.getByTestId('runtime-status')).toHaveText('Runtime ready');

    const secondSession = await page.getByTestId('runtime-session').innerText();
    expect(secondSession).toContain('1 active host session');
    expect(secondSession).not.toBe(firstSession);
  });
});
