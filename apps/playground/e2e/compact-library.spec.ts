import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Library scenes of the design-review gallery (src/design-review/library-scenes.ts),
 * legacy beside compact, in Chromium against the normal playground (vite.config.ts aliases
 * the package sources; the visual harness does not). Measures computed geometry and roles,
 * opens real panels, and fails on page errors, console errors and any request that leaves
 * localhost (map tiles, fonts, PDFs). `.coar-mobile` here is class emulation in desktop
 * Chromium, not a device run.
 */

const INLINE = [
  'data-grid', 'data-grid-tree', 'document-viewer', 'document-viewer-open', 'document-viewer-pdf',
  'map', 'map-editor', 'markdown-viewer', 'markdown-editor', 'markdown-editor-panels',
  'markdown-form', 'page-builder', 'markdown-advanced', 'markdown-form-layouts', 'page-builder-inspectors',
  'data-grid-editors', 'data-grid-states', 'document-viewer-states', 'map-points',
] as const;
const FRAMED = [
  'mermaid', 'markdown-phone', 'script-editor', 'composition', 'markdown-mermaid-integration',
  'page-builder-panes', 'page-builder-code',
] as const;
const READY: Record<string, string> = {
  'data-grid': '.ag-row',
  'data-grid-tree': '.ag-row',
  'document-viewer': '.coar-pdf-anno-panel__item',
  'document-viewer-open': '.coar-pdf-anno-panel__item',
  'document-viewer-pdf': '.coar-pdf-viewer canvas',
  map: '.leaflet-marker-icon',
  'map-editor': '.leaflet-marker-icon',
  'markdown-viewer': '.coar-markdown h1',
  'markdown-editor': '.ProseMirror',
  'markdown-editor-panels': '.coar-md-table-picker',
  'markdown-form': '[data-scene-part=fill] input',
  'page-builder': '.pb-tree-row',
  'markdown-advanced': '.coar-markdown-embed-host [data-scene-part=metric]',
  'markdown-form-layouts': '.coar-markdown-form-paragraph--stacked input',
  'markdown-mermaid-integration': '.coar-markdown-fence .coar-mermaid[data-status=rendered] svg',
  'page-builder-inspectors': '.pb-tree-row',
  'page-builder-panes': '.pb-tree-row',
  'page-builder-code': '.pb-tree-row',
  'data-grid-editors': '.ag-row',
  'data-grid-states': '[data-scene-part=paged] .ag-row',
  'document-viewer-states': '[data-scene-part=outline] .coar-pdf-viewer__pages canvas',
  'map-points': '[data-scene-part=map] .leaflet-marker-icon',
  mermaid: '.coar-mermaid[data-status=rendered] svg',
  'markdown-phone': '.coar-mermaid[data-status=rendered] svg',
  'script-editor': '.monaco-editor .view-lines',
  composition: '.coar-mermaid[data-status=rendered] svg',
};
const PROFILES = ['legacy', 'compact'] as const;
const VARIANTS = [
  { name: 'light', mode: 'light', mobile: false },
  { name: 'dark', mode: 'dark', mobile: false },
  { name: 'dark mobile', mode: 'dark', mobile: true },
] as const;

/** Collects everything that must not happen while a scene is shown. */
function guard(page: Page): string[] {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (/^https?:$/.test(url.protocol) && !['localhost', '127.0.0.1'].includes(url.hostname)) {
      problems.push(`external request: ${request.url()}`);
    }
  });
  return problems;
}

const gallery = (kind: string, extra = '') => `/design-review?kind=${kind}${extra}`;
const framePage = (kind: string, profile: string, mode = 'light', mobile = false) =>
  `/design-review?frame=1&kind=${kind}&profile=${profile}&mode=${mode}&mobile=${mobile}`;
const column = (page: Page, profile: string) => page.locator(`[data-review-profile=${profile}]`);

async function fontsReady(page: Page) {
  await page.evaluate(async () => { await document.fonts.ready; });
}

/**
 * Every Inter weight that text in the scope is set in has a loaded face once
 * `document.fonts.ready` resolved: nothing is painted in a fallback or a synthesized weight.
 */
