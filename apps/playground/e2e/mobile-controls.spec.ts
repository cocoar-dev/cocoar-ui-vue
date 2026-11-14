import { expect, test, type Locator } from '@playwright/test';

// Geometry must be checked in a browser, not happy-dom. Touch is enabled even
// with a desktop-sized viewport: .coar-mobile is explicit, not a device query.
test.use({ hasTouch: true });

const sizes = ['xs', 's', 'm', 'l'] as const;
const desktopHeights = { xs: 27, s: 32, m: 40, l: 48 };
const mobileHeights = { xs: 44, s: 48, m: 52, l: 56 };
const desktopFonts = { xs: 11, s: 13, m: 14, l: 16 };

async function expectTarget(target: Locator, minimum = 44) {
  const box = await target.boundingBox();
  expect(box, 'interactive target has a layout box').not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(minimum);
  expect(box!.height).toBeGreaterThanOrEqual(minimum);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/mobile-controls');
});

test('mobile floors apply at every size across theme boundaries', { tag: '@touch' }, async ({ page }) => {
  for (const size of sizes) {
    const row = page.locator(`[data-size="${size}"]`);
    await expect(row.locator('.coar-number-input-button')).toHaveCount(2);
    for (const button of await row.locator('.coar-button').all()) {
      await expectTarget(button);
      await expect(button).toHaveCSS('height', `${mobileHeights[size]}px`);
    }
    for (const frame of await row.locator('.coar-input-frame').all()) {
      await expect(frame).toHaveCSS('height', `${mobileHeights[size]}px`);
    }

    const iconBox = await row.getByRole('button', { name: 'Add', exact: true }).boundingBox();
    expect(iconBox!.width).toBeCloseTo(iconBox!.height, 0);

    for (const input of await row.locator('.coar-input-frame input').all()) {
      await expectTarget(input);
      const fontSize = await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(fontSize).toBeGreaterThanOrEqual(16);
    }
    const actionTargets = [
      '.coar-text-input-clear',
      '.coar-password-input-clear',
      '.coar-password-input-toggle',
      '.coar-number-input-clear',
      '.coar-number-input-button',
    ].join(', ');
    for (const target of await row.locator(actionTargets).all()) {
      await expectTarget(target);
    }
    const labels = row.locator(
      '.coar-checkbox-wrapper, .coar-switch-wrapper, .coar-radio__label',
    );
    for (const label of await labels.all()) {
      await expectTarget(label, 48);
    }

    // Clear controls must be visible before hover/focus, not just large enough.
    await expect(row.locator('.coar-text-input-clear')).toHaveCSS('opacity', '1');
    await expect(row.locator('.coar-password-input-clear')).toHaveCSS('opacity', '1');
    await expect(row.locator('.coar-number-input-clear')).toHaveCSS('opacity', '1');
  }

  await page.getByLabel('Dark theme', { exact: true }).check();
  await expectTarget(page.locator('[data-size="xs"] .coar-text-input-clear'));
  await expect(page.locator('[data-size="xs"] .coar-text-input-field')).toHaveCSS('font-size', '16px');
});

test('scope changes preserve values and leave desktop siblings unchanged', { tag: '@touch' }, async ({ page }) => {
  const sibling = page.getByTestId('desktop-sibling').getByRole('button');
  await expect(sibling).toHaveCSS('height', '27px');
  await expect(sibling).toHaveCSS('font-size', '11px');

  const input = page.locator('[data-size="xs"] .coar-text-input-field');
  await input.fill('Preserved across presentation changes');
  await page.getByLabel('Mobile presentation', { exact: true }).uncheck();

  for (const size of sizes) {
    const row = page.locator(`[data-size="${size}"]`);
    await expect(row.getByRole('button', { name: 'Save', exact: true })).toHaveCSS(
      'height',
      `${desktopHeights[size]}px`,
    );
    await expect(row.locator('.coar-text-input-field')).toHaveCSS(
      'font-size',
      `${desktopFonts[size]}px`,
    );
  }
  await expect(input).toHaveValue('Preserved across presentation changes');
  await page.getByLabel('Mobile presentation', { exact: true }).check();
  await expect(input).toHaveCSS('font-size', '16px');
  await expect(sibling).toHaveCSS('height', '27px');
});

