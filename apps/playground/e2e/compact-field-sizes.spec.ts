import { expect, test } from '@playwright/test';

const values = 'input:not([type=hidden]), textarea, .coar-select-value, .coar-time-picker__value';

function readFields(scope: Element) {
  return Array.from(scope.querySelectorAll('[data-font-size]')).map((row) => ({
    size: row.getAttribute('data-font-size')!,
    fields: Array.from(row.querySelectorAll('[data-font-family]')).map((field) => ({
      family: field.getAttribute('data-font-family')!,
      fonts: Array.from(field.querySelectorAll(
        'input:not([type=hidden]), textarea, .coar-select-value, .coar-time-picker__value',
      )).map((el) => getComputedStyle(el).fontSize),
      heights: Array.from(field.querySelectorAll(
        '.coar-input-frame, .coar-otp-input__cell, .coar-time-picker__value',
      )).map((el) => el.getBoundingClientRect().height),
    })),
  }));
}

for (const mode of ['light', 'dark']) {
  for (const mobile of [false, true]) {
    const suffix = `${mode}, mobile=${mobile} @touch`;

    test(`all field families scale their text without changing box heights or legacy: ${suffix}`, async ({ page }) => {
      await page.goto(`/design-review/field-sizes?mode=${mode}&mobile=${mobile}`);
      const compact = page.locator('[data-font-profile=compact]');
      const legacy = page.locator('[data-font-profile=legacy]');
      await expect(compact.locator('[data-font-size=l] [data-font-family=otp] input')).toHaveCount(6);
      await page.evaluate(async () => { await document.fonts.ready; });

      const current = await compact.evaluate(readFields);
      const old = await legacy.evaluate(readFields);
      expect(current.map((row) => row.size)).toEqual(['xs', 's', 'm', 'l']);
      for (let i = 0; i < current.length; i++) {
        const row = current[i];
        const font = (mobile ? [16, 16, 16, 18] : [12, 13, 14, 16])[i] + 'px';
        expect(row.fields).toHaveLength(12);
        for (const field of row.fields) {
          expect(field.fonts.length, field.family).toBeGreaterThan(0);
          expect([...new Set(field.fonts)], `${row.size}/${field.family}`).toEqual([font]);
        }
        for (const field of old[i].fields) {
          // Legacy time cells are non-editable spans and keep their original size scale.
          const expected = (mobile && field.family !== 'time' ? 16 : [11, 13, 14, 16][i]) + 'px';
          expect([...new Set(field.fonts)], `legacy ${row.size}/${field.family}`).toEqual([expected]);
        }
        const text = compact.locator(`[data-font-size=${row.size}] [data-font-family=text] .coar-input-frame`);
        expect((await text.boundingBox())!.height).toBe((mobile ? [44, 44, 44, 48] : [24, 32, 36, 44])[i]);
        const tagLabel = compact.locator(`[data-font-size=${row.size}] [data-font-family=tags] .coar-tag-select-tag-label`);
        // Retain the chip's caption scale, not the field font or textarea's normal metrics.
        await expect(tagLabel).toHaveCSS('line-height', [12, 16, 18, 22][i] + 'px');
      }

      // Recreate the previous uniform text scale, not a different layout recipe.
      await compact.evaluate((scope: HTMLElement) => {
        for (const size of ['xs', 's', 'l']) {
          scope.style.setProperty(`--coar-field-${size}-font-size`, 'var(--coar-field-font-size)');
        }
      });
      const uniform = await compact.evaluate(readFields);
      expect(uniform.map((row) => row.fields.map((field) => field.heights)))
        .toEqual(current.map((row) => row.fields.map((field) => field.heights)));
      expect(await legacy.evaluate(readFields)).toEqual(old);
    });

    test(`base text, independent size overrides and mobile floor survive nested themes: ${suffix}`, async ({ page }) => {
      await page.goto(`/design-review/field-sizes?mode=${mode}&mobile=${mobile}`);
      const compact = page.locator('[data-font-profile=compact]');
      await expect(compact.locator('[data-font-size=l] [data-font-family=otp] input')).toHaveCount(6);
      await compact.evaluate((scope: HTMLElement) => {
        scope.style.setProperty('--coar-field-font-size', '18px');
        scope.querySelector('[data-font-content]')!.classList.add('dark-mode');
      });
      for (const [i, size] of ['xs', 's', 'm', 'l'].entries()) {
        const fonts = await compact.locator(`[data-font-size=${size}]`).locator(values)
          .evaluateAll((els) => [...new Set(els.map((el) => getComputedStyle(el).fontSize))]);
        expect(fonts).toEqual([[16, 17, 18, 20][i] + 'px']);
      }
      await compact.evaluate((scope: HTMLElement) => {
        scope.style.setProperty('--coar-field-s-font-size', '22px');
        scope.style.setProperty('--coar-field-xs-font-size', '10px');
        scope.style.setProperty('--coar-field-l-font-size', '19px');
      });
      for (const boundary of ['dark-mode', 'light-mode', 'coar-theme-scope', 'data-theme=dark', 'data-theme=light']) {
        await compact.locator('[data-font-content]').evaluate((scope, boundary) => {
          scope.className = boundary.startsWith('data-theme=') ? '' : boundary;
          if (boundary.startsWith('data-theme=')) scope.setAttribute('data-theme', boundary.split('=')[1]);
          else scope.removeAttribute('data-theme');
        }, boundary);
        const fonts = await compact.evaluate(readFields);
        for (const [i, expected] of [mobile ? '16px' : '10px', '22px', '18px', '19px'].entries()) {
          expect([...new Set(fonts[i].fields.flatMap((field) => field.fonts))], boundary).toEqual([expected]);
        }
      }
      const field = compact.locator('[data-font-size=s] [data-font-family=select]');
      await field.locator('.coar-input-frame').click();
      const host = page.locator('.coar-overlay-host.coar-compact');
      const transported = await host.evaluate((scope) => {
        const probe = document.createElement('span');
        probe.style.fontSize = 'max(var(--coar-field-s-font-size, var(--coar-field-s-default-font-size)), var(--coar-field-min-font-size))';
        scope.appendChild(probe);
        const size = getComputedStyle(probe).fontSize;
        probe.remove();
        return size;
      });
      expect(transported).toBe('22px');
      await page.keyboard.press('Escape');
    });

    test(`large multiline glyphs have room above the retained medium row floor: ${suffix}`, async ({ page }) => {
      await page.goto(`/design-review/field-sizes?mode=${mode}&mobile=${mobile}`);
      const textarea = page.locator('[data-font-profile=compact] [data-font-size=l] textarea');
      await textarea.fill('Übergrößenträger jagen\nÄgyptische ÜÖÄ mögen\ngrößere Zeilen');
      await page.evaluate(async () => { await document.fonts.ready; });
      const metrics = await textarea.evaluate((el) => {
        const style = getComputedStyle(el);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const glyphs = context.measureText('Übergrößenträger jagen Ägyptische ÜÖÄ');
        return {
          font: parseFloat(style.fontSize),
          line: parseFloat(style.lineHeight),
          ink: glyphs.actualBoundingBoxAscent + glyphs.actualBoundingBoxDescent,
          height: el.clientHeight,
        };
      });
      expect(metrics.font).toBe(mobile ? 18 : 16);
      expect(metrics.line).toBeGreaterThanOrEqual(metrics.font * 1.25);
      expect(metrics.line).toBeGreaterThanOrEqual(metrics.ink);
      expect(metrics.height).toBeGreaterThanOrEqual(metrics.line * 3);
      await textarea.screenshot({ path: test.info().outputPath('large-umlauts.png') });
    });

    test(`single and multi-select inline searches use their field size and transport the roles: ${suffix}`, async ({ page }) => {
      await page.goto(`/design-review/field-sizes?mode=${mode}&mobile=${mobile}`);
      const compact = page.locator('[data-font-profile=compact]');
      for (const [i, size] of ['xs', 's', 'm', 'l'].entries()) {
        const font = (mobile ? [16, 16, 16, 18] : [12, 13, 14, 16])[i] + 'px';
        for (const family of ['select', 'multi']) {
          const field = compact.locator(`[data-font-size=${size}] [data-font-family=${family}]`);
          await field.locator('.coar-input-frame').click();
          await expect(field.locator('.coar-select-inline-search')).toHaveCSS('font-size', font);
          const host = page.locator('.coar-overlay-host.coar-compact');
          const transported = await host.evaluate((scope) => {
            const probe = document.createElement('span');
            probe.style.fontSize = 'max(var(--coar-field-xs-font-size, var(--coar-field-xs-default-font-size)), var(--coar-field-min-font-size))';
            scope.appendChild(probe);
            const value = getComputedStyle(probe).fontSize;
            probe.remove();
            return value;
          });
          expect(transported).toBe(mobile ? '16px' : '12px');
          await page.keyboard.press('Escape');
          await expect(field.locator('.coar-select-inline-search')).toHaveCount(0);
        }
        for (const family of ['select', 'multi']) {
          const field = page.locator(`[data-font-profile=legacy] [data-font-size=${size}] [data-font-family=${family}]`);
          await field.locator('.coar-input-frame').click();
          // Legacy multi-select searches intentionally kept the medium text size.
          const legacyFont = (mobile ? 16 : family === 'multi' ? 14 : [11, 13, 14, 16][i]) + 'px';
          await expect(field.locator('.coar-select-inline-search')).toHaveCSS('font-size', legacyFont);
          await page.keyboard.press('Escape');
          await expect(field.locator('.coar-select-inline-search')).toHaveCount(0);
        }
      }
    });
  }
}