async function interReady(scope: Locator) {
  return scope.evaluate(async (root) => {
    await document.fonts.ready;
    const used = new Set<string>();
    for (const el of root.querySelectorAll('*')) {
      const hasText = [...el.childNodes].some((node) => node.nodeType === 3 && node.textContent!.trim());
      if (!hasText) continue;
      const style = getComputedStyle(el);
      if (style.fontFamily.startsWith('Inter')) used.add(style.fontWeight);
    }
    const loaded = [...document.fonts]
      .filter((face) => face.family === 'Inter' && face.status === 'loaded')
      .map((face) => face.weight);
    return { used: [...used].sort(), missing: [...used].filter((weight) => !loaded.includes(weight)) };
  });
}

/** Resolves a token in the context of an element, as a computed color. */
async function role(scope: Locator, token: string) {
  return scope.evaluate((element, name) => {
    const probe = document.createElement('span');
    element.appendChild(probe);
    probe.style.color = `var(${name})`;
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, token);
}

const height = async (locator: Locator) => (await locator.boundingBox())!.height;

test.describe('library gallery', () => {
  test.describe.configure({ timeout: 60_000 });

  test('the gallery lists every library scene and keeps the core kinds', async ({ page }) => {
    await page.goto(gallery('fields'));
    const options = await page.locator('[data-review-kind] option').evaluateAll((list) =>
      list.map((option) => (option as HTMLOptionElement).value));
    expect(options).toEqual([
      'typography', 'fields', 'selection', 'dates', 'states',
      ...['data-grid', 'data-grid-tree', 'document-viewer', 'document-viewer-open', 'document-viewer-pdf',
        'map', 'map-editor', 'markdown-viewer', 'markdown-editor', 'markdown-editor-panels', 'markdown-form',
        'mermaid', 'markdown-phone', 'page-builder', 'script-editor', 'composition',
        'markdown-mermaid-integration', 'markdown-advanced', 'markdown-form-layouts',
        'page-builder-inspectors', 'page-builder-panes', 'page-builder-code',
        'data-grid-editors', 'data-grid-states', 'document-viewer-states', 'map-points'],
    ]);
    expect([...INLINE, ...FRAMED].sort()).toEqual(options.slice(5).sort());
    // Switching through the real control mounts a library scene in both columns.
    await page.locator('[data-review-kind]').selectOption('map');
    for (const profile of PROFILES) {
      await expect(column(page, profile).locator('.leaflet-marker-icon')).toHaveCount(4);
    }
  });

  for (const variant of VARIANTS) {
    for (const kind of INLINE) {
      test(`${kind} renders in both profiles (${variant.name})`, async ({ page }) => {
        const problems = guard(page);
        await page.setViewportSize({ width: 1600, height: 1000 });
        await page.goto(gallery(kind, `&mode=${variant.mode}&mobile=${variant.mobile}`));
        for (const profile of PROFILES) {
          const scope = column(page, profile);
          await expect(scope.locator(READY[kind]).first()).toBeVisible({ timeout: 20_000 });
          await expect(scope).toHaveClass(profile === 'compact' ? /coar-compact/ : /^(?!.*coar-compact)/);
          await expect(scope).toHaveClass(variant.mobile ? /coar-mobile/ : /^(?!.*coar-mobile)/);
          expect(await scope.evaluate((el) => el.closest('.light-mode, .dark-mode')!.classList.contains('dark-mode')))
            .toBe(variant.mode === 'dark');
          // Shared roles are inherited from the column: undefined in legacy, the
          // compact desktop or mobile value in compact.
          const ui = await scope.evaluate((el) => getComputedStyle(el).getPropertyValue('--coar-ui-font-size').trim());
          expect(ui).toBe(profile === 'legacy' ? '' : variant.mobile ? '14px' : '13px');
          const box = (await scope.locator(READY[kind]).first().boundingBox())!;
          expect(box.width).toBeGreaterThan(0);
          expect(box.height).toBeGreaterThan(0);
        }
        await fontsReady(page);
        const fonts = await interReady(column(page, 'compact'));
        expect(fonts.used.length).toBeGreaterThan(0);
        expect(fonts.missing).toEqual([]);
        // Both columns show the same synthetic data: as many rendered items in each.
        await expect.poll(async () => {
          const [legacy, compact] = await Promise.all(PROFILES.map((profile) =>
            column(page, profile).locator(READY[kind]).count()));
          return legacy === compact && legacy > 0;
        }).toBe(true);
        expect(problems).toEqual([]);
      });
    }

    for (const kind of FRAMED) {
      test(`${kind} renders one isolated document per profile (${variant.name})`, async ({ page }) => {
        const problems = guard(page);
        await page.setViewportSize({ width: 1600, height: 1000 });
        await page.goto(gallery(kind, `&mode=${variant.mode}&mobile=${variant.mobile}`));
        for (const profile of PROFILES) {
          const iframe = column(page, profile).locator(`iframe[data-review-frame=${profile}]`);
          await expect(iframe).toHaveCount(1);
          // The column itself carries no profile: the frame document does.
          await expect(column(page, profile)).not.toHaveClass(/coar-compact|coar-mobile/);
          const frame = page.frameLocator(`iframe[data-review-frame=${profile}]`);
          await expect(frame.locator(READY[kind]).first()).toBeVisible({ timeout: 25_000 });
          const html = frame.locator('html');
          await expect(html).toHaveClass(variant.mode === 'dark' ? /dark-mode/ : /light-mode/);
          await expect(html).toHaveClass(profile === 'compact' ? /coar-compact/ : /^(?!.*coar-compact)/);
          await expect(html).toHaveClass(variant.mobile ? /coar-mobile/ : /^(?!.*coar-mobile)/);
          await expect(frame.locator('.app-nav')).toBeHidden();
        }
        expect(problems).toEqual([]);
      });
    }
  }
});

/**
 * Compact color roles are `light-dark()` pairs resolved by the consuming element's
 * `color-scheme`. A descendant that forces `color-scheme: light` inside a dark compact
 * area paints the light value of every role below it.
 */
test.describe('compact dark: no light color-scheme island', () => {
  for (const kind of INLINE) {
    test(`${kind}`, async ({ page }) => {
      await page.setViewportSize({ width: 1600, height: 1000 });
      await page.goto(gallery(kind, '&mode=dark'));
      const compact = column(page, 'compact');
      await expect(compact.locator(READY[kind]).first()).toBeVisible({ timeout: 20_000 });
      const islands = await compact.evaluate((root) => [...root.querySelectorAll('*')]
        .filter((el) => getComputedStyle(el).colorScheme === 'light'
          && getComputedStyle(el.parentElement!).colorScheme !== 'light')
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`));
      expect(islands).toEqual([]);
    });
  }
});

test.describe('library scenes: geometry and real interaction', () => {
  test.describe.configure({ timeout: 60_000 });
  test.beforeEach(async ({ page }) => { await page.setViewportSize({ width: 1600, height: 1000 }); });

  test('data grid rows and header follow the interactive row role; selection and sort work', async ({ page }) => {
    const problems = guard(page);
    for (const mobile of [false, true]) {
      await page.goto(gallery('data-grid', `&mobile=${mobile}`));
      const legacy = column(page, 'legacy');
      const compact = column(page, 'compact');
      await expect(compact.locator('.ag-row')).toHaveCount(5);
      expect(await height(legacy.locator('.ag-row').first())).toBe(40);
      expect(await height(legacy.locator('.ag-header-row').first())).toBe(40);
      expect(await height(compact.locator('.ag-row').first())).toBe(mobile ? 44 : 36);
      expect(await height(compact.locator('.ag-header-row').first())).toBe(mobile ? 44 : 36);
      await expect(compact.locator('.ag-row').first()).toHaveCSS('font-size', mobile ? '14px' : '13px');
      await expect(legacy.locator('.ag-row').first()).toHaveCSS('font-size', '14px');
    }
    const compact = column(page, 'compact');
    await compact.locator('.ag-row').nth(1).locator('.ag-selection-checkbox input').click();
    await expect(compact.locator('.ag-row-selected')).toHaveCount(1);
    await expect(column(page, 'legacy').locator('.ag-row-selected')).toHaveCount(0);
    await compact.locator('.ag-header-cell[col-id=name]').click();
    await expect(compact.locator('.ag-header-cell[col-id=name]')).toHaveAttribute('aria-sort', 'ascending');
    expect(problems).toEqual([]);
  });

  test('tree toggles grow to touch size only in compact mobile; the search filters rows', async ({ page }) => {
    const problems = guard(page);
    for (const mobile of [false, true]) {
      await page.goto(gallery('data-grid-tree', `&mobile=${mobile}`));
      const toggle = (profile: string) => column(page, profile).locator('.coar-tree-cell__toggle').first();
      await expect(toggle('compact')).toBeVisible();
      expect((await toggle('legacy').boundingBox())!.width).toBe(20);
      expect((await toggle('compact').boundingBox())!.width).toBe(mobile ? 44 : 20);
    }
    const compact = column(page, 'compact');
    const names = () => compact.locator('.ag-row .coar-tree-cell').allInnerTexts();
    await expect.poll(async () => (await names()).join(',')).toContain('Button.vue');
    const search = compact.locator('input').first();
    await search.fill('format');
    await expect.poll(async () => (await names()).some((name) => name.includes('Button.vue'))).toBe(false);
    expect(problems).toEqual([]);
  });

  test('document viewer chrome, annotation popover and item menu carry the profile', async ({ page }) => {
    const problems = guard(page);
    for (const mobile of [false, true]) {
      await page.goto(gallery('document-viewer-open', `&mode=dark&mobile=${mobile}`));
      for (const profile of PROFILES) {
        await expect(column(page, profile).locator('.coar-pdf-anno-panel__item').first()).toBeVisible();
      }
      const header = (profile: string) => column(page, profile).locator('.coar-sidebar--side-top').first();
      expect(await height(header('legacy'))).toBe(44);
      expect(await height(header('compact'))).toBe(mobile ? 48 : 40);
    }
    for (const profile of PROFILES) {
      const scope = column(page, profile);
      await scope.locator('.coar-pdf-anno-panel__item').first().dispatchEvent('click');
      const popover = page.locator('.coar-pdf-annotation-popover');
      await expect(popover).toHaveCount(1);
      if (profile === 'compact') {
        await expect(popover).toHaveClass(/coar-compact/);
        await expect(popover).toHaveClass(/coar-mobile/);
        await expect(popover).toHaveClass(/dark-mode/);
      } else {
        await expect(popover).not.toHaveClass(/coar-compact|coar-mobile/);
      }
      const box = (await popover.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(1600);
      await scope.locator('.coar-pdf-anno-panel__item-menu').first().dispatchEvent('click');
      const host = page.locator('.coar-overlay-host').filter({ hasText: 'Delete' });
      await expect(host).toBeVisible();
      await expect(host).toHaveClass(profile === 'compact' ? /coar-compact/ : /^(?!.*coar-compact)/);
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      await page.reload();
      await expect(column(page, 'compact').locator('.coar-pdf-anno-panel__item').first()).toBeVisible();
    }
    expect(problems).toEqual([]);
  });

  test('the local PDF fixture is painted by pdf.js in both profiles', async ({ page }) => {
    const problems = guard(page);
    await page.goto(gallery('document-viewer-pdf'));
    for (const profile of PROFILES) {
      const scope = column(page, profile);
      await expect(scope).toContainText('Quarterly report');
      await expect.poll(() => scope.evaluate((root) => {
        const canvases = [...root.querySelectorAll('canvas')]
          .sort((a, b) => b.width * b.height - a.width * a.height);
        const canvas = canvases[0];
        if (!canvas || !canvas.width) return 0;
        const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
        let ink = 0;
        for (let i = 0; i < data.length; i += 16) if (data[i] < 128 && data[i + 3] > 0) ink++;
        return ink;
      }), { timeout: 15_000 }).toBeGreaterThan(50);
    }
    expect(problems).toEqual([]);
  });

  test('maps stay tile-free; the editor popup form is editable', async ({ page }) => {
    const problems = guard(page);
    await page.goto(gallery('map'));
    for (const profile of PROFILES) {
      const scope = column(page, profile);
      await expect(scope.locator('.leaflet-marker-icon')).toHaveCount(4);
      await expect(scope.locator('.leaflet-tile')).toHaveCount(0);
      await expect(scope.locator('.coar-map-point-list__row')).toHaveCount(5);
    }
    await page.goto(gallery('map-editor', '&mode=dark'));
    const label = (profile: string) => column(page, profile).getByLabel('Label', { exact: true });
    for (const profile of PROFILES) await expect(label(profile)).toHaveValue('British Museum');
    await label('compact').fill('British Museum — Nordeingang');
    await expect(label('compact')).toHaveValue('British Museum — Nordeingang');
    await expect(label('legacy')).toHaveValue('British Museum');
    expect(problems).toEqual([]);
  });

  test('markdown viewer uses the compact document roles only in compact', async ({ page }) => {
    const problems = guard(page);
    for (const mobile of [false, true]) {
      await page.goto(gallery('markdown-viewer', `&mobile=${mobile}`));
      const legacy = column(page, 'legacy');
      const compact = column(page, 'compact');
      await expect(legacy.locator('.coar-markdown h1')).toHaveCSS('font-size', '32px');
      await expect(legacy.locator('.coar-markdown h1')).toHaveCSS('font-weight', '700');
      await expect(legacy.locator('.coar-markdown th').first()).toHaveCSS('text-transform', 'uppercase');
      await expect(compact.locator('.coar-markdown h1')).toHaveCSS('font-size', '24px');
      await expect(compact.locator('.coar-markdown h1')).toHaveCSS('font-weight', '600');
      await expect(compact.locator('.coar-markdown th').first()).toHaveCSS('text-transform', 'none');
      await expect(compact.locator('.coar-markdown p').first()).toHaveCSS('font-size', mobile ? '15px' : '14px');
      await expect(legacy.locator('.coar-markdown p').first()).toHaveCSS('font-size', '16px');
      expect(await compact.locator('.coar-markdown p').first().evaluate((el) => getComputedStyle(el).fontFamily))
        .toMatch(/^Inter/);
      expect(await legacy.locator('.coar-markdown p').first().evaluate((el) => getComputedStyle(el).fontFamily))
        .toMatch(/^Poppins/);
    }
    expect(problems).toEqual([]);
  });

  test('markdown editor: the real table picker opens in the profile of its editor; typing works', async ({ page }) => {
    const problems = guard(page);
    await page.goto(gallery('markdown-editor', '&mode=dark'));
    for (const profile of PROFILES) {
      const editor = column(page, profile).locator('[data-scene-part=fixed-editor]');
      const table = editor.locator('.coar-sidebar-item').filter({ has: page.locator('[icon-name=table]') });
      await table.click();
      const picker = page.locator('.coar-overlay-host').filter({ has: page.locator('.coar-md-table-picker') });
      await expect(picker).toBeVisible();
      await expect(picker).toHaveClass(/dark-mode/);
      await expect(picker).toHaveClass(profile === 'compact' ? /coar-compact/ : /^(?!.*coar-compact)/);
      const box = (await picker.locator('.coar-md-table-picker').boundingBox())!;
      expect(box.y + box.height).toBeLessThanOrEqual(1000);
      await page.keyboard.press('Escape');
      await expect(picker).toHaveCount(0);
    }
    const prose = column(page, 'compact').locator('[data-scene-part=fixed-editor] .ProseMirror');
    await prose.locator('p').first().click();
    await page.keyboard.press('End');
    await page.keyboard.type(' Ergänzt.');
    await expect(prose).toContainText('Ergänzt.');
    await expect(column(page, 'legacy').locator('[data-scene-part=fixed-editor] .ProseMirror')).not.toContainText('Ergänzt.');
    expect(problems).toEqual([]);
  });

  test('markdown form shows its errors in both profiles and accepts input', async ({ page }) => {
    const problems = guard(page);
    await page.goto(gallery('markdown-form', '&mode=dark'));
    for (const profile of PROFILES) {
      const fill = column(page, profile).locator('[data-scene-part=fill]');
      await expect(fill.locator('.coar-markdown-form-field--error')).toHaveCount(1);
      await expect(fill).toContainText('summary is required');
    }
    const name = column(page, 'compact').locator('[data-scene-part=fill] input').first();
    await name.fill('Grace Hopper');
    await expect(name).toHaveValue('Grace Hopper');
    expect(problems).toEqual([]);
  });

  test('page builder: drawer open, field selected, rows on the interactive row role', async ({ page }) => {
    const problems = guard(page);
    for (const mobile of [false, true]) {
      await page.goto(gallery('page-builder', `&mobile=${mobile}`));
      for (const profile of PROFILES) {
        await expect(column(page, profile).locator('.pb-tree-row').first()).toBeVisible();
      }
      expect(await height(column(page, 'legacy').locator('.pb-tree-row').first())).toBe(30);
      // A compact row grows with its content: measured once the theme's font has loaded.
      await expect.poll(() => height(column(page, 'compact').locator('.pb-tree-row').first())).toBe(mobile ? 44 : 36);
    }
    expect(problems).toEqual([]);
  });
});

test.describe('isolated documents (frame pages)', () => {
  test.describe.configure({ timeout: 60_000 });
  test.beforeEach(async ({ page }) => { await page.setViewportSize({ width: 900, height: 1000 }); });

  const monaco = (page: Page) => page.locator('[data-scene-part=editor] .monaco-editor');

  for (const mode of ['light', 'dark'] as const) {
    test(`script editor uses the legacy Monaco theme in a legacy document (${mode})`, async ({ page }) => {
      const problems = guard(page);
      await page.goto(framePage('script-editor', 'legacy', mode));
      await expect(monaco(page).locator('.view-lines')).toBeVisible();
      const vars = await monaco(page).evaluate((el) => ({
        background: getComputedStyle(el).getPropertyValue('--vscode-editor-background').trim(),
        lineNumber: getComputedStyle(el).getPropertyValue('--vscode-editorLineNumber-foreground').trim(),
      }));
      expect(vars).toEqual(mode === 'dark'
        ? { background: '#1a1a1a', lineNumber: '#6b7280' }
        : { background: '#ffffff', lineNumber: '#9ca3af' });
      await expect(page.locator('.coar-script-editor').first()).toHaveCSS('border-radius', '2px');
      expect(problems).toEqual([]);
    });
  }

  test('script editor in a compact light document takes the compact roles', async ({ page }) => {
    const problems = guard(page);
    await page.goto(framePage('script-editor', 'compact', 'light'));
    await expect(monaco(page).locator('.view-lines')).toBeVisible();
    const scene = page.locator('[data-review-profile=compact]');
    const editorBackground = await page.locator('.monaco-editor-background').first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(editorBackground).toBe(await role(scene, '--coar-background-neutral-primary'));
    const lineNumber = await monaco(page).locator('.line-numbers:not(.active-line-number)').first()
      .evaluate((el) => getComputedStyle(el).color);
    expect(lineNumber).toBe(await role(scene, '--coar-text-neutral-tertiary'));
    await expect(page.locator('.coar-script-editor').first()).toHaveCSS('border-radius', '6px');
    expect(problems).toEqual([]);
  });

  test('script editor in a compact dark document matches the dark compact surface', async ({ page }) => {
    const problems = guard(page);
    await page.goto(framePage('script-editor', 'compact', 'dark'));
    await expect(monaco(page).locator('.view-lines')).toBeVisible();
    const scene = page.locator('[data-review-profile=compact]');
    const editorBackground = await page.locator('.monaco-editor-background').first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(problems).toEqual([]);
    expect(editorBackground).toBe(await role(scene, '--coar-background-neutral-primary'));
  });

  for (const profile of PROFILES) {
    test(`script editor IntelliSense opens inside the viewport (${profile}, dark)`, async ({ page }) => {
      const problems = guard(page);
      await page.goto(framePage('script-editor', profile, 'dark'));
      await monaco(page).locator('.view-lines').click();
      await page.keyboard.press('Control+End');
      await page.keyboard.type('\nconst site = (null as unknown as VisitContext).');
      const suggest = page.locator('.suggest-widget.visible');
      await expect(suggest).toBeVisible({ timeout: 10_000 });
      await expect(suggest).toContainText('site');
      await expect(suggest).toContainText('user');
      const box = (await suggest.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(900);
      expect(box.y + box.height).toBeLessThanOrEqual(1000);
      await page.keyboard.press('Escape');
      await expect(suggest).toBeHidden();
      expect(problems).toEqual([]);
    });
  }

  test('mermaid renders per document with the profile font, plus its error state', async ({ page }) => {
    const problems = guard(page);
    const fills: string[] = [];
    for (const profile of PROFILES) {
      await page.goto(framePage('mermaid', profile, 'light'));
      const diagram = page.locator('[data-scene-part=diagram][data-status=rendered] svg');
      await expect(diagram).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('[data-scene-part=error]')).toHaveAttribute('data-status', 'error');
      await expect(page.locator('[data-scene-part=diagram] button')).toHaveCount(3);
      const label = await diagram.locator('.nodeLabel').first().evaluate((el) => getComputedStyle(el).fontFamily);
      expect(label).toMatch(profile === 'compact' ? /^Inter/ : /^Poppins/);
      fills.push(await diagram.locator('.node rect').first().evaluate((el) => getComputedStyle(el).fill));
    }
    // Each document initialized Mermaid with its own profile's colors.
    expect(fills[0]).not.toBe(fills[1]);
    expect(problems).toEqual([]);
  });

  test('markdown phone scene fits a 390px phone viewport in both profiles', async ({ page }) => {
    const problems = guard(page);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const profile of PROFILES) {
      await page.goto(framePage('markdown-phone', profile, 'light', true));
      await expect(page.locator('.coar-mermaid[data-status=rendered] svg')).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('.ProseMirror')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      // Reading text of the viewer (the editor's own text keeps the 16px field size on phones).
      await expect(page.locator('.vs-stack > .coar-markdown p').first())
        .toHaveCSS('font-size', profile === 'compact' ? '15px' : '16px');
    }
    expect(problems).toEqual([]);
  });

  for (const profile of PROFILES) {
    test(`composition: floating filter, filter popup and select editor work (${profile})`, async ({ page }) => {
      const problems = guard(page);
      await page.setViewportSize({ width: 1280, height: 1000 });
      await page.goto(framePage('composition', profile, 'dark'));
      const grid = page.locator('[data-scene-part=grid]');
      await expect(grid.locator('.ag-row')).toHaveCount(4);
      await expect(page.locator('[data-scene-part=map] .leaflet-marker-icon')).toHaveCount(4);
      await expect(page.locator('[data-scene-part=map] .leaflet-tile')).toHaveCount(0);
      await expect(page.locator('[data-scene-part=flow] [data-status=rendered] svg')).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('[data-scene-part=form] .coar-markdown-form-field--error')).toHaveCount(1);

      // Real select editor: its dropdown is a ui overlay that must carry the profile.
      await grid.locator('.ag-row[row-index="1"] .ag-cell[col-id=status]').dblclick();
      const option = page.locator('.coar-overlay-host .coar-select-option').filter({ hasText: 'Visited' });
      await expect(option).toBeVisible();
      const host = page.locator('.coar-overlay-host').filter({ has: page.locator('.coar-select-option') });
      await expect(host).toHaveClass(/dark-mode/);
      if (profile === 'compact') expect(await height(option)).toBe(36);
      await option.click();
      await expect(grid.locator('.ag-row[row-index="1"] .ag-cell[col-id=status]')).toHaveText('Visited');

      // AG Grid floating filter and its filter popup.
      await grid.locator('.ag-floating-filter input').first().fill('park');
      await expect(grid.locator('.ag-row')).toHaveCount(1);
      await expect(grid.locator('.ag-row').first()).toContainText('Hyde Park');
      await grid.locator('.ag-floating-filter-button-button').first().click();
      const popup = page.locator('.ag-filter').first();
      await expect(popup).toBeVisible();
      const box = (await popup.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(1280);
      if (profile === 'compact') {
        const row = await grid.locator('.ag-row').first().evaluate((el) => el.getBoundingClientRect().height);
        expect(row).toBe(36);
      }
      expect(problems).toEqual([]);
    });
  }
});