test('works on body and does not automatically activate on narrow viewports', { tag: '@touch' }, async ({ page }) => {
  await page.getByLabel('Mobile presentation', { exact: true }).uncheck();
  await page.setViewportSize({ width: 390, height: 844 });
  const button = page.locator('[data-size="xs"]').getByRole('button', { name: 'Save', exact: true });
  await expect(button).toHaveCSS('height', '27px');

  await page.evaluate(() => document.body.classList.add('coar-mobile'));
  await expect(button).toHaveCSS('height', '44px');
  await expectTarget(page.locator('[data-size="xs"] .coar-password-input-toggle'));
  await page.evaluate(() => document.body.classList.remove('coar-mobile'));
  await expect(button).toHaveCSS('height', '27px');
});

test('desktop buttons retain their content minimum in constrained flex rows', { tag: '@touch' }, async ({ page }) => {
  const fits = await page.getByTestId('desktop-sibling').getByRole('button').evaluate((el) => {
    const parent = el.parentElement!;
    parent.style.display = 'flex';
    parent.style.width = '1px';
    return el.scrollWidth <= el.clientWidth;
  });
  expect(fits).toBe(true);
});

test('pill radii and compact density keep clear/reveal targets reachable', { tag: '@touch' }, async ({ page }) => {
  await page.getByTestId('mobile-scope').evaluate((el) => {
    el.style.setProperty('--coar-input-radius', '999px');
    el.style.setProperty('--coar-component-density', '0.75');
  });
  const row = page.locator('[data-size="xs"]');
  await row.locator('.coar-text-input-clear').tap({ position: { x: 41, y: 22 } });
  await expect(row.locator('.coar-text-input-field')).toHaveValue('');
  await row.locator('.coar-password-input-toggle').tap({ position: { x: 41, y: 22 } });
  await expect(row.locator('.coar-password-input-field')).toHaveAttribute('type', 'text');
});

test('the size scale and xs action targets survive a border-box reset', { tag: '@touch' }, async ({ page }) => {
  await page.addStyleTag({
    content: `
      *, *::before, *::after { box-sizing: border-box; }
      .coar-input-frame { transition: none !important; }
    `,
  });
  for (const size of sizes) {
    const row = page.locator(`[data-size="${size}"]`);
    for (const frame of await row.locator('.coar-input-frame').all()) {
      const box = await frame.boundingBox();
      expect(box!.height).toBe(mobileHeights[size]);
      await expect(frame).toHaveCSS('border-top-width', '0px');
    }
    for (const action of await row.locator(
      '.coar-text-input-clear, .coar-password-input-toggle, .coar-number-input-button',
    ).all()) {
      await expectTarget(action);
    }
  }
  const row = page.locator('[data-size="xs"]');
  const frameState = await row.locator('.coar-text-input-frame').evaluate((frame) => {
    // Clone the scope attributes, but not the standard-input opt-in class.
    const nested = frame.cloneNode(false) as HTMLElement;
    nested.className = 'coar-input-frame coar-input-frame--m';
    frame.appendChild(nested);
    const nestedHeight = getComputedStyle(nested).height;
    nested.remove();

    frame.classList.add('coar-input-frame--error');
    const input = frame.querySelector('input')!;
    input.focus();
    const style = getComputedStyle(frame);
    const border = getComputedStyle(frame, '::after');
    const result = {
      nestedHeight,
      borderColor: style.borderTopColor,
      paintedColor: border.borderTopColor,
      paintedWidth: border.borderTopWidth,
      boxShadow: style.boxShadow,
    };
    input.blur();
    frame.classList.remove('coar-input-frame--error');
    return result;
  });
  expect(frameState.nestedHeight).toBe('40px');
  expect(frameState.paintedColor).toBe(frameState.borderColor);
  expect(frameState.paintedWidth).toBe('1px');
  expect(frameState.boxShadow).toContain('2px');
  await row.locator('.coar-text-input-clear').tap({ position: { x: 22, y: 1 } });
  await expect(row.locator('.coar-text-input-field')).toHaveValue('');
});

