import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function scene(page: Page, kind: string, mobile: boolean, scheme: string) {
  await page.clock.setSystemTime(new Date('2026-03-10T09:00:00Z'));
  await page.goto(`/visual.html#/visual/compact-edge-${kind}?mode=${mobile ? 'mobile' : 'default'}&scheme=${scheme}`);
  await expect(page.locator('[data-visual-state]')).toHaveAttribute('data-visual-state', 'ready');
  await page.evaluate(async () => { await document.fonts.ready; });
}

async function panelProfile(page: Page, mobile: boolean, scheme: string) {
  const host = page.locator('.coar-overlay-host').last();
  await expect(host).toHaveClass(/coar-compact/);
  await expect(host).toHaveCSS('color-scheme', scheme);
  await expect(host).toHaveCSS('font-family', /Inter/);
  expect(await host.evaluate((element) => Boolean(element.closest('.coar-mobile')))).toBe(mobile);
}

for (const scheme of ['light', 'dark']) {
  for (const mobile of [false, true]) {
    const variant = `${scheme}, mobile=${mobile}`;

    test(`real scrollbar roles, dragging and legacy consumer styling (${variant})`, async ({ page }) => {
      await scene(page, 'scrollbars', mobile, scheme);
      const compact = page.locator('[data-scrollbar=compact]');
      const handle = compact.locator('[data-scroll-host] > .os-scrollbar-vertical .os-scrollbar-handle');
      const legacyHandle = page.locator('[data-scrollbar=legacy] [data-scroll-host] > .os-scrollbar-vertical .os-scrollbar-handle');
      await expect(handle).toBeVisible();
      await expect(legacyHandle).toBeVisible();
      // An ordinary consumer handle rule still styles legacy. The compact
      // profile deliberately provides its own, independently overridable roles.
      await page.addStyleTag({ content: '.os-scrollbar-handle { background: rgb(202, 33, 44); }' });
      await expect(legacyHandle).toHaveCSS('background-color', 'rgb(202, 33, 44)');
      const color = (role: string) => compact.evaluate((root, token) => {
        const probe = document.createElement('span');
        probe.style.backgroundColor = `var(${token})`;
        root.appendChild(probe);
        const value = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return value;
      }, role);
      await page.mouse.move(0, 0);
      await expect(handle).toHaveCSS('background-color', await color('--coar-scrollbar-handle-bg'));
      await handle.hover();
      await expect(handle).toHaveCSS('background-color', await color('--coar-scrollbar-handle-bg-hover'));
      await page.mouse.down();
      await expect(handle).toHaveCSS('background-color', await color('--coar-scrollbar-handle-bg-active'));
      const box = (await handle.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 30, { steps: 4 });
      await page.mouse.up();
      const viewport = compact.locator('[data-overlayscrollbars-viewport]');
      await expect.poll(() => viewport.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
      await page.mouse.move(0, 0);
      await compact.evaluate((root) => (root as HTMLElement).style.setProperty('--coar-scrollbar-handle-bg', 'rgb(12, 34, 56)'));
      await expect(handle).toHaveCSS('background-color', 'rgb(12, 34, 56)');
      await handle.hover();
      await expect(handle).toHaveCSS('background-color', await color('--coar-scrollbar-handle-bg-hover'));
    });

    test(`theme accordions, scale editor and downloaded compact theme (${variant})`, async ({ page }) => {
      await page.goto(`/visual.html#/visual/compact-interaction-theme-editor-open?mode=${mobile ? 'mobile' : 'default'}&scheme=${scheme}`);
      await page.locator('.te-fab').click();
      const panel = page.locator('.te-panel');
      for (const title of [
        'Semantic colors', 'Typography', 'Radius scale', 'Spacing scale', 'Motion',
        'Inputs', 'Buttons', 'Tags & Badges', 'Cards', 'Overlays', 'Dialogs & Toasts',
      ]) {
        const details = panel.locator('details').filter({ has: page.locator('summary', { hasText: title }) });
        const summary = details.locator('summary');
        await summary.click();
        await expect(details).toHaveAttribute('open', '');
        await expect(summary.locator('.te-acc-title')).toHaveCSS('font-family', /Inter/);
        await expect(summary.locator('.te-acc-title')).toHaveCSS('font-size', mobile ? '14px' : '13px');
        if (title === 'Inputs') {
          const scale = details.locator('.tse');
          await scale.getByRole('button', { name: 'Fixed', exact: true }).click();
          await scale.locator('input').fill('12px');
          // TokenScaleEditor uses size="s", not the medium field text role.
          await expect(scale.locator('input')).toHaveCSS('font-size', mobile ? '16px' : '13px');
          await expect(page.locator('[data-interaction=theme-editor] .coar-input-frame').first())
            .toHaveCSS('border-top-left-radius', '12px');
          await scale.getByRole('button', { name: 'Scale', exact: true }).click();
          await scale.getByRole('combobox').click();
          const options = page.locator('.coar-select-dropdown').getByRole('option');
          expect(await options.count()).toBeGreaterThan(4);
          await options.filter({ hasText: /^S$/ }).click();
        }
        await summary.click();
      }

      // A compact export must reproduce its live brand, not silently fall
      // back to Slate when the downloaded class is applied to another scope.
      await panel.locator('.te-color-swatch').first().fill('#a21caf');
      const downloadEvent = page.waitForEvent('download');
      await panel.getByRole('button', { name: 'Download CSS', exact: true }).click();
      const download = await downloadEvent;
      expect(download.suggestedFilename()).toBe('coar-theme--custom.css');
      const stylesheet = await readFile((await download.path())!, 'utf8');
      expect(stylesheet).toContain('--coar-appearance-accent: #a21caf;');
      const colors = await page.evaluate((css) => {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        const exported = document.createElement('div');
        exported.className = 'coar-compact coar-theme--custom';
        document.body.appendChild(exported);
        function color(root: Element) {
          const probe = document.createElement('span');
          probe.style.color = 'var(--coar-color-accent-500)';
          root.appendChild(probe);
          const value = getComputedStyle(probe).color;
          probe.remove();
          return value;
        }
        const result = {
          live: color(document.querySelector('[data-interaction=theme-editor]')!),
          exported: color(exported),
        };
        exported.remove();
        style.remove();
        return result;
      }, stylesheet);
      expect(colors.exported).toBe(colors.live);
      const opposite = scheme === 'dark' ? 'Light' : 'Dark';
      await panel.getByRole('button', { name: opposite, exact: true }).click();
      await expect(page.locator('[data-interaction=theme-editor]'))
        .toHaveCSS('color-scheme', scheme === 'dark' ? 'light' : 'dark');
    });

    test(`select search, empty options and options arriving while open (${variant})`, async ({ page }) => {
      await scene(page, 'selection', mobile, scheme);
      const search = page.locator('[data-case=search]');
      await search.getByRole('combobox').click();
      const input = search.locator('input');
      await expect(input).toBeFocused();
      await expect(input).toHaveCSS('font-size', mobile ? '16px' : '14px');
      await panelProfile(page, mobile, scheme);
      await input.fill('Eintrag 240');
      await expect(page.locator('.coar-select-option')).toHaveCount(1);
      await page.locator('.coar-select-dropdown').getByRole('option', { name: 'Eintrag 240', exact: true }).click();
      await expect(search).toContainText('Eintrag 240');
      await search.getByRole('combobox').click();
      await input.fill('Keine passende Option');
      await expect(page.locator('.coar-select-empty')).toBeVisible();
      await expect(page.locator('.coar-select-empty')).toHaveCSS('font-family', /Inter/);
      await page.keyboard.press('Escape');

      const empty = page.locator('[data-case=empty]');
      await empty.getByRole('combobox').click();
      await expect(page.locator('.coar-select-empty')).toBeVisible();
      // A real keyboard activation updates the app's data without a pointer
      // outside-click dismissing the panel being tested.
      await page.locator('[data-case=load]').press('Enter');
      await expect(page.locator('.coar-overlay-host')).toHaveCount(1);
      await expect(page.locator('.coar-select-option')).toHaveCount(240);
      await expect(page.locator('.coar-select-empty')).toHaveCount(0);
    });

    test(`created tags and real virtual rows retain text and explicit geometry (${variant})`, async ({ page }) => {
      await scene(page, 'selection', mobile, scheme);
      const tags = page.locator('[data-case=create]');
      await tags.locator('input').fill('Eigene Kategorie');
      await expect(page.locator('.coar-tag-select-dropdown')).toHaveCount(0);
      await tags.locator('input').press('Enter');
      await expect(tags.locator('output')).toHaveText('Eigene Kategorie');
      await expect(tags.locator('.coar-tag-select-tag-label')).toHaveCSS('font-family', /Inter/);
      await tags.locator('.coar-tag-select-tag-remove').click();
      await expect(tags.locator('output')).toBeEmpty();

      const list = page.locator('.coar-listbox-list--virtual');
      const rows = list.locator('[role=option]');
      await expect.poll(() => rows.count()).toBeLessThan(240);
      const boxes = await rows.evaluateAll((nodes) => nodes.slice(0, 3).map((node) => {
        const rect = node.getBoundingClientRect();
        return { top: rect.top, height: rect.height, font: getComputedStyle(node).fontFamily };
      }));
      for (const box of boxes) {
        // itemHeight is the list's documented independent virtualization geometry,
        // not a CSS min-height that may overlap its absolutely positioned rows.
        expect(box.height).toBe(32);
        expect(box.font).toContain('Inter');
      }
      expect(boxes[1]!.top - boxes[0]!.top).toBe(32);
      await list.evaluate((node) => { node.scrollTop = node.scrollHeight; });
      await expect(list.getByRole('option', { name: 'Eintrag 240', exact: true })).toBeVisible();
      const filter = page.locator('.coar-listbox-search input');
      await filter.fill('Eintrag 239');
      await expect(rows).toHaveCount(1);
      await expect(rows.first()).toContainText('Eintrag 239');
    });

    test(`optional-time wrappers switch and open both real composed panels (${variant})`, async ({ page }) => {
      await scene(page, 'dates', mobile, scheme);
      for (const kind of ['plain', 'zoned']) {
        const wrapper = page.locator(`[data-case=${kind}]`);
        const toggle = wrapper.getByRole('button', { name: 'Add time', exact: true });
        const expectLayout = async () => {
          const bounds = (await wrapper.boundingBox())!;
          const control = (await wrapper.locator('.coar-date-or-time').boundingBox())!;
          expect(control.x + control.width).toBeLessThanOrEqual(bounds.x + bounds.width + 0.5);
          if (mobile) {
            const target = (await wrapper.locator('.coar-date-or-time__toggle').boundingBox())!;
            expect(target.width).toBeGreaterThanOrEqual(44);
            expect(target.height).toBeGreaterThanOrEqual(44);
          }
        };
        await expect(toggle).toHaveAttribute('aria-pressed', 'false');
        await expectLayout();
        await toggle.click();
        await expect(wrapper.getByRole('button', { name: 'Remove time', exact: true })).toHaveAttribute('aria-pressed', 'true');
        await expectLayout();
        await wrapper.locator(kind === 'plain' ? '.coar-pdtp-btn' : '.coar-zdtp-btn').click();
        await panelProfile(page, mobile, scheme);
        await expect(page.locator('.coar-time-picker').first()).toBeVisible();
        await page.keyboard.press('Escape');
        await wrapper.getByRole('button', { name: 'Remove time', exact: true }).click();
        await expectLayout();
        await wrapper.locator('.coar-plain-date-picker-btn').click();
        await panelProfile(page, mobile, scheme);
        await expect(page.locator('.coar-plain-date-picker-panel')).toBeVisible();
        await page.keyboard.press('Escape');
      }
    });

    test(`date markers, today return and disabled year limits (${variant})`, async ({ page }) => {
      await scene(page, 'dates', mobile, scheme);
      await page.locator('[data-case=markers] .coar-plain-date-picker-btn').click();
      await expect(page.locator('.coar-plain-date-picker-events')).toContainText('Planung und Abstimmung');
      await expect(page.locator('.coar-plain-date-picker-event-text')).toHaveCSS('font-family', /Inter/);
      await page.getByRole('button', { name: 'Next year', exact: true }).click();
      const today = page.getByRole('button', { name: "Jump to today's month", exact: true });
      await expect(today).toBeVisible();
      if (mobile) expect((await today.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await today.click();
      await expect(page.locator('.coar-plain-date-picker-year')).toHaveText('2026');
      await page.keyboard.press('Escape');
      for (const [kind, disabled, year] of [
        ['lower', 'Previous year', '1926'],
        ['upper', 'Next year', '2076'],
      ]) {
        await page.locator(`[data-case=${kind}] .coar-plain-date-picker-btn`).click();
        await expect(page.locator('.coar-plain-date-picker-year')).toHaveText(year!);
        await expect(page.getByRole('button', { name: disabled, exact: true })).toBeDisabled();
        await page.keyboard.press('Escape');
      }
    });

    test(`all dialog sizes, nested alert and confirm preserve context (${variant})`, async ({ page }) => {
      await scene(page, 'dialogs', mobile, scheme);
      const viewport = page.viewportSize()!;
      for (const size of ['s', 'm', 'l', 'xl']) {
        await page.locator(`[data-size=${size}]`).click();
        const dialog = page.locator(`.coar-dialog--${size}`);
        await expect(dialog).toBeVisible();
        await panelProfile(page, mobile, scheme);
        const rect = (await dialog.boundingBox())!;
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width);
        await dialog.getByRole('button', { name: 'Inneren Dialog öffnen' }).click();
        await expect(page.locator('.coar-dialog')).toHaveCount(2);
        await panelProfile(page, mobile, scheme);
        await page.keyboard.press('Escape');
        await expect(page.locator('.coar-dialog')).toHaveCount(1);
        await expect(dialog.getByRole('button', { name: 'Inneren Dialog öffnen' })).toBeFocused();
        await page.keyboard.press('Escape');
      }
      await page.locator('[data-case=alert]').click();
      await panelProfile(page, mobile, scheme);
      await page.getByRole('button', { name: 'OK', exact: true }).click();
      await expect(page.locator('.coar-dialog')).toHaveCount(0);
      await page.locator('[data-case=confirm]').click();
      await page.getByRole('button', { name: 'Übernehmen', exact: true }).click();
      await expect(page.locator('[data-case=result]')).toHaveText('true');
      await page.locator('[data-case=confirm]').click();
      await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
      await expect(page.locator('[data-case=result]')).toHaveText('false');
    });
  }
}

test('compact phone sheet closes through its actual drag handle @touch', async ({ page }) => {
  await scene(page, 'dialogs', true, 'dark');
  await page.locator('[data-case=sheet]').click();
  const sheet = page.locator('.coar-sheet');
  await expect(sheet).toBeVisible();
  // Wait for the entrance motion before taking the pointer's start position.
  await expect.poll(() => sheet.evaluate((node) =>
    node.getAnimations().filter((animation) => animation.playState === 'running').length)).toBe(0);
  const handle = (await sheet.locator('.coar-sheet-handle-area').boundingBox())!;
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + 180, { steps: 12 });
  await page.mouse.up();
  await expect(sheet).toHaveCount(0);
});
