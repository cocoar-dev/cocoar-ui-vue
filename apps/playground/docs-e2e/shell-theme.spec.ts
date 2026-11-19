import { expect, test, type Page } from '@playwright/test';

const label = 'Themed docs';
const key = 'coar-docs-shell-theme';

/** Sets the checkbox, from the navigation bar or, in a narrow window, from the menu. */
async function follow(page: Page, on: boolean) {
  // The open Theme Editor panel covers the end of the navigation bar.
  const panel = page.locator('.te-panel');
  if (await panel.isVisible()) await panel.getByTitle('Close', { exact: true }).click();
  const bar = page.locator('.VPNavBar').getByLabel(label);
  if (await bar.isVisible()) {
    await bar.setChecked(on);
  } else {
    const menu = page.getByRole('button', { name: 'mobile navigation', exact: true });
    await menu.click();
    const box = page.locator('.VPNavScreen').getByLabel(label);
    await expect(page.locator('.VPNavScreen .docs-shell-theme')).toHaveCSS('min-height', '44px');
    await box.setChecked(on);
    await menu.click();
  }
  if (on) await expect(page.locator('html')).toHaveClass(/coar-docs-themed/);
  else await expect(page.locator('html')).not.toHaveClass(/coar-docs-themed/);
}

/** What the VitePress frame shows, and one live component. */
async function metrics(page: Page) {
  return page.evaluate(() => {
    const prose = document.querySelector('.vp-doc > div > p:not(.coar-doc-devices)')!;
    const input = document.querySelector('.vp-doc .coar-text-input-field')!;
    // The painted colour: engines serialize one colour as oklch, oklab or rgb.
    const context = document.createElement('canvas').getContext('2d')!;
    const painted = (color: string) => {
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data).join(',');
    };
    return {
      bodyFont: getComputedStyle(document.body).fontFamily.split(',')[0].replace(/["']/g, '').trim(),
      proseFont: getComputedStyle(prose).fontSize,
      nav: document.querySelector('.VPNavBar')!.getBoundingClientRect().height,
      brand: painted(getComputedStyle(document.querySelector('.vp-doc a')!).color),
      // Text the frame takes from tokens that exist only inside a theme.
      sidebar: (() => { const s = getComputedStyle(document.querySelector('.VPSidebarItem .text')!); return `${s.fontSize} ${s.fontWeight}`; })(),
      activeSidebar: getComputedStyle(document.querySelector('.VPSidebarItem.is-active > .item > .link > .text')!).fontWeight,
      code: getComputedStyle(document.querySelector('.vp-doc :not(pre) > code')!).fontSize,
      fieldFont: getComputedStyle(input).fontSize,
      frame: input.closest('.coar-input-frame')!.getBoundingClientRect().height,
    };
  });
}

/**
 * The metrics once no CSS transition runs (VitePress fades link colours over 0.25s) and two
 * readings in a row agree (fonts loaded).
 */
async function settled(page: Page) {
  let last = await metrics(page);
  await expect.poll(async () => {
    const moving = await page.evaluate(() => document.getAnimations()
      .some((animation) => animation instanceof CSSTransition && animation.playState === 'running'));
    const next = await metrics(page);
    const same = !moving && JSON.stringify(next) === JSON.stringify(last);
    last = next;
    return same;
  }, { intervals: [250] }).toBe(true);
  return last;
}

/** The text-input page, hydrated: VitePress marks the active sidebar entry only then. */
async function open(page: Page) {
  await page.goto('/components/text-input');
  await expect(page.locator('.VPSidebarItem.is-active').first()).toBeAttached();
  await expect(page.locator('.vp-doc .coar-text-input-field').first()).toBeVisible();
}

async function preset(page: Page, name: string) {
  const panel = page.locator('.te-panel');
  if (!await panel.isVisible()) await page.getByTitle('Open theme editor', { exact: true }).click();
  await panel.locator('.te-preset-card', { hasText: name }).click();
}

async function reset(page: Page) {
  await page.locator('.te-panel').getByTitle('Reset all changes', { exact: true }).click();
  await expect(page.locator('#coar-theme-editor')).toHaveCount(0);
}

test('off by default: presets change the components, never the VitePress frame', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page);
  await expect(page.locator('.VPNavBar').getByLabel(label)).not.toBeChecked();
  const plain = await settled(page);
  await preset(page, 'Compact');
  await expect.poll(() => metrics(page)).toMatchObject({ frame: 36, fieldFont: '14px' });
  const compact = await settled(page);
  expect({ ...compact, frame: plain.frame, fieldFont: plain.fieldFont }).toEqual(plain);
  await preset(page, 'Enterprise');
  expect(await settled(page)).toEqual(plain);
  await reset(page);
  expect(await settled(page)).toEqual(plain);
});

