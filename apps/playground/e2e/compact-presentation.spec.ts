import { expect, test } from '@playwright/test';

const review = (kind: string, extra = '') =>
  `/design-review?kind=${kind}${extra}`;

function roleContrasts(scope: Element) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  const probe = document.createElement('span');
  scope.appendChild(probe);
  function rgba(color: string) {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    return Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3);
  }
  function luminance(rgb: number[]) {
    const c = rgb.map((value) => {
      const s = value / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  }
  function color(token: string) {
    probe.style.color = `var(${token})`;
    return rgba(getComputedStyle(probe).color);
  }
  function contrast(a: number[], b: number[]) {
    const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (values[0] + 0.05) / (values[1] + 0.05);
  }
  function apca(a: number[], b: number[]) {
    const y = (rgb: number[]) => {
      const [r, g, b] = rgb.map((c) => (c / 255) ** 2.4);
      const raw = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
      return raw < 0.022 ? raw + (0.022 - raw) ** 1.414 : raw;
    };
    const text = y(a), background = y(b);
    const value = background > text
      ? (background ** 0.56 - text ** 0.57) * 1.14 - 0.027
      : (background ** 0.65 - text ** 0.62) * 1.14 + 0.027;
    return Math.abs(value * 100);
  }
  const surface = color('--coar-background-neutral-primary');
  const measured: Record<string, number> = {};
  for (const role of ['primary', 'secondary', 'tertiary']) {
    measured[`text-${role}`] = contrast(color(`--coar-text-neutral-${role}`), surface);
  }
  measured['input-border'] = contrast(color('--coar-border-input'), surface);
  measured['accent-border'] = contrast(color('--coar-border-accent-primary'), surface);
  measured['focus'] = contrast(color('--coar-focus-color'), surface);
  for (const status of ['success', 'error', 'warning', 'info']) {
    measured[`${status}-fill`] = apca(color(`--coar-text-on-${status}`), color(`--coar-background-semantic-${status}-bold`));
    for (const emphasis of ['bold', 'subtle']) {
      measured[`${status}-text-${emphasis}`] = contrast(
        color(`--coar-text-semantic-${status}-${emphasis}`),
        color(`--coar-background-semantic-${status}-subtlest`),
      );
    }
  }
  measured['accent-fill'] = apca(color('--coar-text-on-accent'), color('--coar-background-accent-primary'));
  measured['selected-option'] = contrast(
    color('--coar-text-accent-primary'),
    color('--coar-background-accent-secondary'),
  );
  probe.remove();
  return measured;
}

test('compact roles are opt-in and the chosen Inter weights really load', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(review('fields'));
  const legacy = page.locator('[data-review-profile=legacy]');
  const compact = page.locator('[data-review-profile=compact]');
  await expect(compact.locator('[data-size=m] input')).toBeVisible();
  await page.evaluate(async () => { await document.fonts.ready; });

  await expect(legacy).toHaveCSS('font-size', '16px');
  await expect(legacy).toHaveCSS('font-weight', '400');
  await expect(compact).toHaveCSS('font-size', '14px');
  await expect(compact).toHaveCSS('font-weight', '400');
  await expect(compact.locator('[data-size=m] input')).toHaveCSS('font-size', '14px');
  await expect(compact.locator('[data-size=m] .coar-button')).toHaveCSS('font-size', '13px');
  await expect(compact.locator('[data-size=m] .coar-form-field__label')).toHaveCSS('font-weight', '500');

  const metrics = await page.locator('[data-review-profile]').evaluateAll((profiles) =>
    profiles.map((profile) => ({
      profile: (profile as HTMLElement).dataset.reviewProfile,
      frame: profile.querySelector('[data-size=m] .coar-input-frame')!.getBoundingClientRect().height,
      button: profile.querySelector('[data-size=m] .coar-button')!.getBoundingClientRect().height,
      font: getComputedStyle(profile).fontFamily,
    })));
  expect(metrics[0]).toMatchObject({ profile: 'legacy', frame: 42, button: 40 });
  expect(metrics[0].font).toContain('Poppins');
  expect(metrics[1]).toMatchObject({ profile: 'compact', frame: 36, button: 36 });
  expect(metrics[1].font).toContain('Inter');
  const loaded = await page.evaluate(() => [...document.fonts]
    .filter((face) => face.family === 'Inter' && face.status === 'loaded')
    .map((face) => face.weight));
  expect(loaded).toEqual(expect.arrayContaining(['400', '500']));
});

