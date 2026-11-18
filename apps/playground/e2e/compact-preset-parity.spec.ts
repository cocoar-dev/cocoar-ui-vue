import { expect, test, type Page } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { visualStories, type VisualStory } from '../src/visual/manifest';

/**
 * The Compact presentation is a set of values: a theme class that carries them, with
 * no `.coar-compact` anywhere, must paint exactly what the `.coar-compact` entry paints.
 *
 * Each case photographs a page twice in the same browser: as it is (the class entry,
 * whose images the visual baselines pin against the beta), and again with every
 * `coar-compact` class replaced by `coar-theme--compact` before the first paint and the
 * Compact values loaded as an ordinary theme stylesheet for that class, the way an
 * exported theme ships. The two images must be identical, pixel for pixel. The pages
 * themselves (stories, review scenes) are not changed for this.
 *
 * Covered: forms and open panels, calendar, data grid, page builder with its real
 * editors, markdown, viewer, map, Mermaid and Monaco, in both colour schemes, desktop
 * and `.coar-mobile` (class emulation in desktop Chromium, not a device run).
 */

const THEME = 'coar-theme--compact';

const forTheme = (file: string) =>
  readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8').replaceAll('.coar-compact', `.${THEME}`);

/**
 * The generated `.coar-compact` entry, for another selector: an exported theme. With
 * it the one rule of the scenes themselves that names the class (they paint their own
 * canvas; the library never paints an application's page background).
 */
const themeCss = [
  '../../../packages/ui/styles/tokens/compact.css',
  '../src/visual/stories/compact-scene.css',
].map(forTheme).join('\n');

/** Runs in the page before any script of it: no element keeps the class past a microtask. */
function replaceClass({ css, theme }: { css: string; theme: string }) {
  const swap = (element: Element) => {
    if (!element.classList.contains('coar-compact')) return;
    element.classList.remove('coar-compact');
    element.classList.add(theme);
  };
  const scan = (node: Node) => {
    if (!(node instanceof Element)) return;
    swap(node);
    node.querySelectorAll('.coar-compact').forEach(swap);
  };
  new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes') swap(record.target as Element);
      else record.addedNodes.forEach(scan);
    }
  }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.dataset.presetParity = '';
    style.textContent = css;
    document.head.appendChild(style);
    scan(document.documentElement);
  });
}

interface Case {
  name: string;
  url: string;
  viewport?: { width: number; height: number };
  clock?: string;
  /** Resolves when the page shows its final content. */
  ready: (page: Page) => Promise<void>;
}

const variants = [
  { mode: 'default', scheme: 'light' },
  { mode: 'default', scheme: 'dark' },
  { mode: 'mobile', scheme: 'light' },
  { mode: 'mobile', scheme: 'dark' },
] as const;

const STORIES = [
  'compact-core-fields', 'compact-core-selection', 'compact-core-states', 'compact-core-dates',
  'compact-core-typography', 'compact-display-data', 'compact-display-navigation',
  'compact-display-lists', 'compact-display-indicators', 'compact-calendar-week',
  'compact-calendar-month', 'compact-calendar-agenda', 'compact-interaction-select-open',
  'compact-interaction-multi-select-open', 'compact-interaction-date-picker-open',
  'compact-interaction-dialog-open', 'compact-interaction-context-menu-open',
  'compact-display-popover-open', 'compact-builder-editors',
];

function storyCase(story: VisualStory, mode: string, scheme: string): Case {
  return {
    name: `${story.name} ${mode} ${scheme}`,
    url: `/visual.html#/visual/${story.name}?mode=${mode}&scheme=${scheme}`,
    viewport: story.viewport,
    clock: story.clock,
    ready: async (page) => {
      await expect(page.locator('[data-visual-root]')).toHaveAttribute('data-visual-state', 'ready');
      for (const action of story.open?.actions ?? []) {
        if ('keyboardFocus' in action) {
          await page.keyboard.press('Shift');
          await page.locator(action.keyboardFocus).focus();
        } else if ('dispatch' in action) await page.locator(action.on).dispatchEvent(action.dispatch);
        else await page.locator(action.on).press(action.press);
      }
      if (story.open) {
        const hosts = page.locator('.coar-overlay-host');
        await expect(hosts).toHaveCount(story.open.overlays);
        for (let i = 0; i < story.open.overlays; i += 1) await expect(hosts.nth(i)).toHaveCSS('opacity', '1');
        if (story.open.ready) await expect(page.locator(story.open.ready).first()).toBeAttached();
      }
      for (const selector of story.ready ?? []) await expect(page.locator(selector)).toBeVisible();
    },
  };
}

