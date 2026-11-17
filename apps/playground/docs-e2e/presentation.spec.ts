import { expect, test, type Page } from '@playwright/test';

const label = 'Documentation presentation';
const key = 'coar-docs-presentation';

async function choose(page: Page, value: 'legacy' | 'compact') {
  if (!await page.locator('.VPNavBar').getByLabel(label).isVisible()) {
    const menu = page.getByRole('button', { name: 'mobile navigation', exact: true });
    await menu.click();
    const select = page.locator('.VPNavScreen').getByLabel(label);
    await expect(select).toHaveCSS('min-height', '44px');
    await select.selectOption(value);
    await menu.click();
  } else {
    await page.locator('.VPNavBar').getByLabel(label).selectOption(value);
  }
  if (value === 'compact') await expect(page.locator('html')).toHaveClass(/coar-compact/);
  else await expect(page.locator('html')).not.toHaveClass(/coar-compact/);
}

async function metrics(page: Page) {
  return page.evaluate(() => {
    const prose = document.querySelector('.vp-doc > div > p:not(.coar-doc-devices)')!;
    const input = document.querySelector('.vp-doc .coar-text-input-field')!;
    return {
      proseFont: getComputedStyle(prose).fontSize,
      proseLine: getComputedStyle(prose).lineHeight,
      nav: document.querySelector('.VPNavBar')!.getBoundingClientRect().height,
      fieldFont: getComputedStyle(input).fontSize,
      frame: input.closest('.coar-input-frame')!.getBoundingClientRect().height,
    };
  });
}

test('legacy is the default; shell and live demos switch and restore without reloading', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/components/text-input');
  await expect(page.locator('.vp-doc .coar-text-input-field').first()).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/coar-compact/);
  const before = await metrics(page);
  const input = page.locator('.vp-doc .coar-text-input-field').first();
  await input.fill('Werte behalten');
  const origin = await page.evaluate(() => performance.timeOrigin);
  await choose(page, 'compact');
  await expect.poll(() => metrics(page)).toMatchObject({ proseFont: '14px', nav: 48, frame: 36, fieldFont: '14px' });
  await expect(input).toHaveValue('Werte behalten');
  await choose(page, 'legacy');
  expect(await metrics(page)).toEqual(before);
  await expect(input).toHaveValue('Werte behalten');
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
  expect(errors).toEqual([]);
});

test('saved style survives reload and a client-side page navigation', async ({ page }) => {
  await page.goto('/components/text-input');
  await choose(page, 'compact');
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe('compact');
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/coar-compact/);
  const origin = await page.evaluate(() => performance.timeOrigin);
  if (!await page.locator('.VPNavBarMenu').isVisible()) {
    await page.getByRole('button', { name: 'mobile navigation', exact: true }).click();
    await page.locator('.VPNavScreen').getByRole('link', { name: 'Components', exact: true }).click();
  } else {
    await page.locator('.VPNavBarMenu').getByRole('link', { name: 'Components', exact: true }).click();
  }
  await expect(page.locator('.vp-doc h1')).toContainText('Button');
  await expect(page.locator('html')).toHaveClass(/coar-compact/);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
});

test('blocked storage still allows live switching for this visit', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Blocked', 'SecurityError'); } });
  });
  await page.goto('/components/text-input');
  await choose(page, 'compact');
  await expect.poll(() => metrics(page)).toMatchObject({ proseFont: '14px', frame: 36 });
  await choose(page, 'legacy');
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass(/coar-compact/);
});

test('light and dark remain independent and open library overlays follow the style', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/components/text-input');
  const darkSwitch = page.locator('.VPNavBarAppearance button');
  await darkSwitch.click();
  await expect(page.locator('html')).toHaveClass(/dark-mode/);
  await choose(page, 'compact');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(28, 36, 49)');
  await page.locator('.VPNavBar .locale-switcher [role=combobox]').click();
  const host = page.locator('.coar-overlay-host');
  // A body-mounted host already inside html.coar-compact inherits the context;
  // only overlays escaping a local opt-in need their own mirrored class.
  await expect(host).toHaveCSS('color-scheme', 'dark');
  await expect(host.locator('.coar-select-option').first()).toHaveCSS('font-family', /Inter/);
  await page.keyboard.press('Escape');
  await choose(page, 'legacy');
  await expect(page.locator('html')).toHaveClass(/dark-mode/);
  await darkSwitch.click();
  await expect(page.locator('html')).not.toHaveClass(/dark-mode/);
  await choose(page, 'compact');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
});