test('a popover opened in the local area keeps the mobile presentation', { tag: '@touch' }, async ({ page }) => {
  await page.getByRole('button', { name: 'Share from mobile', exact: true }).click();
  const invite = page.getByTestId('mobile-popover-button');
  await expect(invite).toBeVisible();
  // The overlay is teleported to body, outside the local .coar-mobile area.
  const host = page.locator('.coar-overlay-host', { has: invite });
  await expect(host).toHaveClass(/\bcoar-mobile\b/);
  await expectTarget(invite);
  await expect(invite).toHaveCSS('height', `${mobileHeights.m}px`);
});

test('a popover opened from the desktop sibling keeps the desktop presentation', { tag: '@touch' }, async ({ page }) => {
  await page.getByRole('button', { name: 'Share from desktop', exact: true }).click();
  const invite = page.getByTestId('desktop-popover-button');
  await expect(invite).toBeVisible();
  const host = page.locator('.coar-overlay-host', { has: invite });
  await expect(host).not.toHaveClass(/\bcoar-mobile\b/);
  await expect(invite).toHaveCSS('height', `${desktopHeights.m}px`);
});

test('touch, mouse, keyboard and non-editable semantics are preserved', { tag: '@touch' }, async ({ page }) => {
  const row = page.locator('[data-size="xs"]');
  await row.getByRole('button', { name: 'Save', exact: true }).tap();
  await expect(page.getByTestId('click-count')).toHaveText('1');
  await row.getByRole('button', { name: 'Save', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('click-count')).toHaveText('2');
  await row.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByTestId('click-count')).toHaveText('3');

  await row.locator('.coar-text-input-clear').tap({ position: { x: 3, y: 3 } });
  await expect(row.locator('.coar-text-input-field')).toHaveValue('');
  await expect(row.locator('.coar-text-input-clear')).toBeHidden();
  await row.locator('.coar-password-input-toggle').tap();
  await expect(row.locator('.coar-password-input-field')).toHaveAttribute('type', 'text');
  await row.locator('.coar-number-input-button--increment').tap();
  await expect(row.locator('.coar-number-input-field')).toHaveValue('2');
  await row.locator('.coar-number-input-button--decrement').tap();
  await expect(row.locator('.coar-number-input-field')).toHaveValue('1');

  await row.locator('.coar-checkbox-wrapper').tap();
  await expect(row.locator('.coar-checkbox-input')).toBeChecked();
  await row.locator('.coar-switch-wrapper').tap();
  await expect(row.locator('.coar-switch-input')).toBeChecked();
  await row.locator('.coar-radio__label').first().tap();
  await expect(row.getByRole('radio').first()).toBeChecked();

  const extras = page.getByTestId('extra-controls');
  await expect(extras.locator('.coar-text-input-field:disabled')).toBeDisabled();
  await expect(extras.locator('.coar-password-input-field')).toHaveAttribute('readonly', '');
  await expect(extras.getByRole('button', { name: 'Disabled', exact: true })).toBeDisabled();
  await expect(extras.locator('.coar-text-input-clear')).toHaveCount(1);
  await expectTarget(extras.locator('.coar-text-input-clear'));
  const labels = extras.locator(
    '.coar-checkbox-wrapper, .coar-switch-wrapper, .coar-radio__label',
  );
  for (const label of await labels.all()) {
    await expectTarget(label, 48);
  }
  await extras.locator('.coar-text-input-clear').tap({ position: { x: 3, y: 3 } });
  await expect(extras.locator('textarea')).toHaveValue('');
});