test('action, field and shape roles can change independently without changing legacy controls', async ({ page }) => {
  await page.goto(review('fields'));
  const compact = page.locator('[data-review-profile=compact]');
  const legacy = page.locator('[data-review-profile=legacy]');
  const button = compact.locator('[data-size=m] .coar-button');
  const input = compact.locator('[data-size=m] input');
  await expect(input).toBeVisible();
  await compact.evaluate((scope: HTMLElement) => {
    scope.style.setProperty('--coar-ui-font-size', '15px');
    scope.style.setProperty('--coar-field-font-size', '17px');
    scope.style.setProperty('--coar-button-radius', '10px');
  });
  await expect(button).toHaveCSS('font-size', '15px');
  await expect(input).toHaveCSS('font-size', '17px');
  await expect(button).toHaveCSS('border-radius', '10px');
  await expect(compact.locator('[data-size=m] .coar-input-frame')).toHaveCSS('border-radius', '6px');
  await expect(compact.locator('[data-size=m] .coar-form-field__label')).toHaveCSS('font-size', '15px');
  await expect(legacy.locator('[data-size=m] input')).toHaveCSS('font-size', '14px');
  await expect(legacy.locator('[data-size=m] .coar-button')).toHaveCSS('font-size', '14px');
});

test('200 percent layout zoom keeps narrow forms usable without page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1400 });
  await page.goto(review('fields', '&profile=compact&mobile=true'));
  // CSS layout zoom reflows at half the available width; unlike deviceScaleFactor
  // or pinch magnification it also exercises wrapping. Not an OS text-only zoom.
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  const compact = page.locator('[data-review-profile=compact]');
  const input = compact.locator('[data-size=m] input');
  await expect(input).toBeVisible();
  await input.fill('Größenprüfung bei doppelter Darstellung');
  await expect(input).toHaveValue('Größenprüfung bei doppelter Darstellung');
  await expect(compact.locator('[data-size=m] .coar-button')).toBeVisible();
  expect((await compact.locator('[data-size=m] .coar-input-frame').boundingBox())!.height).toBe(88);
  const widths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
});

