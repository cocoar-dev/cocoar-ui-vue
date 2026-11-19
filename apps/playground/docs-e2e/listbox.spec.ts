import { expect, test } from '@playwright/test';

for (const profile of ['legacy', 'compact'] as const) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`${profile} ${scheme} listbox keeps its rounded scroll viewport usable`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      // Compact through its class entry on <html> before the first paint, as an app opts in.
      if (profile === 'compact') {
        await page.addInitScript(() => {
          const apply = () => document.documentElement?.classList.add('coar-compact');
          if (document.documentElement) apply();
          else new MutationObserver((_, observer) => {
            if (!document.documentElement) return;
            apply();
            observer.disconnect();
          }).observe(document, { childList: true });
        });
      }
      await page.goto('/components/listbox');
      if (scheme === 'dark') {
        await page.locator('.VPNavBarAppearance button').click();
        await expect(page.locator('html')).toHaveClass(/dark-mode/);
      }

      // Make an opaque classic track unmistakable, including in WebKit's
      // overlay-scrollbar environment. The component's more specific Compact
      // rules must override it; Legacy deliberately retains its native styling.
      await page.addStyleTag({
        content: `
          .coar-listbox-list::-webkit-scrollbar { width: 16px; height: 16px; }
          .coar-listbox-list::-webkit-scrollbar-track { background: rgb(255, 0, 255); }
          .coar-listbox-list::-webkit-scrollbar-thumb { background: gray; border-radius: 8px; }
        `,
      });
      const host = page.locator('.coar-listbox').first();
      const list = host.locator('.coar-listbox-list');
      await expect(list.getByRole('option')).toHaveCount(6);
      // Six Legacy rows fit the demo's normal height. Use a short viewport so
      // every profile must actually paint and operate a scrollbar.
      await list.evaluate((el) => {
        el.style.height = '120px';
        el.style.flex = 'none';
      });
      expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
      const standardScrollbars = await page.evaluate(() =>
        CSS.supports('scrollbar-color', 'gray transparent'),
      );

      if (profile === 'compact') {
        for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
          await expect(list).toHaveCSS(`border-${corner}-radius`, '6px');
        }
        if (standardScrollbars) {
          await expect(list).toHaveCSS('scrollbar-color', /rgba\(0, 0, 0, 0\)$/);
        }
      } else if (standardScrollbars) {
        await expect(list).toHaveCSS('scrollbar-color', 'auto');
      }

      const image = await list.screenshot({ scale: 'css' });
      const opaqueTrackPixels = await page.evaluate(
        async (data) => {
          const image = new Image();
          image.src = data;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext('2d')!;
          context.drawImage(image, 0, 0);
          const pixels = context.getImageData(0, 0, image.width, image.height).data;
          let count = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i] > 220 && pixels[i + 1] < 80 && pixels[i + 2] > 220) count++;
          }
          return count;
        },
        `data:image/png;base64,${image.toString('base64')}`,
      );

      if (profile === 'compact') {
        expect(opaqueTrackPixels, 'opaque track must not cover the rounded border').toBe(0);
        if (!standardScrollbars) {
          // The fallback keeps a real, visible 12px scrollbar plus the 2px border.
          expect(await list.evaluate((el) => el.offsetWidth - el.clientWidth)).toBe(14);
        }
      } else if (!standardScrollbars) {
        expect(
          opaqueTrackPixels,
          'the WebKit fixture must reproduce an opaque track',
        ).toBeGreaterThan(0);
      }

      await list.press('End');
      await expect.poll(() => list.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
      const last = list.getByRole('option', { name: 'Fig', exact: true });
      await expect(last).toHaveAttribute('aria-selected', 'true');
      await list.press('Space');
      await expect(last).toHaveAttribute('aria-selected', 'false');
      await list.press('Space');
      await expect(last).toHaveAttribute('aria-selected', 'true');
      expect(await list.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
      await expect(list).not.toHaveCSS('box-shadow', 'none');
      await host.getByRole('textbox').fill('Apple');
      await expect(list.getByRole('option')).toHaveCount(1);
      await expect(list.getByRole('option', { name: 'Apple', exact: true })).toBeVisible();
    });
  }
}
