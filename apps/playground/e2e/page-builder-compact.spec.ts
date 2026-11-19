import { expect, test, type Locator, type Page } from '@playwright/test';
import { openBuilderTool } from './helpers';

/**
 * The opt-in compact presentation of the page builder chrome
 * (packages/page-builder/src/styles/compact.css).
 *
 * Measures computed geometry and typography in a real browser: the default
 * presentation keeps every legacy value, `.coar-compact` derives the chrome
 * from the shared roles (desktop and mobile values of those roles are set here
 * explicitly, so the spec checks the builder's derivations, not the values the
 * shared token files choose), and the authored canvas content keeps its
 * typography whatever the chrome does.
 */

interface Metrics {
  rootFont: string;
  paneHeader: number;
  treeRow: number;
  treeFont: string;
  paneTitleFont: string;
  activityButton: number;
  activityIndicatorLeft: string;
  iconButton: number;
  canvasToolbar: number;
  canvasTabFont: string;
  canvasContentFont: string;
  canvasContentWeight: string;
  treeButton: number;
}

async function metrics(builder: Locator): Promise<Metrics> {
  return builder.evaluate((root) => {
    const q = (selector: string) => {
      const el = root.querySelector<HTMLElement>(selector);
      if (!el) throw new Error(`missing ${selector}`);
      return el;
    };
    const cs = (selector: string, pseudo?: string) => getComputedStyle(q(selector), pseudo);
    const height = (selector: string) => q(selector).getBoundingClientRect().height;
    return {
      rootFont: getComputedStyle(root).fontSize,
      paneHeader: height('.pb-builder__pane-header'),
      treeRow: height('.pb-tree-row'),
      treeFont: cs('.pb-tree-node').fontSize,
      paneTitleFont: cs('.pb-builder__pane-title').fontSize,
      activityButton: height('.pb-builder__activity-btn'),
      activityIndicatorLeft: cs('.pb-builder__activity-btn--active', '::before').left,
      iconButton: height('.pb-builder__icon-btn'),
      canvasToolbar: height('.pb-canvas__toolbar'),
      canvasTabFont: cs('.canvas-node__tab').fontSize,
      canvasContentFont: cs('.pb-canvas__content').fontSize,
      canvasContentWeight: cs('.pb-canvas__content').fontWeight,
      treeButton: height('.pb-tree-btn'),
    };
  });
}

async function setProfile(page: Page, classes: string[], roles: Record<string, string>) {
  await page.evaluate(
    ({ classes, roles }) => {
      const html = document.documentElement;
      html.classList.remove('coar-compact');
      html.classList.add(...classes);
      html.removeAttribute('style');
      for (const [name, value] of Object.entries(roles)) html.style.setProperty(name, value);
    },
    { classes, roles },
  );
}

const DESKTOP_ROLES = {
  '--coar-ui-font-size': '13px',
  '--coar-caption-font-size': '12px',
  '--coar-interactive-row-height': '36px',
};
const MOBILE_ROLES = {
  '--coar-ui-font-size': '14px',
  '--coar-caption-font-size': '13px',
  '--coar-interactive-row-height': '44px',
};

test.describe('PageBuilder compact presentation', () => {
  test('is opt-in: the default chrome keeps its values, .coar-compact derives them from the shared roles', async ({ page }) => {
    await page.goto('/page-builder');
    const builder = page.locator('.pb-builder');
    await openBuilderTool(builder, 'Structure');
    await expect(builder.locator('.pb-tree-row').first()).toBeVisible();

    const legacy: Metrics = {
      rootFont: '13px',
      paneHeader: 40,
      treeRow: 30,
      treeFont: '12px',
      paneTitleFont: '12px',
      activityButton: 32,
      activityIndicatorLeft: '-6px',
      iconButton: 24,
      canvasToolbar: 38,
      canvasTabFont: '10px',
      canvasContentFont: '13px',
      canvasContentWeight: '400',
      treeButton: 22,
    };
    expect(await metrics(builder)).toEqual(legacy);

    // Shared roles alone change nothing: the builder reads them only in the profile.
    await setProfile(page, [], MOBILE_ROLES);
    expect(await metrics(builder)).toEqual(legacy);

    await setProfile(page, ['coar-compact'], DESKTOP_ROLES);
    // A compact outline row grows with its content: measured once the theme's font has loaded.
    await expect.poll(() => metrics(builder)).toEqual({
      rootFont: '13px',
      paneHeader: 40,
      treeRow: 36,
      treeFont: '13px',
      paneTitleFont: '12px',
      activityButton: 32,
      activityIndicatorLeft: '-6px',
      iconButton: 28,
      canvasToolbar: 40,
      canvasTabFont: '11px',
      canvasContentFont: '13px',
      canvasContentWeight: '400',
      treeButton: 24,
    });

    await setProfile(page, ['coar-compact'], MOBILE_ROLES);
    // A compact outline row grows with its content: measured once the theme's font has loaded.
    await expect.poll(() => metrics(builder)).toEqual({
      rootFont: '14px',
      paneHeader: 44,
      treeRow: 44,
      treeFont: '14px',
      paneTitleFont: '13px',
      activityButton: 40,
      activityIndicatorLeft: '-2px',
      iconButton: 36,
      canvasToolbar: 44,
      canvasTabFont: '12px',
      // The authored page keeps its size while the chrome grows.
      canvasContentFont: '13px',
      canvasContentWeight: '400',
      treeButton: 32,
    });

    await setProfile(page, [], {});
    expect(await metrics(builder)).toEqual(legacy);
  });

  // The size of an element preview may follow the host's profile (it renders the
  // shared components); the builder's own frame around it must not move.
  test('keeps the canvas node frame and the drop zones out of the profile', async ({ page }) => {
    await page.goto('/page-builder');
    const builder = page.locator('.pb-builder');
    // The demo's runtime supplies the login card width asynchronously. Measure
    // both profiles after it has replaced the stretched fallback layout.
    await expect(builder.locator('.canvas-node--root > .canvas-node__body > .canvas-node')).toHaveCSS('width', '380px');
    const geometry = () =>
      builder.evaluate((root) => ({
        nodes: [...root.querySelectorAll<HTMLElement>('.pb-canvas__content .canvas-node')].map((node) => {
          const cs = getComputedStyle(node);
          return [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft, cs.borderTopWidth];
        }),
        zones: [...root.querySelectorAll<HTMLElement>('.pb-canvas__content .canvas-dropzone')].map((zone) => {
          const cs = getComputedStyle(zone);
          return [cs.width, cs.height, cs.paddingTop];
        }),
        frame: getComputedStyle(root.querySelector<HTMLElement>('.pb-canvas')!).padding,
      }));
    const before = await geometry();
    expect(before.nodes.length).toBeGreaterThan(3);
    await setProfile(page, ['coar-compact'], MOBILE_ROLES);
    expect(await geometry()).toEqual(before);
  });
});
