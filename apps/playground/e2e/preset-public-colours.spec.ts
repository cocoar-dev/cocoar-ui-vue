import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const themeDirectory = `/@fs${resolve(import.meta.dirname, '../../../packages/ui/src/theme')}`;

for (const scheme of ['light', 'dark']) {
  for (const mobile of [false, true]) {
    test(`Enterprise public colours follow root and nested schemes in ${scheme} ${mobile ? 'mobile' : 'desktop'} @touch`, async ({
      page,
    }) => {
      await page.goto(
        `/design-review?frame=1&kind=selection&profile=legacy&mode=${scheme}&mobile=${mobile}`,
      );
      await expect(page.locator('.core-samples')).toBeVisible();
      const samples = await page.evaluate(
        async ({ themeDirectory, scheme, mobile }) => {
          const { serializeRoleTheme } = await import(
            /* @vite-ignore */ `${themeDirectory}/role-theme.ts`
          );
          const { ENTERPRISE_THEME } = await import(
            /* @vite-ignore */ `${themeDirectory}/enterprise-theme.ts`
          );
          const style = document.createElement('style');
          style.textContent = `@layer cocoar.tokens {${serializeRoleTheme(
            '.coar-theme--public-colours',
            ENTERPRISE_THEME,
          )}}`;
          document.head.appendChild(style);
          const root = document.documentElement;
          root.classList.add('coar-theme--public-colours');
          root.classList.toggle('dark-mode', scheme === 'dark');
          root.classList.toggle('coar-mobile', mobile);
          return ['', 'light', 'dark'].map((local) => {
            const scope = document.createElement('section');
            if (local) scope.className = `coar-theme-scope ${local}-mode`;
            document.body.appendChild(scope);
            const thumb = document.createElement('i');
            thumb.style.backgroundColor = 'var(--coar-scrollbar-thumb)';
            thumb.style.color = 'var(--coar-text-on-brand-primary)';
            const hover = document.createElement('i');
            hover.style.backgroundColor = 'var(--coar-scrollbar-thumb-hover)';
            scope.append(thumb, hover);
            const result = {
              scheme: local || scheme,
              thumb: getComputedStyle(thumb).backgroundColor,
              hover: getComputedStyle(hover).backgroundColor,
              textOnBrand: getComputedStyle(thumb).color,
            };
            scope.remove();
            return result;
          });
        },
        { themeDirectory, scheme, mobile },
      );
      for (const sample of samples) {
        const dark = sample.scheme === 'dark';
        const rgb = dark ? '255, 255, 255' : '0, 0, 0';
        expect(sample.thumb).toBe(`rgba(${rgb}, 0.2)`);
        expect(sample.hover).toBe(`rgba(${rgb}, 0.3)`);
        expect(sample.textOnBrand).toBe('rgb(255, 255, 255)');
      }
    });
  }
}
