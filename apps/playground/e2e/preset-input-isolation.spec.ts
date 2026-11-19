import { expect, test, type Locator } from '@playwright/test';
import { resolve } from 'node:path';

const themeDirectory = `/@fs${resolve(import.meta.dirname, '../../../packages/ui/src/theme')}`;

async function settled(surface: Locator): Promise<Buffer> {
  let previous = await surface.screenshot({ animations: 'disabled', caret: 'hide' });
  for (let i = 0; i < 10; i += 1) {
    const next = await surface.screenshot({ animations: 'disabled', caret: 'hide' });
    if (previous.equals(next)) return next;
    previous = next;
  }
  throw new Error('the annotation surface never settled');
}

for (const scheme of ['light', 'dark']) {
  for (const mobile of [false, true]) {
    for (const enterpriseLast of [false, true]) {
      test(`preset inputs are isolated ${scheme} ${mobile ? 'mobile' : 'desktop'} Enterprise CSS ${enterpriseLast ? 'last' : 'first'} @touch`, async ({ page }) => {
        await page.goto(`/design-review?frame=1&kind=document-viewer&profile=legacy&mode=${scheme}&mobile=${mobile}`);
        await expect(page.locator('.coar-pdf-viewer').first()).toBeVisible();
        const comparisons = await page.evaluate(async ({ themeDirectory, enterpriseLast }) => {
          const { COMPACT_THEME } = await import(/* @vite-ignore */ `${themeDirectory}/compact-theme.ts`);
          const { ENTERPRISE_THEME } = await import(/* @vite-ignore */ `${themeDirectory}/enterprise-theme.ts`);
          const { serializeRoleTheme } = await import(/* @vite-ignore */ `${themeDirectory}/role-theme.ts`);
          const names: string[] = [...new Set<string>([
            ...Object.keys(COMPACT_THEME.tokens),
            ...Object.keys(COMPACT_THEME.mobileTokens),
            ...Object.keys(ENTERPRISE_THEME.tokens),
            ...Object.keys(ENTERPRISE_THEME.mobileTokens),
            ...Object.keys(ENTERPRISE_THEME.roles),
          ])];
          const classFor = (name: string) => `coar-theme--isolation-${name}`;
          const style = document.createElement('style');
          const definitions = [
            serializeRoleTheme(`.${classFor('compact')}`, COMPACT_THEME),
            serializeRoleTheme(`.${classFor('enterprise')}`, ENTERPRISE_THEME),
          ];
          style.textContent = `@layer cocoar.tokens {${(enterpriseLast ? definitions : definitions.reverse()).join('\n')}}`;
          document.head.appendChild(style);
          const fixture = document.createElement('div');
          document.body.appendChild(fixture);
          const boundaries = [
            '', 'coar-theme-scope', 'coar-theme-none', 'coar-mobile',
            'light-mode', 'dark-mode', 'data-theme',
          ];
          const scopes = (parent: HTMLElement, name: string) => {
            const root = document.createElement('section');
            root.className = classFor(name);
            parent.appendChild(root);
            return root;
          };
          const measure = (parent: HTMLElement) => boundaries.map((boundary) => {
            const scope = document.createElement('div');
            scope.className = boundary;
            if (boundary === 'data-theme') scope.dataset.theme = 'dark';
            parent.appendChild(scope);
            const viewer = document.createElement('div');
            viewer.className = 'coar-pdf-viewer';
            scope.appendChild(viewer);
            const css = getComputedStyle(viewer);
            const result = Object.fromEntries(names.map((name) => [name, css.getPropertyValue(name).trim()]));
            result['viewer-small-font'] = css.getPropertyValue('--coar-document-viewer-small-font-size').trim();
            result['text-colour'] = css.color;
            scope.remove();
            return { boundary, values: result };
          });
          const results = [];
          for (const inner of ['compact', 'enterprise']) {
            const outer = inner === 'compact' ? 'enterprise' : 'compact';
            const standalone = scopes(fixture, inner);
            const expected = measure(standalone);
            const surrounding = scopes(fixture, outer);
            const nested = scopes(surrounding, inner);
            results.push({ name: `${outer} → ${inner}`, expected, actual: measure(nested) });
            for (const root of [standalone, nested]) {
              root.style.setProperty('--coar-ui-font-size', '23px');
              root.style.setProperty('--coar-appearance-accent', '#e4572e');
            }
            results.push({ name: `live consumer inputs ${outer} → ${inner}`,
              expected: measure(standalone), actual: measure(nested) });
            standalone.removeAttribute('style');
            nested.removeAttribute('style');
            const sandwich = scopes(nested, outer);
            const reference = scopes(fixture, outer);
            results.push({ name: `${outer} → ${inner} → ${outer}`, expected: measure(reference), actual: measure(sandwich) });
            sandwich.remove();
            surrounding.className = '';
            results.push({ name: `remove outer ${outer}`, expected, actual: measure(nested) });
            surrounding.className = classFor(outer);
            nested.className = '';
            results.push({ name: `remove inner ${inner}`, expected: measure(reference), actual: measure(nested) });
            fixture.replaceChildren();
          }
          fixture.remove();
          style.remove();
          return results;
        }, { themeDirectory, enterpriseLast });
        for (const comparison of comparisons) {
          expect(comparison.actual, comparison.name).toEqual(comparison.expected);
        }
      });
    }
  }
}

