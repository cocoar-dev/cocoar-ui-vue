import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { libraryScenes } from '../src/design-review/library-scenes';
import { visualStories } from '../src/visual/manifest';
import { approvedEnterpriseReference } from './enterprise-approved-appearance';

const themeUrl = `/@fs${resolve(import.meta.dirname, '../../../packages/ui/src/theme/enterprise-theme.ts')}`;
const serializerUrl = `/@fs${resolve(import.meta.dirname, '../../../packages/ui/src/theme/role-theme.ts')}`;
interface ParityScene {
  id: string;
  ready: string;
  frameHeight: number;
  frameWidth?: number;
  clock?: string;
  visualStory?: string;
}

const scenes: ParityScene[] = [
  ...['fields', 'selection', 'typography', 'dates', 'states'].map((id) => ({
    id, ready: '.core-samples', frameHeight: 900,
  })),
  ...libraryScenes,
  // Reuse the existing default calendar fixtures verbatim. Their exact clocks
  // exercise today/now markers; no protected story or manifest entry is changed.
  ...visualStories.filter((story) => story.name.startsWith('calendar-')).map((story) => {
    if (!story.clock || !story.viewport) {
      throw new Error(`calendar parity requires the fixture's clock and viewport: ${story.name}`);
    }
    return {
      id: story.name,
      ready: '[data-visual-root][data-visual-state="ready"]',
      frameHeight: story.viewport.height,
      frameWidth: story.viewport.width,
      clock: story.clock,
      visualStory: story.name,
    };
  }),
];

/** Require consecutive identical captures, not an arbitrary delay or a pixel tolerance. */
async function settled(page: Page): Promise<Buffer> {
  const capture = () => page.screenshot({ animations: 'disabled', caret: 'hide', fullPage: true });
  let previous = await capture();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const next = await capture();
    if (previous.equals(next)) return next;
    previous = next;
  }
  throw new Error('the Enterprise parity page never settled');
}

async function calendarReady(page: Page, scene: ParityScene): Promise<void> {
  if (scene.visualStory !== 'calendar-month-continuous') return;
  // Offscreen months mount progressively and preserve the scroll anchor.
  // Two identical viewport captures can precede the remaining month renders.
  const calendar = page.locator('.coar-continuous-month-view');
  await expect(calendar.locator('.coar-continuous-month-view__section').first()).toBeAttached();
  await expect(calendar.locator('.coar-continuous-month-view__placeholder'))
    .toHaveCount(0, { timeout: 30_000 });
}

// The same deterministic raster flags as the Docker visual comparison, without
// changing that comparison or any existing story, baseline or tolerance.
test.use({
  launchOptions: { args: ['--disable-lcd-text', '--disable-partial-raster'] },
});

test.describe('Enterprise is the default presentation as a complete theme', () => {
  for (const scene of scenes) {
    for (const scheme of ['light', 'dark']) {
      for (const mobile of [false, true]) {
        test(`${scene.id} ${scheme} ${mobile ? 'mobile' : 'default'}`, async ({ page }, testInfo) => {
          test.setTimeout(120_000);
          await page.setViewportSize({ width: scene.frameWidth ?? 1280, height: Math.max(900, scene.frameHeight) });
          await page.clock.setFixedTime(new Date(scene.clock ?? '2026-03-10T09:00:00Z'));
          await page.goto(scene.visualStory
            ? `/visual.html#/visual/${scene.visualStory}?mode=${mobile ? 'mobile' : 'default'}&scheme=${scheme}`
            : `/design-review?frame=1&kind=${scene.id}&profile=legacy&mode=${scheme}&mobile=${mobile}`);
          await expect(page.locator(scene.ready).first()).toBeVisible({ timeout: 30_000 });
          if (scene.visualStory) {
            await expect(page.locator('.coar-compact'), 'the calendar reference must be the actual default presentation')
              .toHaveCount(0);
          }
          await calendarReady(page, scene);
          await page.evaluate(() => document.fonts.ready);
          await page.mouse.move(0, 0);
          const syntaxReady = async (expectedColors?: string[]): Promise<string[]> => {
            if (scene.id !== 'script-editor') return [];
            const colors: string[] = [];
            // Every populated editor must have its actual syntax tokens. TS
            // and JS load independently; stable un-tokenized frames aren't ready.
            for (const [part, text] of [
              ['editor', '// Route the visit report to the right reviewer.'],
              ['inline', '3'], ['error', 'return'], ['readonly', 'export'],
            ]) {
              const token = page.locator(`[data-scene-part=${part}] .view-line span[class*="mtk"]`)
                .filter({ hasText: text }).first();
              await expect(token).toBeVisible();
              await expect(token).not.toHaveClass(/\bmtk1\b/);
              // Theme changes rebuild Monaco's token color map. A non-mtk1
              // span alone doesn't prove its actual syntax color is ready.
              if (expectedColors) {
                await expect(token).toHaveCSS('color', expectedColors[colors.length]!);
              }
              colors.push(await token.evaluate((element) => getComputedStyle(element).color));
            }
            return colors;
          };
          const syntaxColors = await syntaxReady();
          const before = await settled(page);
          const approvedCss = approvedEnterpriseReference(scene.id, scheme);
          let expected = before;
          if (approvedCss) {
            const referenceStyle = await page.addStyleTag({ content: approvedCss });
            expected = await settled(page);
            expect(expected.equals(before), 'the approved reference must exercise a visible delta').toBe(false);
            await referenceStyle.evaluate((element) => element.remove());
          }

          await page.evaluate(async ({ themeUrl, serializerUrl }) => {
            const { ENTERPRISE_THEME } = await import(/* @vite-ignore */ themeUrl);
            const { serializeRoleTheme } = await import(/* @vite-ignore */ serializerUrl);
            const style = document.createElement('style');
            style.textContent = `@layer cocoar.tokens {\n${serializeRoleTheme('.coar-theme--enterprise', ENTERPRISE_THEME)}}`;
            document.head.appendChild(style);
            document.documentElement.classList.add('coar-theme--enterprise');
          }, { themeUrl, serializerUrl });
          await calendarReady(page, scene);
          await page.evaluate(() => document.fonts.ready);
          await expect(page.locator(scene.ready).first()).toBeVisible();
          await syntaxReady(syntaxColors);
          const after = await settled(page);
          if (!expected.equals(after)) {
            for (const [name, image] of [
              ['without-theme.png', before], ['expected-enterprise.png', expected], ['enterprise-theme.png', after],
            ] as const) {
              const path = testInfo.outputPath(name);
              await writeFile(path, image);
              await testInfo.attach(name, { path, contentType: 'image/png' });
            }
          }
          expect(after.equals(expected),
            approvedCss
              ? 'Enterprise must match the no-theme reference plus exactly the approved appearance'
              : 'Enterprise must preserve every default-presentation pixel',
          ).toBe(true);
        });
      }
    }
  }
});
