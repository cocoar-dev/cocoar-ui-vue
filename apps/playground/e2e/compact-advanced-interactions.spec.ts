import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  for (const mobile of [false, true]) {
    test(`page-builder pointer ghost retains its own chrome roles (${scheme}, mobile=${mobile})`, async ({ page }) => {
      await page.goto(`/design-review?kind=page-builder&profile=compact&mode=${scheme}&mobile=${mobile}`);
      const profile = page.locator('[data-review-profile=compact]');
      const rows = profile.locator('.pb-tree-row');
      await expect(rows.first()).toBeVisible();
      const count = await rows.count();
      const grip = rows.nth(1).locator('.pb-tree-grip');
      const expected = await rows.nth(1).evaluate((row) => {
        const style = getComputedStyle(row);
        const probe = document.createElement('span');
        probe.style.color = 'var(--coar-background-neutral-primary)';
        row.appendChild(probe);
        const surface = getComputedStyle(probe).color;
        probe.remove();
        return { font: style.fontFamily, size: style.fontSize, line: style.lineHeight, surface };
      });
      const point = (await grip.boundingBox())!;
      await page.mouse.move(point.x + point.width / 2, point.y + point.height / 2);
      await page.mouse.down();
      await page.mouse.move(point.x + 60, point.y + 50, { steps: 3 });
      const ghost = page.locator('body > .pb-dnd-ghost');
      await expect(ghost).toBeVisible();
      await expect(ghost).toHaveClass(/coar-compact/);
      expect((await ghost.getAttribute('class'))!.includes('coar-mobile')).toBe(mobile);
      await expect(ghost).toHaveCSS('font-family', expected.font);
      await expect(ghost).toHaveCSS('font-size', expected.size);
      await expect(ghost).toHaveCSS('line-height', expected.line);
      await expect(ghost).toHaveCSS('color-scheme', scheme);
      await expect(ghost).toHaveCSS('background-color', expected.surface);
      await expect(ghost.locator('.pb-tree-row')).toHaveCSS('font-size', expected.size);
      await page.keyboard.press('Escape');
      await page.mouse.up();
      await expect(ghost).toHaveCount(0);
      await expect(rows).toHaveCount(count);
    });

    test(`month day sheet measures its real close/header budget (${scheme}, mobile=${mobile})`, async ({ page }) => {
      await page.clock.setSystemTime(new Date('2026-04-15T08:30:00Z'));
      await page.goto(`/visual.html#/visual/compact-calendar-month?mode=${mobile ? 'mobile' : 'default'}&scheme=${scheme}`);
      await expect(page.locator('[data-visual-root]')).toHaveAttribute('data-visual-state', 'ready');
      const sheet = page.locator('.coar-month-day-overlay');
      await expect(sheet).toBeVisible();
      const close = sheet.locator('.coar-month-day-overlay__close');
      const size = mobile ? 44 : 32;
      await expect(close).toHaveCSS('width', `${size}px`);
      await expect(close).toHaveCSS('height', `${size}px`);
      const budget = await sheet.evaluate((node) => {
        const style = getComputedStyle(node);
        const header = node.querySelector<HTMLElement>('.coar-month-day-overlay__header')!;
        const list = node.querySelector('.coar-month-day-overlay__list')!;
        const frame = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth']
          .reduce((sum, key) => sum + (parseFloat(style[key as keyof CSSStyleDeclaration] as string) || 0), 0);
        return header.offsetHeight + frame + parseFloat(getComputedStyle(list).maxHeight);
      });
      expect(budget).toBe(360);
      expect((await sheet.boundingBox())!.height).toBeLessThanOrEqual(360);
      await close.click();
      await expect(sheet).toHaveCount(0);
      // Reopen through the real overflow affordance and close by keyboard.
      await page.locator('[data-day-key="2026-04-14"] .coar-month-cell__overflow').click();
      await expect(sheet).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(sheet).toHaveCount(0);
      await expect(page.locator('[data-day-key="2026-04-14"] .coar-month-cell__overflow')).toBeFocused();
    });

    test(`narrow compact week keeps every day reachable without clipping (${scheme}, mobile=${mobile})`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 900 });
      await page.clock.setFixedTime(new Date('2026-04-15T08:30:00Z'));
      await page.goto(`/visual.html#/visual/compact-calendar-week?mode=${mobile ? 'mobile' : 'default'}&scheme=${scheme}`);
      const root = page.locator('[data-visual-root]');
      await expect(root).toHaveAttribute('data-visual-state', 'ready');
      // Exercise the existing real scene in a narrow host, not a changed
      // visual recipe or an updated default-presentation baseline.
      await root.evaluate((el) => {
        document.body.style.margin = '0';
        Object.assign((el as HTMLElement).style, { width: '390px', padding: '0' });
      });
      const body = page.locator('.coar-calendar__body--week');
      await expect(page.locator('.coar-time-grid--scrollable-x')).toBeVisible();
      await expect(body).toHaveCSS('overflow-x', 'auto');
      const widths = await page.locator('.coar-time-grid-event[data-event-id]').evaluateAll((cards) =>
        cards.map((card) => card.getBoundingClientRect().width));
      expect(widths.length).toBeGreaterThan(5);
      expect(Math.min(...widths)).toBeGreaterThanOrEqual(24);
      const headers = page.locator('.coar-time-grid-header__cell');
      const dates = await headers.allTextContents();

      if (mobile) {
        const cdp = await page.context().newCDPSession(page);
        const box = (await headers.first().boundingBox())!;
        const y = box.y + box.height / 2;
        try {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y }] });
          for (let x = 280; x >= 100; x -= 20) {
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
          }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await expect.poll(() => body.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
          expect(await headers.allTextContents()).toEqual(dates);
        } finally {
          await cdp.detach();
        }
      }

      await body.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
      const saturday = headers.filter({ hasText: 'Sat' });
      await expect.poll(() => saturday.evaluate((el) => el.getBoundingClientRect().right)).toBeLessThanOrEqual(390);
      expect((await saturday.boundingBox())!.x).toBeGreaterThanOrEqual(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    });
  }
}
