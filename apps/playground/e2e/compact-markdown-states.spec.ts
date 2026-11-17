import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Markdown sub-states that the library scenes of compact-library.spec.ts do not reach,
 * legacy beside compact, in Chromium against the normal playground (source aliases):
 *
 * - `markdown-mermaid-integration` (framed): ```mermaid fences through the real
 *   markdown-mermaid registry inside CoarMarkdown, light and dark each its own document;
 *   author color spans keep their saved color in both profiles.
 * - `markdown-advanced` (inline): editor frontmatter / code-block / embed NodeViews, the
 *   floating toolbar, TableHandles with their action menu, the image-upload spinner.
 * - `markdown-form-layouts` (inline): `layout=row` and `layout=stacked` paragraphs.
 *
 * Every test fails on page errors, console errors and requests that leave localhost.
 * Measured values are written to the test output (`[measure]`) for the audit
 * (src/design-review/audits/markdown-states.md). `.coar-mobile` is not covered here.
 */

const PROFILES = ['legacy', 'compact'] as const;
const MODES = ['light', 'dark'] as const;

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
const framePage = (kind: string, profile: string, mode: string) =>
  `/design-review?frame=1&kind=${kind}&profile=${profile}&mode=${mode}&mobile=false`;
const column = (page: Page, profile: string) => page.locator(`[data-review-profile=${profile}]`);
const measure = (label: string, value: unknown) => console.log(`[measure] ${label}: ${JSON.stringify(value)}`);

async function font(locator: Locator) {
  return locator.evaluate((el) => {
    const s = getComputedStyle(el);
    return { family: s.fontFamily.split(',')[0]!.trim(), size: s.fontSize, weight: s.fontWeight, lineHeight: s.lineHeight };
  });
}
const box = async (locator: Locator) => (await locator.boundingBox())!;
/**
 * ProseMirror reads a click's or a native caret move's DOM selection on `selectionchange`,
 * after the input event; a key handled by ProseMirror right after it would act on the old
 * selection. Two frames let it catch up.
 */
const settle = (page: Page) => page.evaluate(() =>
  new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));

test.describe('markdown: mermaid fences through the registry', () => {
  test.describe.configure({ timeout: 90_000 });

  for (const mode of MODES) {
    test(`fences render as diagrams in one document per profile; color spans unchanged (${mode})`, async ({ page }) => {
      const problems = guard(page);
      await page.setViewportSize({ width: 900, height: 1000 });
      const fills: string[] = [];
      for (const profile of PROFILES) {
        await page.goto(framePage('markdown-mermaid-integration', profile, mode));
        const html = page.locator('html');
        await expect(html).toHaveClass(mode === 'dark' ? /dark-mode/ : /light-mode/);
        await expect(html).toHaveClass(profile === 'compact' ? /coar-compact/ : /^(?!.*coar-compact)/);

        const doc = page.locator('[data-scene-part=zoomable-doc] .coar-markdown');
        const fences = doc.locator('.coar-markdown-fence[data-fence-language=mermaid]');
        await expect(fences).toHaveCount(2);
        // Fence → CoarMermaidFence → CoarMermaidDiagram: rendered and error, zoomable.
        const ok = fences.nth(0).locator('.coar-mermaid');
        await expect(ok).toHaveAttribute('data-status', 'rendered', { timeout: 20_000 });
        await expect(ok).toHaveClass(/coar-mermaid--zoomable/);
        await expect(fences.nth(1).locator('.coar-mermaid')).toHaveAttribute('data-status', 'error');
        // The zero-config registry renders without zoom controls.
        const plain = page.locator('[data-scene-part=plain-doc] .coar-markdown-fence .coar-mermaid');
        await expect(plain).toHaveAttribute('data-status', 'rendered', { timeout: 20_000 });
        await expect(plain).not.toHaveClass(/coar-mermaid--zoomable/);
        await expect(plain.locator('button')).toHaveCount(0);
        // An unregistered fence language stays a code block.
        await expect(doc.locator('.coar-markdown-code-block')).toHaveCount(1);

        const controls = ok.locator('button');
        await expect(controls).toHaveCount(3);
        const control = await box(controls.first());
        const label = ok.locator('svg .nodeLabel').first();
        const labelFont = await font(label);
        expect(labelFont.family).toMatch(profile === 'compact' ? /^Inter/ : /^Poppins/);
        const fill = await ok.locator('svg .node rect').first().evaluate((el) => getComputedStyle(el).fill);
        fills.push(fill);

        // Geometry of the fence in the prose flow: distance to the paragraphs around it.
        const flow = await doc.evaluate((root) => {
          const fence = root.querySelector('.coar-markdown-fence')!;
          const before = fence.previousElementSibling!.getBoundingClientRect();
          const after = fence.nextElementSibling!.getBoundingClientRect();
          const self = fence.getBoundingClientRect();
          return {
            gapBefore: Math.round(self.top - before.bottom),
            gapAfter: Math.round(after.top - self.bottom),
            fenceMargin: getComputedStyle(fence).margin,
            width: Math.round(self.width),
            proseWidth: Math.round(root.getBoundingClientRect().width),
          };
        });
        measure(`mermaid-fence ${profile} ${mode}`, {
          labelFont, fill, control: { w: control.width, h: control.height }, ...flow,
          paragraph: await font(doc.locator('p').first()),
        });
        expect(flow.width).toBe(flow.proseWidth);

        // Real zoom interaction: the zoom-in control scales the diagram content.
        const content = ok.locator('.coar-mermaid__svg');
        const before = await content.evaluate((el) => (el as HTMLElement).style.transform);
        await controls.nth(1).click();
        await expect.poll(() => content.evaluate((el) => (el as HTMLElement).style.transform)).not.toBe(before);

        // Author color spans are saved document colors: identical in both profiles and modes.
        const spans = doc.locator('.coar-markdown-color');
        await expect(spans).toHaveCount(2);
        await expect(spans.nth(0)).toHaveCSS('color', 'rgb(37, 99, 235)');
        await expect(spans.nth(1)).toHaveCSS('color', 'rgb(185, 28, 28)');
      }
      // Each document initialized Mermaid with its own profile.
      expect(fills[0]).not.toBe(fills[1]);
      expect(problems).toEqual([]);
    });
  }

  test('the gallery keeps Mermaid inside one iframe per profile (dark)', async ({ page }) => {
    const problems = guard(page);
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto(gallery('markdown-mermaid-integration', '&mode=dark'));
    for (const profile of PROFILES) {
      const frame = page.frameLocator(`iframe[data-review-frame=${profile}]`);
      await expect(frame.locator('.coar-markdown-fence .coar-mermaid[data-status=rendered] svg').first())
        .toBeVisible({ timeout: 25_000 });
      await expect(frame.locator('html')).toHaveClass(/dark-mode/);
      await expect(column(page, profile)).not.toHaveClass(/coar-compact/);
    }
    // The gallery document itself never loads a diagram (Mermaid's config stays per frame).
    await expect(page.locator('.coar-mermaid')).toHaveCount(0);
    expect(problems).toEqual([]);
  });
});

test.describe('markdown editor: NodeViews, floating toolbar, table handles, upload', () => {
  test.describe.configure({ timeout: 90_000 });
  test.beforeEach(async ({ page }) => { await page.setViewportSize({ width: 1600, height: 1000 }); });

  const editorOf = (page: Page, profile: string) => column(page, profile).locator('[data-scene-part=editor]');
  const ready = async (page: Page) => {
    for (const profile of PROFILES) {
      await expect(editorOf(page, profile).locator('.coar-markdown-embed-host [data-scene-part=metric]'))
        .toBeVisible({ timeout: 20_000 });
    }
  };

  for (const mode of MODES) {
    test(`frontmatter, code block, embed and color span NodeViews (${mode})`, async ({ page }) => {
      const problems = guard(page);
      await page.goto(gallery('markdown-advanced', `&mode=${mode}`));
      await ready(page);
      for (const profile of PROFILES) {
        const editor = editorOf(page, profile);
        const prose = editor.locator('.ProseMirror');

        // Frontmatter NodeView: a direct block of the ProseMirror root, entries as key: value.
        const front = prose.locator(':scope > .coar-markdown-frontmatter');
        await expect(front.locator('.coar-markdown-frontmatter__entry')).toHaveCount(2);
        const frontColor = await front.evaluate((el) => getComputedStyle(el).color);

        // Code block NodeView: render mode, then edit mode with the language row once the
        // caret is inside it.
        const host = prose.locator('.coar-md-code-host');
        await expect(host).not.toHaveClass(/coar-md-code-host--editing/);
        const renderBox = await box(host);
        await host.locator('.coar-md-code-edit-btn').click();
        await expect(host).toHaveClass(/coar-md-code-host--editing/);
        const langRow = host.locator('.coar-md-code-lang-row');
        await expect(langRow).toBeVisible();
        const langRowHeight = Math.round((await box(langRow)).height);
        const editBox = await box(host);
        const codeFont = await font(host.locator('.coar-md-code-content'));

        // Embed NodeView: the registered viewer; selecting the node outlines it.
        const embed = prose.locator('.coar-markdown-embed-host');
        await prose.locator('p').filter({ hasText: 'Letzter Absatz' }).click();
        await expect(host).not.toHaveClass(/coar-md-code-host--editing/);
        // Select the embed with the keyboard: caret at the start of the next paragraph, then left.
        await prose.locator('p').filter({ hasText: 'Absatz nach dem Embed' }).click();
        await settle(page);
        await page.keyboard.press('Home');
        await settle(page);
        await page.keyboard.press('ArrowLeft');
        await expect(embed).toHaveClass(/coar-markdown-embed-host--selected/);
        const outline = await embed.evaluate((el) => {
          const s = getComputedStyle(el);
          return { outline: `${s.outlineWidth} ${s.outlineStyle} ${s.outlineColor}`, radius: s.borderRadius, style: s.outlineStyle };
        });

        // Author color span inside the editor: saved color, not re-tinted.
        const span = prose.locator('span[style*="color"]').first();
        await expect(span).toHaveCSS('color', 'rgb(37, 99, 235)');

        measure(`editor-nodeviews ${profile} ${mode}`, {
          writing: await font(prose.locator('p').first()),
          frontmatter: { ...(await font(front)), color: frontColor },
          codeRender: { h: Math.round(renderBox.height) },
          codeEdit: { h: Math.round(editBox.height), langRow: langRowHeight },
          codeFont,
          embedSelected: outline,
          metric: await font(embed.locator('[data-scene-part=metric] span')),
        });
        // Only compact fixes the masked selection ring. Legacy's generic
        // contenteditable reset must keep its historical appearance unchanged.
        expect(outline.style, 'compact selection is painted; legacy cascade is preserved')
          .toBe(profile === 'compact' ? 'solid' : 'none');
      }
      expect(problems).toEqual([]);
    });
  }

  test('floating toolbar on a selection carries the profile and stays in the viewport (dark)', async ({ page }) => {
    const problems = guard(page);
    await page.goto(gallery('markdown-advanced', '&mode=dark'));
    await ready(page);
    for (const profile of PROFILES) {
      const prose = editorOf(page, profile).locator('.ProseMirror');
      await prose.locator('strong').first().dblclick();
      const toolbar = page.locator('body > .coar-md-floating-toolbar');
      await expect(toolbar).toBeVisible();
      await expect(toolbar).toHaveClass(profile === 'compact' ? /coar-compact/ : /^(?!.*coar-compact)/);
      const rect = await box(toolbar);
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(1600);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      const button = toolbar.locator('button').first();
      const b = await box(button);
      measure(`floating-toolbar ${profile} dark`, {
        toolbar: { w: Math.round(rect.width), h: Math.round(rect.height) },
        button: { w: b.width, h: b.height },
        background: await toolbar.evaluate((el) => getComputedStyle(el).backgroundColor),
        radius: await toolbar.evaluate((el) => getComputedStyle(el).borderRadius),
      });
      // Real command: the italic button wraps the selection.
      await toolbar.locator('button[title*="talic" i], button[aria-label*="talic" i]').first().click();
      await expect(prose.locator('em strong, strong em')).toHaveCount(1);
      await page.keyboard.press('ControlOrMeta+z');
      await page.mouse.click(5, 5);
      await expect(toolbar).toHaveCount(0);
    }
    expect(problems).toEqual([]);
  });

  test('table handles appear on hover, carry the profile and open their action menu (light)', async ({ page }) => {
    const problems = guard(page);
    await page.goto(gallery('markdown-advanced'));
    await ready(page);
    for (const profile of PROFILES) {
      const table = editorOf(page, profile).locator('.ProseMirror table');
      await table.scrollIntoViewIfNeeded();
      const t = await box(table);
      await page.mouse.move(t.x + 20, t.y + t.height / 2);
      const handles = page.locator('body > .coar-md-th');
      await expect(handles).toBeVisible();
      await expect(handles).toHaveClass(profile === 'compact' ? /coar-compact/ : /^(?!.*coar-compact)/);
      const grip = handles.locator('.coar-md-th__bar--col .coar-md-th__grip').first();
      const g = await box(grip);
      await grip.hover();
      await expect(grip).toHaveClass(/coar-md-th__grip--active/);
      await expect(handles.locator('.coar-md-th__hl')).toBeVisible();
      await grip.click();
      const item = page.getByRole('menuitem', { name: 'Insert column right' });
      await expect(item).toBeVisible();
      const menuHost = page.locator('.coar-overlay-host').filter({ has: item });
      const menuClass = await menuHost.getAttribute('class');
      const itemFont = await font(item);
      const itemBox = await box(item);
      measure(`table-handles ${profile} light`, {
        grip: { w: Math.round(g.width), h: Math.round(g.height) },
        menuHost: menuClass, item: { ...itemFont, h: itemBox.height },
      });
      await expect(menuHost).toHaveClass(profile === 'compact' ? /coar-compact/ : /^(?!.*coar-compact)/);
      // Real command: insert a column right of the first one.
      await item.click();
      await expect(table.locator('tr').first().locator('th, td')).toHaveCount(3);
      await page.mouse.move(5, 5);
      await expect(handles).toHaveCount(0);
    }
    expect(problems).toEqual([]);
  });

  test('a pasted image shows the upload spinner until the local upload resolves (light)', async ({ page }) => {
    const problems = guard(page);
    await page.goto(gallery('markdown-advanced'));
    await ready(page);
    for (const profile of PROFILES) {
      const scope = column(page, profile);
      const prose = editorOf(page, profile).locator('.ProseMirror');
      await prose.locator('p').filter({ hasText: 'Letzter Absatz' }).click();
      await settle(page);
      await page.keyboard.press('End');
      await settle(page);
      // A real paste event with an image file: the editor's imageUpload plugin handles it.
      await prose.evaluate((el) => {
        const data = new DataTransfer();
        data.items.add(new File([new Uint8Array([137, 80, 78, 71])], 'diagramm.png', { type: 'image/png' }));
        el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
      });
      const spinner = prose.locator('.coar-md-image-uploading');
      await expect(spinner).toBeVisible();
      await expect(scope.locator('[data-scene-part=upload-pending]')).toHaveText('1 Upload(s) offen');
      const s = await box(spinner);
      const style = await spinner.evaluate((el) => {
        const c = getComputedStyle(el);
        return { animation: c.animationName, arc: c.borderTopColor, track: c.borderRightColor, fontSize: c.fontSize };
      });
      measure(`upload-spinner ${profile} light`, { w: s.width, h: s.height, ...style });
      expect(style.animation).not.toBe('none');
      await scope.locator('[data-scene-part=finish-upload]').click();
      await expect(spinner).toHaveCount(0);
      await expect(prose.locator('img[alt=diagramm]')).toHaveCount(1);
    }
    expect(problems).toEqual([]);
  });
});

test.describe('markdown form: row and stacked paragraphs', () => {
  test.describe.configure({ timeout: 60_000 });

  for (const mode of MODES) {
    test(`row puts the label beside, stacked above the control; input and errors work (${mode})`, async ({ page }) => {
      const problems = guard(page);
      await page.setViewportSize({ width: 1600, height: 1000 });
      await page.goto(gallery('markdown-form-layouts', `&mode=${mode}`));
      for (const profile of PROFILES) {
        const scope = column(page, profile);
        const row = scope.locator('[data-scene-part=row] .coar-markdown-form-paragraph--row');
        const stacked = scope.locator('[data-scene-part=stacked] .coar-markdown-form-paragraph--stacked');
        await expect(row).toHaveCount(2);
        await expect(stacked).toHaveCount(2);
        await expect(stacked.first().locator('input')).toBeVisible({ timeout: 20_000 });

        const geometry = async (paragraph: Locator) => paragraph.evaluate((p) => {
          const label = p.querySelector('strong')!.getBoundingClientRect();
          // The control frame (the field), not the native input inset inside it.
          const input = p.querySelector('.coar-markdown-form-field')!.getBoundingClientRect();
          const text = p.querySelector('input')!.getBoundingClientRect();
          const s = getComputedStyle(p);
          return {
            gap: s.gap, columns: s.gridTemplateColumns,
            label: { x: Math.round(label.x), top: Math.round(label.top), bottom: Math.round(label.bottom) },
            input: { x: Math.round(input.x), top: Math.round(input.top), h: Math.round(input.height), w: Math.round(input.width) },
            textInset: Math.round(text.x - input.x),
            labelCenterOffset: Math.round((label.top + label.height / 2) - (input.top + input.height / 2)),
          };
        });
        const r = await geometry(row.first());
        const st = await geometry(stacked.first());
        // Row: label left of the control, vertically centered on it.
        expect(r.input.x).toBeGreaterThan(r.label.x);
        expect(Math.abs(r.labelCenterOffset)).toBeLessThanOrEqual(2);
        // Stacked: label above the control, same left edge.
        expect(st.input.top).toBeGreaterThanOrEqual(st.label.bottom);
        expect(Math.abs(st.input.x - st.label.x)).toBeLessThanOrEqual(1);

        const error = scope.locator('[data-scene-part=stacked] .coar-markdown-form-field--error');
        await expect(error).toHaveCount(1);
        measure(`form-layouts ${profile} ${mode}`, {
          row: r, stacked: st,
          label: await font(row.first().locator('strong')),
          input: await font(row.first().locator('input')),
          error: await font(scope.locator('[data-scene-part=row] .coar-markdown-form-field--error').first()
            .locator('xpath=.//*[contains(text(), "required")]').first()),
        });

        // Real input clears the required error of the stacked field.
        await stacked.nth(1).locator('input').fill('Bestanden');
        await expect(error).toHaveCount(0);
      }
      expect(problems).toEqual([]);
    });
  }
});
