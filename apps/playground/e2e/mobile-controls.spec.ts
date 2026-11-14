import { expect, test, type Locator, type Page } from '@playwright/test';

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

async function expectFont(target: Locator, minimum = 16) {
  const fontSize = await target.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(minimum);
}

/** Taps a point off the visible icon, still inside its 44px hit area. */
async function tapBeside(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded();
  const box = (await target.boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2 + 16);
}

test(
  'selects, date pickers, segmented controls and OTP cells take the size scale',
  { tag: '@touch' },
  async ({ page }) => {
    for (const size of sizes) {
      const row = page.locator(`[data-size="${size}"]`);
      for (const target of await row
        .locator('.coar-select-clear, .coar-plain-date-picker-clear, .coar-input-frame-button')
        .all()) {
        await expectTarget(target);
      }
      await expectFont(row.locator('.coar-select-value'));
      for (const segment of await row.locator('.coar-segmented-control__segment').all()) {
        await expectTarget(segment);
        await expect(segment).toHaveCSS('height', `${mobileHeights[size]}px`);
        await expectFont(segment);
      }
      for (const cell of await row.locator('.coar-otp-input__cell').all()) {
        await expect(cell).toHaveCSS('height', `${mobileHeights[size]}px`);
        await expect(cell).toHaveCSS('width', `${mobileHeights[size]}px`);
        await expectFont(cell);
      }
      await expect(row.locator('.coar-select-clear')).toHaveCSS('opacity', '1');
    }
  },
);

