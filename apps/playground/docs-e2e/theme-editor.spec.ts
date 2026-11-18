import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * The Theme Editor round trip in the documentation: Compact is loaded as values (no
 * `.coar-compact`), edited, measured across a page navigation and inside an open
 * overlay, exported, and the exported file alone gives a fresh page the same values.
 * Resetting returns the theme the page has without the editor and leaves light/dark
 * and `.coar-mobile` alone.
 */

test.skip(({ isMobile }) => isMobile, 'the editor panel is a desktop tool');

const select = '.vp-doc .coar-select-trigger';

async function openEditor(page: Page) {
  await page.locator('.te-fab').click();
  await expect(page.locator('.te-panel')).toBeVisible();
}

function preset(page: Page, name: string) {
  return page.locator('.te-preset-card').filter({ has: page.locator('.te-preset-name', { hasText: new RegExp(`^${name}$`) }) });
}

async function setRole(page: Page, token: string, value: string) {
  const values = page.locator('[data-te-role-values]');
  if (!await values.evaluate((details: HTMLDetailsElement) => details.open)) {
    await values.locator('summary').click();
  }
  const input = page.locator(`[data-te-role="${token}"] input`).first();
  await input.fill(value);
  await input.press('Enter');
  await input.blur();
}

/** What a visitor sees: the first select of the page and resolved roles at the page root. */
async function metrics(page: Page) {
  await expect(page.locator(select).first()).toBeVisible();
  return page.evaluate((selector) => {
    const trigger = document.querySelector(selector)!;
    const frame = trigger.closest('.coar-input-frame') ?? trigger;
    const root = getComputedStyle(document.documentElement);
    const probe = document.createElement('span');
    document.body.appendChild(probe);
    const resolve = (property: 'color' | 'backgroundColor', value: string) => {
      probe.style[property] = value;
      const computed = getComputedStyle(probe)[property];
      probe.style[property] = '';
      return computed;
    };
    const result = {
      frame: Math.round(frame.getBoundingClientRect().height),
      fieldFont: getComputedStyle(trigger).fontSize,
      bodyFamily: root.fontFamily.split(',')[0].trim().replace(/["']/g, ''),
      uiFont: root.getPropertyValue('--coar-ui-font-size').trim(),
      accent: resolve('backgroundColor', 'var(--coar-background-accent-primary)'),
      text: resolve('color', 'var(--coar-text-neutral-primary)'),
    };
    probe.remove();
    return result;
  }, select);
}

/** Text size of the options in the open dropdown: the overlay is teleported to `body`. */
async function optionFont(page: Page) {
  const option = page.locator('.coar-overlay-host [role=option]').first();
  await expect(option).toBeVisible();
  return option.evaluate((element) => getComputedStyle(element).fontSize);
}

test('Compact loads as values, survives navigation and an open overlay, and its export stands alone', async ({ page, browser }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/components/select');
  const app = await metrics(page);
  const origin = await page.evaluate(() => performance.timeOrigin);

  await openEditor(page);
  await preset(page, 'Compact').click();
  await expect.poll(() => metrics(page)).toMatchObject({ bodyFamily: 'Inter', uiFont: '13px' });
  expect((await metrics(page)).text).not.toBe(app.text);
  // Values, not the beta class, and no reload.
  await expect(page.locator('.coar-compact')).toHaveCount(0);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);

  // Edit typography and a size independently (the selects of this page are size `s`:
  // one pixel below the medium field text).
  await setRole(page, '--coar-ui-font-size', '15');
  await setRole(page, '--coar-component-s-height', '34px');
  await setRole(page, '--coar-field-font-size', '16px');
  await expect.poll(() => metrics(page)).toMatchObject({ frame: 34, fieldFont: '15px', uiFont: '15px' });

  // An open overlay follows a change made while it is open, and the reset of that value.
  // The editor's field is set without a click, which would close the dropdown.
  const row = page.locator('[data-te-role="--coar-ui-font-size"]');
  const change = (value: string) => row.locator('input').first().evaluate((input: HTMLInputElement, next) => {
    input.value = next;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await page.locator(select).first().dispatchEvent('click');
  const openFont = await optionFont(page);
  await change('19px');
  await expect.poll(() => optionFont(page)).not.toBe(openFont);
  const largeFont = await optionFont(page);
  expect(parseFloat(largeFont)).toBeGreaterThan(parseFloat(openFont));
  await row.locator('.te-icon-btn--reset').evaluate((button: HTMLButtonElement) => button.click());
  await expect.poll(() => optionFont(page)).not.toBe(largeFont);
  await change('15px');
  await expect.poll(() => optionFont(page)).toBe(openFont);
  await page.keyboard.press('Escape');
  await expect(page.locator('.coar-overlay-host [role=option]')).toHaveCount(0);
  const edited = await metrics(page);
  expect(edited).toMatchObject({ frame: 34, fieldFont: '15px', uiFont: '15px' });

  // Client-side navigation keeps the theme.
  await page.locator('.te-panel button[title=Close]').click();
  await expect(page.locator('.te-panel')).toHaveCount(0);
  await page.locator('.VPSidebar a', { hasText: /^Text Input$/ }).first().click();
  await expect(page.locator('.vp-doc h1')).toContainText('Text Input');
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--coar-ui-font-size').trim())).toBe('15px');
  await page.goBack();
  await expect(page.locator('.vp-doc h1')).toContainText('Select');
  expect(await metrics(page)).toEqual(edited);

  // The download is a theme class with every value a fresh app needs.
  await openEditor(page);
  await page.locator('.te-theme-name-input').fill('roundtrip');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSS' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('coar-theme--roundtrip.css');
  const css = await readFile((await download.path())!, 'utf8');
  expect(css).toContain('.coar-theme--roundtrip');
  // The class, that is; a token of the contract is named `--coar-compact-color-scheme`.
  expect(css).not.toMatch(/\.coar-compact\b/);
  expect(css).not.toContain('coar-theme-editor');
  expect(css).toMatch(/--coar-role-derivation: ;/);

  // A fresh page without the editor's changes and without the Compact class.
  const context = await browser.newContext({ viewport: page.viewportSize()!, reducedMotion: 'reduce' });
  try {
    const fresh = await context.newPage();
    await fresh.goto('/components/select');
    expect(await metrics(fresh)).toEqual(app);
    await fresh.addStyleTag({ content: css });
    await fresh.evaluate(() => document.documentElement.classList.add('coar-theme--roundtrip'));
    await expect.poll(() => metrics(fresh)).toEqual(edited);
    await expect(fresh.locator('.coar-compact')).toHaveCount(0);
    await expect(fresh.locator('#coar-theme-editor')).toHaveCount(0);
    await fresh.locator(select).first().dispatchEvent('click');
    expect(await optionFont(fresh)).toBe(openFont);
  } finally {
    await context.close();
  }

  // Reset all: the app's own theme, in place.
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect.poll(() => metrics(page)).toEqual(app);
  await expect(page.locator('#coar-theme-editor')).toHaveCount(0);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
  expect(errors).toEqual([]);
});

test('reset leaves colour scheme and touch mode alone; the other presets still apply', async ({ page }) => {
  await page.goto('/components/select');
  // The app's own state: dark, and a touch presentation on the page root.
  await page.locator('.VPNavBar .VPSwitchAppearance').first().click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.evaluate(() => document.documentElement.classList.add('coar-mobile'));
  const classes = () => page.evaluate(() => [...document.documentElement.classList].filter((name) => name !== 'coar-theme-editor').sort());
  const before = { classes: await classes(), metrics: await metrics(page) };

  await openEditor(page);
  await preset(page, 'Compact').click();
  await expect.poll(async () => (await metrics(page)).bodyFamily).toBe('Inter');
  // Touch sizes combine with the preset: a field never falls below the touch minimum.
  expect((await metrics(page)).frame).toBeGreaterThanOrEqual(44);
  expect(await classes()).toEqual(before.classes);

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect.poll(() => metrics(page)).toEqual(before.metrics);
  expect(await classes()).toEqual(before.classes);

  // A preset of the default look still changes only what it names.
  await preset(page, 'Playful').click();
  await expect.poll(async () => (await metrics(page)).accent).not.toBe(before.metrics.accent);
  expect((await metrics(page)).frame).toBe(before.metrics.frame);
  await expect(page.locator('.coar-compact')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect.poll(() => metrics(page)).toEqual(before.metrics);
});