test('Compact inline code stays readable in both color schemes and Legacy restores unchanged', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const path of ['/guide/getting-started', '/components/text-input']) {
    await page.goto(path);
    for (const dark of [false, true]) {
      if (await page.locator('html').evaluate((el) => el.classList.contains('dark')) !== dark) {
        await page.locator('.VPNavBarAppearance button').click();
      }
      await expect(page.locator('html')).toHaveClass(dark ? /dark/ : /^(?!.*\bdark\b)/);
      let legacy: { text: string | null; callout: boolean; ratio: number }[] | undefined;
      for (const profile of ['legacy', 'compact', 'legacy'] as const) {
        await choose(page, profile);
        // Measure the selected appearance, not an interpolated transition color.
        await page.evaluate(async () => {
          await Promise.all(document.getAnimations()
            .filter((animation) => Number.isFinite(animation.effect?.getTiming().iterations))
            .map((animation) => animation.finished.catch(() => {})));
        });
        const contrasts = await page.locator('.vp-doc :not(pre) > code').evaluateAll((elements) => {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 1;
          const ctx = canvas.getContext('2d')!;
          function luminance(rgb: number[]) {
            const [r, g, b] = rgb.map((value) => {
              const s = value / 255;
              return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
            });
            return r * 0.2126 + g * 0.7152 + b * 0.0722;
          }
          return elements.map((code) => {
            // Composite translucent code/callout surfaces over their actual ancestors.
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, 1, 1);
            const ancestors: Element[] = [];
            for (let el: Element | null = code; el; el = el.parentElement) ancestors.unshift(el);
            for (const el of ancestors) {
              ctx.fillStyle = getComputedStyle(el).backgroundColor;
              ctx.fillRect(0, 0, 1, 1);
            }
            const background = luminance(Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3));
            ctx.fillStyle = getComputedStyle(code).color;
            ctx.fillRect(0, 0, 1, 1);
            const foreground = luminance(Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3));
            return {
              text: code.textContent,
              callout: !!code.closest('.custom-block'),
              ratio: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05),
            };
          });
        });
        expect(contrasts.length).toBeGreaterThan(0);
        expect(contrasts.some((code) => code.callout)).toBe(true);
        if (profile === 'compact') {
          for (const code of contrasts) {
            expect(code.ratio, `${path} ${profile} ${dark ? 'dark' : 'light'}: ${code.text}`).toBeGreaterThanOrEqual(4.5);
          }
        } else if (legacy) expect(contrasts).toEqual(legacy);
        else legacy = contrasts;
      }
    }
  }
});

test('PhoneFrame follows the style without reloading or losing a form and open dialog', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/guide/mobile');
  const iframe = page.locator('iframe.coar-phone-frame__viewport').first();
  await iframe.scrollIntoViewIfNeeded();
  const frame = page.frameLocator('iframe.coar-phone-frame__viewport').first();
  await frame.getByPlaceholder('Event name').fill('Dauerhaft');
  const url = await iframe.getAttribute('src');
  await frame.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(frame.getByRole('dialog', { name: 'Delete the event?', exact: true })).toBeVisible();
  await choose(page, 'compact');
  await expect(frame.locator('html')).toHaveClass(/coar-compact/);
  await expect(frame.getByRole('dialog', { name: 'Delete the event?', exact: true })).toBeVisible();
  await expect(frame.getByPlaceholder('Event name')).toHaveValue('Dauerhaft');
  expect(await iframe.getAttribute('src')).toBe(url);
  await frame.getByRole('button', { name: 'Keep', exact: true }).click();
  await choose(page, 'legacy');
  await expect(frame.locator('html')).not.toHaveClass(/coar-compact/);
  await expect(frame.getByPlaceholder('Event name')).toHaveValue('Dauerhaft');
});

test('standalone mobile docs share the choice and retain the mobile class', async ({ page }) => {
  await page.goto('/mobile/#/form');
  await expect(page.locator('html')).toHaveClass(/coar-mobile/);
  const input = page.getByPlaceholder('Event name');
  await input.fill('Mobil behalten');
  await page.getByLabel(label).selectOption('compact');
  await expect(page.locator('html')).toHaveClass(/coar-compact/);
  await expect(page.locator('html')).toHaveClass(/coar-mobile/);
  await expect(input).toHaveValue('Mobil behalten');
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/coar-compact/);
  await page.getByLabel(label).selectOption('legacy');
  await expect(page.locator('html')).not.toHaveClass(/coar-compact/);
  await expect(page.locator('html')).toHaveClass(/coar-mobile/);
});

test('the selector stays reachable at phone, tablet and desktop widths', async ({ page }) => {
  await page.goto('/components/text-input');
  for (const width of [320, 390, 768, 960, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const profile of ['compact', 'legacy'] as const) {
      await choose(page, profile);
      if (width >= 768) await expect(page.locator('.VPNavBarMenu')).toBeVisible();
      const rightEdge = await page.locator('.VPNavBar')
        .locator('a:visible, button:visible, select:visible, [role=combobox]:visible')
        .evaluateAll((els) => Math.max(...els.map((el) => el.getBoundingClientRect().right)));
      expect(rightEdge, `${profile}: visible navigation at ${width}px`).toBeLessThanOrEqual(width);
    }
  }
});
