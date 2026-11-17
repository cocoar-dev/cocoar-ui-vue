import { expect, test } from '@playwright/test';

test('nested theme and reset boundaries retain compact mobile geometry and explicit theme inputs', async ({ page }) => {
  await page.goto('/design-review/context');
  const origin = page.locator('[data-context-origin]');
  const reset = page.locator('[data-context-reset]');
  await expect(origin.locator('input')).toHaveCSS('font-size', '16px');
  await expect(origin.locator('input')).toHaveCSS('font-family', 'Arial');
  await expect(origin.locator('[data-context-button]')).toHaveCSS('border-radius', '11px');
  await expect(origin.locator('[data-context-button]')).toHaveCSS('font-size', '15px');
  for (const frame of await origin.locator('.coar-input-frame').all()) {
    expect((await frame.boundingBox())!.height).toBe(44);
  }
  await expect(reset.locator('input')).toHaveCSS('font-size', '16px');
  await expect(reset.locator('input')).toHaveCSS('font-family', 'Inter, ui-sans-serif, system-ui, sans-serif');
  await expect(reset.locator('button')).toHaveCSS('border-radius', '6px');
  for (const frame of await reset.locator('.coar-input-frame').all()) {
    expect((await frame.boundingBox())!.height).toBe(44);
  }
  await expect(reset).toHaveCSS('color-scheme', 'light');
  await expect(page.locator('[data-context-legacy] input')).toHaveCSS('font-family', /Poppins/);

  await page.getByRole('combobox', { name: 'Lokale Auswahl' }).click();
  const host = page.locator('.coar-overlay-host.coar-compact');
  await expect(host).toHaveClass(/dark-mode/);
  await expect(host.locator('.coar-select-option').first()).toHaveCSS('font-family', 'Arial');
  await expect(host.locator('.coar-select-option').first()).toHaveCSS('font-size', '15px');
  const darkColor = await host.locator('.coar-select-option').first().evaluate((el) => getComputedStyle(el).color);
  await page.locator('[data-context-mode]').evaluate((el: HTMLSelectElement) => {
    el.value = 'light';
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(host).toHaveClass(/light-mode/);
  await expect.poll(() => host.locator('.coar-select-option').first().evaluate((el) => getComputedStyle(el).color))
    .not.toBe(darkColor);
  await page.keyboard.press('Escape');
  await page.getByRole('combobox', { name: 'Zurückgesetzte Auswahl' }).click();
  await expect(host).toHaveClass(/light-mode/);
  await expect(host.locator('.coar-select-option').first()).toHaveCSS('font-family', 'Inter, ui-sans-serif, system-ui, sans-serif');
  await page.keyboard.press('Escape');
});

test('custom teleports follow the same live appearance and clear mobile floors', async ({ page }) => {
  await page.goto('/design-review/context');
  const portal = page.locator('[data-context-teleport]');
  await expect(portal).toHaveClass(/coar-compact/);
  await expect(portal).toHaveClass(/coar-mobile/);
  await expect(portal).toHaveClass(/dark-mode/);
  await expect(portal.locator('span')).toHaveCSS('font-size', '13px');
  await expect(portal).toHaveCSS('font-family', 'Arial');
  await page.locator('[data-context-mobile]').uncheck();
  await expect(portal).not.toHaveClass(/coar-mobile/);
  await expect(page.locator('[data-context-origin] input')).toHaveCSS('font-size', '14px');
  await page.locator('[data-context-font]').selectOption('Inter');
  await expect(portal).toHaveCSS('font-family', 'Inter');
});

test('an inner mode boundary inherits consumer-authored density roles instead of reinstalling defaults', async ({ page }) => {
  await page.goto('/design-review/context');
  await page.locator('[data-context-mobile]').uncheck();
  await page.locator('[data-context-profile]').evaluate((scope: HTMLElement) => {
    scope.style.setProperty('--coar-ui-font-size', '17px');
    scope.style.setProperty('--coar-field-font-size', '19px');
    scope.style.setProperty('--coar-component-m-height', '40px');
    scope.style.setProperty('--coar-control-radius', '9px');
    scope.style.setProperty('--coar-font-family-body', 'Georgia');
  });
  const inherited = page.locator('[data-context-inherited]');
  await expect(inherited.locator('button')).toHaveCSS('font-size', '17px');
  await expect(inherited.locator('input')).toHaveCSS('font-size', '19px');
  await expect(inherited.locator('input')).toHaveCSS('font-family', 'Georgia');
  await expect(inherited.locator('.coar-input-frame')).toHaveCSS('border-radius', '9px');
  expect((await inherited.locator('.coar-input-frame').boundingBox())!.height).toBe(40);
  // An explicit reset is a different contract and deliberately restores defaults.
  await expect(page.locator('[data-context-reset] input')).toHaveCSS('font-size', '14px');
});

for (const mode of ['light', 'dark']) {
  for (const mobile of [false, true]) {
    test(`body-mounted drag previews retain local typography and surface (${mode}, mobile=${mobile})`, async ({ page }) => {
      await page.goto('/design-review/context');
      await page.locator('[data-context-mode]').selectOption(mode);
      await page.locator('[data-context-mobile]').setChecked(mobile);
      const nativeSource = page.locator('[data-context-origin] [data-context-native-drag]');
      const native = await nativeSource.evaluate((source) => {
        const read = (node: Element) => {
          const style = getComputedStyle(node);
          return {
            classes: [...node.classList], font: style.fontFamily, size: style.fontSize,
            color: style.color, background: style.backgroundColor, scheme: style.colorScheme,
          };
        };
        const captures: ReturnType<typeof read>[] = [];
        const transfer = new DataTransfer();
        const original = transfer.setDragImage.bind(transfer);
        transfer.setDragImage = (node, x, y) => {
          original(node, x, y);
          captures.push(read(node));
        };
        source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: transfer }));
        return { preview: captures[0], source: read(source) };
      });
      // This verifies the actual DOM passed to the native API, not the OS-owned
      // drag bitmap (which a page screenshot cannot capture).
      expect(native.preview).toMatchObject({
        font: native.source.font, size: native.source.size, color: native.source.color,
        background: native.source.background, scheme: mode,
      });
      expect(native.preview.classes).toContain('coar-compact');
      expect(native.preview.classes.includes('coar-mobile')).toBe(mobile);
      await expect(page.locator('body > .coar-compact[style*="-10000px"]')).toHaveCount(0);

      const pointer = page.locator('[data-context-origin] [data-context-pointer-drag]');
      const point = (await pointer.boundingBox())!;
      const expected = await pointer.evaluate((node) => {
        const style = getComputedStyle(node);
        return { font: style.fontFamily, size: style.fontSize, background: style.backgroundColor };
      });
      await page.mouse.move(point.x + 20, point.y + 15);
      await page.mouse.down();
      await page.mouse.move(point.x + 60, point.y + 45, { steps: 3 });
      const ghost = page.locator('body > .coar-dnd-ghost');
      await expect(ghost).toBeVisible();
      await expect(ghost).toHaveClass(/coar-compact/);
      await expect(ghost).toHaveCSS('color-scheme', mode);
      await expect(ghost).toHaveCSS('font-family', expected.font);
      await expect(ghost).toHaveCSS('font-size', expected.size);
      await expect(ghost).toHaveCSS('background-color', expected.background);
      await expect(ghost.locator('.coar-dnd-ghost__count')).toHaveText('2');
      await page.keyboard.press('Escape');
      await page.mouse.up();
      await expect(ghost).toHaveCount(0);
      await expect(pointer).toBeVisible();
    });
  }
}