test('a real unavailable-font fallback keeps the compact fields and long labels usable', async ({ page }) => {
  let blockedFonts = 0;
  await page.route(/\.(?:woff2?|ttf|otf)(?:\?|$)/, (route) => {
    blockedFonts += 1;
    return route.abort();
  });
  await page.goto(review('typography', '&profile=compact&mobile=true'));
  const compact = page.locator('[data-review-profile=compact]');
  const input = compact.locator('input').first();
  await expect(input).toBeVisible();
  await page.evaluate(async () => { await document.fonts.ready; });
  expect(blockedFonts).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.fonts.check('400 14px Inter', 'Überprüfung'))).toBe(false);
  await input.fill('Straße · Großhändler · ÄÖÜ · 1.234,50 €');
  await expect(input).toHaveValue('Straße · Großhändler · ÄÖÜ · 1.234,50 €');
  await expect(input).toHaveCSS('font-size', '16px');
  const widths = await compact.evaluate((scope) => ({
    scroll: scope.scrollWidth,
    client: scope.clientWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
});

for (const mode of ['light', 'dark']) {
  for (const mobile of [false, true]) {
    test(`muted field borders preserve focus, error and legacy in ${mode}, mobile=${mobile} @touch`, async ({ page }) => {
      await page.goto(review('states', `&mode=${mode}&mobile=${mobile}`));
      const compact = page.locator('[data-review-profile=compact]');
      const normal = compact.locator('.coar-input-frame').first();
      const error = compact.locator('.coar-input-frame--error');
      const legacy = page.locator('[data-review-profile=legacy] .coar-input-frame').first();
      const normalColor = mode === 'light' ? 'rgb(142, 148, 156)' : 'rgb(96, 113, 138)';
      const hoverColor = mode === 'light' ? 'rgb(125, 135, 148)' : 'rgb(109, 126, 151)';
      const focusColor = mode === 'light' ? 'rgb(70, 93, 123)' : 'rgb(181, 201, 228)';
      const legacyColor = mode === 'light' ? 'rgb(214, 214, 214)' : 'rgb(113, 113, 122)';

      await expect(normal).toHaveCSS('border-top-color', normalColor);
      await expect(normal.locator('input')).toHaveCSS('font-size', mobile ? '16px' : '14px');
      expect((await normal.boundingBox())!.height).toBe(mobile ? 44 : 36);
      await expect(legacy).toHaveCSS('border-top-color', legacyColor);
      const errorColor = await error.evaluate((el) => getComputedStyle(el).borderTopColor);
      expect(errorColor).not.toBe(normalColor);
      expect(errorColor).not.toBe(focusColor);

      await normal.hover();
      await expect(normal).toHaveCSS('border-top-color', hoverColor);
      await page.mouse.move(0, 0);
      await normal.locator('input').focus();
      await expect(normal).toHaveCSS('border-top-color', focusColor);
      await normal.hover();
      await expect(normal).toHaveCSS('box-shadow', new RegExp(focusColor.replace(/[()]/g, '\\$&')));
      await error.hover();
      await expect(error).toHaveCSS('border-top-color', errorColor);
      await error.locator('input').focus();
      await expect(error).toHaveCSS('border-top-color', errorColor);

      await compact.evaluate((scope: HTMLElement) => {
        scope.style.setProperty('--coar-border-input', '#808080');
        scope.style.setProperty('--coar-border-input-hover', '#777777');
      });
      await page.mouse.move(0, 0);
      await expect(normal).toHaveCSS('border-top-color', 'rgb(128, 128, 128)');
      await normal.hover();
      await expect(normal).toHaveCSS('border-top-color', 'rgb(119, 119, 119)');
      await page.mouse.move(0, 0);
      await normal.locator('input').focus();
      await expect(normal).toHaveCSS('border-top-color', focusColor);
      await expect(error).toHaveCSS('border-top-color', errorColor);
      await expect(legacy).toHaveCSS('border-top-color', legacyColor);
    });
  }

  test(`representative consumer theme hues retain text and focus contrast in ${mode}`, async ({ page }) => {
    await page.goto(review('typography', `&profile=compact&mode=${mode}`));
    const compact = page.locator('[data-review-profile=compact]');
    await expect(compact.locator('input').first()).toBeVisible();
    for (const hue of ['#334155', '#15803d', '#be185d', '#facc15', '#1183cd']) {
      await compact.evaluate((scope: HTMLElement, color) => {
        scope.style.setProperty('--coar-appearance-accent', color);
        for (const status of ['success', 'error', 'warning', 'info']) {
          scope.style.setProperty(`--coar-${status}`, color);
        }
      }, hue);
      const ratios = await compact.evaluate(roleContrasts);
      for (const [role, ratio] of Object.entries(ratios)) {
        expect(ratio, `${mode} ${hue} ${role}`).toBeGreaterThanOrEqual(
          role.endsWith('-fill') ? 54.5 : ['input-border', 'accent-border', 'focus'].includes(role) ? 3 : 4.5,
        );
      }
    }
  });

  test(`small text and semantic fills have measured contrast in ${mode}`, async ({ page }) => {
    await page.goto(review('typography', `&profile=compact&mode=${mode}`));
    await expect(page.locator('[data-review-profile=compact] input').first()).toBeVisible();
    const ratios = await page.locator('[data-review-profile=compact]').evaluate(roleContrasts);
    for (const [role, ratio] of Object.entries(ratios)) {
      expect(ratio, `${mode} ${role}`).toBeGreaterThanOrEqual(
        role.endsWith('-fill') ? 54.5 : ['input-border', 'accent-border', 'focus'].includes(role) ? 3 : 4.5,
      );
    }
  });

  test(`rendered loading and progress indicators remain distinguishable in ${mode}`, async ({ page }) => {
    await page.goto(`/visual.html#/visual/compact-display-indicators?mode=default&scheme=${mode}`);
    const root = page.locator('[data-visual-root]');
    await expect(root).toHaveAttribute('data-visual-state', 'ready');
    const ratios = await root.evaluate((scope) => {
      const ctx = document.createElement('canvas').getContext('2d')!;
      function luminance(css: string) {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = css;
        ctx.fillRect(0, 0, 1, 1);
        const c = Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3).map((v) => {
          const s = v / 255;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
      }
      function contrast(a: string, b: string) {
        const [lo, hi] = [luminance(a), luminance(b)].sort((x, y) => x - y);
        return (hi + 0.05) / (lo + 0.05);
      }
      const measured = [...scope.querySelectorAll('.coar-progress-bar')].map((bar) => contrast(
        getComputedStyle(bar.querySelector('.coar-progress-bar-fill')!).backgroundColor,
        getComputedStyle(bar.querySelector('.coar-progress-bar-container')!).backgroundColor,
      ));
      const surface = getComputedStyle(scope.querySelector('.coar-compact')!).backgroundColor;
      for (const arc of scope.querySelectorAll('.coar-spinner-arc')) {
        measured.push(contrast(getComputedStyle(arc).stroke, surface));
      }
      return measured;
    });
    expect(ratios).toHaveLength(6);
    for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(3);
  });
}

test.describe('compact touch presentation', () => {
  test.use({ hasTouch: true });

  test('uses distinct input and action text with aligned 44px targets @touch', async ({ page }) => {
    await page.goto(review('fields', '&profile=compact&mobile=true'));
    const compact = page.locator('[data-review-profile=compact]');
    const frame = compact.locator('[data-size=m] .coar-input-frame');
    await expect(frame).toBeVisible();
    await expect(compact.locator('[data-size=m] input')).toHaveCSS('font-size', '16px');
    await expect(compact.locator('[data-size=m] .coar-button')).toHaveCSS('font-size', '14px');
    expect((await frame.boundingBox())!.height).toBe(44);
    expect((await compact.locator('[data-size=m] .coar-button').boundingBox())!.height).toBe(44);
    const otp = compact.locator('.coar-otp-input__cell').first();
    await expect(otp).toHaveCSS('font-size', '16px');
    expect((await otp.boundingBox())!.height).toBe(44);
    await compact.locator('[data-size=m] input').tap();
    await expect(compact.locator('[data-size=m] input')).toBeFocused();
  });

  test('real nested trigger roles and mode changes reach an open overlay @touch', async ({ page }) => {
    await page.goto(review('selection', '&profile=compact'));
    await page.getByRole('combobox', { name: 'Status', exact: true }).tap();
    const host = page.locator('.coar-overlay-host.coar-compact');
    await expect(host).toBeVisible();
    const option = host.locator('.coar-select-option').first();
    await expect(option).toHaveCSS('font-family', 'Inter, ui-sans-serif, system-ui, sans-serif');
    await expect(option).toHaveCSS('font-size', '13px');
    expect((await option.boundingBox())!.height).toBe(36);
    const lightSelectedColor = await option.evaluate((el) => getComputedStyle(el).color);

    // Change the fixture through its real Vue controls without clicking outside
    // and dismissing the open panel. No component styles or DOM are rewritten.
    await page.locator('[data-review-mobile]').evaluate((control: HTMLInputElement) => {
      control.checked = true;
      control.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(host).toHaveClass(/coar-mobile/);
    await expect(option).toHaveCSS('font-size', '14px');
    expect((await option.boundingBox())!.height).toBe(44);

    await page.locator('[data-review-mode]').evaluate((control: HTMLSelectElement) => {
      control.value = 'dark';
      control.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(host).toHaveClass(/dark-mode/);
    // A selected option uses the accent role, not neutral primary text.
    // Resolve via a real element so RGB/OKLCH serialization is browser-owned.
    const darkColors = await host.evaluate((el) => {
      const probe = document.createElement('span');
      el.appendChild(probe);
      probe.style.color = 'var(--coar-text-accent-primary)';
      const selected = getComputedStyle(probe).color;
      probe.style.color = 'var(--coar-text-neutral-primary)';
      const neutral = getComputedStyle(probe).color;
      probe.remove();
      return { selected, neutral };
    });
    expect(darkColors.selected).not.toBe(lightSelectedColor);
    await expect(option).toHaveCSS('color', darkColors.selected);
    await expect(host.locator('.coar-select-option:not(.coar-select-option--selected)').first())
      .toHaveCSS('color', darkColors.neutral);
    await page.keyboard.press('Escape');
    await expect(host).toHaveCount(0);
  });
});