test('rows and small controls reach 44px targets', { tag: '@touch' }, async ({ page }) => {
  const area = page.getByTestId('rows-and-small-controls');
  for (const frame of await area.locator('.coar-input-frame').all()) {
    const box = (await frame.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(mobileHeights.m);
  }
  for (const target of await area
    .locator(
      [
        '.coar-select-clear',
        '.coar-input-frame-button',
        '.coar-zdtp-tz-indicator',
        '.coar-tab-button',
        '.coar-pagination-button',
      ].join(', '),
    )
    .all()) {
    await expectTarget(target);
  }
  for (const row of await area
    .locator('.coar-listbox-item, .coar-menu-item, .coar-sub-expand')
    .all()) {
    const box = (await row.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    await expectFont(row);
  }
  await expectFont(area.locator('.coar-tab-button').first());
  await expectFont(area.locator('.coar-pagination-button--active'));
});

test(
  'tag and chip remove targets grow without enlarging the tag',
  { tag: '@touch' },
  async ({ page }) => {
    const area = page.getByTestId('rows-and-small-controls');
    const tag = area.locator('.coar-tag');
    expect((await tag.boundingBox())!.height).toBeLessThan(44);
    await tapBeside(page, area.locator('.coar-tag__close'));
    await expect(page.getByTestId('tag-closes')).toHaveText('1');

    const chips = area.locator('.coar-tag-select-tag');
    await expect(chips).toHaveCount(2);
    expect((await chips.first().boundingBox())!.height).toBeLessThan(44);
    await tapBeside(page, chips.last().locator('.coar-tag-select-tag-remove'));
    await expect(chips).toHaveCount(1);
  },
);

test(
  'select options opened from the local area are touch-sized rows',
  { tag: '@touch' },
  async ({ page }) => {
    await page.locator('[data-size="xs"] .coar-select-trigger').tap();
    const host = page.locator('.coar-overlay-host');
    const option = host.getByRole('option', { name: 'Germany', exact: true });
    await expect(option).toBeVisible();
    await expect(host).toHaveClass(/\bcoar-mobile\b/);
    expect((await option.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expectFont(option);
    await option.tap();
    await expect(page.locator('[data-size="xs"] .coar-select-value')).toHaveText('Germany');
  },
);

test(
  'the new controls keep their desktop sizes without the class',
  { tag: '@touch' },
  async ({ page }) => {
    await expect(page.getByTestId('desktop-sibling').locator('.coar-select-frame')).toHaveCSS(
      'height',
      '27px',
    );
    await page.getByLabel('Mobile presentation', { exact: true }).uncheck();
    for (const size of sizes) {
      const row = page.locator(`[data-size="${size}"]`);
      await expect(row.locator('.coar-select-frame')).toHaveCSS(
        'height',
        `${desktopHeights[size]}px`,
      );
      await expect(row.locator('.coar-segmented-control__segment').first()).toHaveCSS(
        'height',
        `${desktopHeights[size]}px`,
      );
      await expect(row.locator('.coar-otp-input__cell').first()).toHaveCSS(
        'height',
        `${desktopHeights[size]}px`,
      );
      await expect(row.locator('.coar-select-value')).toHaveCSS(
        'font-size',
        `${desktopFonts[size]}px`,
      );
    }
    const area = page.getByTestId('rows-and-small-controls');
    await expect(area.locator('.coar-pagination-button--active')).toHaveCSS('height', '32px');
    const item = (await area.locator('.coar-menu-item').first().boundingBox())!;
    expect(item.height).toBeLessThan(44);
  },
);

// ─── Narrow cases (phone width) ─────────────────────────────────────────────────

const narrow = (page: Page) => page.getByTestId('narrow-cases');

/**
 * Taps on a grid over the 44×44px square centred on each icon: every point must reach
 * that icon's own button or nothing interactive (no neighbour's hit area, no other control).
 */
async function expectOwnHitAreas(buttons: Locator) {
  const all = await buttons.all();
  expect(all.length).toBeGreaterThan(1);
  for (const button of all) {
    await button.scrollIntoViewIfNeeded();
    const wrong = await button.evaluate((own) => {
      const r = own.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const found: string[] = [];
      for (let dx = -21; dx <= 21; dx += 7) {
        for (let dy = -21; dy <= 21; dy += 7) {
          const hit = document.elementFromPoint(cx + dx, cy + dy);
          const control = hit?.closest(
            'button, input, select, textarea, a[href], [role="option"], [role="tab"], [tabindex]:not([tabindex="-1"])',
          );
          if (control && control !== own) {
            found.push(`(${dx},${dy}) → ${control.tagName.toLowerCase()}.${control.className}`);
          }
        }
      }
      return found;
    });
    expect(wrong, 'points of the hit area that reach another control').toEqual([]);
  }
}

test.describe('narrow cases at a 320px viewport', { tag: '@touch' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
  });

  test('wrapped tag-select chips: each remove hit area reaches only its own button', async ({
    page,
  }) => {
    const field = narrow(page).getByTestId('narrow-tag-select');
    const chips = field.locator('.coar-tag-select-tag');
    await expect(chips).toHaveCount(3);
    const tops = await chips.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
    expect(new Set(tops.map(Math.round)).size, 'the chips wrap').toBeGreaterThan(1);
    await expectOwnHitAreas(field.locator('.coar-tag-select-tag-remove'));
  });

  test('closable tags wrapped in a list: each close hit area reaches only its own button', async ({
    page,
  }) => {
    const list = narrow(page).getByTestId('tag-list');
    const tops = await list
      .locator('.coar-tag')
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
    expect(new Set(tops.map(Math.round)).size, 'the tags wrap').toBeGreaterThan(1);
    await expectOwnHitAreas(list.locator('.coar-tag__close'));
  });

  test('long tabs are never narrower than their labels and never overlap', async ({ page }) => {
    const buttons = narrow(page).getByTestId('narrow-tabs').locator('.coar-tab-button');
    await expect(buttons).toHaveCount(4);
    const boxes = await buttons.evaluateAll((els) =>
      els.map((el) => {
        const b = el.getBoundingClientRect();
        const l = el.querySelector('.coar-tab-label')!.getBoundingClientRect();
        return { left: b.left, right: b.right, labelLeft: l.left, labelRight: l.right };
      }),
    );
    boxes.forEach((box, i) => {
      expect(box.labelLeft, `tab ${i}: label inside its button`).toBeGreaterThanOrEqual(
        box.left - 0.5,
      );
      expect(box.labelRight, `tab ${i}: label inside its button`).toBeLessThanOrEqual(
        box.right + 0.5,
      );
      if (i > 0)
        expect(box.left, `tab ${i}: after its neighbour`).toBeGreaterThanOrEqual(
          boxes[i - 1].right - 0.5,
        );
    });
  });

  test('six OTP cells keep the mobile height and fit the container', async ({ page }) => {
    const container = narrow(page).getByTestId('narrow-otp');
    const cells = container.locator('.coar-otp-input__cell');
    await expect(cells).toHaveCount(6);
    const right = (await container.boundingBox())!;
    for (const cell of await cells.all()) {
      const box = (await cell.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(right.x + right.width + 0.5);
      expect(box.height).toBe(mobileHeights.m);
      await expectFont(cell);
    }
    const group = (await container.locator('.coar-otp-input').boundingBox())!;
    expect(group.x + group.width).toBeLessThanOrEqual(right.x + right.width + 0.5);
  });

  test('pagination with 30 items wraps its 44px buttons inside the container', async ({ page }) => {
    const container = narrow(page).getByTestId('narrow-pagination');
    const edge = (await container.boundingBox())!;
    const buttons = container.locator('.coar-pagination-button');
    await expect(buttons).toHaveCount(7);
    for (const button of await buttons.all()) {
      const box = (await button.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(edge.x + edge.width + 0.5);
      await expectTarget(button);
    }
  });
});