for (const inner of ['compact', 'enterprise']) {
  for (const scheme of ['light', 'dark']) {
    for (const mobile of [false, true]) {
      test(`open ${inner} annotation stays isolated from a different outer preset in ${scheme} ${mobile ? 'mobile' : 'desktop'} @touch`, async ({ page }) => {
        await page.goto(`/design-review?frame=1&kind=document-viewer-open&profile=legacy&mode=${scheme}&mobile=${mobile}`);
        const viewer = page.locator('.coar-pdf-viewer').first();
        await expect(viewer.locator('.coar-pdf-annotation-pin').first()).toBeVisible();
        await viewer.evaluate(async (element, { themeDirectory, inner }) => {
          const { COMPACT_THEME } = await import(/* @vite-ignore */ `${themeDirectory}/compact-theme.ts`);
          const { ENTERPRISE_THEME } = await import(/* @vite-ignore */ `${themeDirectory}/enterprise-theme.ts`);
          const { serializeRoleTheme } = await import(/* @vite-ignore */ `${themeDirectory}/role-theme.ts`);
          const style = document.createElement('style');
          style.textContent = `@layer cocoar.tokens {
            ${serializeRoleTheme('.coar-theme--teleport-compact', COMPACT_THEME)}
            ${serializeRoleTheme('.coar-theme--teleport-enterprise', ENTERPRISE_THEME)}
          }`;
          document.head.appendChild(style);
          element.parentElement!.classList.add(`coar-theme--teleport-${inner}`);
        }, { themeDirectory, inner });
        await viewer.locator('.coar-pdf-annotation-pin').first().click();
        const popover = page.locator('.coar-pdf-annotation-popover');
        await expect(popover).toBeVisible();
        await page.mouse.move(0, 0);
        const reference = await settled(popover);
        const outer = inner === 'compact' ? 'enterprise' : 'compact';
        const outerClass = `coar-theme--teleport-${outer}`;
        await page.locator('html').evaluate((element, name) => element.classList.add(name), outerClass);
        expect((await settled(popover)).equals(reference), 'a differently themed body must not change the open teleport').toBe(true);
        await viewer.evaluate((element) =>
          (element.parentElement as HTMLElement).style.setProperty('--coar-theme-document-viewer-font-size', '19px'));
        await expect(popover).toHaveCSS('font-size', '19px');
        await viewer.evaluate((element) =>
          (element.parentElement as HTMLElement).style.removeProperty('--coar-theme-document-viewer-font-size'));
        await page.locator('html').evaluate((element, name) => element.classList.remove(name), outerClass);
        expect((await settled(popover)).equals(reference), 'removing the outer preset must restore the same open teleport').toBe(true);
      });
    }
  }
}
