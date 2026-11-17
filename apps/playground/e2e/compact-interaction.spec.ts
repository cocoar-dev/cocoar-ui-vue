import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Interaction scenes of the compact profile (`src/visual/stories/compact-interaction-*.vue`),
 * loaded through the unmodified visual page (`/visual.html`) of the normal playground server.
 * The pixel baselines prove the look; this spec proves what they cannot: the real open panels
 * take the profile (fonts, roles, light/dark, mobile roles), state changes by pointer, keyboard
 * and touch, focus, and no page or console errors. `mode=mobile` is `.coar-mobile` on `<html>`
 * in desktop Chromium (class emulation), not a device; `@touch` tests run in Playwright's
 * WebKit too, which proves the engine and its touch events, not iOS gestures or keyboards.
 * Needs the `compact-interaction-*` entries of `src/visual/stories.json`; the ledger is
 * `src/design-review/audits/ui-interactions.md`.
 */

type Mode = 'default' | 'mobile';
type Scheme = 'light' | 'dark';
interface Variant { name: string; mode: Mode; scheme: Scheme }

const VARIANTS: Variant[] = [
  { name: 'light', mode: 'default', scheme: 'light' },
  { name: 'dark', mode: 'default', scheme: 'dark' },
  { name: 'mobile light', mode: 'mobile', scheme: 'light' },
  { name: 'mobile dark', mode: 'mobile', scheme: 'dark' },
];

/** The roles of `styles/tokens/compact.css`, desktop and with `.coar-mobile`. */
const ROLES = {
  default: { ui: 13, field: 14, fieldSmall: 13, caption: 12, row: 36, pickerAction: 32, pickerMonth: 32, timeStep: 28 },
  mobile: { ui: 14, field: 16, fieldSmall: 16, caption: 12, row: 44, pickerAction: 44, pickerMonth: 44, timeStep: 44 },
} as const;

const CLOCK = '2026-03-10T09:00:00Z';

/** Collects everything that must not happen while a scene is shown. */
function guard(page: Page): string[] {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  return problems;
}

async function scene(page: Page, name: string, v: Pick<Variant, 'mode' | 'scheme'>, clock?: string) {
  if (clock) await page.clock.setSystemTime(new Date(clock));
  // A new document per scene: a hash change alone keeps the previous scene's overlays.
  await page.goto('about:blank');
  await page.goto(`/visual.html#/visual/${name}?mode=${v.mode}&scheme=${v.scheme}`);
  await expect(page.locator('[data-visual-state]')).toHaveAttribute('data-visual-state', 'ready');
  await page.evaluate(async () => { await document.fonts.ready; });
  return page.locator('[data-visual-root] > .coar-compact');
}

interface TextStyle { family: string; size: number; weight: string; scheme: string }
async function textStyle(locator: Locator): Promise<TextStyle> {
  return locator.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      family: s.fontFamily.split(',')[0].trim().replace(/["']/g, ''),
      size: parseFloat(s.fontSize),
      weight: s.fontWeight,
      scheme: s.colorScheme,
    };
  });
}

const box = async (locator: Locator) => (await locator.boundingBox())!;

/** Waits until no animation runs in the page: geometry is measured settled, not mid-motion. */
async function settled(page: Page) {
  await expect.poll(() => page.evaluate(() =>
    // Only time-driven animations: OverlayScrollbars drives its handles by scroll timelines,
    // which stay "running" forever; endless indicators never settle and move no geometry.
    document.getAnimations().filter((a) => a.playState === 'running'
      && a.timeline instanceof DocumentTimeline
      && a.effect?.getComputedTiming().iterations !== Infinity).length)).toBe(0);
}

/** The classes of the overlay host a teleported element lives in. */
async function hostClasses(locator: Locator): Promise<string[]> {
  return locator.evaluate((el) => [...(el.closest('.coar-overlay-host')?.classList ?? [])]);
}

/** The host carries the profile and the scheme of the area that opened it. */
async function expectProfileHost(locator: Locator, scheme: Scheme) {
  const classes = await hostClasses(locator);
  expect(classes).toContain('coar-compact');
  expect(classes).toContain(`${scheme}-mode`);
  expect((await textStyle(locator)).scheme).toBe(scheme);
}

/**
 * Every element with own text in the scope is set in Inter, and every Inter weight it uses has
 * a loaded face: nothing is painted in a fallback or a synthesized weight.
 */
async function expectInter(scopes: Locator) {
  for (const scope of await scopes.all()) await expectInterIn(scope);
}

