import { expect, test as base, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';

const themeDirectory = `/@fs${resolve(import.meta.dirname, '../../../packages/ui/src/theme')}`;

const test = base.extend({
  launchOptions: async ({ browserName }, use) => {
    await use(
      browserName === 'chromium'
        ? { args: ['--disable-lcd-text', '--disable-partial-raster'] }
        : {},
    );
  },
});

async function settled(page: Page): Promise<Buffer> {
  let previous = await page.screenshot({ animations: 'disabled', caret: 'hide', fullPage: true });
  for (let i = 0; i < 10; i += 1) {
    const next = await page.screenshot({ animations: 'disabled', caret: 'hide', fullPage: true });
    if (previous.equals(next)) return next;
    previous = next;
  }
  throw new Error('the preset fallback page never settled');
}

for (const preset of ['compact', 'enterprise']) {
  for (const scheme of ['light', 'dark']) {
    for (const mobile of [false, true]) {
      for (const placement of ['document', 'local']) {
        test(`flat ${preset} on ${placement} retains every pixel without @scope in ${scheme} ${mobile ? 'mobile' : 'desktop'} @touch`, async ({
          page,
        }, testInfo) => {
          await page.clock.setFixedTime(new Date('2026-03-10T09:00:00Z'));
          await page.goto(
            `/design-review?frame=1&kind=selection&profile=legacy&mode=${scheme}&mobile=${mobile}`,
          );
          await expect(page.locator('.core-samples')).toBeVisible();
          await page.evaluate(
            async ({ themeDirectory, preset, placement, mobile }) => {
              const { serializeRoleTheme } = await import(
                /* @vite-ignore */ `${themeDirectory}/role-theme.ts`
              );
              const values = await import(
                /* @vite-ignore */ `${themeDirectory}/${preset}-theme.ts`
              );
              const style = document.createElement('style');
              style.textContent = `@layer cocoar.tokens {${serializeRoleTheme(
                '.coar-theme--fallback-test',
                values[preset === 'compact' ? 'COMPACT_THEME' : 'ENTERPRISE_THEME'],
              )}}`;
              document.head.appendChild(style);
              const root =
                placement === 'document'
                  ? document.documentElement
                  : document.querySelector('.core-samples')!;
              root.classList.add('coar-theme--fallback-test');
              if (placement === 'local' && mobile)
                document.documentElement.classList.add('coar-mobile');
            },
            { themeDirectory, preset, placement, mobile },
          );
          await page.evaluate(() => document.fonts.ready);
          const directNativeTargets = await page.evaluate(() => {
            const root = document.documentElement;
            const targets = new Set<Element>();
            const inspect = (container: CSSStyleSheet | CSSGroupingRule, scoped = false) => {
              for (const rule of container.cssRules) {
                if ('cssRules' in rule) {
                  inspect(rule as CSSGroupingRule, scoped || rule.cssText.startsWith('@scope'));
                } else if (scoped && rule instanceof CSSStyleRule) {
                  for (const element of root.querySelectorAll(rule.selectorText)) {
                    if (element.matches('input, textarea')) targets.add(element);
                  }
                }
              }
            };
            for (const sheet of document.styleSheets) {
              try {
                inspect(sheet);
              } catch (error) {
                if (!(error instanceof DOMException && error.name === 'SecurityError')) throw error;
              }
            }
            return targets.size;
          });
          // Safari 26.0–26.3 ignores scoped declarations ON native fields. Our
          // supported container markup gives fields inherited values instead.
          expect(directNativeTargets).toBe(0);
          await page.mouse.move(0, 0);
          const modern = await settled(page);
          const removed = await page.evaluate(() => {
            let removed = 0;
            const strip = (container: CSSStyleSheet | CSSGroupingRule) => {
              for (let i = container.cssRules.length - 1; i >= 0; i -= 1) {
                const rule = container.cssRules[i]!;
                if (rule.cssText.startsWith('@scope')) {
                  container.deleteRule(i);
                  removed += 1;
                } else if ('cssRules' in rule) {
                  strip(rule as CSSGroupingRule);
                }
              }
            };
            for (const sheet of document.styleSheets) {
              try {
                strip(sheet);
              } catch (error) {
                // Font providers can be cross-origin; no preset lives in them.
                if (!(error instanceof DOMException && error.name === 'SecurityError')) throw error;
              }
            }
            return removed;
          });
          expect(removed, 'exercise the fallback by removing native scope rules').toBeGreaterThan(
            0,
          );
          const legacy = await settled(page);
          if (!legacy.equals(modern)) {
            for (const [name, image] of [
              ['scoped.png', modern],
              ['legacy.png', legacy],
            ] as const) {
              const path = testInfo.outputPath(name);
              await writeFile(path, image);
              await testInfo.attach(name, { path, contentType: 'image/png' });
            }
          }
          expect(legacy.equals(modern), 'legacy flat preset must be pixel-identical').toBe(true);
        });
      }
    }
  }
}
