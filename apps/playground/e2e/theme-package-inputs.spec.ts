import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';

const serializerUrl = `/@fs${resolve(import.meta.dirname, '../../../packages/ui/src/theme/role-theme.ts')}`;
const enterpriseUrl = `/@fs${resolve(import.meta.dirname, '../../../packages/ui/src/theme/enterprise-theme.ts')}`;

// Match the strict Enterprise and Docker comparisons when a CSS edit repaints
// overlapping avatar borders. No pixel tolerance or image retry is involved.
test.use({
  launchOptions: { args: ['--disable-lcd-text', '--disable-partial-raster'] },
});

async function applyEnterprise(page: Page) {
  await page.evaluate(async ({ serializerUrl, enterpriseUrl }) => {
    const { serializeRoleTheme } = await import(/* @vite-ignore */ serializerUrl);
    const { ENTERPRISE_THEME } = await import(/* @vite-ignore */ enterpriseUrl);
    const style = document.createElement('style');
    style.textContent = `@layer cocoar.tokens {
      ${serializeRoleTheme('.coar-theme--enterprise', ENTERPRISE_THEME)}
    }`;
    document.head.appendChild(style);
    document.documentElement.classList.add('coar-theme--enterprise');
  }, { serializerUrl, enterpriseUrl });
}

