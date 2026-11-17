import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

/**
 * Page builder in the compact presentation: the panes, inspectors, dialogs and renderer that
 * `compact-library.spec.ts` (only `.pb-tree-row`) and `page-builder-compact.spec.ts` (metrics
 * of the default scene) do not reach. Scenes: `page-builder-inspectors`, `page-builder-panes`,
 * `page-builder-code` (src/design-review/scenes, registered in library-scenes.ts).
 *
 * How it measures:
 *  - Every scene is opened as a frame page (`/design-review?frame=1&kind=…`), so each profile
 *    is its own document: `.coar-compact` / `.coar-mobile` / `.light-mode|.dark-mode` sit on
 *    <html>, and Monaco (Logic, dialogs) keeps one theme per document.
 *  - Nodes are selected and panes are opened by real clicks on the real builder.
 *  - `legacy` keeps the literal values of the default presentation (also under `.coar-mobile`:
 *    the promise is that the default does not move). `compact` derives its expectations from
 *    the shared roles read in the page (`--coar-interactive-row-height` …) and from
 *    colour roles resolved with a probe element, never from hard-coded pixel guesses.
 *  - Authored content (preview frame, canvas content, standalone renderer) must stay the same
 *    in every profile.
 *  - Compact contrast sweeps fail below 4.5:1 for small enabled text. Legacy contrast
 *    is recorded separately, without redesigning the default presentation.
 *
 * `.coar-mobile` here is class emulation in desktop Chromium. There is no tablet, touch or
 * device run in this file: the builder is "tablet partial, phone no", and the 16px canvas
 * node buttons, the 24x20 fx toggle and the hand-made segmented control are recorded in the
 * touch-target census (attachment `touch-census-*`), not asserted as passing.
 */

type Profile = 'legacy' | 'compact';
interface Variant { name: string; mode: 'light' | 'dark'; mobile: boolean }

const PROFILES: Profile[] = ['legacy', 'compact'];
const VARIANTS: Variant[] = [
  { name: 'light', mode: 'light', mobile: false },
  { name: 'dark', mode: 'dark', mobile: false },
  { name: 'light mobile', mode: 'light', mobile: true },
  { name: 'dark mobile', mode: 'dark', mobile: true },
];
/** Monaco-heavy tests run the compact profile in every variant, legacy only in light + dark desktop. */
const MONACO_RUNS = VARIANTS.flatMap((variant) =>
  PROFILES.filter((profile) => profile === 'compact' || !variant.mobile).map((profile) => ({ profile, variant })));

test.use({ viewport: { width: 1500, height: 1000 } });

// ── Harness helpers ────────────────────────────────────────────────────────────

const frameUrl = (kind: string, profile: Profile, v: Variant) =>
  `/design-review?frame=1&kind=${kind}&profile=${profile}&mode=${v.mode}&mobile=${v.mobile}`;

/**
 * Measured floor for a compact promise. The default (legacy) presentation must stay exactly as it is, so a
 * legacy value is only recorded as an observation (annotation), never asserted to be good.
 */
function gate(message: string, actual: number, min: number) {
  if (message.startsWith('legacy')) {
    test.info().annotations.push({ type: 'legacy-observation', description: `${message}: ${Math.round(actual * 100) / 100} (floor ${min} not enforced)` });
    return;
  }
  expect.soft(actual, message).toBeGreaterThanOrEqual(min);
}

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

async function open(page: Page, kind: string, profile: Profile, v: Variant): Promise<Locator> {
  await page.goto(frameUrl(kind, profile, v));
  const html = page.locator('html');
  await expect(html).toHaveClass(v.mode === 'dark' ? /dark-mode/ : /light-mode/);
  await expect(html).toHaveClass(profile === 'compact' ? /coar-compact/ : /^(?!.*coar-compact)/);
  await expect(html).toHaveClass(v.mobile ? /coar-mobile/ : /^(?!.*coar-mobile)/);
  const builder = page.locator('.pb-builder');
  await expect(builder.locator('.pb-tree-row').first()).toBeVisible({ timeout: 25_000 });
  return builder;
}

/** Shared roles as the page resolves them on the builder root (NaN where the profile does not define them). */
async function shared(builder: Locator) {
  return builder.evaluate((el) => {
    const style = getComputedStyle(el);
    const n = (name: string) => parseFloat(style.getPropertyValue(name));
    return {
      row: n('--coar-interactive-row-height'),
      ui: n('--coar-ui-font-size'),
      caption: n('--coar-caption-font-size'),
      field: n('--coar-field-font-size'),
      controlRadius: n('--coar-control-radius'),
      panelPadding: n('--coar-panel-padding'),
      lineHeight: n('--coar-ui-line-height'),
    };
  });
}
type Shared = Awaited<ReturnType<typeof shared>>;

/** Expectations: literal in legacy, derived from the shared roles in compact. */
function want(profile: Profile, s: Shared) {
  if (profile === 'legacy') {
    return {
      treeRow: 30, treeBtn: 22, header: 40, canvasToolbar: 38, previewToolbar: 38, iconBtn: 24,
      libGroupToggle: 36, libItemMin: 30, label: 12, meta: 11, field: 13, segActiveWeight: '600',
      inline: 22, optAdd: 24, translationsHeading: 18, compositionsHeading: 17, panelPadding: 20,
    };
  }
  return {
    treeRow: s.row, treeBtn: s.row - 12, header: Math.max(40, s.row), canvasToolbar: Math.max(40, s.row),
    previewToolbar: Math.max(40, s.row), iconBtn: s.row - 8, libGroupToggle: s.row, libItemMin: s.row,
    label: s.caption, meta: s.caption, field: s.field, segActiveWeight: '500',
    inline: s.row - 12, optAdd: s.row - 12, translationsHeading: 16, compositionsHeading: 16, panelPadding: s.panelPadding,
  };
}

async function css(target: Locator, ...props: string[]) {
  return target.evaluate((el, names) => {
    const style = getComputedStyle(el);
    return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(name)]));
  }, props);
}
const px = async (target: Locator, prop: string) => parseFloat((await css(target, prop))[prop]);
async function rect(target: Locator) {
  const box = (await target.boundingBox())!;
  return { x: box.x, y: box.y, w: Math.round(box.width * 100) / 100, h: Math.round(box.height * 100) / 100 };
}