test('on: the frame takes the theme, and Enterprise looks exactly like Reset', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page);
  const plain = await settled(page);
  const input = page.locator('.vp-doc .coar-text-input-field').first();
  await input.fill('Werte behalten');
  const origin = await page.evaluate(() => performance.timeOrigin);
  await follow(page, true);
  const themed = await settled(page);
  expect(themed.nav).toBe(48);
  expect(themed.bodyFont).not.toBe(plain.bodyFont);
  await preset(page, 'Enterprise');
  expect(await settled(page)).toEqual(themed);
  await preset(page, 'Compact');
  await expect.poll(() => metrics(page)).toMatchObject({ proseFont: '14px', frame: 36, fieldFont: '14px' });
  await reset(page);
  expect(await settled(page)).toEqual(themed);
  await follow(page, false);
  expect(await settled(page)).toEqual(plain);
  await expect(input).toHaveValue('Werte behalten');
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
});

test('the choice survives a reload and a client-side page navigation', async ({ page }) => {
  await page.goto('/components/text-input');
  await follow(page, true);
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe('on');
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/coar-docs-themed/);
  const origin = await page.evaluate(() => performance.timeOrigin);
  if (!await page.locator('.VPNavBarMenu').isVisible()) {
    await page.getByRole('button', { name: 'mobile navigation', exact: true }).click();
    await page.locator('.VPNavScreen').getByRole('link', { name: 'Components', exact: true }).click();
  } else {
    await page.locator('.VPNavBarMenu').getByRole('link', { name: 'Components', exact: true }).click();
  }
  await expect(page.locator('.vp-doc h1')).toContainText('Button');
  await expect(page.locator('html')).toHaveClass(/coar-docs-themed/);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
  await follow(page, false);
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass(/coar-docs-themed/);
});

test('blocked storage still allows switching for this visit', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Blocked', 'SecurityError'); } });
  });
  await page.goto('/components/text-input');
  await follow(page, true);
  await expect.poll(() => metrics(page)).toMatchObject({ nav: 48 });
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass(/coar-docs-themed/);
});

test('a PhoneFrame demo shows the preset of the Theme Editor without reloading', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/guide/mobile');
  const iframe = page.locator('iframe.coar-phone-frame__viewport').first();
  await iframe.scrollIntoViewIfNeeded();
  const frame = page.frameLocator('iframe.coar-phone-frame__viewport').first();
  const field = frame.getByPlaceholder('Event name');
  await field.fill('Dauerhaft');
  const url = await iframe.getAttribute('src');
  // Touch fields keep 16px in every preset; the family shows the theme.
  const family = () => field.evaluate((el) => getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim());
  const before = await family();
  await frame.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(frame.getByRole('dialog', { name: 'Delete the event?', exact: true })).toBeVisible();
  await preset(page, 'Compact');
  await expect(frame.locator('html')).toHaveClass(/coar-theme-editor/);
  await expect.poll(family).toBe('Inter');
  expect(before).not.toBe('Inter');
  await expect(frame.getByRole('dialog', { name: 'Delete the event?', exact: true })).toBeVisible();
  await expect(field).toHaveValue('Dauerhaft');
  expect(await iframe.getAttribute('src')).toBe(url);
  await reset(page);
  await expect(frame.locator('html')).not.toHaveClass(/coar-theme-editor/);
  await expect.poll(family).toBe(before);
  await expect(field).toHaveValue('Dauerhaft');
});

test('the checkbox stays reachable at phone, tablet and desktop widths', async ({ page }) => {
  await page.goto('/components/text-input');
  for (const width of [320, 390, 768, 960, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const on of [true, false]) {
      await follow(page, on);
      if (width >= 768) await expect(page.locator('.VPNavBarMenu')).toBeVisible();
      const rightEdge = await page.locator('.VPNavBar')
        .locator('a:visible, button:visible, input:visible, [role=combobox]:visible')
        .evaluateAll((els) => Math.max(...els.map((el) => el.getBoundingClientRect().right)));
      expect(rightEdge, `visible navigation at ${width}px`).toBeLessThanOrEqual(width);
    }
  }
});

for (const on of [false, true]) {
  test(`a page opened at 320px keeps the menu button on screen (themed docs: ${on})`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.addInitScript((value) => localStorage.setItem('coar-docs-shell-theme', value), on ? 'on' : 'off');
    await page.goto('/components/text-input');
    const menu = page.getByRole('button', { name: 'mobile navigation', exact: true });
    await expect(menu).toBeVisible();
    const box = (await menu.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    // The title gives way, it does not leave the bar.
    const title = (await page.locator('.VPNavBarTitle').boundingBox())!;
    expect(title.x).toBeGreaterThanOrEqual(0);
  });
}