for (const scheme of ['light', 'dark']) {
  test(`Calendar data avatars retain authored and generated colours in ${scheme}`, async ({ page }, testInfo) => {
    await page.goto(`/e2e/fixtures/calendar-data/index.html?scheme=${scheme}&part=avatar`);
    const calendar = page.locator('[data-calendar-data]');
    const avatars = calendar.locator('.coar-event-assignees__avatar');
    await expect(avatars).toHaveCount(12);
    await page.evaluate(() => document.fonts.ready);
    const colours = () => avatars.evaluateAll((elements) => elements.map((element) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let text = walker.nextNode();
      while (text && !text.textContent?.trim()) text = walker.nextNode();
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        ink: getComputedStyle(text?.parentElement ?? element).color,
        width: style.width,
        height: style.height,
      };
    }));
    const legacy = await colours();
    expect(legacy[0]!.background).not.toBe(legacy[1]!.background);
    await avatars.first().evaluate((element) => {
      (element as HTMLElement).style.color = '#123456';
    });
    expect((await colours())[0]!.ink).toBe('rgb(18, 52, 86)');
    await avatars.first().evaluate((element) => {
      (element as HTMLElement).style.removeProperty('color');
    });
    expect(await colours()).toEqual(legacy);
    const before = await calendar.screenshot({ animations: 'disabled' });
    await testInfo.attach('without-theme.png', { body: before, contentType: 'image/png' });
    await calendar.evaluate((element) => {
      const style = (element as HTMLElement).style;
      style.setProperty('--coar-theme-calendar-avatar-auto-bg', '#123456');
      style.setProperty('--coar-theme-calendar-avatar-ink', '#123456');
    });
    expect(await colours()).toEqual(legacy);
    await calendar.evaluate((element) => {
      const style = (element as HTMLElement).style;
      style.removeProperty('--coar-theme-calendar-avatar-auto-bg');
      style.removeProperty('--coar-theme-calendar-avatar-ink');
    });
    await applyEnterprise(page);
    expect(await colours()).toEqual(legacy);
    const after = await calendar.screenshot({ animations: 'disabled' });
    if (!after.equals(before)) {
      await writeFile(testInfo.outputPath('without-theme.png'), before);
      await writeFile(testInfo.outputPath('enterprise-theme.png'), after);
    }
    expect(after.equals(before), 'Enterprise must preserve every avatar pixel').toBe(true);
    await calendar.locator('[data-avatar-case="xs"]').evaluate((element) => {
      (element as HTMLElement).style.setProperty('--test-assignee-colour', '#7b61ff');
    });
    await expect(avatars.nth(2)).toHaveCSS('background-color', 'rgb(123, 97, 255)');
    await expect(avatars.nth(6)).toHaveCSS('background-color', legacy[6]!.background);
    await calendar.evaluate((element) => {
      const style = (element as HTMLElement).style;
      style.setProperty('--coar-theme-calendar-avatar-auto-bg', '#e4572e');
      style.setProperty('--coar-theme-calendar-avatar-ink', '#e4572e');
    });
    for (const index of [0, 1, 4, 5, 8, 9]) {
      await expect(avatars.nth(index)).toHaveCSS('background-color', 'rgb(228, 87, 46)');
    }
    await expect(avatars.nth(3)).toHaveCSS('background-color', legacy[3]!.background);
    expect((await colours()).every((avatar) => avatar.ink === 'rgb(228, 87, 46)')).toBe(true);
    await calendar.evaluate((element) => {
      (element as HTMLElement).style.setProperty('--coar-calendar-avatar-auto-bg', '#123456');
    });
    await expect(avatars.first()).toHaveCSS('background-color', 'rgb(18, 52, 86)');
    await avatars.first().evaluate((element) => {
      const style = (element as HTMLElement).style;
      style.setProperty('--coar-calendar-avatar-auto-bg', '#ff00ff');
      style.setProperty('--coar-calendar-avatar-ink', '#123456');
    });
    await expect(avatars.first()).toHaveCSS('background-color', 'rgb(255, 0, 255)');
    expect((await colours())[0]!.ink).toBe('rgb(18, 52, 86)');
    await calendar.evaluate((element) => {
      const style = (element as HTMLElement).style;
      style.removeProperty('--coar-theme-calendar-avatar-auto-bg');
      style.removeProperty('--coar-theme-calendar-avatar-ink');
      style.removeProperty('--coar-calendar-avatar-auto-bg');
      const avatarStyle = (element.querySelector('.coar-event-assignees__avatar') as HTMLElement).style;
      avatarStyle.removeProperty('--coar-calendar-avatar-auto-bg');
      avatarStyle.removeProperty('--coar-calendar-avatar-ink');
      document.documentElement.classList.remove('coar-theme--enterprise');
      document.documentElement.classList.add('coar-compact');
    });
    const compact = await calendar.locator('[data-compact-avatar-reference]')
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return { background: style.backgroundColor, ink: style.color };
      });
    for (const index of [0, 1, 4, 5, 8, 9]) {
      await expect(avatars.nth(index)).toHaveCSS('background-color', compact.background);
    }
    const compactAvatars = await colours();
    expect(compactAvatars[0]!.ink).toBe(compact.ink);
    expect(compactAvatars[3]!.ink).toBe('rgb(0, 0, 0)');
  });

  test(`Calendar data selections retain per-use colours and local overrides in ${scheme}`, async ({ page }) => {
    await page.goto(`/e2e/fixtures/calendar-data/index.html?scheme=${scheme}&part=selection`);
    const calendar = page.locator('[data-calendar-data]');
    const selections = calendar.locator('[data-time-selection]');
    await expect(selections).toHaveCount(4);
    const checkDataColours = async () => {
      for (const section of await calendar.locator('[data-selection-case]').all()) {
        const colour = await section.locator('[data-selection-reference]')
          .evaluate((element) => getComputedStyle(element).color);
        await expect(section.locator('[data-time-selection]')).toHaveCSS('border-top-color', colour);
      }
    };
    await checkDataColours();
    const before = await calendar.screenshot({ animations: 'disabled' });
    await calendar.evaluate((element) => {
      (element as HTMLElement).style.setProperty('--coar-theme-calendar-selection-border-color', '#123456');
    });
    await checkDataColours();
    await calendar.evaluate((element) => {
      (element as HTMLElement).style.removeProperty('--coar-theme-calendar-selection-border-color');
    });
    await applyEnterprise(page);
    await checkDataColours();
    expect((await calendar.screenshot({ animations: 'disabled' })).equals(before)).toBe(true);
    await calendar.locator('[data-selection-case="vertical-0"]').evaluate((element) => {
      (element as HTMLElement).style.setProperty('--coar-calendar-selection-color', '#7b61ff');
    });
    await checkDataColours();
    await calendar.evaluate((element) => {
      (element as HTMLElement).style.setProperty('--coar-theme-calendar-selection-border-color', '#e4572e');
    });
    for (const selection of await selections.all()) {
      await expect(selection).toHaveCSS('border-top-color', 'rgb(228, 87, 46)');
    }
    await calendar.evaluate((element) => {
      (element as HTMLElement).style.setProperty('--coar-calendar-selection-border-color', '#123456');
    });
    for (const selection of await selections.all()) {
      await expect(selection).toHaveCSS('border-top-color', 'rgb(18, 52, 86)');
    }
    await calendar.evaluate((element) => {
      const style = (element as HTMLElement).style;
      style.removeProperty('--coar-theme-calendar-selection-border-color');
      style.removeProperty('--coar-calendar-selection-border-color');
      document.documentElement.classList.remove('coar-theme--enterprise');
      document.documentElement.classList.add('coar-compact');
    });
    const compactColour = await calendar.locator('[data-compact-border-reference]')
      .evaluate((element) => getComputedStyle(element).color);
    for (const selection of await selections.all()) {
      await expect(selection).toHaveCSS('border-top-color', compactColour);
    }
  });

  test(`Calendar data markers retain per-use colours and local overrides in ${scheme}`, async ({ page }) => {
    await page.goto(`/e2e/fixtures/calendar-data/index.html?scheme=${scheme}`);
    const calendar = page.locator('[data-calendar-data]');
    const durations = calendar.locator('.coar-time-axis-marker__duration');
    await expect(durations).toHaveCount(4);
    await page.evaluate(() => document.fonts.ready);
    const expected = ['rgb(181, 51, 115)', 'rgb(28, 128, 93)'];
    const checkDataColours = async () => {
      for (const orientation of ['vertical', 'horizontal']) {
        for (const [index, colour] of expected.entries()) {
          await expect(calendar.locator(`[data-axis-case="${orientation}-${index}"] .coar-time-axis-marker__duration`))
            .toHaveCSS('color', colour);
        }
      }
    };
    await checkDataColours();
    const before = await calendar.screenshot({ animations: 'disabled' });
    await calendar.evaluate((element) => {
      (element as HTMLElement).style.setProperty('--coar-theme-calendar-axis-marker-text-color', '#123456');
    });
    await checkDataColours(); // An optional input alone cannot activate derivation.
    await calendar.evaluate((element) => {
      (element as HTMLElement).style.removeProperty('--coar-theme-calendar-axis-marker-text-color');
    });
    await applyEnterprise(page);
    await checkDataColours();
    expect((await calendar.screenshot({ animations: 'disabled' })).equals(before)).toBe(true);

    const first = calendar.locator('[data-axis-case="vertical-0"]');
    await first.evaluate((element) => {
      (element as HTMLElement).style.setProperty('--coar-calendar-draft-color', '#7b61ff');
    });
    await expect(first.locator('.coar-time-axis-marker__duration')).toHaveCSS('color', 'rgb(123, 97, 255)');
    await expect(calendar.locator('[data-axis-case="vertical-1"] .coar-time-axis-marker__duration'))
      .toHaveCSS('color', expected[1]!);
    await calendar.evaluate((element) => {
      (element as HTMLElement).style.setProperty('--coar-theme-calendar-axis-marker-text-color', '#e4572e');
    });
    for (const duration of await durations.all()) {
      await expect(duration).toHaveCSS('color', 'rgb(228, 87, 46)');
    }
    await calendar.evaluate((element) => {
      (element as HTMLElement).style.setProperty('--coar-calendar-axis-marker-text-color', '#123456');
    });
    for (const duration of await durations.all()) {
      await expect(duration).toHaveCSS('color', 'rgb(18, 52, 86)');
    }
    await calendar.evaluate((element) => {
      const style = (element as HTMLElement).style;
      style.removeProperty('--coar-theme-calendar-axis-marker-text-color');
      style.removeProperty('--coar-calendar-axis-marker-text-color');
      document.documentElement.classList.remove('coar-theme--enterprise');
      document.documentElement.classList.add('coar-compact');
    });
    const compactColour = await calendar.locator('[data-compact-reference]')
      .evaluate((element) => getComputedStyle(element).color);
    for (const duration of await durations.all()) {
      await expect(duration).toHaveCSS('color', compactColour);
    }
  });

  test(`Calendar geometry inputs preserve defaults and consumer overrides in ${scheme}`, async ({ page }) => {
    await page.goto(`/visual.html#/visual/calendar-agenda?mode=default&scheme=${scheme}`);
    const calendar = page.locator('.coar-agenda-view').first();
    const row = calendar.locator('.coar-agenda-event').first();
    await expect(row).toBeVisible();
    await expect(row).toHaveCSS('padding', '10px 16px');

    // Inputs alone must not activate a theme.
    await calendar.evaluate((element) => {
      (element as HTMLElement).style.setProperty('--coar-theme-calendar-agenda-row-padding', '12px 22px');
    });
    await expect(row).toHaveCSS('padding', '10px 16px');
    await calendar.evaluate((element) => {
      (element as HTMLElement).style.removeProperty('--coar-theme-calendar-agenda-row-padding');
      document.documentElement.classList.add('coar-compact');
    });
    const compactPadding = await row.evaluate((element) => getComputedStyle(element).padding);
    await page.evaluate(() => document.documentElement.classList.remove('coar-compact'));
    await expect(row).toHaveCSS('padding', '10px 16px');

    await applyEnterprise(page);
    await expect(row).toHaveCSS('padding', '10px 16px');
    await expect(row).toHaveCSS('background-color', scheme === 'dark' ? 'rgb(24, 24, 27)' : 'rgb(255, 255, 255)');
    await calendar.evaluate((element) => {
      (element as HTMLElement).style.setProperty('--coar-theme-calendar-bg', '#123456');
    });
    await expect(row).toHaveCSS('background-color', 'rgb(18, 52, 86)');
    await calendar.evaluate((element) => {
      (element as HTMLElement).style.setProperty('--coar-calendar-bg', '#234567');
    });
    await expect(row).toHaveCSS('background-color', 'rgb(35, 69, 103)');
    await calendar.evaluate((element) => {
      (element as HTMLElement).style.setProperty('--coar-theme-calendar-agenda-row-padding', '12px 22px');
    });
    await expect(row).toHaveCSS('padding', '12px 22px');
    await calendar.evaluate((element) => {
      (element as HTMLElement).style.setProperty('--coar-calendar-agenda-row-padding', '14px 24px');
    });
    await expect(row).toHaveCSS('padding', '14px 24px');

    await calendar.evaluate((element) => {
      const style = (element as HTMLElement).style;
      style.removeProperty('--coar-theme-calendar-agenda-row-padding');
      style.removeProperty('--coar-calendar-agenda-row-padding');
      style.removeProperty('--coar-theme-calendar-bg');
      style.removeProperty('--coar-calendar-bg');
      document.documentElement.classList.remove('coar-theme--enterprise');
      document.documentElement.classList.add('coar-compact');
    });
    await expect(row).toHaveCSS('padding', compactPadding);
  });

  test(`Page Builder retains distinct metrics and local overrides in ${scheme}`, async ({ page }) => {
    await page.goto(`/design-review?frame=1&kind=page-builder&profile=legacy&mode=${scheme}&mobile=false`);
    const builder = page.locator('.pb-builder').first();
    const toolbar = builder.locator('.pb-canvas__toolbar').first();
    const node = builder.locator('.pb-tree-node').first();
    const row = builder.locator('.pb-tree-row').first();
    await expect(row).toBeVisible();
    for (const enterprise of [false, true]) {
      if (enterprise) await applyEnterprise(page);
      await expect(builder).toHaveCSS('font-size', '13px');
      await expect(toolbar).toHaveCSS('height', '38px');
      await expect(row).toHaveCSS('font-size', '12px');
      await expect(row).toHaveCSS('height', '30px');
      await expect(row).toHaveCSS('min-height', '0px');
    }
    await builder.evaluate((element) => {
      const style = (element as HTMLElement).style;
      style.setProperty('--coar-theme-page-builder-font-size', '17px');
      style.setProperty('--coar-theme-page-builder-small-font-size', '14px');
      style.setProperty('--coar-theme-page-builder-toolbar-height', '46px');
    });
    await expect(builder).toHaveCSS('font-size', '17px');
    await expect(row).toHaveCSS('font-size', '14px');
    await expect(toolbar).toHaveCSS('height', '46px');
    await node.evaluate((element) => {
      (element as HTMLElement).style.setProperty('--coar-page-builder-small-font-size', '19px');
    });
    await expect(row).toHaveCSS('font-size', '19px');

    await builder.evaluate((element) => {
      const style = (element as HTMLElement).style;
      style.removeProperty('--coar-theme-page-builder-font-size');
      style.removeProperty('--coar-theme-page-builder-small-font-size');
      style.removeProperty('--coar-theme-page-builder-toolbar-height');
      document.documentElement.classList.remove('coar-theme--enterprise');
      document.documentElement.classList.add('coar-compact');
    });
    await node.evaluate((element) => {
      const style = (element as HTMLElement).style;
      style.removeProperty('--coar-page-builder-small-font-size');
      style.setProperty('--coar-page-builder-font-size', '21px');
    });
    await expect(row).toHaveCSS('font-size', '21px');
  });

  test(`Map retains Leaflet chrome and local consumer overrides in ${scheme}`, async ({ page }) => {
    await page.goto(`/design-review?frame=1&kind=map&profile=legacy&mode=${scheme}&mobile=false`);
    const map = page.locator('.coar-map').first();
    await map.locator('.leaflet-marker-icon').first().click();
    await expect(map.locator('.leaflet-popup-content')).toBeVisible();
    const chrome = () => map.evaluate((element) => {
      const parts = [
        '.leaflet-container', '.leaflet-bar', '.leaflet-control-zoom-in',
        '.leaflet-control-attribution', '.leaflet-popup-content-wrapper',
        '.leaflet-popup-content', '.leaflet-popup-close-button', '.coar-map-popup__note',
      ];
      const properties = [
        'font-family', 'font-size', 'font-weight', 'line-height', 'color',
        'background-color', 'border-color', 'border-radius', 'box-shadow',
      ];
      return Object.fromEntries(parts.map((selector) => {
        const part = element.querySelector(selector);
        if (!part) throw new Error(`missing Leaflet part: ${selector}`);
        const style = getComputedStyle(part);
        return [selector, Object.fromEntries(properties.map((property) => [property, style.getPropertyValue(property)]))];
      }));
    });
    const before = await chrome();
    await applyEnterprise(page);
    await expect(map).toHaveClass(/coar-map--role-theme/);
    expect(await chrome()).toEqual(before);
    const zoom = map.locator('.leaflet-control-zoom-in');
    await zoom.hover();
    await expect(zoom).toHaveCSS('background-color', 'rgb(244, 244, 244)');
    await map.evaluate((element) => {
      (element as HTMLElement).style.setProperty('--coar-theme-map-chrome-font-size', '18px');
    });
    await expect(map.locator('.leaflet-container')).toHaveCSS('font-size', '18px');
    await expect(map.locator('.leaflet-control-attribution')).toHaveCSS('font-size', '18px');
    await map.evaluate((element) => {
      const style = (element as HTMLElement).style;
      style.removeProperty('--coar-theme-map-chrome-font-size');
      style.setProperty('--coar-theme-map-zoom-font-family', 'serif');
    });
    await expect(zoom).toHaveCSS('font-family', 'serif');
    await zoom.evaluate((element) => {
      (element as HTMLElement).style.setProperty('--coar-map-zoom-font-family', 'monospace');
    });
    await expect(zoom).toHaveCSS('font-family', 'monospace');

    // Compact's original roles must still be read on the consuming element.
    // Resolving a new alias from them on the map root would lose these overrides.
    await map.evaluate((element) => {
      (element as HTMLElement).style.removeProperty('--coar-theme-map-zoom-font-family');
      document.documentElement.classList.remove('coar-theme--enterprise');
      document.documentElement.classList.add('coar-compact');
    });
    await zoom.evaluate((element) => {
      const style = (element as HTMLElement).style;
      style.removeProperty('--coar-map-zoom-font-family');
      style.setProperty('--coar-map-chrome-font-family', 'serif');
    });
    await expect(zoom).toHaveCSS('font-family', 'serif');
    await map.locator('.leaflet-container').evaluate((element) => {
      (element as HTMLElement).style.setProperty('--coar-ui-font-size', '23px');
    });
    await expect(map.locator('.leaflet-container')).toHaveCSS('font-size', '23px');
  });

  test(`Enterprise retains all Monaco CSS colors in ${scheme}`, async ({ page }) => {
    await page.goto(`/design-review?frame=1&kind=script-editor&profile=legacy&mode=${scheme}&mobile=false`);
    const editor = page.locator('.monaco-editor').first();
    await expect(editor.locator('.view-lines')).toBeVisible();
    const colors = () => editor.evaluate((element) => {
      const styles = getComputedStyle(element);
      return Object.fromEntries(Array.from(styles)
        .filter((name) => name.startsWith('--vscode-') && CSS.supports('color', styles.getPropertyValue(name).trim()))
        .sort().map((name) => [name, styles.getPropertyValue(name).trim()]));
    });
    const before = await colors();
    // Reject an empty comparison if Monaco ever changes its CSS interface.
    expect(Object.keys(before).length).toBeGreaterThan(25);
    expect(before['--vscode-editor-background']).toBe(scheme === 'dark' ? '#1a1a1a' : '#ffffff');
    await applyEnterprise(page);
    // Exercise the public input and await Monaco's applied result, rather than
    // comparing two equal palettes before its document observer has run.
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--coar-theme-script-editor-editor-widget-background', '#123456');
    });
    await expect(editor).toHaveCSS('--vscode-editorWidget-background', '#123456');
    await page.evaluate(() => {
      document.documentElement.style.removeProperty('--coar-theme-script-editor-editor-widget-background');
    });
    await expect(editor).toHaveCSS('--vscode-editorWidget-background', before['--vscode-editorWidget-background']!);
    expect(await colors()).toEqual(before);
  });

  test(`Document Viewer retains distinct hover fills and consumer inputs in ${scheme}`, async ({ page }) => {
    await page.goto(`/design-review?frame=1&kind=document-viewer&profile=legacy&mode=${scheme}&mobile=false`);
    const viewer = page.locator('.coar-pdf-viewer').first();
    const subtle = viewer.locator('.coar-pdf-anno-panel__filter:not(.coar-pdf-anno-panel__filter--off)').first();
    const normal = viewer.locator('.coar-pdf-anno-panel__close').first();
    for (const enterprise of [false, true]) {
      if (enterprise) await applyEnterprise(page);
      await subtle.hover();
      await expect(subtle).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.04)');
      await normal.hover();
      await expect(normal).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.06)');
    }

    await viewer.evaluate((element) => {
      (element as HTMLElement).style.setProperty('--coar-color-surface-3', '#123456');
    });
    await subtle.hover();
    await expect(subtle).toHaveCSS('background-color', 'rgb(18, 52, 86)');
    await normal.hover();
    await expect(normal).toHaveCSS('background-color', 'rgb(18, 52, 86)');
    await viewer.evaluate((element) => {
      const style = (element as HTMLElement).style;
      style.removeProperty('--coar-color-surface-3');
      style.setProperty('--coar-theme-document-viewer-hover-subtle', '#abcdef');
    });
    await subtle.hover();
    await expect(subtle).toHaveCSS('background-color', 'rgb(171, 205, 239)');
    await normal.hover();
    await expect(normal).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.06)');
    await viewer.evaluate((element) => {
      (element as HTMLElement).style.setProperty('--coar-document-viewer-hover-subtle', '#fedcba');
    });
    await subtle.hover();
    await expect(subtle).toHaveCSS('background-color', 'rgb(254, 220, 186)');

    // Existing uniform package overrides still reach all Compact hover roles.
    await viewer.evaluate((element) => {
      const style = (element as HTMLElement).style;
      style.removeProperty('--coar-theme-document-viewer-hover-subtle');
      style.removeProperty('--coar-document-viewer-hover-subtle');
      style.setProperty('--coar-document-viewer-hover', '#123456');
      document.documentElement.classList.remove('coar-theme--enterprise');
      document.documentElement.classList.add('coar-compact');
    });
    await subtle.hover();
    await expect(subtle).toHaveCSS('background-color', 'rgb(18, 52, 86)');
    await normal.hover();
    await expect(normal).toHaveCSS('background-color', 'rgb(18, 52, 86)');
  });

  test(`scoped Enterprise inputs follow the annotation teleport in ${scheme}`, async ({ page }) => {
    await page.goto(`/design-review?frame=1&kind=document-viewer-open&profile=legacy&mode=${scheme}&mobile=false`);
    const viewer = page.locator('.coar-pdf-viewer').first();
    await expect(viewer.locator('.coar-pdf-annotation-pin').first()).toBeVisible();
    await applyEnterprise(page);
    await viewer.evaluate((element) => {
      document.documentElement.classList.remove('coar-theme--enterprise');
      // The teleport leaves an Enterprise area for a differently themed body.
      document.documentElement.classList.add('coar-compact');
      element.parentElement!.classList.add('coar-theme--enterprise');
      const style = document.createElement('style');
      style.textContent = `.coar-theme--enterprise.custom-viewer {
        --coar-theme-document-viewer-font-size: 17px;
        --coar-theme-document-viewer-surface: #123456;
      }`;
      document.head.appendChild(style);
    });
    await viewer.locator('.coar-pdf-annotation-pin').first().click();
    const popover = page.locator('.coar-pdf-annotation-popover');
    await expect(popover).toBeVisible();
    await expect(popover).toHaveCSS('font-size', '13px');
    await expect(popover).toHaveCSS('border-radius', '6px');
    await expect(popover).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await viewer.evaluate((element) => element.parentElement!.classList.add('custom-viewer'));
    await expect(popover).toHaveCSS('font-size', '17px');
    await expect(popover).toHaveCSS('background-color', 'rgb(18, 52, 86)');
    expect(await page.locator('html').evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--coar-theme-document-viewer-font-size').trim(),
    )).toBe('');
  });
}