/** Resolves a CSS colour expression (tokens, color-mix …) in the context of an element to rgba. */
async function roleColor(scope: Locator, expression: string) {
  return scope.evaluate((element, value) => {
    const probe = document.createElement('span');
    probe.style.color = value;
    element.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = resolved;
    ctx.fillRect(0, 0, 1, 1);
    const data = ctx.getImageData(0, 0, 1, 1).data;
    return [data[0], data[1], data[2], data[3] / 255] as [number, number, number, number];
  }, expression);
}
/** A computed colour property of an element as rgba. */
async function paint(target: Locator, prop: string) {
  return target.evaluate((element, name) => {
    const resolved = getComputedStyle(element).getPropertyValue(name);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = resolved;
    ctx.fillRect(0, 0, 1, 1);
    const data = ctx.getImageData(0, 0, 1, 1).data;
    return [data[0], data[1], data[2], data[3] / 255] as [number, number, number, number];
  }, prop);
}
function near(actual: number[], expected: number[], channel = 3, alpha = 0.03) {
  return actual.slice(0, 3).every((value, i) => Math.abs(value - expected[i]) <= channel)
    && Math.abs(actual[3] - expected[3]) <= alpha;
}
const luminance = ([r, g, b]: number[]) => {
  const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const ratio = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** The first opaque background behind an element (translucent layers composited over the document base). */
async function backdrop(target: Locator) {
  return target.evaluate((element) => {
    const dark = document.documentElement.classList.contains('dark-mode');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const rgba = (value: string) => {
      ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255];
    };
    const layers: number[][] = [];
    for (let el: Element | null = element; el; el = el.parentElement) {
      const bg = rgba(getComputedStyle(el).backgroundColor);
      if (bg[3] > 0) layers.push(bg);
      if (bg[3] >= 0.99) break;
    }
    let base = dark ? [18, 18, 18] : [255, 255, 255];
    for (const layer of layers.reverse()) base = base.map((c, i) => layer[i] * layer[3] + c * (1 - layer[3]));
    return base;
  });
}

/** Contrast of every enabled, visible text in a region; returns the offenders below the given ratios. */
async function contrastSweep(region: Locator) {
  return region.evaluate((root) => {
    const dark = document.documentElement.classList.contains('dark-mode');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const rgba = (value: string) => {
      ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255];
    };
    const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    const lum = (c: number[]) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const back = (element: Element) => {
      const layers: number[][] = [];
      for (let el: Element | null = element; el; el = el.parentElement) {
        const bg = rgba(getComputedStyle(el).backgroundColor);
        if (bg[3] > 0) layers.push(bg);
        if (bg[3] >= 0.99) break;
      }
      let base = dark ? [18, 18, 18] : [255, 255, 255];
      for (const layer of layers.reverse()) base = base.map((c, i) => layer[i] * layer[3] + c * (1 - layer[3]));
      return base;
    };
    const result: { target: string; text: string; ratio: number; size: number }[] = [];
    for (const element of root.querySelectorAll<HTMLElement>('*')) {
      if (element.closest('.monaco-editor, svg, [aria-hidden="true"], [disabled], [aria-disabled="true"]')) continue;
      const own = [...element.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent!.trim()).join(' ').trim();
      if (!own) continue;
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      if (box.width < 1 || box.height < 1 || style.visibility === 'hidden' || Number(style.opacity) < 0.6) continue;
      const fg = rgba(style.color);
      const bg = back(element);
      let alpha = fg[3];
      for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
        alpha *= Number(getComputedStyle(ancestor).opacity);
      }
      const mixed = bg.map((c, i) => fg[i] * alpha + c * (1 - alpha));
      const [hi, lo] = [lum(mixed), lum(bg)].sort((a, b) => b - a);
      result.push({
        target: `${element.tagName.toLowerCase()}.${String(element.className).split(' ')[0]}`,
        text: own.slice(0, 40),
        ratio: Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100,
        size: parseFloat(style.fontSize),
      });
    }
    return result;
  });
}
async function expectReadable(region: Locator, info: TestInfo, label: string) {
  const all = await contrastSweep(region);
  const weak = all.filter((entry) => entry.ratio < 4.5);
  if (weak.length) await info.attach(`contrast-${label}`, { body: JSON.stringify(weak, null, 1), contentType: 'application/json' });
  const floor = all.filter((entry) => entry.ratio < 3);
  if (label.includes('legacy')) {
    if (floor.length) test.info().annotations.push({ type: 'legacy-observation', description: `${label}: ${floor.length} text(s) below 3:1, e.g. ${JSON.stringify(floor[0])}` });
  } else {
    expect.soft(weak, `small text below 4.5:1 in ${label}`).toEqual([]);
  }
  expect.soft(all.length, `texts measured in ${label}`).toBeGreaterThan(0);
}

/** Keyboard-modality focus: the ring the user sees, not a programmatic focus. */
async function focusByKeyboard(page: Page, target: Locator) {
  await target.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(target).toBeFocused();
}
async function expectFocusRing(page: Page, target: Locator, label: string) {
  await focusByKeyboard(page, target);
  const ring = await css(target, 'outline-style', 'outline-width', 'outline-offset');
  if (label.startsWith('legacy')) {
    test.info().annotations.push({ type: 'legacy-observation', description: `${label}: focus ring ${JSON.stringify(ring)}` });
    return;
  }
  expect.soft(ring['outline-style'], `${label}: focus ring present`).not.toBe('none');
  expect.soft(parseFloat(ring['outline-width']), `${label}: focus ring width`).toBeGreaterThan(0);
  if (ring['outline-style'] !== 'auto') {
    const color = await paint(target, 'outline-color');
    gate(`${label}: focus ring contrast`, ratio(color, await backdrop(target)), 3);
  }
}

async function openDrawer(builder: Locator, name: 'Structure' | 'Insert elements') {
  const button = builder.locator(`.pb-builder__activity-btn[aria-label="${name}"]`);
  if ((await button.getAttribute('aria-pressed')) !== 'true') await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
}
/** Groups open at start; reopen whatever a state change (search, toggle) closed, before measuring items. */
async function openAllGroups(library: Locator) {
  const toggles = library.locator('.pb-library__group-toggle');
  for (let i = 0; i < (await toggles.count()); i++) {
    if ((await toggles.nth(i).getAttribute('aria-expanded')) === 'false') await toggles.nth(i).click();
  }
}
async function selectNode(builder: Locator, name: string) {
  await openDrawer(builder, 'Structure');
  const row = builder.locator('.pb-tree-row').filter({ hasText: name }).first();
  // A real mouse click on the row's own left edge (grip area), not on the label: the label centre can be covered by
  // `.pb-tree-actions` (see the label-hit test); no forced click is used anywhere.
  const height = (await row.boundingBox())!.height;
  await row.click({ position: { x: 6, y: height / 2 } });
  await expect(row).toHaveAttribute('aria-selected', 'true');
  return row;
}
const tab = (builder: Locator, name: string) => builder.getByRole('tab', { name, exact: true });
async function openTab(builder: Locator, name: string) {
  await tab(builder, name).click();
  const panel = builder.getByRole('tabpanel', { name });
  await expect(panel).toBeVisible();
  return panel;
}
const touchCensus = async (info: TestInfo, label: string, entries: Record<string, { w: number; h: number }>) =>
  info.attach(`touch-census-${label}`, { body: JSON.stringify(entries, null, 1), contentType: 'application/json' });

