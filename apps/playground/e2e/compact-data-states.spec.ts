import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Open grid / viewer / map states of the compact presentation, driven through the real components.
 *
 * Two groups, selected by title prefix:
 *  - `[registered]`  uses scenes that already exist in the gallery (`map`, `map-editor`, `document-viewer-pdf`).
 *  - `[draft-scene]` uses the four NEW scenes of this draft (`data-grid-editors`, `data-grid-states`,
 *    `document-viewer-states`, `map-points`). Missing scene registration is a failure, never a skipped check.
 *
 * Variants: light/dark x default/`.coar-mobile` (class emulation in desktop Chromium, never a device). Behaviour is
 * asserted on the compact profile; the legacy profile only gets invariants (default look stays) and observations.
 * Legacy values that look poor (e.g. a white Leaflet popup in dark) are attached as `legacy-observation`
 * annotations, never asserted as "good".
 * Everything runs against localhost: any request that leaves it fails the test.
 */

type Profile = 'legacy' | 'compact';
interface Variant { name: string; mode: 'light' | 'dark'; mobile: boolean }
const VARIANTS: Variant[] = [
  { name: 'light', mode: 'light', mobile: false },
  { name: 'dark', mode: 'dark', mobile: false },
  { name: 'light mobile', mode: 'light', mobile: true },
  { name: 'dark mobile', mode: 'dark', mobile: true },
];
const CLOCK = '2026-03-10T09:00:00Z';

test.use({ viewport: { width: 1500, height: 1000 } });

// ── helpers ────────────────────────────────────────────────────────────────────

const galleryUrl = (kind: string, profile: Profile, v: Variant) =>
  `/design-review?kind=${kind}&profile=${profile}&mode=${v.mode}&mobile=${v.mobile}`;
const scopeOf = (page: Page, profile: Profile) => page.locator(`[data-review-profile=${profile}]`);

/** Everything that must not happen while a scene is shown. `allow` whitelists expected console errors. */
function guard(page: Page, allow: RegExp[] = []): string[] {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !allow.some((re) => re.test(message.text()))) problems.push(`console: ${message.text()}`);
  });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (/^https?:$/.test(url.protocol) && !['localhost', '127.0.0.1'].includes(url.hostname)) {
      problems.push(`external request: ${request.url()}`);
    }
  });
  return problems;
}

async function fontsReady(page: Page) { await page.evaluate(async () => { await document.fonts.ready; }); }

/** A missing registration must not silently remove a component from coverage. */
async function requireScene(page: Page, kind: string) {
  await page.goto(`/design-review?kind=typography&profile=compact`);
  await expect(page.locator('[data-review-kind] option').first()).toBeAttached();
  const kinds = await page.locator('[data-review-kind] option').evaluateAll((list) =>
    list.map((option) => (option as HTMLOptionElement).value));
  expect(kinds, `scene "${kind}" is registered in library-scenes.ts`).toContain(kind);
}

async function openScene(page: Page, kind: string, profile: Profile, v: Variant, ready: string) {
  await page.clock.setSystemTime(new Date(CLOCK));
  await page.goto(galleryUrl(kind, profile, v));
  const scope = scopeOf(page, profile);
  await expect(scope.locator(ready).first()).toBeVisible({ timeout: 20_000 });
  await fontsReady(page);
  return scope;
}

/** Numeric value of a custom property (px) as resolved on `scope`. */
async function rolePx(scope: Locator, token: string): Promise<number> {
  return parseFloat(await scope.evaluate((el, name) => getComputedStyle(el).getPropertyValue(name), token));
}