test('document package inputs reach roots, follow nested schemes and retain local overrides', async ({ page }) => {
  await page.goto('/design-review?frame=1&kind=markdown-form-layouts&profile=legacy&mode=light&mobile=false');
  await expect(page.locator('.coar-markdown-form')).not.toHaveCount(0);
  await page.evaluate(async (serializerUrl) => {
    const { serializeRoleTheme } = await import(/* @vite-ignore */ serializerUrl);
    const style = document.createElement('style');
    style.textContent = `@layer cocoar.tokens {
      ${serializeRoleTheme('.package-input-test', {
        tokens: { '--coar-role-derivation': '' },
        mobileTokens: {},
        roles: {
          '--coar-theme-markdown-inline-code-background': 'light-dark(#123456, #abcdef)',
          '--coar-theme-markdown-form-block-radius': '19px',
        },
      })}
    }`;
    document.head.appendChild(style);
    const scope = document.createElement('section');
    scope.className = 'package-input-test';
    scope.innerHTML = `
      <div class="light-mode">
        <div class="coar-markdown"><code>light</code></div>
        <div class="dark-mode">
          <div class="coar-markdown"><code>dark</code></div>
          <div class="coar-markdown-form"></div>
        </div>
      </div>`;
    document.body.appendChild(scope);
  }, serializerUrl);

  const codes = page.locator('.package-input-test code');
  await expect(codes.nth(0)).toHaveCSS('background-color', 'rgb(18, 52, 86)');
  await expect(codes.nth(1)).toHaveCSS('background-color', 'rgb(171, 205, 239)');
  expect(await page.locator('.package-input-test .coar-markdown-form').evaluate((element) =>
    getComputedStyle(element).getPropertyValue('--coar-markdown-form-block-radius').trim(),
  )).toBe('19px');

  await codes.nth(1).evaluate((element) => {
    (element.parentElement as HTMLElement).style.setProperty('--coar-markdown-inline-code-background', '#fedcba');
  });
  await expect(codes.nth(1)).toHaveCSS('background-color', 'rgb(254, 220, 186)');
});
