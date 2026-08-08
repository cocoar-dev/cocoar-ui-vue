import { expect, test, type Page } from '@playwright/test';

async function openRenderer(page: Page) {
  await page.goto('/auth-customization-lab');
  await page.getByRole('button', { name: 'Renderer', exact: true }).click();
}

test.describe('Auth Customization Lab', () => {
  test('runs the code-authored login disabled rule reactively', async ({ page }) => {
    await openRenderer(page);

    const submit = page.getByRole('button', { name: 'Anmelden', exact: true });
    const username = page.getByRole('textbox', { name: 'Benutzername', exact: true });
    const password = page.locator('.renderer-frame input[type="password"]');

    await expect(submit).toBeDisabled();
    await username.fill('alice');
    await expect(submit).toBeDisabled();
    await password.fill('demo-password');
    await expect(submit).toBeEnabled();
    await password.fill('');
    await expect(submit).toBeDisabled();
  });

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
      ['Consent · scopes[]', 'Zulassen'],
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
    await expect(page.getByText('Edit structure, Quick Properties', { exact: false })).toBeVisible();
    await page.getByRole('treeitem', { name: 'Anmelden submit', exact: true }).click();
    const builder = page.locator('.pb-builder');
    await builder.getByRole('tab', { name: 'Translations', exact: true }).click();
    const translationRow = builder.getByRole('row').filter({ hasText: 'page.submit.label' });
    await expect(translationRow.getByRole('textbox').nth(0)).toHaveValue('Anmelden');
    const englishLabel = translationRow.getByRole('textbox').nth(1);
    await expect(englishLabel).toHaveValue('Sign in');
    await englishLabel.fill('Continue');
    await expect(translationRow.getByRole('textbox').nth(0)).toHaveValue('Anmelden');
    await builder.getByRole('tab', { name: 'Editor', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Edit element code' })).toBeVisible();
    await page.getByRole('button', { name: 'Edit element code' }).click();
    const codeDialog = page.getByRole('dialog', { name: 'Element Code · submit' });
    await expect(codeDialog.locator('.monaco-editor')).toBeVisible();
    await expect(codeDialog.locator('.view-lines')).toContainText('page.fields.username?.trim()');
    await expect(codeDialog.locator('.view-lines')).toContainText('page.form.valid');
    await expect(codeDialog.locator('.view-lines')).toContainText('page.submit.label');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();

    await page.getByRole('treeitem', { name: 'Page', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Add Page Code', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Add Page Code', exact: true }).click();
    const pageCodeDialog = page.getByRole('dialog', { name: 'Page Code · Root' });
    await expect(pageCodeDialog.locator('.monaco-editor')).toBeVisible();
    await expect(pageCodeDialog.locator('.view-lines')).toContainText('compute(page, runtime)');
    await expect(pageCodeDialog).toContainText('page.style');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();

    await page.getByRole('button', { name: 'JSON', exact: true }).click();
    await expect(page.locator('pre')).toContainText('"type": "page"');
    await expect(page.locator('pre')).toContainText('"auth:login"');
    await expect(page.locator('pre')).toContainText('"stateCode"');
    await expect(page.locator('pre')).toContainText('"elementCode"');

    await page.getByRole('button', { name: 'Use cases & gaps', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'PageBuilder hand-off matrix' })).toBeVisible();
    await expect(page.getByText('Responsive overrides', { exact: true })).toBeVisible();
    await expect(page.getByText('Schema-positioned form feedback', { exact: true })).toBeVisible();
    await expect(page.getByText('Dynamic arrays / repeaters', { exact: true })).toBeVisible();
  });

  test('evaluates Builder preview fixtures and element code in its own runtime session', async ({ page }) => {
    await page.goto('/auth-customization-lab');
    await page.getByRole('button', { name: 'Builder', exact: true }).click();
    const builder = page.locator('.pb-builder');
    await builder.getByRole('tab', { name: 'Preview', exact: true }).click();

    const submit = builder.getByRole('button', { name: 'Anmelden', exact: true });
    const username = builder.getByRole('textbox', { name: 'Benutzername', exact: true });
    const password = builder.locator('.pb-builder__preview-frame input[type="password"]');
    await expect(submit).toBeDisabled();
    await username.fill('alice');
    await password.fill('demo-password');
    await expect(submit).toBeEnabled();

    const fixtureOptions = await builder.locator('.pb-builder__preview-control select').first()
      .locator('option').allTextContents();
    expect(fixtureOptions).toContain('Host values');
    expect(fixtureOptions).toContain('Typical');
  });

  test('authors compositions separately and keeps pages pinned until updated', async ({ page }) => {
    await page.goto('/auth-customization-lab');
    await page.getByRole('button', { name: 'Builder', exact: true }).click();
    const builder = page.locator('.pb-builder');
    await builder.getByRole('tab', { name: 'Compositions', exact: true }).click();

    const loginV1 = builder.getByRole('treeitem', {
      name: 'Visual markup shoppingListVisual amzettel-brand-panel@1',
      exact: true,
    });
    await expect(loginV1).toBeVisible();
    await loginV1.click();
    await expect(builder.getByRole('heading', { name: 'amzettel-brand-panel@1', exact: true })).toBeVisible();
    await expect(builder.getByRole('button', { name: 'Publish new version', exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Compositions', exact: true }).click();
    const repository = page.getByRole('complementary', { name: 'Composition library' });
    await expect(repository.getByRole('button', { name: /amZettel brand panel/ })).toContainText('amzettel-brand-panel@1');
    await expect(page.getByRole('heading', { name: 'amZettel brand panel', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Publish new version', exact: true }).click();
    await expect(repository.getByRole('button', { name: /amZettel brand panel/ })).toContainText('amzettel-brand-panel@2');
    await expect(page.getByText('Published amzettel-brand-panel@2.', { exact: false })).toBeVisible();

    await page.getByRole('button', { name: 'Pages', exact: true }).click();
    await builder.getByRole('tab', { name: 'Compositions', exact: true }).click();
    const stillPinnedV1 = builder.getByRole('treeitem', {
      name: 'Visual markup shoppingListVisual amzettel-brand-panel@1',
      exact: true,
    });
    await expect(stillPinnedV1).toBeVisible();
    await stillPinnedV1.click();
    await builder.getByTestId('composition-properties')
      .getByRole('button', { name: 'Update to latest', exact: true }).click();
    await expect(builder.getByRole('treeitem', {
      name: 'Visual markup shoppingListVisual amzettel-brand-panel@2',
      exact: true,
    })).toBeVisible();
  });

  test('places a repository composition from the element palette and opens its definition', async ({ page }) => {
    await page.goto('/auth-customization-lab');
    await page.getByRole('button', { name: 'Forgot password', exact: true }).click();
    await page.getByRole('button', { name: 'Builder', exact: true }).click();

    const builder = page.locator('.pb-builder');
    const composition = builder.locator('[data-composition-id="amzettel-brand-panel"]');
    await expect(composition).toContainText('amZettel brand panel');
    await composition.dragTo(builder.locator('[data-dropzone="o::into"]'));

    const properties = builder.getByTestId('composition-properties');
    await expect(properties.getByLabel('Name')).toHaveValue('amZettel brand panel');
    await expect(properties.getByLabel('Pinned version')).toHaveText(/1/);
    await expect(properties.getByRole('button', { name: 'Up to date', exact: true })).toBeDisabled();

    await properties.getByRole('button', { name: 'Open composition', exact: true }).click();
    await expect(page.getByRole('complementary', { name: 'Composition library' })).toBeVisible();
    const definitionEditor = page.getByRole('region', { name: 'amZettel brand panel', exact: true });
    await expect(definitionEditor.getByRole('heading', { name: 'amZettel brand panel', exact: true })).toBeVisible();
    await expect(definitionEditor.getByText('amzettel-brand-panel@1', { exact: false })).toBeVisible();
  });

  test('renders a dynamic consent scope array and submits selected values', async ({ page }) => {
    await openRenderer(page);
    await page.getByRole('button', { name: 'Consent · scopes[]', exact: true }).click();
    await page.getByLabel('Consent scope count').selectOption('8');

    const scopes = page.locator('.renderer-frame input[type="checkbox"]');
    await expect(scopes).toHaveCount(8);
    await expect(page.getByText('Read invoices for all assigned organisations')).toBeVisible();

    await page.getByText('Email address', { exact: true }).click();
    await expect(page.getByRole('checkbox', { name: 'Email address' })).not.toBeChecked();
    await page.getByRole('button', { name: 'Zulassen', exact: true }).click();
    await expect(page.getByText(
      'Consent accepted with 7 approved scope(s); redirect suppressed in the lab.',
      { exact: true },
    )).toBeVisible();
    await expect(page).toHaveURL(/\/auth-customization-lab$/);
  });

  test('keeps consent mounted after an expired ticket response', async ({ page }) => {
    await openRenderer(page);
    await page.getByRole('button', { name: 'Consent · scopes[]', exact: true }).click();
    await page.getByLabel('Consent API result').selectOption('expired');
    await page.getByRole('button', { name: 'Zulassen', exact: true }).click();

    await expect(page.getByRole('alert')).toContainText('consent request has expired');
    await expect(page.locator('.renderer-frame input[type="checkbox"]')).toHaveCount(3);
    await expect(page.getByRole('checkbox', { name: 'Profile' })).toBeChecked();
    await expect(page).toHaveURL(/\/auth-customization-lab$/);
  });

  test('documents the non-obvious contract for every customizable view', async ({ page }) => {
    await page.goto('/auth-customization-lab');
    await page.getByRole('button', { name: 'View contract', exact: true }).click();

    for (const [slot, requiredText] of [
      ['Login', 'Password values never enter persisted page JSON, logs or URL parameters'],
      ['Forgot password', 'account-enumeration safe'],
      ['Logout', 'session is invalidated before the confirmation is rendered'],
      ['Consent · scopes[]', 'Required scopes are selected and cannot be unchecked'],
    ] as const) {
      await page.getByRole('button', { name: slot, exact: true }).click();
      await expect(page.getByText(requiredText, { exact: false })).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Non-negotiable security & behaviour' }),
      ).toBeVisible();
    }
  });
});