/** Library scenes of the design review, one profile per page (`frame=1`: the theme sits on `html`). */
const SCENES: Record<string, string> = {
  'data-grid': '.ag-row',
  'data-grid-tree': '.ag-row',
  'document-viewer-open': '.coar-pdf-anno-panel__item',
  map: '.leaflet-marker-icon',
  'markdown-viewer': '.coar-markdown h1',
  'markdown-editor': '.ProseMirror',
  'markdown-form': '[data-scene-part=fill] input',
  'page-builder': '.pb-tree-row',
  mermaid: '.coar-mermaid[data-status=rendered] svg',
  'script-editor': '.monaco-editor .view-lines',
};

function sceneCase(kind: string, mode: string, mobile: boolean): Case {
  return {
    name: `${kind} ${mobile ? 'mobile' : 'default'} ${mode}`,
    url: `/design-review?frame=1&kind=${kind}&profile=compact&mode=${mode}&mobile=${mobile}`,
    viewport: { width: 1280, height: 900 },
    clock: '2026-03-10T09:00:00Z',
    ready: async (page) => {
      await expect(page.locator(SCENES[kind]).first()).toBeVisible({ timeout: 20_000 });
    },
  };
}

const cases: Case[] = [
  ...STORIES.flatMap((name) => {
    const story = visualStories.find((entry) => entry.name === name);
    if (!story) throw new Error(`no visual story "${name}"`);
    const modes = story.scope === 'local' ? variants.filter((v) => v.mode === 'mobile') : variants;
    return modes.map((variant) => storyCase(story, variant.mode, variant.scheme));
  }),
  ...Object.keys(SCENES).flatMap((kind) => [
    sceneCase(kind, 'light', false),
    sceneCase(kind, 'dark', true),
  ]),
];

/** Two consecutive identical captures: nothing is still loading, moving or blinking. */
async function settled(page: Page): Promise<Buffer> {
  const shot = () => page.screenshot({ animations: 'disabled', caret: 'hide' });
  let previous = await shot();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await page.waitForTimeout(150);
    const next = await shot();
    if (next.equals(previous)) return next;
    previous = next;
  }
  throw new Error('the page never settled');
}

async function capture(page: Page, entry: Case, classFree: boolean): Promise<Buffer> {
  if (classFree) await page.addInitScript(replaceClass, { css: themeCss, theme: THEME });
  if (entry.viewport) await page.setViewportSize(entry.viewport);
  if (entry.clock) await page.clock.setFixedTime(new Date(entry.clock));
  await page.goto(entry.url);
  await entry.ready(page);
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.mouse.move(0, 0);
  const image = await settled(page);
  const themed = await page.evaluate((theme) => ({
    byClass: document.querySelectorAll('.coar-compact').length,
    byTheme: document.querySelectorAll(`.${theme}`).length,
  }), THEME);
  if (classFree) {
    expect(themed.byClass, 'no element may carry .coar-compact in the class-free run').toBe(0);
    expect(themed.byTheme).toBeGreaterThan(0);
  } else {
    expect(themed.byClass).toBeGreaterThan(0);
  }
  return image;
}

test.describe('Compact as a theme class, without .coar-compact', () => {
  test.describe.configure({ timeout: 180_000 });

  for (const entry of cases) {
    test(`paints like the class entry: ${entry.name}`, async ({ browser }, testInfo) => {
      const pair = async () => {
        const images: Buffer[] = [];
        for (const classFree of [false, true]) {
          const context = await browser.newContext({ reducedMotion: 'reduce' });
          try {
            images.push(await capture(await context.newPage(), entry, classFree));
          } finally {
            await context.close();
          }
        }
        return images;
      };
      // Two loads of the very same page can differ in a few anti-aliased pixels of
      // rounded corners (the browser rasterises them per load, outside Docker with the
      // host's GPU). A real difference shows in every pair; one identical pair proves
      // the two entries can paint the same image.
      let [byClass, byTheme] = await pair();
      for (let attempt = 1; attempt < 4 && !byClass.equals(byTheme); attempt += 1) {
        [byClass, byTheme] = await pair();
      }
      if (!byClass.equals(byTheme)) {
        for (const [name, image] of [['class-entry.png', byClass], ['theme-class.png', byTheme]] as const) {
          const path = testInfo.outputPath(name);
          writeFileSync(path, image);
          await testInfo.attach(name, { path, contentType: 'image/png' });
        }
      }
      expect(byClass.equals(byTheme), 'the theme class must paint what .coar-compact paints').toBe(true);
    });
  }
});