async function expectInterIn(scope: Locator) {
  const report = await scope.evaluate(async (root) => {
    await document.fonts.ready;
    const used = new Set<string>();
    const foreign = new Set<string>();
    for (const el of [root, ...root.querySelectorAll('*')]) {
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim());
      if (!hasText) continue;
      const style = getComputedStyle(el);
      const family = style.fontFamily.split(',')[0].trim().replace(/["']/g, '');
      if (family === 'Inter') used.add(style.fontWeight);
      else if (!/mono|courier/i.test(style.fontFamily)) foreign.add(`${el.className || el.tagName}: ${family}`);
    }
    const loaded = [...document.fonts]
      .filter((face) => face.family.replace(/["']/g, '') === 'Inter' && face.status === 'loaded')
      .map((face) => face.weight);
    return { foreign: [...foreign], missing: [...used].filter((w) => !loaded.includes(w)) };
  });
  expect(report).toEqual({ foreign: [], missing: [] });
}

/** The panel opens next to its trigger, at least as wide, and stays in the viewport. */
async function expectAnchored(panel: Locator, trigger: Locator, page: Page) {
  const p = await box(panel);
  const t = await box(trigger);
  const viewport = page.viewportSize()!;
  expect(p.y).toBeGreaterThanOrEqual(t.y + t.height - 1);
  expect(Math.abs(p.x - t.x)).toBeLessThanOrEqual(2);
  expect(p.width).toBeGreaterThanOrEqual(t.width - 2);
  expect(p.x + p.width).toBeLessThanOrEqual(viewport.width);
  expect(p.y + p.height).toBeLessThanOrEqual(viewport.height);
}

const host = (page: Page) => page.locator('.coar-overlay-host');

test.describe('compact interaction scenes', () => {
  test.describe.configure({ timeout: 60_000 });

  for (const v of VARIANTS) {
    const roles = ROLES[v.mode];

    test(`selection panels take the profile: ${v.name}`, async ({ page }) => {
      const problems = guard(page);
      for (const name of ['select', 'multi-select', 'tag-select']) {
        await scene(page, `compact-interaction-${name}-open`, v);
        const field = page.locator('[data-visual-open]');
        if (name === 'tag-select') await field.locator('.coar-tag-select-input').click();
        else await field.getByRole('combobox').click();
        // München: the tag select lists only the options not yet chosen.
        const option = host(page).getByRole('option').filter({ hasText: /^\s*München\s*$/ });
        await expect(option).toBeVisible();
        await settled(page);
        await expectProfileHost(option, v.scheme);
        expect(await textStyle(option)).toMatchObject({ family: 'Inter', size: roles.ui, weight: '400' });
        expect((await box(option)).height).toBe(roles.row);
        // Group headers are captions; the long option keeps its row.
        const header = host(page).locator('.coar-select-group-header').first();
        expect(await textStyle(header)).toMatchObject({ family: 'Inter', size: roles.caption });
        await expectInter(host(page));
        const frame = name === 'tag-select' ? field.locator('.coar-tag-select-input').locator('xpath=ancestor::*[contains(@class,"coar-input-frame")][1]') : field.getByRole('combobox');
        await expectAnchored(host(page).first(), frame, page);
      }
      expect(problems).toEqual([]);
    });

    test(`date and time pickers take the profile: ${v.name}`, async ({ page }) => {
      const problems = guard(page);
      const pickers = [
        { name: 'date-picker', button: '.coar-plain-date-picker-btn', month: '.coar-plain-date-picker-month-item', year: '.coar-plain-date-picker-year-btn' },
        { name: 'date-time-picker', button: '.coar-pdtp-btn', month: '.coar-pdtp-month-item', year: '.coar-pdtp-year-btn' },
        { name: 'zoned-picker', button: '.coar-zdtp-btn', month: '.coar-zdtp-month-item', year: '.coar-zdtp-year-btn' },
      ];
      for (const picker of pickers) {
        await scene(page, `compact-interaction-${picker.name}-open`, v, CLOCK);
        await page.locator(`[data-visual-open] ${picker.button}`).click();
        await expect(page.locator('.coar-scrollable-calendar__months-wrapper--ready')).toBeAttached();
        await settled(page);
        const day = host(page).locator('.coar-scrollable-calendar__day', { hasText: /^14$/ }).first();
        await expectProfileHost(day, v.scheme);
        expect(await textStyle(day)).toMatchObject({ family: 'Inter', size: roles.ui });
        expect((await box(day)).height).toBeGreaterThanOrEqual(roles.row);
        // Side column: month list and year stepper (internals of the panel).
        const month = host(page).locator(picker.month).first();
        expect(await textStyle(month)).toMatchObject({ family: 'Inter', size: roles.caption });
        expect((await box(month)).height).toBe(roles.pickerMonth);
        const yearButton = host(page).locator(picker.year).first();
        const yb = await box(yearButton);
        expect([yb.width, yb.height]).toEqual([roles.pickerAction, roles.pickerAction]);
        if (picker.name !== 'date-picker') {
          const value = host(page).locator('.coar-time-picker__value').first();
          expect(await textStyle(value)).toMatchObject({ family: 'Inter', size: roles.fieldSmall });
          const step = await box(host(page).locator('.coar-time-picker__btn').first());
          expect([step.width, step.height]).toEqual([roles.timeStep, roles.timeStep]);
        }
        if (picker.name === 'zoned-picker') {
          const lock = await box(host(page).locator('.coar-zdtp-footer-lock'));
          expect([lock.width, lock.height]).toEqual([roles.pickerAction, roles.pickerAction]);
        }
        await expectInter(host(page));
      }
      expect(problems).toEqual([]);
    });

    test(`the zone list inside the zoned panel takes the profile: ${v.name}`, async ({ page }) => {
      const problems = guard(page);
      await scene(page, 'compact-interaction-zoned-zone-list-open', v, CLOCK);
      await page.locator('[data-visual-open] .coar-zdtp-btn').click();
      await host(page).locator('.coar-zdtp-display-tz-btn').click();
      const active = host(page).locator('.coar-zdtp-tz-picker-item--active');
      await expect(active).toBeVisible();
      await settled(page);
      await expectProfileHost(active, v.scheme);
      expect(await textStyle(active)).toMatchObject({ family: 'Inter', size: roles.ui });
      expect((await box(active)).height).toBe(roles.row);
      const header = host(page).locator('.coar-zdtp-tz-group-header').first();
      expect(await textStyle(header)).toMatchObject({ family: 'Inter', size: roles.caption });
      // The search field reads the ui role on desktop. On phones it is a text field: under 16px
      // iOS Safari zooms the page on focus, and its target needs the 44px role (see the ledger).
      const search = host(page).locator('.coar-zdtp-tz-search-input');
      await expect(search).toBeFocused();
      expect(await textStyle(search)).toMatchObject({ family: 'Inter', size: roles.field });
      if (v.mode === 'mobile') expect((await box(search)).height).toBeGreaterThanOrEqual(44);
      await expectInter(host(page));
      expect(problems).toEqual([]);
    });

    test(`dialog, form-field status and context menu take the profile: ${v.name}`, async ({ page }) => {
      const problems = guard(page);
      // Dialog shell with a footer of three actions.
      await scene(page, 'compact-interaction-dialog-open', v);
      const dialog = host(page).getByRole('dialog');
      await expect(dialog).toBeVisible();
      await settled(page);
      await expectProfileHost(dialog, v.scheme);
      await expect(dialog.locator('.coar-dialog-close')).toBeFocused();
      const close = await box(dialog.locator('.coar-dialog-close'));
      expect(close.width).toBe(v.mode === 'mobile' ? 44 : 32);
      expect(await textStyle(dialog.locator('.coar-dialog-title'))).toMatchObject({ family: 'Inter', size: 16, weight: '600' });
      const actions = dialog.locator('.coar-dialog-footer .coar-button');
      await expect(actions).toHaveText(['Löschen', 'Abbrechen', 'Speichern']);
      for (const action of await actions.all()) {
        expect(await textStyle(action)).toMatchObject({ family: 'Inter', size: roles.ui });
        expect((await box(action)).height).toBe(roles.row);
      }
      expect(await textStyle(dialog.locator('input').first())).toMatchObject({ size: roles.field });
      await expectInter(host(page));

      // Form-field status panels: hint, errors, warning; rules.
      await scene(page, 'compact-interaction-form-status-open', v);
      await page.locator('[data-status=messages] .coar-popover-trigger').click();
      await page.locator('[data-status=rules] .coar-popover-trigger').click();
      await expect(host(page)).toHaveCount(2);
      await settled(page);
      const panels = host(page).locator('.coar-form-field__status-panel');
      await expect(panels).toHaveCount(2);
      await expectProfileHost(panels.first(), v.scheme);
      await expect(panels.first().locator('.coar-form-field__status-section')).toHaveCount(3);
      await expect(panels.nth(1).locator('.coar-form-field__status-rule')).toHaveCount(3);
      await expect(panels.nth(1).locator('.coar-form-field__status-rule--fulfilled')).toHaveCount(2);
      for (const text of await host(page).locator('.coar-form-field__status-section-body p, .coar-form-field__status-rule-label').all()) {
        expect(await textStyle(text)).toMatchObject({ family: 'Inter', size: roles.ui });
      }
      await expectInter(host(page));

      // Context menu at a point, with nested flyouts.
      await scene(page, 'compact-interaction-context-menu-open', v);
      await expect(host(page)).toHaveCount(1);
      // With a mouse, hover opens a flyout (a click on the open parent would close it again).
      await host(page).locator('[data-level="1"] > .coar-submenu-item').hover();
      await host(page).locator('[data-level="2"] > .coar-submenu-item').hover();
      await expect(host(page)).toHaveCount(3);
      await settled(page);
      const menus = host(page);
      for (let i = 0; i < 3; i += 1) {
        const item = menus.nth(i).locator('.coar-menu-item, .coar-submenu-item').first();
        await expectProfileHost(item, v.scheme);
        expect(await textStyle(item)).toMatchObject({ family: 'Inter', size: roles.ui });
        expect((await box(item)).height).toBe(roles.row);
      }
      // Each flyout opens beside the item that owns it.
      const owner1 = await box(menus.nth(0).locator('[data-level="1"] > .coar-submenu-item'));
      const flyout1 = await box(menus.nth(1));
      expect(flyout1.x).toBeGreaterThanOrEqual(owner1.x + owner1.width - 8);
      const owner2 = await box(menus.nth(1).locator('[data-level="2"] > .coar-submenu-item'));
      const flyout2 = await box(menus.nth(2));
      expect(flyout2.x).toBeGreaterThanOrEqual(owner2.x + owner2.width - 8);
      expect(flyout2.x + flyout2.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      expect(await textStyle(menus.nth(0).locator('.coar-menu-heading'))).toMatchObject({ size: roles.caption });
      await expectInter(host(page).first());
      expect(problems).toEqual([]);
    });

    test(`field actions and the theme editor take the profile: ${v.name}`, async ({ page }) => {
      const problems = guard(page);
      const root = await scene(page, 'compact-interaction-field-actions', v);
      const field = page.locator('[data-field=stepper]');
      // Steppers fill the frame's height (inside its 1px border on desktop); the clear button is
      // icon-sized on desktop and takes the 44px target on phones.
      for (const label of ['Decrease value', 'Increase value']) {
        const b = await box(field.getByRole('button', { name: label }));
        expect(b.height).toBeGreaterThanOrEqual(roles.row - 2);
        expect(b.height).toBeLessThanOrEqual(roles.row);
      }
      const clear = await box(field.getByRole('button', { name: 'Clear' }));
      if (v.mode === 'mobile') expect(Math.min(clear.width, clear.height)).toBeGreaterThanOrEqual(44);
      expect(await textStyle(field.locator('input'))).toMatchObject({ family: 'Inter', size: roles.field });
      const step = await box(page.locator('[data-time="24"] .coar-time-picker__btn').first());
      expect([step.width, step.height]).toEqual([roles.timeStep, roles.timeStep]);
      expect(await textStyle(page.locator('[data-time="24"] .coar-time-picker__value').first())).toMatchObject({ size: roles.field });
      await expectInter(root);

      await scene(page, 'compact-interaction-theme-editor-open', v);
      await page.locator('.te-fab').click();
      const panel = host(page).locator('.te-panel');
      await expect(panel).toBeVisible();
      await settled(page);
      await expectProfileHost(panel, v.scheme);
      expect(await textStyle(panel)).toMatchObject({ family: 'Inter', size: roles.ui });
      await expectInter(panel);
      expect(problems).toEqual([]);
    });

    test(`the palette editor opened from the theme editor takes the profile: ${v.name}`, async ({ page }) => {
      const problems = guard(page);
      await scene(page, 'compact-interaction-palette-editor-open', v);
      await page.locator('.te-fab').click();
      await host(page).locator('.te-palette-btn').first().click();
      const palette = page.getByRole('dialog', { name: 'Accent palette editor' });
      await expect(palette).toBeVisible();
      // It is teleported to <body> by itself, not through the overlay host: it must still
      // carry the profile of the editor that opened it.
      expect(await palette.evaluate((el) => !!el.closest('.coar-compact'))).toBe(true);
      await expectInter(palette);
      const row600 = palette.locator('.cpe-row').filter({ has: page.locator('.cpe-row-step', { hasText: /^600$/ }) });
      await expect(row600.locator('.cpe-val').first()).toHaveText(v.scheme === 'dark' ? '0.780' : '0.400');
      const swatch = palette.locator('.cpe-strip-swatch[title="600"]');
      const colors = await swatch.evaluate((el) => {
        const probe = document.createElement('span');
        probe.style.color = 'var(--coar-color-accent-600)';
        el.appendChild(probe);
        const expected = getComputedStyle(probe).color;
        probe.remove();
        return { actual: getComputedStyle(el).backgroundColor, expected };
      });
      expect(colors.actual).toBe(colors.expected);
      await expect(swatch.locator('.cpe-strip-label')).toHaveCSS('font-size', '12px');
      expect(problems).toEqual([]);
    });
  }

  test('phone sheet: long form body scrolls under a fixed footer', async ({ page }) => {
    const problems = guard(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await scene(page, 'compact-interaction-sheet-form', { mode: 'mobile', scheme: 'light' });
    const sheet = host(page).locator('.coar-sheet');
    await expect(sheet).toBeVisible();
    await expectProfileHost(sheet, 'light');
    await expect(sheet.locator('.coar-sheet-close')).toBeFocused();
    await settled(page);
    const footer = sheet.locator('.coar-sheet-footer');
    await expect(footer.locator('.coar-button')).toHaveText(['Abbrechen', 'Speichern']);
    for (const b of await footer.locator('.coar-button').all()) {
      expect(await textStyle(b)).toMatchObject({ family: 'Inter', size: 14 });
      expect((await box(b)).height).toBe(44);
    }
    for (const input of await sheet.locator('.coar-sheet-body input:not([type=checkbox])').all()) {
      expect(await textStyle(input)).toMatchObject({ family: 'Inter', size: 16 });
    }
    const before = await box(footer);
    const body = sheet.locator('.coar-sheet-body');
    const scroll = await body.evaluate((el) => {
      const scroller = (el.querySelector('[data-overlayscrollbars-viewport]') as HTMLElement | null) ?? el;
      const max = scroller.scrollHeight - scroller.clientHeight;
      scroller.scrollTop = max;
      return { max, top: scroller.scrollTop };
    });
    expect(scroll.max).toBeGreaterThan(100);
    expect(scroll.top).toBe(scroll.max);
    const last = sheet.getByText('Bestätigung per E-Mail senden');
    await expect(last).toBeInViewport();
    expect((await box(last)).y + (await box(last)).height).toBeLessThanOrEqual(before.y);
    expect(await box(footer)).toEqual(before);
    expect(before.y + before.height).toBeLessThanOrEqual(844);
    await expectInter(sheet);
    expect(problems).toEqual([]);
  });

  test('select: keyboard opens, moves, selects and returns focus', async ({ page }) => {
    const problems = guard(page);
    await scene(page, 'compact-interaction-select-open', { mode: 'default', scheme: 'light' });
    const combobox = page.locator('[data-visual-open]').getByRole('combobox');
    await combobox.focus();
    await page.keyboard.press('Enter');
    await expect(host(page).getByRole('listbox')).toBeVisible();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect(host(page)).toHaveCount(0);
    await expect(combobox).toContainText('Zürich — Hauptsitz mit langem Namen');
    await expect(combobox).toBeFocused();
    // A disabled option cannot be chosen by pointer.
    await combobox.click();
    await host(page).getByRole('option', { name: 'Linz (geschlossen)' }).click({ force: true });
    await expect(combobox).toContainText('Zürich');
    await page.keyboard.press('Escape');
    await expect(host(page)).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test('multi select and tag select: toggle, select all, filter, remove', async ({ page }) => {
    const problems = guard(page);
    await scene(page, 'compact-interaction-multi-select-open', { mode: 'default', scheme: 'light' });
    const multi = page.locator('[data-visual-open]').getByRole('combobox');
    await multi.click();
    const listbox = host(page).getByRole('listbox');
    const graz = listbox.getByRole('option', { name: 'Graz' });
    await expect(graz).toHaveAttribute('aria-selected', 'false');
    await graz.click();
    await expect(graz).toHaveAttribute('aria-selected', 'true');
    await expect(host(page)).toHaveCount(1); // stays open for more choices
    await expect(listbox.getByRole('option', { name: 'Linz (geschlossen)' })).toHaveAttribute('aria-disabled', 'true');

    await scene(page, 'compact-interaction-tag-select-open', { mode: 'default', scheme: 'light' });
    const input = page.locator('[data-visual-open] .coar-tag-select-input');
    await input.click();
    await input.fill('Salz');
    const options = host(page).getByRole('option');
    await expect(options).toHaveText(['Salzburg']);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    const tags = page.locator('[data-visual-open] .coar-tag-select-tag-label');
    await expect(tags).toHaveText(['Wien', 'Berlin', 'Salzburg']);
    await expect(input).toHaveValue('');
    await input.press('Backspace');
    await expect(tags).toHaveText(['Wien', 'Berlin']);
    expect(problems).toEqual([]);
  });

  test('date pickers: year stepper, month list, day choice, escape', async ({ page }) => {
    const problems = guard(page);
    await scene(page, 'compact-interaction-date-picker-open', { mode: 'default', scheme: 'light' }, CLOCK);
    const input = page.locator('[data-visual-open] input');
    await expect(input).toHaveValue('14.03.2026');
    await page.locator('[data-visual-open] .coar-plain-date-picker-btn').click();
    const panel = host(page);
    await expect(panel.locator('.coar-scrollable-calendar__months-wrapper--ready')).toBeAttached();
    const year = panel.locator('.coar-plain-date-picker-year');
    await expect(year).toHaveText('2026');
    await panel.locator('.coar-plain-date-picker-year-btn').last().click();
    await expect(year).toHaveText('2027');
    await panel.locator('.coar-plain-date-picker-year-btn').first().click();
    await expect(year).toHaveText('2026');
    // The month list scrolls the calendar to the month.
    await panel.locator('.coar-plain-date-picker-month-item', { hasText: 'Jun' }).click();
    const june = panel.locator('.coar-scrollable-calendar__month', { has: page.locator('.coar-scrollable-calendar__month-name', { hasText: 'June' }) });
    await expect(june.first()).toBeInViewport();
    await june.first().locator('.coar-scrollable-calendar__day', { hasText: /^17$/ }).first().click();
    await expect(input).toHaveValue('17.06.2026');
    // `closeOnSelect` is off by default: the panel stays for another choice; Escape closes it.
    await expect(host(page)).toHaveCount(1);
    await expect(panel.locator('.coar-scrollable-calendar__day--selected', { hasText: /^17$/ })).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(host(page)).toHaveCount(0);
    await expect(input).toHaveValue('17.06.2026');
    expect(problems).toEqual([]);
  });

  test('zoned picker: display zone search and choice, value zone editor', async ({ page }) => {
    const problems = guard(page);
    await scene(page, 'compact-interaction-zoned-zone-list-open', { mode: 'default', scheme: 'light' }, CLOCK);
    await page.locator('[data-visual-open] .coar-zdtp-btn').click();
    const panel = host(page);
    await panel.locator('.coar-zdtp-display-tz-btn').click();
    const search = panel.locator('.coar-zdtp-tz-search-input');
    await expect(search).toBeFocused();
    await expect(panel.locator('.coar-zdtp-tz-picker-item--active')).toContainText('UTC');
    await search.fill('Tokyo');
    const items = panel.locator('.coar-zdtp-tz-picker-item');
    await expect(items).toHaveCount(1);
    await items.click();
    await expect(panel.locator('.coar-zdtp-tz-search-input')).toHaveCount(0);
    await expect(panel.locator('.coar-zdtp-display-tz-btn')).toContainText('Tokyo');
    // The value's own zone stays Vienna; its editor opens from the footer.
    await expect(panel.locator('.coar-zdtp-footer-tz-name')).toContainText('Vienna');
    await panel.locator('.coar-zdtp-footer-lock').click();
    await expect(panel.locator('.coar-zdtp-footer-edit')).toBeVisible();
    await panel.locator('.coar-zdtp-footer-cancel').click();
    await expect(panel.locator('.coar-zdtp-footer-tz-name')).toContainText('Vienna');
    expect(problems).toEqual([]);
  });

  test('dialog: focus stays inside, escape closes', async ({ page }) => {
    const problems = guard(page);
    await scene(page, 'compact-interaction-dialog-open', { mode: 'default', scheme: 'light' });
    const dialog = host(page).getByRole('dialog');
    await expect(dialog.locator('.coar-dialog-close')).toBeFocused();
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(host(page)).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test('context menu: keyboard opens and closes the nested flyouts level by level', async ({ page }) => {
    const problems = guard(page);
    await scene(page, 'compact-interaction-context-menu-open', { mode: 'default', scheme: 'light' });
    await expect(host(page)).toHaveCount(1);
    const level1 = host(page).locator('[data-level="1"] > .coar-submenu-item');
    await level1.focus();
    await page.keyboard.press('ArrowRight');
    await expect(host(page)).toHaveCount(2);
    const level2 = host(page).locator('[data-level="2"] > .coar-submenu-item');
    await level2.focus();
    await page.keyboard.press('ArrowRight');
    await expect(host(page)).toHaveCount(3);
    await expect(host(page).nth(2).getByText('2025')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(host(page)).toHaveCount(2);
    await page.keyboard.press('Escape');
    await expect(host(page)).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(host(page)).toHaveCount(0);
    // A real right click on an element inside the profile opens the menu in the profile.
    await page.locator('[data-context-target]').click({ button: 'right' });
    await expect(host(page)).toHaveCount(1);
    expect(await hostClasses(host(page))).toContain('coar-compact');
    expect(problems).toEqual([]);
  });

  test('panel layout: dividers resize by keyboard and drag, clamp, and follow the toggle', async ({ page }) => {
    const problems = guard(page);
    await scene(page, 'compact-interaction-panel-layout', { mode: 'default', scheme: 'light' });
    const size = (side: string) => page.locator(`[data-size=${side}]`);
    const left = page.getByRole('separator', { name: 'Resize left panel' });
    const right = page.getByRole('separator', { name: 'Resize right panel' });
    const bottom = page.getByRole('separator', { name: 'Resize bottom panel' });
    await expect(size('left')).toHaveText('200');

    await left.focus();
    await page.keyboard.press('ArrowRight');
    await expect(size('left')).toHaveText('208');
    await expect(left).toHaveAttribute('aria-valuenow', '208');
    await page.keyboard.press('End');
    await expect(size('left')).toHaveText('320');
    await page.keyboard.press('Home');
    await expect(size('left')).toHaveText('140');
    // The focused divider shows the profile's accent, not the literal fallback blue.
    const line = await left.evaluate((el) => getComputedStyle(el, '::before').backgroundColor);
    expect(line).not.toBe('rgb(59, 130, 246)');

    // Drag by pointer.
    const lb = await box(left);
    await page.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2);
    await page.mouse.down();
    await page.mouse.move(lb.x + lb.width / 2 + 60, lb.y + lb.height / 2, { steps: 4 });
    await page.mouse.up();
    await expect(size('left')).toHaveText('200');
    await expect(left).toBeFocused();

    // Right and bottom grow towards the content (inverted).
    await right.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(size('right')).toHaveText('188');
    await bottom.focus();
    await page.keyboard.press('ArrowUp');
    await expect(size('bottom')).toHaveText('104');

    // The nested split in the left region resizes too.
    const nested = page.locator('.coar-panel-layout__left [role=separator]');
    const before = (await box(page.locator('.coar-panel-layout__left').getByText('Details'))).y;
    await nested.focus();
    await page.keyboard.press('ArrowDown');
    expect((await box(page.locator('.coar-panel-layout__left').getByText('Details'))).y).toBe(before + 8);

    // Closing the sidebar removes its region and divider; opening restores the width.
    await page.locator('[data-toggle-left]').click();
    await expect(left).toHaveCount(0);
    await expect(page.locator('.coar-panel-layout__left')).toHaveCount(0);
    await page.locator('[data-toggle-left]').click();
    await expect(size('left')).toHaveText('200');
    expect(problems).toEqual([]);
  });

  test('theme editor: writes to the profile container, palette editor edits a step', async ({ page }) => {
    const problems = guard(page);
    const root = await scene(page, 'compact-interaction-theme-editor-open', { mode: 'default', scheme: 'light' });
    await page.locator('.te-fab').click();
    const panel = host(page).locator('.te-panel');
    await expect(panel).toBeVisible();
    await panel.locator('.te-preset-card', { hasText: 'Minimal' }).click();
    await expect(panel.getByRole('button', { name: 'Reset' })).toBeVisible();
    // The editor's writes land on the compact container, never on <html>.
    expect(await page.evaluate(() => document.documentElement.classList.contains('coar-theme-editor'))).toBe(false);
    await panel.getByRole('button', { name: 'Reset' }).click();
    await panel.locator('.te-palette-btn').first().click();
    const palette = page.getByRole('dialog', { name: 'Accent palette editor' });
    await expect(palette).toBeVisible();
    const row = palette.locator('.cpe-row').first();
    const slider = row.locator('input[type=range]').first();
    await slider.fill('0.5');
    await expect(row).toHaveClass(/cpe-row--changed/);
    await expect(row.locator('.cpe-val').first()).toHaveText('0.500');
    await row.locator('.cpe-reset-btn').click();
    await expect(row).not.toHaveClass(/cpe-row--changed/);
    await palette.getByRole('button', { name: 'Close' }).click();
    await expect(palette).toHaveCount(0);
    await panel.locator('.te-icon-btn[title=Close]').click();
    await expect(host(page)).toHaveCount(0);
    await expect(root).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('number input and time picker: frame actions by pointer and keyboard', async ({ page }) => {
    const problems = guard(page);
    await scene(page, 'compact-interaction-field-actions', { mode: 'default', scheme: 'light' });
    const field = page.locator('[data-field=stepper]');
    const input = field.locator('input');
    const inc = field.getByRole('button', { name: 'Increase value' });
    const dec = field.getByRole('button', { name: 'Decrease value' });
    await expect(input).toHaveValue('5');
    await inc.click();
    await expect(input).toHaveValue('6');
    await input.focus();
    await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue('7');
    for (let i = 0; i < 5; i += 1) await inc.click({ force: true });
    await expect(input).toHaveValue('10');
    await expect(inc).toBeDisabled();
    await dec.click();
    await expect(input).toHaveValue('9');
    await field.getByRole('button', { name: 'Clear' }).click();
    await expect(input).toHaveValue('');

    const hours24 = page.locator('[data-time="24"] [role=spinbutton]').first();
    const minutes24 = page.locator('[data-time="24"] [role=spinbutton]').nth(1);
    await page.locator('[data-time="24"]').getByRole('button', { name: 'Increase hours' }).click();
    await expect(hours24).toHaveAttribute('aria-valuenow', '10');
    await page.locator('[data-time="24"]').getByRole('button', { name: 'Increase minutes' }).click();
    await expect(minutes24).toHaveAttribute('aria-valuenow', '45'); // minute step 15
    await minutes24.focus();
    await page.keyboard.press('ArrowDown');
    await expect(minutes24).toHaveAttribute('aria-valuenow', '30');
    await expect(page.locator('[data-time="max"]').getByRole('button', { name: 'Increase hours' })).toBeDisabled();
    await expect(page.locator('[data-time="disabled"] .coar-time-picker__btn').first()).toBeDisabled();
    const period = page.locator('[data-time="12"] .coar-time-picker__period-value');
    await expect(period).toHaveText('PM');
    expect(problems).toEqual([]);
  });

  test('transitions: each one leaves and enters with its own classes and settles clean', async ({ browser, baseURL }) => {
    // Real motion: the visual pipeline captures with reduced motion, this measures the animation.
    const context = await browser.newContext({ baseURL, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    const problems = guard(page);
    await scene(page, 'compact-interaction-transitions', { mode: 'default', scheme: 'light' });
    for (const kind of ['collapse', 'fade', 'slide', 'scale']) {
      const cell = page.locator(`[data-transition=${kind}-on]`);
      const panel = cell.locator('[data-panel]');
      await expect(panel).toBeVisible();
      // Two frames after the toggle the element is still there, in motion (CSS classes of
      // Collapse, inline transitions of the JS-driven Fade, Slide and Scale).
      const motion = (toggle: boolean) => cell.evaluate(async (c, t) => {
        if (t) (c.querySelector('[data-toggle]') as HTMLElement).click();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const p = c.querySelector('[data-panel]') as HTMLElement | null;
        return p ? { active: /-(enter|leave)-active/.test(p.className) || p.style.transition !== '' } : null;
      }, toggle);
      expect(await motion(true)).toEqual({ active: true });
      await expect(panel).toHaveCount(0, { timeout: 2_000 });
      await expect(cell.locator('[data-toggle]')).toHaveText('Einblenden');
      expect(await motion(true)).toEqual({ active: true });
      await expect.poll(() => panel.evaluate((p) => /-(enter|leave)-/.test(p.className) || p.style.transition !== ''), { timeout: 2_000 }).toBe(false);
      // Settled: no inline transition, geometry or clipping left behind. (Fade leaves an inline
      // `opacity: 1`, which changes nothing visible; noted in the ledger.)
      expect(await panel.getAttribute('style')).not.toMatch(/transition|height|transform|overflow|opacity: 0/);
      expect(await panel.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    }
    expect(problems).toEqual([]);
    await context.close();
  });
});

test.describe('compact interaction scenes by touch', { tag: '@touch' }, () => {
  test.use({ hasTouch: true });

  test('select, steppers, time spinners and flyouts answer taps', async ({ page }) => {
    const problems = guard(page);
    await scene(page, 'compact-interaction-select-open', { mode: 'mobile', scheme: 'light' });
    const combobox = page.locator('[data-visual-open]').getByRole('combobox');
    await combobox.tap();
    const option = host(page).getByRole('option').filter({ hasText: /^\s*Berlin\s*$/ });
    expect((await box(option)).height).toBe(44);
    await option.tap();
    await expect(host(page)).toHaveCount(0);
    await expect(combobox).toContainText('Berlin');

    await scene(page, 'compact-interaction-field-actions', { mode: 'mobile', scheme: 'light' });
    const field = page.locator('[data-field=stepper]');
    await field.getByRole('button', { name: 'Increase value' }).tap();
    await expect(field.locator('input')).toHaveValue('6');
    await page.locator('[data-time="24"]').getByRole('button', { name: 'Increase hours' }).tap();
    await expect(page.locator('[data-time="24"] [role=spinbutton]').first()).toHaveAttribute('aria-valuenow', '10');

    await scene(page, 'compact-interaction-context-menu-open', { mode: 'mobile', scheme: 'light' });
    await host(page).locator('[data-level="1"] > .coar-submenu-item').tap();
    await expect(host(page)).toHaveCount(2);
    expect((await box(host(page).nth(1).locator('.coar-menu-item').first())).height).toBe(44);
    expect(problems).toEqual([]);
  });

  test('phone sheet closes by its close button tap', async ({ page }) => {
    const problems = guard(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await scene(page, 'compact-interaction-sheet-form', { mode: 'mobile', scheme: 'light' });
    const sheet = host(page).locator('.coar-sheet');
    await expect(sheet).toBeVisible();
    await sheet.locator('.coar-sheet-close').tap();
    await expect(host(page)).toHaveCount(0);
    expect(problems).toEqual([]);
  });
});