// ═══════════════════════════════════════════════════════════════════════════════
// Scene 1 · inspectors + canvas + standalone renderer (no Monaco)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('page builder compact · inspectors, canvas, outline, renderer', () => {
  test.describe.configure({ timeout: 90_000 });

  test('stack, paragraph, image, button and select inspectors, selected by real clicks', async ({ page }, info) => {
    const problems = guard(page);
    for (const v of VARIANTS) {
      for (const profile of PROFILES) {
        const label = `${profile} ${v.name}`;
        const builder = await open(page, 'page-builder-inspectors', profile, v);
        const s = await shared(builder);
        if (profile === 'compact') {
          expect(s.row, 'shared interactive row role').toBe(v.mobile ? 44 : 36);
          expect(s.ui, 'shared UI font role').toBe(v.mobile ? 14 : 13);
        }
        const w = want(profile, s);
        const props = builder.locator('.pb-props');
        const census: Record<string, { w: number; h: number }> = {};

        // Stack: StackInspector.vue is not registered (stack/index.ts); the real control is the "Stack direction"
        // CoarSelect of the Style section. Selection by a real option click; focus ring of the select trigger.
        await selectNode(builder, 'formStack');
        await expect(props.locator('.pb-props__section-title', { hasText: /^Stack$/ })).toHaveCount(0);
        const directionField = props.locator('.coar-form-field').filter({ has: page.locator('label', { hasText: 'Stack direction' }) }).first();
        const directionTrigger = directionField.locator('.coar-select-trigger').first();
        await expect(directionTrigger).toContainText('Column');
        census['stack direction select'] = await rect(directionTrigger);
        await expectFocusRing(page, directionTrigger, `${label}: stack direction select`);
        await directionTrigger.click();
        await page.getByRole('option', { name: 'Row', exact: true }).click();
        await expect(directionTrigger).toContainText('Row');
        await directionTrigger.click();
        await page.getByRole('option', { name: 'Column', exact: true }).click();
        await expect(directionTrigger).toContainText('Column');

        // Paragraph: native textarea on the field role (13 → 14 / 16 in compact), edit reaches the canvas.
        await selectNode(builder, 'introText');
        const textarea = props.locator('.pb-prop-textarea');
        expect.soft(await px(textarea, 'font-size'), `${label}: textarea font`).toBe(w.field);
        await textarea.fill('Edited by the review');
        await expect(builder.locator('.pb-canvas__content .canvas-node__paragraph', { hasText: 'Edited by the review' })).toBeVisible();
        await textarea.focus();
        expect.soft((await css(textarea, 'outline-width'))['outline-width'], `${label}: textarea ring`).toBe('2px');
        gate(`${label}: textarea ring contrast`, ratio(await paint(textarea, 'outline-color'), await backdrop(textarea)), 3);

        // Image: pickAsset variant, thumbnail geometry is asset geometry and stays 80x80 in every profile.
        await selectNode(builder, 'brandImage');
        const thumb = props.locator('.pb-image-asset__thumb');
        expect.soft(await css(thumb, 'width', 'height'), `${label}: thumbnail content size`).toEqual({ width: '80px', height: '80px' });
        expect(await thumb.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
        const radius = await px(thumb, 'border-top-left-radius');
        expect.soft(radius, `${label}: thumbnail radius`).toBe(profile === 'legacy' ? 6 : s.controlRadius);
        await expect(props.getByRole('button', { name: 'Change…' })).toBeVisible();
        census['image Change button'] = await rect(props.getByRole('button', { name: 'Change…' }));

        // Button: action editor + fx switch (opens no dialog here: Monaco lives in the frame scenes).
        await selectNode(builder, 'saveButton');
        const fx = props.getByRole('switch', { name: 'Use expression for Disabled' });
        await expect(fx).toBeVisible();
        census['fx switch'] = await rect(fx);
        await expectFocusRing(page, fx, `${label}: fx switch`);
        await fx.click();
        await expect(props.getByRole('switch', { name: 'Use static value for Disabled' })).toHaveAttribute('aria-checked', 'true');
        const expression = props.locator('.pb-bindable-property__expression');
        await expect(expression).toBeVisible();
        expect.soft(await px(expression.locator('span'), 'font-size'), `${label}: fx "Edit…" size`).toBe(w.meta);
        await props.getByRole('switch', { name: 'Use static value for Disabled' }).click();
        await expect(expression).toHaveCount(0);
        const heading = props.locator('.pb-action-values__heading strong');
        await expect(heading).toBeVisible();
        expect.soft(await px(heading, 'font-size'), `${label}: action heading size`).toBe(w.label);
        if (profile === 'compact') expect.soft((await css(heading, 'font-weight'))['font-weight']).toBe('600');

        // Select: OptionsEditor (public export) — ± buttons on the inline-button role, add, remove.
        await selectNode(builder, 'country');
        const rows = props.locator('.pb-select-options__row');
        await expect(rows).toHaveCount(3);
        const optionButton = rows.first().locator('.pb-select-options__btn').first();
        expect.soft((await rect(optionButton)).h, `${label}: options ± button`).toBe(w.inline);
        const add = props.locator('.pb-select-options__add');
        expect.soft((await rect(add)).h, `${label}: add option`).toBe(w.optAdd);
        expect.soft(await px(props.locator('.pb-select-options__label'), 'font-size'), `${label}: options label`).toBe(w.label);
        census['options ± button'] = await rect(optionButton);
        census['options add'] = await rect(add);
        await add.click();
        await expect(rows).toHaveCount(4);
        await rows.nth(3).locator('.pb-select-options__btn--danger').click();
        await expect(rows).toHaveCount(3);

        // The inspector as a whole stays readable.
        await expectReadable(props, info, `inspectors-${label}`);
        await touchCensus(info, `inspectors-${label}`, census);
      }
    }
    expect(problems).toEqual([]);
  });

  test('outline: row, row actions beside an issue icon, add-child menu', async ({ page }, info) => {
    const problems = guard(page);
    for (const v of VARIANTS) {
      for (const profile of PROFILES) {
        const label = `${profile} ${v.name}`;
        const builder = await open(page, 'page-builder-inspectors', profile, v);
        const w = want(profile, await shared(builder));

        // A row with an authoring warning (action not in availableActions): issue icon + selected-row actions.
        const row = await selectNode(builder, 'legacyButton');
        const issue = row.locator('.pb-tree-issue');
        await expect(issue).toBeVisible();
        await expect(row.locator('.pb-tree-label-key')).toHaveCSS('opacity', profile === 'compact' ? '1' : '0.7');
        const actions = row.locator('.pb-tree-actions .pb-tree-btn');
        await expect(actions.first()).toBeVisible();
        if (profile === 'legacy') expect.soft((await rect(row)).h, `${label}: row`).toBe(w.treeRow);
        else expect.soft((await rect(row)).h, `${label}: minimum row`).toBeGreaterThanOrEqual(w.treeRow);
        expect.soft((await rect(actions.first())).h, `${label}: row action`).toBe(w.treeBtn);
        // Four actions must not cover the validation indicator. On narrow
        // compact rows the action tray can wrap below the readable node label.
        const issueBox = await rect(issue);
        const actionsBox = await rect(row.locator('.pb-tree-actions'));
        const horizontalOverlap = Math.max(0, Math.min(issueBox.x + issueBox.w, actionsBox.x + actionsBox.w) - Math.max(issueBox.x, actionsBox.x));
        const verticalOverlap = Math.max(0, Math.min(issueBox.y + issueBox.h, actionsBox.y + actionsBox.h) - Math.max(issueBox.y, actionsBox.y));
        const overlap = verticalOverlap > 0 ? horizontalOverlap : 0;
        if (profile === 'legacy') {
          // Observed in the default presentation (unchanged by design): the overlap is pinned, not demanded to be fixed.
          expect.soft(overlap, `${label}: observed issue-icon overlap by the row actions (default presentation)`).toBe(18);
        } else {
          expect.soft(overlap, `${label}: issue icon is not covered by the row actions`).toBe(0);
        }
        // With the actions shown, the label keeps its share of the drawer (compact mobile measured 41px: truncated to ~4 characters).
        const labelWidth = (await rect(row.locator('.pb-tree-label'))).w;
        await info.attach(`outline-label-width-${label}`, { body: String(labelWidth) });
        if (profile === 'compact') expect.soft(labelWidth, `${label}: selected row keeps a readable label column (px)`).toBeGreaterThanOrEqual(60);
        await expectReadable(row, info, `outline-row-${label}`);

        // Add-child menu of a container: items on the row role, an overlay shadow.
        await selectNode(builder, 'formStack');
        const trigger = builder.locator('.pb-tree-add__trigger').first();
        await trigger.click();
        const menu = builder.locator('.pb-tree-add__menu').first();
        await expect(menu).toBeVisible();
        const item = menu.locator('.pb-tree-add__item').first();
        expect.soft((await rect(item)).h, `${label}: add-menu item`).toBeGreaterThanOrEqual(profile === 'legacy' ? 0 : w.treeRow);
        if (profile === 'compact') {
          expect.soft((await css(menu, 'box-shadow'))['box-shadow'], `${label}: menu shadow`).not.toBe('none');
          expect.soft(await px(item, 'font-size')).toBe((await shared(builder)).ui);
        }
        await expectReadable(menu, info, `add-menu-${label}`);
        await page.keyboard.press('Escape');
      }
    }
    expect(problems).toEqual([]);
  });

  test('outline: the label centre is not intercepted by the row actions (product finding, no forced click)', async ({ page }) => {
    const problems = guard(page);
    for (const v of VARIANTS) {
      for (const profile of PROFILES) {
        const label = `${profile} ${v.name}`;
        const builder = await open(page, 'page-builder-inspectors', profile, v);
        const hits: Record<string, string> = {};
        for (const name of ['country', 'saveButton', 'legacyButton', 'brandPanel']) {
          const row = await selectNode(builder, name);
          hits[name] = await row.evaluate((el) => {
            const box = el.querySelector('.pb-tree-label')!.getBoundingClientRect();
            const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
            return hit?.closest('.pb-tree-actions') ? 'row-actions' : hit?.closest('.pb-tree-label') ? 'label' : String(hit?.className);
          });
        }
        await test.info().attach(`label-hit-${label}`, { body: JSON.stringify(hits, null, 1), contentType: 'application/json' });
        const intercepted = Object.entries(hits).filter(([, hit]) => hit === 'row-actions').map(([name]) => name);
        if (profile === 'legacy') {
          test.info().annotations.push({ type: 'legacy-observation', description: `${label}: label centre intercepted by row actions on ${JSON.stringify(intercepted)}` });
        } else {
          expect.soft(intercepted, `${label}: rows whose label centre is covered by .pb-tree-actions`).toEqual([]);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  test('library drawer: groups, items, categorical hues, search and empty state', async ({ page }, info) => {
    const problems = guard(page);
    for (const v of VARIANTS) {
      for (const profile of PROFILES) {
        const label = `${profile} ${v.name}`;
        const builder = await open(page, 'page-builder-inspectors', profile, v);
        const s = await shared(builder);
        const w = want(profile, s);
        await openDrawer(builder, 'Insert elements');
        const library = builder.getByRole('complementary', { name: 'Element library' });
        await expect(library).toBeVisible();
        const toggle = library.locator('.pb-library__group-toggle').first();
        expect.soft((await rect(toggle)).h, `${label}: group toggle`).toBe(w.libGroupToggle);
        const item = library.locator('.pb-library__item--element').first();
        await expect(item).toBeVisible();
        expect.soft((await rect(item)).h, `${label}: item`).toBeGreaterThanOrEqual(w.libItemMin);
        if (profile === 'compact') expect.soft(await px(item, 'font-size')).toBe(s.ui);
        // Independent category hues have readable compact dark variants.
        // Outside opt-in their historical values remain exact.
        for (const [kind, hex] of [['container', [82, 116, 154]], ['element', [95, 107, 114]]] as const) {
          await openAllGroups(library);
          const icon = library.locator(`.pb-library__item--${kind} > :first-child`).first();
          await expect(icon).toBeAttached(); // the icon host has no box of its own, the colour is inherited by the glyph
          const color = await paint(icon, 'color');
          const expected = profile === 'compact'
            ? await roleColor(icon, `var(--coar-page-builder-palette-${kind}-color)`)
            : [...hex, 1];
          expect.soft(near(color, expected, 1), `${label}: ${kind} category role`).toBe(true);
          const contrast = ratio(color, await backdrop(icon));
          await info.attach(`hue-contrast-${kind}-${label}`, { body: String(Math.round(contrast * 100) / 100) });
          gate(`${label}: ${kind} icon vs library surface (non-text 3:1)`, contrast, 3);
        }
        await expectReadable(library, info, `library-${label}`);
        // Search to the empty state.
        await library.getByPlaceholder('Search elements…').fill('zzz-no-match');
        await expect(library.locator('.pb-library__empty').first()).toBeVisible();
        await expectReadable(library, info, `library-empty-${label}`);
      }
    }
    expect(problems).toEqual([]);
  });

  test('canvas: selected node chrome, type tab, drag over drop zones (real pointer drag)', async ({ page }, info) => {
    const problems = guard(page);
    for (const v of VARIANTS) {
      for (const profile of PROFILES) {
        const label = `${profile} ${v.name}`;
        const builder = await open(page, 'page-builder-inspectors', profile, v);
        const s = await shared(builder);
        const w = want(profile, s);
        await selectNode(builder, 'saveButton');

        expect.soft((await rect(builder.locator('.pb-canvas__toolbar'))).h, `${label}: canvas toolbar`).toBe(w.canvasToolbar);
        // Authored content: pinned in every profile (the chrome may grow to 14px, the page may not).
        const content = builder.locator('.pb-canvas__content');
        expect.soft(await css(content, 'font-size', 'font-weight'), `${label}: canvas content typography`).toEqual({ 'font-size': '13px', 'font-weight': '400' });

        const tabEl = builder.locator('.canvas-node--selected > .canvas-node__tab').first();
        await expect(tabEl).toBeVisible();
        expect.soft((await css(tabEl, 'height'))['height'], `${label}: type tab keeps its 16px (content-box) geometry`).toBe('16px');
        const badge = profile === 'legacy' ? 10 : Math.max(11, s.caption - 1);
        expect.soft(await px(tabEl, 'font-size'), `${label}: type tab font`).toBe(badge);
        // Tab surface: the legacy white tab is a dark-mode defect that only compact repairs.
        const tabBg = await paint(tabEl, 'background-color');
        if (profile === 'legacy' && v.mode === 'dark') expect.soft(near(tabBg, [255, 255, 255, 1], 1), `${label}: legacy tab stays white`).toBe(true);
        if (profile === 'compact') expect.soft(near(tabBg, await roleColor(tabEl, 'var(--coar-background-neutral-primary)'), 2), `${label}: tab follows the surface role`).toBe(true);
        if (profile === 'compact' && v.mode === 'dark') expect.soft(luminance(tabBg), `${label}: tab is dark in dark mode`).toBeLessThan(0.3);
        // Selection changes the text colour with a transition. Measure the final
        // selected ink, not the readable neutral colour at the start of that transition.
        const selection = await roleColor(tabEl, 'var(--canvas-border-selected)');
        await expect.poll(async () => near(await paint(tabEl, 'color'), selection, 1)).toBe(true);
        const tabContrast = ratio(await paint(tabEl, 'color'), tabBg);
        await info.attach(`selected-tab-contrast-${label}`, { body: String(tabContrast) });
        gate(`${label}: selected type-tab text vs tab surface`, tabContrast, 4.5);
        const selectedNode = builder.locator('.canvas-node--element').filter({
          has: page.getByRole('button', { name: 'Save', exact: true }),
        });
        await expect(selectedNode).toHaveCount(1);
        // Select another node first, then exercise the normal canvas selection
        // path with the pointer left over the selected frame (not the outline).
        await selectNode(builder, 'country');
        await expect(selectedNode).not.toHaveClass(/canvas-node--selected/);
        const clickPoint = { x: 3, y: (await rect(selectedNode)).h / 2 };
        await selectedNode.hover({ position: clickPoint });
        const hoverBorder = await roleColor(selectedNode,
          'var(--coar-page-builder-canvas-border-hover, rgba(80, 86, 96, 0.34))');
        await expect.poll(async () => near(await paint(selectedNode, 'border-top-color'), hoverBorder, 1)).toBe(true);
        await selectedNode.click({ position: clickPoint });
        await expect(selectedNode).toHaveClass(/canvas-node--selected/);
        expect(await selectedNode.evaluate((el) => el.matches(':hover')), `${label}: pointer remains on canvas selection`).toBe(true);
        const selectedHoverBorder = profile === 'compact' ? selection : hoverBorder;
        await expect.poll(async () => near(await paint(selectedNode, 'border-top-color'), selectedHoverBorder, 1)).toBe(true);
        gate(`${label}: selected hovered frame`, ratio(await paint(selectedNode, 'border-top-color'), await backdrop(selectedNode)), 3);
        gate(`${label}: selected hovered type-tab text`, ratio(await paint(tabEl, 'color'), tabBg), 4.5);
        if (profile === 'compact') {
          await expect.poll(async () => near(await paint(selectedNode, 'border-top-color'), selection, 1)).toBe(true);
          gate(`${label}: selected node frame`, ratio(await paint(selectedNode, 'border-top-color'), await backdrop(selectedNode)), 3);
          expect.soft(near(selection, await roleColor(tabEl, 'var(--coar-text-accent-primary)'), 1),
            `${label}: selected chrome follows readable accent ink`).toBe(true);
          // A host brand change must update both the selected text and its frame,
          // without rebuilding the builder or changing the authored content.
          for (const accent of ['#b91c1c', '#1d4ed8']) {
            await page.locator('html').evaluate((el, value) => {
              el.style.setProperty('--coar-appearance-accent', value);
            }, accent);
            const ink = await roleColor(tabEl, 'var(--coar-text-accent-primary)');
            await expect.poll(async () => near(await paint(tabEl, 'color'), ink, 1)).toBe(true);
            await expect.poll(async () => near(await paint(tabEl, 'border-top-color'), ink, 1)).toBe(true);
            gate(`${label} ${accent}: selected type-tab text`, ratio(await paint(tabEl, 'color'), tabBg), 4.5);
          }
          await page.locator('html').evaluate((el) => el.style.removeProperty('--coar-appearance-accent'));
          await expect.poll(async () => near(await paint(tabEl, 'color'), selection, 1)).toBe(true);
        }
        const del = builder.locator('.canvas-node--selected > .canvas-node__delete').last();
        const delBox = await rect(del);
        expect.soft(await css(del, 'width', 'height'), `${label}: delete button keeps its geometry`).toEqual({ width: '16px', height: '16px' });
        await touchCensus(info, `canvas-${label}`, { 'type tab': await rect(tabEl), 'delete button': delBox });

        // Real drag of a library item over the canvas: zones become active, one is "over".
        await openDrawer(builder, 'Insert elements');
        const item = builder.locator('.pb-library__item--element').first();
        const from = (await item.boundingBox())!;
        await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
        await page.mouse.down();
        await page.mouse.move(from.x + 40, from.y + 20, { steps: 4 });
        const target = builder.locator('.pb-canvas__content').boundingBox();
        const canvasBox = (await target)!;
        await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + 120, { steps: 8 });
        const active = builder.locator('.canvas-dropzone--drag-active').first();
        await expect(active).toBeAttached();
        const zone = (await active.boundingBox())!;
        await page.mouse.move(zone.x + zone.width / 2, zone.y + zone.height / 2, { steps: 4 });
        const over = builder.locator('.canvas-dropzone--over').first();
        await expect(over).toBeAttached();
        const accent = 'var(--coar-background-accent-primary)';
        if (profile === 'compact') {
          // Drop zones are derived from the host accent (legacy: a fixed blue).
          await expect.poll(async () => near(await paint(over, 'background-color'), await roleColor(over, `color-mix(in oklab, ${accent} 35%, transparent)`), 3, 0.05)).toBe(true);
          await expect.poll(async () => near(await paint(over, 'border-top-color'), await roleColor(over, `color-mix(in oklab, ${accent} 95%, transparent)`), 3, 0.05)).toBe(true);
        } else {
          await expect.poll(async () => near(await paint(over, 'background-color'), [22, 102, 204, 0.35], 2, 0.03)).toBe(true);
        }
        // The ghost is a body-level node; only compact gives it the profile classes (`.pb-dnd-ghost`).
        if (profile === 'compact') {
          const ghost = page.locator('body > .pb-dnd-ghost');
          await expect(ghost).toBeVisible();
          await expect(ghost).toHaveClass(/coar-compact/);
        }
        await page.keyboard.press('Escape');
        await page.mouse.up();
        await expect(page.locator('body > .pb-dnd-ghost')).toHaveCount(0);
        await expect(builder.locator('.canvas-dropzone--drag-active')).toHaveCount(0);

        // The persistent empty-container placeholder (idle state) in this profile and mode.
        const empty = builder.locator('.canvas-dropzone--empty').first();
        await expect(empty).toBeVisible();
        const idleBackground = await roleColor(empty,
          'var(--coar-page-builder-drop-zone-idle-bg, rgba(102, 102, 110, 0.04))');
        await expect.poll(async () => paint(empty, 'background-color')).toEqual(idleBackground);
        gate(`${label}: placeholder text`, ratio(await paint(empty, 'color'), await backdrop(empty)), 4.5);
      }
    }
    expect(problems).toEqual([]);
  });

  test('standalone CoarPageRenderer is authored content: no chrome role, authored geometry unchanged', async ({ page }) => {
    const problems = guard(page);
    const geometry: Record<string, unknown> = {};
    for (const v of VARIANTS) {
      for (const profile of PROFILES) {
        await open(page, 'page-builder-inspectors', profile, v);
        const renderer = page.locator('[data-scene-part=renderer]');
        const title = renderer.getByRole('heading', { name: 'Account settings' });
        await expect(title).toBeVisible();
        await expect(renderer.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
        // Roles of the chrome are defined on builder roots only: nothing reaches the renderer.
        expect(await renderer.evaluate((el) => getComputedStyle(el).getPropertyValue('--coar-page-builder-font-size'))).toBe('');
        // Authored data: the stack gap (12px) and the page padding (24px) are the document's, not the profile's.
        const measured = {
          page: await css(renderer.locator('.pb-page').first(), 'padding-top', 'row-gap'),
          stack: await css(renderer.locator('.pb-stack').first(), 'row-gap'),
        };
        expect(measured.page['padding-top']).toBe('24px');
        expect(measured.page['row-gap']).toBe('16px');
        expect(measured.stack['row-gap']).toBe('12px');
        geometry[`${profile} ${v.name}`] = measured;
        // The form control it renders is a shared control: it takes the host profile and still works.
        const name = renderer.getByRole('textbox', { name: 'Display name' });
        await name.fill('Ada Lovelace');
        await expect(name).toHaveValue('Ada Lovelace');
      }
    }
    expect(new Set(Object.values(geometry).map((entry) => JSON.stringify(entry))).size, 'authored geometry is identical in every profile and mode').toBe(1);
    expect(problems).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Scene 2 · panes (Library covered above) + Logic, Translations, Compositions, JSON, Preview, Expression dialog
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('page builder compact · panes and the expression dialog', () => {
  test.describe.configure({ timeout: 120_000 });

  test('translations: header, table, edit, usage, empty state', async ({ page }, info) => {
    const problems = guard(page);
    for (const v of VARIANTS) {
      for (const profile of PROFILES) {
        const label = `${profile} ${v.name}`;
        const builder = await open(page, 'page-builder-panes', profile, v);
        const s = await shared(builder);
        const w = want(profile, s);
        const panel = await openTab(builder, 'Translations');
        const root = panel.locator('.pb-translations');
        expect.soft(await px(root, 'padding-top'), `${label}: panel padding`).toBe(w.panelPadding);
        const h3 = panel.getByRole('heading', { name: 'Translations', level: 3 });
        expect.soft(await px(h3, 'font-size'), `${label}: heading size`).toBe(w.translationsHeading);
        if (profile === 'compact') {
          expect.soft((await css(h3, 'font-weight'))['font-weight']).toBe('600');
          expect.soft((await css(panel.locator('thead th').first(), 'font-weight'))['font-weight']).toBe('500');
          expect.soft(await px(panel.locator('thead th').first(), 'font-size')).toBe(s.caption);
        }
        // Two keys, two locales; the heading key is used once by the heading node.
        const rows = panel.locator('tbody tr');
        await expect(rows).toHaveCount(2);
        const heroRow = rows.filter({ hasText: 'page.hero.title' });
        await expect(heroRow.locator('.pb-translations__usage')).toHaveText('1');
        const german = heroRow.getByRole('textbox').nth(1);
        await expect(german).toHaveValue('Kontoeinstellungen');
        await german.fill('Konto');
        await expect(german).toHaveValue('Konto');
        await expect(heroRow.locator('.pb-translations__delete')).toBeDisabled();
        await expectReadable(root, info, `translations-${label}`);
        // Empty state through the search field.
        await panel.getByPlaceholder('Search translation keys…').fill('zzz-no-match');
        const empty = panel.locator('.pb-translations__empty');
        await expect(empty).toBeVisible();
        if (profile === 'compact') expect.soft((await css(empty.locator('strong'), 'font-weight'))['font-weight']).toBe('600');
        await expectReadable(empty, info, `translations-empty-${label}`);
      }
    }
    expect(problems).toEqual([]);
  });

  test('compositions: library, linked selection, missing reference, version select on the input surface', async ({ page }, info) => {
    const problems = guard(page);
    for (const v of VARIANTS) {
      for (const profile of PROFILES) {
        const label = `${profile} ${v.name}`;
        const builder = await open(page, 'page-builder-panes', profile, v);
        const s = await shared(builder);
        const w = want(profile, s);
        await selectNode(builder, 'brandPanel');
        const panel = await openTab(builder, 'Compositions');
        const root = panel.locator('.pb-compositions');
        expect.soft(await px(root, 'padding-top'), `${label}: panel padding`).toBe(w.panelPadding);
        const heading = panel.getByRole('heading', { name: 'Reusable compositions' });
        expect.soft(await px(heading, 'font-size'), `${label}: heading size`).toBe(w.compositionsHeading);
        await expect(panel.getByText('Linked selection')).toBeVisible();
        await expect(panel.getByRole('button', { name: 'Update to latest' })).toBeEnabled(); // v2 of v3
        await expect(panel.getByRole('alert').filter({ hasText: 'ghost-panel' })).toBeVisible(); // missing reference
        const version = panel.locator('.pb-compositions__version select');
        await expect(version).toBeVisible();
        const bg = await paint(version, 'background-color');
        if (profile === 'legacy' && v.mode === 'dark') expect.soft(near(bg, [255, 255, 255, 1], 1), `${label}: legacy select is white in dark`).toBe(true);
        if (profile === 'compact') {
          expect.soft(near(bg, await roleColor(version, 'var(--coar-surface-input, var(--coar-background-neutral-primary))'), 2), `${label}: select on the input surface`).toBe(true);
          gate(`${label}: select text vs its surface`, ratio(await paint(version, 'color'), bg), 4.5);
          expect.soft((await css(panel.locator('.pb-compositions__eyebrow').first(), 'font-weight'))['font-weight']).toBe('600');
        }
        // Real action: choose the newer version and insert it after the selection.
        await version.selectOption({ label: 'v3' });
        await panel.getByRole('button', { name: 'Insert' }).first().click();
        await expect(builder.locator('.pb-tree-row').filter({ hasText: 'brand-panel@v3' })).toHaveCount(1);
        await expectReadable(root, info, `compositions-${label}`);
      }
    }
    expect(problems).toEqual([]);
  });

  test('JSON pane: toolbar, editor, error state, Apply on the accent', async ({ page }, info) => {
    const problems = guard(page);
    for (const v of VARIANTS) {
      for (const profile of PROFILES) {
        const label = `${profile} ${v.name}`;
        const builder = await open(page, 'page-builder-panes', profile, v);
        const s = await shared(builder);
        const w = want(profile, s);
        const panel = await openTab(builder, 'JSON');
        const toolbar = panel.locator('.pb-builder__json-toolbar');
        expect.soft(await px(panel.locator('.pb-builder__json-hint'), 'font-size'), `${label}: hint`).toBe(profile === 'legacy' ? 12 : w.meta); // 12px is the observed default-presentation value
        const editor = panel.locator('.pb-builder__json-editor');
        if (profile === 'compact') expect.soft(await px(editor, 'font-size'), `${label}: code size`).toBe(s.caption);
        const apply = panel.locator('.pb-builder__json-apply');
        await expect(apply).toBeEnabled();
        const applyText = await paint(apply, 'color');
        const applyBg = await paint(apply, 'background-color');
        if (profile === 'compact') expect.soft(near(applyText, await roleColor(apply, 'var(--coar-text-on-bold, #fff)'), 2), `${label}: on-accent text`).toBe(true);
        else expect.soft(near(applyText, [255, 255, 255, 1], 1)).toBe(true);
        if (applyBg[3] > 0.99) gate(`${label}: Apply label vs accent`, ratio(applyText, applyBg), 4.5);
        const original = await editor.inputValue();
        await editor.fill('{ "broken": ');
        const error = toolbar.locator('.pb-builder__json-error');
        await expect(error).toBeVisible();
        await expect(apply).toBeDisabled();
        gate(`${label}: error text`, ratio(await paint(error, 'color'), await backdrop(error)), 4.5);
        await expectReadable(toolbar, info, `json-error-${label}`);
        await editor.fill(original);
        await expect(error).toHaveCount(0);
        await expect(apply).toBeEnabled();
        await expectFocusRing(page, apply, `${label}: Apply`);
      }
    }
    expect(problems).toEqual([]);
  });

  test('preview: preview frame keeps the authored typography, real renderer, language, zoom', async ({ page }, info) => {
    const problems = guard(page);
    for (const v of VARIANTS) {
      for (const profile of PROFILES) {
        const label = `${profile} ${v.name}`;
        const builder = await open(page, 'page-builder-panes', profile, v);
        const s = await shared(builder);
        const w = want(profile, s);
        const panel = await openTab(builder, 'Preview');
        expect.soft((await rect(panel.locator('.pb-builder__preview-toolbar'))).h, `${label}: preview toolbar`).toBe(w.previewToolbar);
        const frame = panel.locator('.pb-builder__preview-frame');
        // Authored content: 13px / 400 in every profile, also while the mobile chrome is 14px.
        expect.soft(await css(frame, 'font-size', 'font-weight'), `${label}: preview frame typography`).toEqual({ 'font-size': '13px', 'font-weight': '400' });
        const title = frame.getByRole('heading', { name: 'Account settings' });
        await expect(title).toBeVisible();
        // Real preview language switch: the translation key of the heading resolves in the other locale.
        const language = panel.locator('.pb-builder__bar-control select');
        await expect(language).toBeVisible();
        if (profile === 'compact') gate(`${label}: language select`, ratio(await paint(language, 'color'), await paint(language, 'background-color')), 4.5);
        await language.selectOption({ label: 'Deutsch' });
        await expect(frame.getByRole('heading', { name: 'Kontoeinstellungen' })).toBeVisible();
        await language.selectOption({ label: 'English' });
        await expect(title).toBeVisible();
        // Form controls inside the preview work.
        await frame.getByRole('textbox', { name: 'Display name' }).fill('Grace Hopper');
        await expect(frame.getByRole('textbox', { name: 'Display name' })).toHaveValue('Grace Hopper');
        // Zoom: step buttons and the input; the value stays unclipped even at the largest step.
        const zoom = panel.locator('.pb-zoom__input');
        const before = await zoom.inputValue();
        await panel.getByTitle('Zoom in').click();
        await expect.poll(() => zoom.inputValue()).not.toBe(before);
        await zoom.fill('400');
        await zoom.press('Enter');
        expect.soft(await zoom.evaluate((el: HTMLInputElement) => el.scrollWidth <= el.clientWidth), `${label}: zoom input shows "${await zoom.inputValue()}" unclipped`).toBe(true);
        await panel.getByTitle('Zoom out').click();
        await expectReadable(panel.locator('.pb-builder__preview-toolbar'), info, `preview-toolbar-${label}`);
      }
    }
    expect(problems).toEqual([]);
  });

  test('logic pane and expression dialog (Monaco) follow the profile', async ({ page }, info) => {
    const problems = guard(page);
    for (const { profile, variant: v } of MONACO_RUNS) {
      const label = `${profile} ${v.name}`;
      const builder = await open(page, 'page-builder-panes', profile, v);
      const s = await shared(builder);
      const w = want(profile, s);

      const logic = await openTab(builder, 'Logic');
      const editor = logic.locator('.coar-script-editor');
      await expect(editor).toBeVisible({ timeout: 30_000 });
      await expect(logic.locator('.monaco-editor .view-lines')).toBeVisible();
      expect.soft(await px(logic.locator('.pb-page-code__toolbar span').first(), 'font-size'), `${label}: toolbar meta`).toBe(w.meta);
      if (profile === 'compact') {
        expect.soft((await css(logic.locator('.pb-page-code__toolbar strong'), 'font-weight'))['font-weight']).toBe('600');
        const lh = await logic.locator('.pb-page-code__toolbar span').first().evaluate((el) => parseFloat(getComputedStyle(el).lineHeight) / parseFloat(getComputedStyle(el).fontSize));
        expect.soft(lh, `${label}: UI line height`).toBeCloseTo(s.lineHeight, 1);
      }
      const monacoBg = await paint(logic.locator('.monaco-editor .monaco-editor-background').first(), 'background-color');
      expect.soft(luminance(monacoBg) < 0.2, `${label}: Monaco surface matches the ${v.mode} mode`).toBe(v.mode === 'dark');
      await expect(logic.getByRole('button', { name: 'Apply state' })).toBeDisabled();
      await expectReadable(logic.locator('.pb-page-code__toolbar'), info, `logic-${label}`);

      // Expression dialog through a real fx binding on the selected button.
      await tab(builder, 'Editor').click();
      await selectNode(builder, 'saveButton');
      const props = builder.locator('.pb-props');
      await props.getByRole('switch', { name: 'Use expression for Disabled' }).click();
      await props.locator('.pb-bindable-property__expression').click();
      const dialog = page.getByRole('dialog', { name: 'Expression · disabled' });
      await expect(dialog).toBeVisible();
      await expect(dialog.locator('.coar-script-editor')).toBeVisible({ timeout: 30_000 });
      const root = dialog.locator('.pb-expression-dialog').first().or(page.locator('.pb-expression-dialog').first());
      const probe = await root.evaluate((el) => ({
        role: getComputedStyle(el).getPropertyValue('--coar-page-builder-font-size').trim(),
        inCompact: !!el.closest('.coar-compact'),
        scheme: getComputedStyle(el).colorScheme,
      }));
      expect.soft(probe.role !== '', `${label}: dialog root resolves the builder roles`).toBe(profile === 'compact');
      expect.soft(probe.inCompact, `${label}: teleported dialog sits in the compact scope`).toBe(profile === 'compact');
      if (profile === 'compact') {
        expect.soft((await css(dialog.locator('.pb-expression-dialog__meta strong').first(), 'font-weight'))['font-weight']).toBe('600');
        expect.soft(await px(dialog.locator('.pb-expression-dialog__hint').first(), 'font-size'), `${label}: dialog hint size`).toBe(s.caption);
      }
      const dialogBg = await paint(dialog.locator('.monaco-editor .monaco-editor-background').first(), 'background-color');
      expect.soft(luminance(dialogBg) < 0.2, `${label}: dialog Monaco matches the ${v.mode} mode`).toBe(v.mode === 'dark');
      await expectReadable(dialog, info, `expression-dialog-${label}`);
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(dialog).toHaveCount(0);
    }
    expect(problems).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Scene 3 · code-driven authoring: page/element code dialogs and the empty preview
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('page builder compact · code mode dialogs and the empty preview', () => {
  test.describe.configure({ timeout: 120_000 });

  test('page code and element code dialogs open in the profile of their builder', async ({ page }, info) => {
    const problems = guard(page);
    for (const { profile, variant: v } of MONACO_RUNS) {
      const label = `${profile} ${v.name}`;
      const builder = await open(page, 'page-builder-code', profile, v);
      const s = await shared(builder);
      const props = builder.locator('.pb-props');

      // Root: "Add Page Code" (the first outline row is the page).
      await builder.locator('.pb-tree-row').first().locator('.pb-tree-label').click();
      await props.getByRole('button', { name: 'Add Page Code' }).click();
      const pageDialog = page.getByRole('dialog', { name: 'Page Code · Root' });
      await expect(pageDialog).toBeVisible();
      await expect(pageDialog.locator('.coar-script-editor')).toBeVisible({ timeout: 30_000 });
      await checkCodeDialog(pageDialog, page, profile, v, s, label, '.pb-page-root-code-dialog', info);
      await pageDialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(pageDialog).toHaveCount(0);

      // Element: "Add element code" on the selected button.
      await selectNode(builder, 'saveButton');
      await props.getByRole('button', { name: 'Add element code' }).click();
      const elementDialog = page.getByRole('dialog', { name: 'Element Code · saveButton' });
      await expect(elementDialog).toBeVisible();
      await expect(elementDialog.locator('.coar-script-editor')).toBeVisible({ timeout: 30_000 });
      await checkCodeDialog(elementDialog, page, profile, v, s, label, '.pb-element-code-dialog', info);
      await elementDialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(elementDialog).toHaveCount(0);
    }
    expect(problems).toEqual([]);
  });

  test('preview without host values shows its empty state, readable in every profile', async ({ page }, info) => {
    const problems = guard(page);
    for (const v of VARIANTS) {
      for (const profile of PROFILES) {
        const label = `${profile} ${v.name}`;
        const builder = await open(page, 'page-builder-code', profile, v);
        const panel = await openTab(builder, 'Preview');
        const empty = panel.locator('.pb-builder__preview-empty');
        await expect(empty).toBeVisible();
        await expect(empty).toContainText('Preview values are missing');
        if (profile === 'compact') expect.soft((await css(empty.locator('strong'), 'font-weight'))['font-weight'], `${label}: strong weight`).toBe('600');
        await expectReadable(empty, info, `preview-empty-${label}`);
      }
    }
    expect(problems).toEqual([]);
  });
});

async function checkCodeDialog(
  dialog: Locator, page: Page, profile: Profile, v: Variant, s: Shared, label: string, rootSelector: string, info: TestInfo,
) {
  const root = page.locator(rootSelector).first();
  const state = await root.evaluate((el) => ({
    role: getComputedStyle(el).getPropertyValue('--coar-page-builder-font-size').trim(),
    inCompact: !!el.closest('.coar-compact'),
  }));
  expect.soft(state.inCompact, `${label}: dialog sits in the compact scope`).toBe(profile === 'compact');
  expect.soft(state.role !== '', `${label}: dialog root resolves the builder roles`).toBe(profile === 'compact');
  if (profile === 'compact') {
    const meta = dialog.locator(`${rootSelector}__meta`).first();
    expect.soft(await px(dialog.locator(`${rootSelector}__hint`).first(), 'font-size'), `${label}: hint size`).toBe(s.caption);
    expect.soft((await css(meta.locator('strong').first(), 'font-weight'))['font-weight'], `${label}: meta strong weight`).toBe('600');
  }
  const bg = await paint(dialog.locator('.monaco-editor .monaco-editor-background').first(), 'background-color');
  expect.soft(luminance(bg) < 0.2, `${label}: Monaco matches the ${v.mode} mode`).toBe(v.mode === 'dark');
  await expectReadable(dialog, info, `code-dialog-${rootSelector.slice(1)}-${label}`);
}