/** A colour role resolved in the context of `scope` (browser-serialised, `light-dark()`/oklch safe). */
async function roleColor(scope: Locator, token: string): Promise<string> {
  return scope.evaluate((el, name) => {
    const probe = document.createElement('span');
    probe.style.color = `var(${name})`;
    el.appendChild(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, token);
}

/** Waits until a numeric reading stops changing (Leaflet's zoom animation has ended). */
async function settled(read: () => Promise<number>) {
  let last = NaN;
  await expect.poll(async () => { const now = await read(); const same = Math.abs(now - last) < 0.5; last = now; return same; }, { timeout: 4_000 }).toBe(true);
}

const css = (locator: Locator, prop: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);
const px = async (locator: Locator, prop: string) => parseFloat(await css(locator, prop));
const box = async (locator: Locator) => (await locator.boundingBox())!;

/** Compact promise: hard floor. The legacy presentation only records an observation. */
function gate(profile: Profile, message: string, actual: number, min: number) {
  if (profile === 'legacy') {
    test.info().annotations.push({ type: 'legacy-observation', description: `${message}: ${Math.round(actual * 100) / 100} (floor ${min} not enforced)` });
    return;
  }
  expect.soft(actual, message).toBeGreaterThanOrEqual(min);
}
function observe(message: string, value: unknown) {
  test.info().annotations.push({ type: 'legacy-observation', description: `${message}: ${JSON.stringify(value)}` });
}

/** The overlay host an element lives in carries the profile, the scheme and the mobile marker of its area. */
async function expectProfileHost(locator: Locator, v: Variant, profile: Profile) {
  const classes = await locator.evaluate((el) => [...(el.closest('.coar-overlay-host')?.classList ?? [])]);
  if (profile === 'compact') {
    expect(classes, 'host classes').toContain('coar-compact');
    expect(classes).toContain(`${v.mode}-mode`);
    expect(classes.includes('coar-mobile'), 'host mobile marker').toBe(v.mobile);
  } else {
    expect(classes).not.toContain('coar-compact');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// [registered] scenes: map, map-editor, document-viewer-pdf
// ═══════════════════════════════════════════════════════════════════════════════

for (const v of VARIANTS) {
  for (const profile of ['legacy', 'compact'] as Profile[]) {
    test(`[registered] map: tooltip, popup, zoom and pin target (${profile}, ${v.name})`, async ({ page }) => {
      const problems = guard(page);
      const scope = await openScene(page, 'map', profile, v, '.leaflet-marker-icon');
      const pins = scope.locator('.leaflet-marker-icon');
      await expect(pins).toHaveCount(4);
      await expect(scope.locator('.leaflet-tile')).toHaveCount(0);
      const ui = profile === 'compact' ? await rolePx(scope, '--coar-ui-font-size') : 0;

      // Tooltip by hover (label of the point).
      await pins.first().hover();
      const tooltip = scope.locator('.leaflet-tooltip');
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toHaveText('Westminster');
      const tooltipFont = await px(tooltip, 'font-size');
      if (profile === 'compact') {
        expect(tooltipFont, 'tooltip font = ui role').toBe(ui);
        expect(await css(tooltip, 'background-color'), 'tooltip surface').toBe(await roleColor(scope, '--coar-background-neutral-primary'));
        expect(await css(tooltip, 'color'), 'tooltip text').toBe(await roleColor(scope, '--coar-text-neutral-primary'));
        expect(await px(tooltip, 'border-radius'), 'tooltip radius = control role').toBe(await rolePx(scope, '--coar-control-radius'));
      } else {
        expect(tooltipFont, 'legacy tooltip keeps Leaflet default').toBe(12);
        observe('legacy tooltip surface/text', [await css(tooltip, 'background-color'), await css(tooltip, 'color')]);
      }
      await page.mouse.move(5, 5);
      await expect(tooltip).toHaveCount(0);

      // Popup by click: label + note, inside the map, closable.
      await pins.first().click();
      const popup = scope.locator('.leaflet-popup');
      await expect(popup).toBeVisible();
      await expect(popup).toContainText('Westminster');
      await expect(popup.locator('.coar-map-popup__note')).toHaveText('Start at the bridge');
      const wrapper = popup.locator('.leaflet-popup-content-wrapper');
      const canvasBox = await box(scope.locator('.coar-map__canvas'));
      const wb = await box(wrapper);
      expect(wb.x).toBeGreaterThanOrEqual(canvasBox.x - 1);
      expect(wb.x + wb.width).toBeLessThanOrEqual(canvasBox.x + canvasBox.width + 1);
      if (profile === 'compact') {
        expect(await css(wrapper, 'background-color'), 'popup surface').toBe(await roleColor(scope, '--coar-background-neutral-primary'));
        expect(await px(wrapper, 'border-radius'), 'popup radius = panel role').toBe(await rolePx(scope, '--coar-panel-radius'));
        expect(await px(popup.locator('.leaflet-popup-content'), 'font-size'), 'popup text = ui role').toBe(ui);
        expect(await px(popup.locator('.coar-map-popup__note'), 'font-size')).toBe(ui);
        // The popup tip takes the surface too (no white wedge in dark).
        expect(await css(popup.locator('.leaflet-popup-tip'), 'background-color')).toBe(await roleColor(scope, '--coar-background-neutral-primary'));
      } else {
        expect(await px(wrapper, 'border-radius'), 'legacy popup keeps Leaflet radius').toBe(12);
        observe('legacy popup surface/text', [await css(wrapper, 'background-color'), await css(wrapper, 'color')]);
      }
      await popup.locator('.leaflet-popup-close-button').click();
      await expect(popup).toHaveCount(0);

      // Zoom buttons: touch size in compact mobile; the map really zooms in and back out.
      const zoomIn = scope.locator('.leaflet-control-zoom-in');
      const zoomOut = scope.locator('.leaflet-control-zoom-out');
      const zb = await box(zoomIn);
      if (profile === 'compact') expect.soft(zb.width, 'zoom button width').toBeGreaterThanOrEqual(v.mobile ? 44 : 30);
      else expect(zb.width, 'legacy zoom button keeps Leaflet size').toBe(30);
      const spread = async () => {
        const a = await box(pins.first());
        const b = await box(pins.nth(3));
        return Math.hypot(a.x - b.x, a.y - b.y);
      };
      const before = await spread();
      await zoomIn.click();
      await expect.poll(spread, { timeout: 4_000 }).toBeGreaterThan(before * 1.5);
      await settled(spread);
      await zoomOut.click();
      await expect.poll(async () => Math.abs((await spread()) - before), { timeout: 4_000 }).toBeLessThan(3);

      // Spatial pins keep real hit geometry; invisible halos can steal a
      // neighbouring marker's centre (covered by the editor regression below).
      const pin = await pins.first().evaluate((el) => {
        const r = el.getBoundingClientRect();
        const b = getComputedStyle(el, '::before');
        return { w: r.width, h: r.height, beforeContent: b.content };
      });
      expect(pin.w).toBe(26);
      expect(pin.h).toBe(26);
      expect(pin.beforeContent, 'no invisible enlarged marker target').toBe('none');
      expect(problems).toEqual([]);
    });
  }

  test(`[registered] map editor: property popup form (${v.name})`, async ({ page }) => {
    const problems = guard(page);
    const scope = await openScene(page, 'map-editor', 'compact', v, '.leaflet-marker-icon');
    const popup = scope.locator('.coar-map-edit-popup');
    await expect(popup).toBeVisible();
    const canvasBox = await box(scope.locator('.coar-map__canvas'));
    const pb = await box(popup);
    expect(pb.x, 'popup inside the map (left)').toBeGreaterThanOrEqual(canvasBox.x - 1);
    expect(pb.x + pb.width, 'popup inside the map (right)').toBeLessThanOrEqual(canvasBox.x + canvasBox.width + 1);
    const label = scope.getByLabel('Label', { exact: true });
    await expect(label).toHaveValue('British Museum');
    // Fields are ui `s` fields: the frame follows the shared control role (desktop keeps the library's 30px, 44px mobile).
    const sRole = await rolePx(scope, '--coar-control-s-height'); // defined by the mobile floor only
    const sHeight = Number.isNaN(sRole) ? 30 : sRole;
    expect(sHeight).toBe(v.mobile ? 44 : 30);
    const fieldBox = await box(label.locator('xpath=ancestor::*[contains(@class,"coar-input-frame")][1]'));
    expect.soft(fieldBox.height, 'point form field height').toBe(sHeight);
    expect(await px(label, 'font-size'), 'small field text retains the mobile floor').toBe(v.mobile ? 16 : 13);
    await label.fill('British Museum — Nordeingang');
    await expect(label).toHaveValue('British Museum — Nordeingang');
    // The reorder/delete controls exist and meet the target role.
    for (const name of ['Move earlier', 'Move later']) {
      const button = scope.getByRole('button', { name });
      await expect(button).toBeVisible();
      expect.soft((await box(button)).height, `${name} height`).toBeGreaterThanOrEqual(v.mobile ? 44 : 32);
    }
    // The close button is a real target (the scene does not bind `selected`, so closing is driven in `map-points`).
    const close = popup.locator('.coar-map-edit-popup__close button');
    await expect(close).toBeVisible();
    expect.soft((await box(close)).height, 'popup close button height').toBeGreaterThanOrEqual(v.mobile ? 44 : 24);
    expect(problems).toEqual([]);
  });

  test(`[registered] document viewer: search bar and toolbar inputs (${v.name})`, async ({ page }) => {
    const problems = guard(page);
    for (const profile of ['legacy', 'compact'] as Profile[]) {
      const scope = await openScene(page, 'document-viewer-pdf', profile, v, '.coar-pdf-viewer canvas');
      await expect(scope).toContainText('Quarterly report');
      const viewer = scope.locator('.coar-pdf-viewer');
      const inputRole = profile === 'compact' ? await rolePx(viewer, '--coar-document-viewer-input-height') : 0;
      const targetRole = profile === 'compact' ? await rolePx(viewer, '--coar-document-viewer-target-size') : 0;

      // Toolbar inputs: no iOS focus zoom in compact mobile (>= 16px), at least the input-height role.
      for (const sel of ['.coar-pdf-toolbar__page-input', '.coar-pdf-toolbar__zoom-input']) {
        const input = scope.locator(sel);
        const font = await px(input, 'font-size');
        if (profile === 'compact') {
          expect(font, `${sel} font`).toBeGreaterThanOrEqual(v.mobile ? 16 : 13);
          expect.soft((await box(input)).height, `${sel} complete field height`).toBe(inputRole);
          if (v.mobile) expect((await box(input)).height, `${sel} touch target`).toBeGreaterThanOrEqual(44);
        } else {
          observe(`legacy ${sel} font/height`, [font, (await box(input)).height]);
        }
      }

      // Search: open from the toolbar, find, navigate, no match, Escape.
      await scope.locator('.coar-pdf-toolbar .coar-sidebar-item', { hasText: 'Search' }).first().click();
      const bar = scope.locator('.coar-pdf-searchbar');
      await expect(bar).toBeVisible();
      const input = bar.locator('.coar-pdf-searchbar__input');
      await expect(input).toBeFocused();
      await input.fill('budget');
      await expect(bar.locator('.coar-pdf-searchbar__count')).toHaveText('1 of 1');
      const hit = scope.locator('.coar-pdf-search-rect--current');
      await expect(hit).toHaveCount(1);
      await expect(hit).toBeVisible();
      const hitBox = await box(hit);
      const pageBox = await box(scope.locator('.coar-pdf-viewer__pages canvas').first());
      expect(hitBox.x).toBeGreaterThanOrEqual(pageBox.x - 1);
      expect(hitBox.x + hitBox.width).toBeLessThanOrEqual(pageBox.x + pageBox.width + 1);
      await input.press('Enter');
      await expect(bar.locator('.coar-pdf-searchbar__count')).toHaveText('1 of 1');
      await input.press('Shift+Enter');
      await expect(bar.locator('.coar-pdf-searchbar__count')).toHaveText('1 of 1');
      const inputFont = await px(input, 'font-size');
      const inputHeight = (await box(input)).height;
      const buttons = bar.locator('.coar-pdf-searchbar__btn');
      expect(await buttons.count()).toBeGreaterThanOrEqual(3);
      if (profile === 'compact') {
        expect(inputFont, 'search input font').toBeGreaterThanOrEqual(v.mobile ? 16 : 13);
        expect.soft(inputHeight, 'search input height = role').toBe(inputRole);
        for (let i = 0; i < (await buttons.count()); i++) {
          expect.soft((await box(buttons.nth(i))).height, `search button ${i} height`).toBeGreaterThanOrEqual(targetRole);
        }
      } else {
        observe('legacy search input font/height', [inputFont, inputHeight]);
      }
      await input.fill('zzzz-no-match');
      await expect(scope.locator('.coar-pdf-search-rect')).toHaveCount(0);
      const none = await bar.locator('.coar-pdf-searchbar__count').innerText();
      observe('no-match count text', none);
      await input.press('Escape');
      await expect(bar).toHaveCount(0);
      await expect(scope.locator('.coar-pdf-search-rect')).toHaveCount(0);
    }
    expect(problems).toEqual([]);
  });

  test(`[registered] document viewer: marker flyout by hover (${v.name})`, async ({ page }) => {
    const problems = guard(page);
    const scope = await openScene(page, 'document-viewer-pdf', 'compact', v, '.coar-pdf-viewer canvas');
    const viewer = scope.locator('.coar-pdf-viewer');
    const target = await rolePx(viewer, '--coar-document-viewer-target-size');
    // The swatch role exists only for touch (32px); the desktop swatch keeps the library's 22px.
    const swatchRole = await rolePx(viewer, '--coar-document-viewer-swatch-size');
    const swatch = Number.isNaN(swatchRole) ? 22 : swatchRole;
    const group = scope.locator('.coar-pdf-toolbar .coar-sidebar-group', { hasText: 'Marker' }).first();
    await group.hover();
    const flyout = page.locator('.coar-pdf-toolbar__flyout');
    await expect(flyout).toBeVisible();
    const widths = flyout.locator('.coar-pdf-toolbar__flyout-width');
    const colors = flyout.locator('.coar-pdf-toolbar__flyout-color');
    expect(await widths.count()).toBeGreaterThanOrEqual(2);
    expect(await colors.count()).toBeGreaterThanOrEqual(5);
    for (let i = 0; i < (await widths.count()); i++) {
      expect.soft((await box(widths.nth(i))).height, `width preset ${i}`).toBeGreaterThanOrEqual(target);
    }
    for (let i = 0; i < (await colors.count()); i++) {
      const b = await box(colors.nth(i));
      expect.soft(b.width, `swatch ${i} width`).toBe(swatch);
      expect.soft(b.height, `swatch ${i} height`).toBe(swatch);
    }
    // Choosing a width and a colour changes the pressed/checked state.
    const secondWidth = widths.nth(1);
    await secondWidth.click();
    await expect(secondWidth).toHaveAttribute('aria-pressed', 'true');
    const secondColor = colors.nth(1);
    await secondColor.click();
    await expect(secondColor).toHaveAttribute('aria-checked', 'true');
    // The flyout is hover-only (documented touch limitation): recorded, not asserted.
    test.info().annotations.push({ type: 'touch-limit', description: 'toolbar flyouts open on hover only (documented device limit)' });
    await page.mouse.move(5, 5);
    await expect(flyout).toHaveCount(0);
    expect(problems).toEqual([]);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// [draft-scene] data-grid-editors: every cell editor, opened and committed for real
// ═══════════════════════════════════════════════════════════════════════════════

const cell = (scope: Locator, row: number, col: string) =>
  scope.locator(`.ag-row[row-index="${row}"] .ag-cell[col-id="${col}"]`);
const EDITING = '.ag-cell-inline-editing, .ag-cell.ag-cell-editing';

/** Commit like a user: Tab, falling back to a click on another cell (popup editors keep focus in their trigger). */
async function commit(page: Page, scope: Locator) {
  await page.keyboard.press('Tab');
  if (await scope.locator(EDITING).count()) await cell(scope, 1, 'name').click({ position: { x: 4, y: 4 } });
  await expect(scope.locator(EDITING)).toHaveCount(0);
}

/** Tab continues editing in the next cell; finish that separate edit with real input. */
async function endFollowingEdit(page: Page, scope: Locator) {
  for (let i = 0; i < 2 && (await scope.locator(EDITING).count()) > 0; i++) {
    await page.keyboard.press('Escape');
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  }
  if ((await scope.locator(EDITING).count()) > 0) {
    test.info().annotations.push({ type: 'observation', description: 'Escape did not end the following picker edit; clicking another cell ends it' });
    await cell(scope, 1, 'name').click({ position: { x: 4, y: 4 } });
  }
  await expect(scope.locator(EDITING)).toHaveCount(0);
}

const PICKER_BUTTON = { due: '.coar-plain-date-picker-btn', start: '.coar-pdtp-btn', meeting: '.coar-zdtp-btn' } as const;

/** The editor sits inside its cell (no overflow of the cell frame) and fits the row. */
async function expectInsideCell(editor: Locator, cellBox: Locator, label: string) {
  const e = await box(editor);
  const c = await box(cellBox);
  expect.soft(e.x, `${label} left`).toBeGreaterThanOrEqual(c.x - 1);
  expect.soft(e.x + e.width, `${label} right`).toBeLessThanOrEqual(c.x + c.width + 1);
  expect.soft(e.height, `${label} height`).toBeLessThanOrEqual(c.height + 1);
}

for (const v of VARIANTS) {
  test(`[draft-scene] grid editors: text (+ locked row) and number (${v.name})`, async ({ page }) => {
    await requireScene(page, 'data-grid-editors');
    const problems = guard(page);
    const scope = await openScene(page, 'data-grid-editors', 'compact', v, '.ag-row');
    const field = v.mobile ? 16 : 13; // Cell editors use size="s".
    const changes = scope.locator('[data-scene-part=changes]');

    const name = cell(scope, 0, 'name');
    await name.dblclick();
    const text = scope.locator('.coar-text-cell-editor input');
    await expect(text).toBeVisible();
    await expect(text).toBeFocused();
    await expectInsideCell(scope.locator('.coar-text-cell-editor'), name, 'text editor');
    expect(await px(text, 'font-size'), 'small text editor font (16px on touch: no iOS zoom)').toBe(field);
    await text.fill('Alpine');
    await text.press('Enter');
    await expect(scope.locator(EDITING)).toHaveCount(0);
    await expect(name).toHaveText('Alpine');
    await expect(changes).toContainText('name=Alpine');

    // Escape cancels: no change line, old value stays.
    await name.dblclick();
    await scope.locator('.coar-text-cell-editor input').fill('discarded');
    await page.keyboard.press('Escape');
    await expect(name).toHaveText('Alpine');
    await expect(changes).not.toContainText('discarded');

    // The predicate refuses the locked row.
    await cell(scope, 2, 'name').dblclick();
    await expect(scope.locator(EDITING)).toHaveCount(0);

    const qty = cell(scope, 0, 'qty');
    await qty.dblclick();
    const number = scope.locator('.coar-number-cell-editor input');
    await expect(number).toBeVisible();
    await expectInsideCell(scope.locator('.coar-number-cell-editor'), qty, 'number editor');
    expect(await px(number, 'font-size')).toBe(field);
    await number.fill('12');
    // Number input commits its typed value on blur; Tab moves editing on.
    await number.press('Tab');
    await expect(qty).not.toHaveClass(/ag-cell-inline-editing/);
    await endFollowingEdit(page, scope);
    await expect(qty).toContainText('12');
    await expect(changes).toContainText('qty=12');
    // Over the max (99): record what the editor does, do not assert a product rule the docs do not give.
    await qty.dblclick();
    await scope.locator('.coar-number-cell-editor input').fill('150');
    await page.keyboard.press('Tab');
    await expect(qty).not.toHaveClass(/ag-cell-inline-editing/);
    await endFollowingEdit(page, scope);
    test.info().annotations.push({ type: 'observation', description: `qty after typing 150 (max 99), Tab: "${(await qty.innerText()).trim()}"` });
    expect(problems).toEqual([]);
  });

  test(`[draft-scene] grid editors: checkbox (${v.name})`, async ({ page }) => {
    await requireScene(page, 'data-grid-editors');
    const problems = guard(page);
    const scope = await openScene(page, 'data-grid-editors', 'compact', v, '.ag-row');
    const active = cell(scope, 0, 'active');
    await active.dblclick();
    const input = scope.locator('.coar-checkbox-cell-editor input[type=checkbox]');
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
    await expect(input).toBeChecked();
    await expectInsideCell(scope.locator('.coar-checkbox-cell-editor'), active, 'checkbox editor');
    await page.keyboard.press('Space');
    await expect(input).not.toBeChecked();
    await page.keyboard.press('Enter');
    await expect(scope.locator(EDITING)).toHaveCount(0);
    await expect(scope.locator('[data-scene-part=changes]')).toContainText('active=false');
    // Touch floor of the row: the checkbox centre is inside a cell at least the interactive row high.
    expect.soft((await box(scope.locator('.ag-row[row-index="0"]'))).height, 'row height').toBe(await rolePx(scope, '--coar-interactive-row-height'));
    expect(problems).toEqual([]);
  });

  for (const profile of ['legacy', 'compact'] as Profile[]) {
    test(`[draft-scene] grid editors: select dropdown (${profile}, ${v.name})`, async ({ page }) => {
      await requireScene(page, 'data-grid-editors');
      const problems = guard(page);
      const scope = await openScene(page, 'data-grid-editors', profile, v, '.ag-row');
      await cell(scope, 0, 'status').dblclick();
      const option = page.locator('.coar-overlay-host .coar-select-option').filter({ hasText: 'Done' });
      await expect(option).toBeVisible();
      await expectProfileHost(option, v, profile);
      if (profile === 'compact') {
        expect(await px(option, 'font-size'), 'option = ui role').toBe(await rolePx(scope, '--coar-ui-font-size'));
        expect((await box(option)).height, 'option row = interactive row role').toBe(await rolePx(scope, '--coar-interactive-row-height'));
      } else observe('legacy option height', (await box(option)).height);
      const viewport = page.viewportSize()!;
      const ob = await box(option);
      expect(ob.x + ob.width).toBeLessThanOrEqual(viewport.width);
      expect(ob.y + ob.height).toBeLessThanOrEqual(viewport.height);
      await option.click();
      await expect(scope.locator(EDITING)).toHaveCount(0);
      await expect(cell(scope, 0, 'status')).toHaveText('Done');
      await expect(scope.locator('[data-scene-part=changes]')).toContainText('status=done');
      expect(problems).toEqual([]);
    });
  }

  test(`[draft-scene] grid editors: multi-select and tag-select (${v.name})`, async ({ page }) => {
    await requireScene(page, 'data-grid-editors');
    const problems = guard(page);
    const scope = await openScene(page, 'data-grid-editors', 'compact', v, '.ag-row');
    const changes = scope.locator('[data-scene-part=changes]');

    await cell(scope, 0, 'tags').dblclick();
    const remote = page.locator('.coar-overlay-host .coar-select-option').filter({ hasText: 'Remote' });
    await expect(remote).toBeVisible();
    await expectProfileHost(remote, v, 'compact');
    expect((await box(remote)).height, 'option row').toBe(await rolePx(scope, '--coar-interactive-row-height'));
    await expect(remote).toHaveAttribute('aria-selected', 'false');
    await remote.click();
    await expect(remote).toHaveAttribute('aria-selected', 'true'); // the dropdown stays open while toggling
    await commit(page, scope);
    await expect(changes).toContainText('tags=priority|remote');

    await cell(scope, 0, 'labels').dblclick();
    const input = scope.locator('.coar-tag-select-input');
    await expect(input).toBeVisible();
    await input.fill('Violet');
    await input.press('Enter');
    await commit(page, scope);
    // allowCreate: the created tag is committed with the existing ones. Soft: the exact format is the editor's.
    await expect.soft(changes).toContainText('labels=red|Violet');
    expect(problems).toEqual([]);
  });

  for (const [col, panelKind, expectedLine] of [
    ['due', 'plain date', 'due=2026-03-17'],
    ['start', 'plain date-time', 'start=2026-03-17T09:30:00'],
    ['meeting', 'zoned date-time', 'meeting=2026-03-17T09:30:00+01:00[Europe/Vienna]'],
  ] as const) {
    for (const profile of col === 'meeting' ? (['compact'] as Profile[]) : (['legacy', 'compact'] as Profile[])) {
      test(`[draft-scene] grid editors: ${panelKind} picker panel (${profile}, ${v.name})`, async ({ page }) => {
        await requireScene(page, 'data-grid-editors');
        const problems = guard(page);
        const scope = await openScene(page, 'data-grid-editors', profile, v, '.ag-row');
        const target = cell(scope, 0, col);
        await target.dblclick();
        await expectInsideCell(scope.locator(`.coar-${panelKind.replace(/ /g, '-').replace('plain-date-time', 'plain-date-time')}-cell-editor`), target, `${panelKind} editor`);
        // Enter commits the grid cell; the actual calendar button opens the picker.
        await scope.locator(`.coar-${panelKind.replace(/ /g, '-')}-cell-editor ${PICKER_BUTTON[col]}`).click();
        const months = page.locator('.coar-overlay-host .coar-scrollable-calendar__months-wrapper--ready');
        await expect(months).toBeVisible({ timeout: 10_000 });
        const month = page.locator('.coar-overlay-host .coar-scrollable-calendar__month')
          .filter({ has: page.locator('.coar-scrollable-calendar__day--selected:not(.coar-scrollable-calendar__day--outside)') }).first();
        const day = month.locator('.coar-scrollable-calendar__day:not(.coar-scrollable-calendar__day--outside)', { hasText: /^17$/ }).first();
        await expect(day).toBeVisible();
        await expectProfileHost(day, v, profile);
        if (profile === 'compact') {
          expect((await box(day)).height, 'day cell >= picker day role').toBeGreaterThanOrEqual(await rolePx(scope, '--coar-picker-day-min-height'));
          expect(await px(day, 'font-size'), 'day text = ui role').toBe(await rolePx(scope, '--coar-ui-font-size'));
        } else observe(`legacy ${panelKind} day size`, await box(day));
        const panel = await box(page.locator('.coar-overlay-host').filter({ has: page.locator('.coar-scrollable-calendar__months-wrapper--ready') }).first());
        const viewport = page.viewportSize()!;
        expect(panel.x + panel.width, 'panel right edge').toBeLessThanOrEqual(viewport.width);
        expect(panel.y + panel.height, 'panel bottom edge').toBeLessThanOrEqual(viewport.height);
        await day.click();
        await page.keyboard.press('Escape');
        await expect(months).toHaveCount(0);
        await expect(scope.locator(EDITING)).toHaveCount(1);
        await page.keyboard.press('Tab');
        await expect(target).not.toHaveClass(/ag-cell-inline-editing/);
        await endFollowingEdit(page, scope);
        await expect(scope.locator('[data-scene-part=changes]')).toContainText(expectedLine);
        expect(problems).toEqual([]);
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// [draft-scene] data-grid-states: pagination, filter popup / column menu, loading, empty
// ═══════════════════════════════════════════════════════════════════════════════

for (const v of VARIANTS) {
  test(`[draft-scene] grid states: pagination (${v.name})`, async ({ page }) => {
    await requireScene(page, 'data-grid-states');
    const problems = guard(page);
    const scope = await openScene(page, 'data-grid-states', 'compact', v, '[data-scene-part=paged] .ag-row');
    const paged = scope.locator('[data-scene-part=paged]');
    const rows = paged.locator('.ag-center-cols-container .ag-row');
    await expect(rows).toHaveCount(5);
    const panel = paged.locator('.ag-paging-panel');
    await expect(panel).toBeVisible();
    await expect(paged.locator('.ag-paging-row-summary-panel')).toContainText(/1.*5.*12/);
    await expect(paged.locator('.ag-center-cols-container .ag-row').first()).toContainText('Alpha');
    await paged.getByRole('button', { name: /next page/i }).click();
    await expect(paged.locator('.ag-center-cols-container .ag-row').first()).toContainText('Foxtrot');
    await paged.getByRole('button', { name: /last page/i }).click();
    await expect(rows).toHaveCount(2);
    await expect(paged.getByRole('button', { name: /next page/i })).toBeDisabled();
    await paged.getByRole('button', { name: /first page/i }).click();
    await expect(paged.locator('.ag-center-cols-container .ag-row').first()).toContainText('Alpha');
    await expect(paged.locator('.ag-paging-page-size')).toBeVisible();
    // Design numbers (soft: AG Grid draws this panel from the adapter's live variables only).
    const cellFont = await px(paged.locator('.ag-cell').first(), 'font-size');
    expect.soft(await px(panel, 'font-size'), 'paging font = cell font').toBe(cellFont);
    expect.soft((await box(panel)).height, 'paging panel height >= interactive row').toBeGreaterThanOrEqual(await rolePx(scope, '--coar-interactive-row-height'));
    const buttons = paged.locator('.ag-paging-button');
    for (let i = 0; i < (await buttons.count()); i++) {
      const b = await box(buttons.nth(i));
      test.info().annotations.push({ type: 'touch-census', description: `paging button ${i}: ${Math.round(b.width)}x${Math.round(b.height)}` });
    }
    expect(problems).toEqual([]);
  });

  test(`[draft-scene] grid states: floating filter popup and column menu (${v.name})`, async ({ page }) => {
    await requireScene(page, 'data-grid-states');
    const problems = guard(page);
    const scope = await openScene(page, 'data-grid-states', 'compact', v, '[data-scene-part=paged] .ag-row');
    const paged = scope.locator('[data-scene-part=paged]');
    const rows = paged.locator('.ag-center-cols-container .ag-row');
    const floating = paged.locator('.ag-floating-filter input').first();
    await floating.fill('Lima');
    await expect(rows).toHaveCount(1);
    await floating.fill('');
    await expect(rows).toHaveCount(5);

    // The popup behind the floating-filter button: inside the grid root (so it carries the profile) and the viewport.
    await paged.locator('.ag-floating-filter-button-button').first().click();
    const popup = page.locator('.ag-popup .ag-filter, .ag-filter').first();
    await expect(popup).toBeVisible();
    expect(await popup.evaluate((el) => !!el.closest('.coar-compact')), 'popup inside the compact area').toBe(true);
    const vb = page.viewportSize()!;
    const pb = await box(popup);
    expect(pb.x + pb.width).toBeLessThanOrEqual(vb.width);
    expect(pb.y + pb.height).toBeLessThanOrEqual(vb.height);
    const shell = popup.locator('xpath=ancestor::*[contains(@class,"ag-menu")][1]');
    expect.soft(await css(shell, 'color-scheme'), 'popup color-scheme follows the grid').toBe(v.mode);
    expect.soft(await css(shell, 'background-color'), 'popup surface').toBe(await roleColor(scope, '--coar-background-neutral-primary'));
    expect.soft(await px(popup, 'font-size'), 'popup text = ui role').toBe(await rolePx(scope, '--coar-ui-font-size'));
    await page.keyboard.press('Escape');
    await expect(popup).toHaveCount(0);

    // Column menu: AG Grid Community's menu is the filter popup. With the library header there is no header menu
    // button and a header right click opens nothing (FilterMenuFactory.showMenuAfterContextMenuEvent is empty),
    // so the scene calls the public `api.showColumnMenu`.
    await paged.locator('[role=columnheader][col-id=name]').click({ button: 'right' });
    await expect(page.locator('.ag-menu')).toHaveCount(0);
    await scope.locator('[data-scene-action=column-menu]').click();
    const menu = page.locator('.ag-menu, .ag-popup .ag-filter').first();
    await expect(menu).toBeVisible();
    expect(await menu.evaluate((el) => !!el.closest('.coar-compact'))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test(`[draft-scene] grid states: loading and empty overlays (${v.name})`, async ({ page }) => {
    await requireScene(page, 'data-grid-states');
    const problems = guard(page);
    const scope = await openScene(page, 'data-grid-states', 'compact', v, '[data-scene-part=paged] .ag-row');
    const loading = scope.locator('[data-scene-part=loading]');
    const loadingOverlay = loading.locator('.ag-overlay-loading-center');
    await expect(loadingOverlay).toBeVisible();
    await expect(loading.locator('.ag-row')).toHaveCount(0);
    const gridBox = await box(loading.locator('.ag-root-wrapper'));
    const lb = await box(loadingOverlay);
    expect(lb.x).toBeGreaterThanOrEqual(gridBox.x - 1);
    expect(lb.x + lb.width).toBeLessThanOrEqual(gridBox.x + gridBox.width + 1);
    expect(lb.y + lb.height).toBeLessThanOrEqual(gridBox.y + gridBox.height + 1);
    expect.soft(await px(loadingOverlay, 'font-size'), 'loading text = ui role').toBe(await rolePx(scope, '--coar-ui-font-size'));

    const empty = scope.locator('[data-scene-part=empty]');
    const noRows = empty.locator('.ag-overlay-no-rows-center');
    await expect(noRows).toBeVisible();
    await expect(noRows).toContainText(/no rows/i);
    expect.soft(await px(noRows, 'font-size'), 'empty text = ui role').toBe(await rolePx(scope, '--coar-ui-font-size'));
    expect.soft(await css(noRows, 'color'), 'empty text is not the surface colour').not.toBe(await roleColor(scope, '--coar-background-neutral-primary'));
    expect(problems).toEqual([]);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// [draft-scene] document-viewer-states: outline sidebar, two-match search, error card
// ═══════════════════════════════════════════════════════════════════════════════

for (const v of VARIANTS) {
  test(`[draft-scene] viewer: outline sidebar and two-match search (${v.name})`, async ({ page }) => {
    await requireScene(page, 'document-viewer-states');
    const problems = guard(page);
    const scope = await openScene(page, 'document-viewer-states', 'compact', v, '[data-scene-part=outline] .coar-pdf-viewer__pages canvas');
    const viewer = scope.locator('[data-scene-part=outline]');
    const target = await rolePx(viewer.locator('.coar-pdf-viewer'), '--coar-document-viewer-target-size');
    const rowRole = await rolePx(scope, '--coar-interactive-row-height');

    const tabs = viewer.locator('.coar-pdf-sidebar__tab');
    await expect(tabs).toHaveCount(2);
    for (let i = 0; i < 2; i++) expect.soft((await box(tabs.nth(i))).height, `sidebar tab ${i}`).toBeGreaterThanOrEqual(target);
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    const links = viewer.locator('.coar-pdf-sidebar__outline-link');
    await expect(links).toHaveCount(5);
    await expect(links.nth(0)).toHaveText('Chapter 1: Overview');
    const indent = (i: number) => px(links.nth(i), 'padding-left');
    expect(await indent(1), 'nested outline entry is indented').toBeGreaterThan(await indent(0));
    expect(await indent(3)).toBe(await indent(1));
    for (let i = 0; i < 5; i++) expect.soft((await box(links.nth(i))).height, `outline row ${i}`).toBeGreaterThanOrEqual(rowRole);
    await links.nth(2).click(); // Chapter 2 -> page 2
    await expect(viewer.locator('.coar-pdf-toolbar__page-input')).toHaveValue('2');
    // Back to thumbnails.
    await tabs.nth(0).click();
    await expect(viewer.locator('.coar-pdf-sidebar__thumb').first()).toBeVisible();

    // Search: "budget" is on pages 1 and 2.
    await viewer.locator('.coar-pdf-toolbar .coar-sidebar-item', { hasText: 'Search' }).first().click();
    const input = viewer.locator('.coar-pdf-searchbar__input');
    await input.fill('budget');
    const count = viewer.locator('.coar-pdf-searchbar__count');
    await expect(count).toHaveText('1 of 2');
    await input.press('Enter');
    await expect(count).toHaveText('2 of 2');
    await expect(viewer.locator('.coar-pdf-search-rect--current')).toHaveCount(1);
    await input.press('Shift+Enter');
    await expect(count).toHaveText('1 of 2');
    await input.press('Escape');
    await expect(viewer.locator('.coar-pdf-searchbar')).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test(`[draft-scene] viewer: error card and retry (${v.name})`, async ({ page }) => {
    await requireScene(page, 'document-viewer-states');
    // pdf.js may log the parse failure it reports through the `error` event; nothing else is tolerated.
    const problems = guard(page);
    const scope = await openScene(page, 'document-viewer-states', 'compact', v, '[data-scene-part=error] .coar-pdf-viewer__error-retry');
    const viewer = scope.locator('[data-scene-part=error]');
    const title = viewer.locator('.coar-pdf-viewer__error-title');
    await expect(title).toHaveText('Could not load the PDF.');
    const retry = viewer.locator('.coar-pdf-viewer__error-retry');
    const target = await rolePx(viewer.locator('.coar-pdf-viewer'), '--coar-document-viewer-target-size');
    expect.soft((await box(retry)).height, 'retry target').toBeGreaterThanOrEqual(target);
    expect.soft(await px(title, 'font-size'), 'error title = ui role').toBe(await rolePx(scope, '--coar-ui-font-size'));
    const card = await box(viewer.locator('.coar-pdf-viewer__error-body'));
    const frame = await box(viewer.locator('.coar-pdf-viewer'));
    expect(card.x).toBeGreaterThanOrEqual(frame.x);
    expect(card.x + card.width).toBeLessThanOrEqual(frame.x + frame.width + 1);
    const counter = scope.locator('[data-scene-part=error-count]');
    const before = Number(await counter.innerText());
    expect(before).toBeGreaterThanOrEqual(1);
    await retry.click();
    await expect(counter).not.toHaveText(String(before), { timeout: 10_000 }); // the retried load fails again and reports again
    await expect(title).toBeVisible();
    expect(problems).toEqual([]);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// [draft-scene] map-points: point list removal / reorder, map bridge, editor popup and drag
// ═══════════════════════════════════════════════════════════════════════════════

const ORDER = 'Westminster > Thames bend > Dishoom > British Museum > Hyde Park';

for (const v of VARIANTS) {
  test(`[draft-scene] map points: list removal, reorder and map bridge (${v.name})`, async ({ page }) => {
    await requireScene(page, 'map-points');
    const problems = guard(page);
    const scope = await openScene(page, 'map-points', 'compact', v, '[data-scene-part=map] .leaflet-marker-icon');
    const map = scope.locator('[data-scene-part=map]');
    const rows = scope.locator('.coar-map-point-list__row');
    const order = scope.locator('[data-scene-part=order]');
    await expect(rows).toHaveCount(5);
    await expect(order).toHaveText(ORDER);
    const target = await rolePx(scope, '--coar-control-min-target-size').then((n) => (Number.isNaN(n) ? 0 : n));

    // Bridge: activating a row pans, opens the Leaflet popup and selects the pin.
    await rows.nth(3).locator('.coar-map-point-list__main').click();
    await expect(map.locator('.leaflet-popup')).toContainText('British Museum');
    await expect(rows.nth(3)).toHaveClass(/selected/);
    await expect(map.locator('.coar-map-marker--selected')).toHaveCount(1);
    // Hover emphasis on a pin (and removal again on leave).
    await rows.nth(0).hover();
    await expect(map.locator('.coar-map-marker--highlight')).toHaveCount(1);
    await page.mouse.move(5, 5);
    await expect(map.locator('.coar-map-marker--highlight')).toHaveCount(0);

    // Targets: handle and delete button (>= the touch role in compact mobile).
    const handle = rows.nth(0).locator('.coar-map-point-list__handle');
    const del = rows.nth(0).locator('.coar-map-point-list__delete');
    expect.soft((await box(handle)).height, 'drag handle').toBeGreaterThanOrEqual(target);
    expect.soft((await box(del)).height, 'delete button').toBeGreaterThanOrEqual(target);

    // Reorder by dragging the handle of the first row onto the lower half of the third row.
    const dropRow = await box(rows.nth(2));
    await handle.dragTo(rows.nth(2), { targetPosition: { x: dropRow.width / 2, y: dropRow.height * 0.8 } });
    await expect(order).toHaveText('Thames bend > Dishoom > Westminster > British Museum > Hyde Park');

    // Removal: the row, the order line and the pin of the removed stop are gone.
    const pinsBefore = await map.locator('.leaflet-marker-icon').count();
    await rows.nth(1).locator('.coar-map-point-list__delete').click(); // Dishoom
    await expect(rows).toHaveCount(4);
    await expect(order).toHaveText('Thames bend > Westminster > British Museum > Hyde Park');
    await expect(map.locator('.leaflet-marker-icon')).toHaveCount(pinsBefore - 1);
    expect(problems).toEqual([]);
  });

  test(`[draft-scene] map points: editor popup, reorder, drag and delete (${v.name})`, async ({ page }) => {
    await requireScene(page, 'map-points');
    const problems = guard(page);
    const scope = await openScene(page, 'map-points', 'compact', v, '[data-scene-part=editor] .leaflet-marker-icon');
    const editor = scope.locator('[data-scene-part=editor]');
    const order = scope.locator('[data-scene-part=editor-order]');
    const coords = scope.locator('[data-scene-part=editor-coords]');
    const pins = editor.locator('.leaflet-marker-icon');
    await expect(order).toHaveText(ORDER);

    // Select the third stop (Dishoom): property popup with the point form.
    await expect(pins).toHaveCount(5);
    await editor.scrollIntoViewIfNeeded();
    await pins.nth(2).click();
    const popup = editor.locator('.coar-map-edit-popup');
    await expect(popup).toBeVisible();
    await expect(editor.getByLabel('Label', { exact: true })).toHaveValue('Dishoom');
    await editor.getByRole('button', { name: 'Move earlier' }).click();
    await expect(order).toHaveText('Westminster > Dishoom > Thames bend > British Museum > Hyde Park');
    await editor.getByRole('button', { name: 'Move later' }).click();
    await expect(order).toHaveText(ORDER);

    // Drag the selected pin: its coordinates change, the order does not.
    const beforeCoords = await coords.innerText();
    const pb = await box(pins.nth(2));
    await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
    await page.mouse.down();
    await page.mouse.move(pb.x + pb.width / 2 - 40, pb.y + pb.height / 2 - 30, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => coords.innerText()).not.toBe(beforeCoords);
    await expect(order).toHaveText(ORDER);

    // Escape deselects (popup gone); selecting again and pressing delete removes the stop.
    await page.keyboard.press('Escape');
    await expect(popup).toHaveCount(0);
    await pins.nth(2).click();
    await expect(popup).toBeVisible();
    const del = editor.locator('.coar-map-form__delete');
    expect.soft((await box(del)).height, 'delete button').toBeGreaterThanOrEqual(v.mobile ? 44 : 24);
    await del.click();
    await expect(order).toHaveText('Westminster > Thames bend > British Museum > Hyde Park');
    await expect(popup).toHaveCount(0);

    // A neighbouring vertex must not steal a pin's centre through an invisible
    // enlarged target, including under the compact mobile presentation.
    const vertex = await box(pins.nth(1));
    const museum = await box(pins.nth(2));
    await page.mouse.move(museum.x + museum.width / 2, museum.y + museum.height / 2);
    await page.mouse.down();
    await page.mouse.move(vertex.x + vertex.width / 2 + 14, vertex.y + vertex.height / 2 - 14, { steps: 10 });
    await page.mouse.up();
    const ownsCentre = await pins.nth(2).evaluate((element) => {
      const b = element.getBoundingClientRect();
      return document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)?.closest('.leaflet-marker-icon') === element;
    });
    expect(ownsCentre, 'the pin owns its centre beside a vertex').toBe(true);
    await pins.nth(2).click();
    await expect(editor.getByLabel('Label', { exact: true })).toHaveValue('British Museum');
    expect(problems).toEqual([]);
  });
}
