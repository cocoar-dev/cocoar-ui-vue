/**
 * The visual baselines: one entry per story in `./stories/<name>.vue`, listed
 * in `./stories.json`.
 *
 * Read by both sides — the `/visual/:story` view and the Playwright spec in
 * `apps/playground/visual/` — so this file must stay plain TypeScript without
 * Vue or browser imports. A story file without an entry in `stories.json`, or
 * an entry without a file, fails the visual spec.
 *
 * The list is data (JSON) on purpose: adding a story edits only `stories.json`,
 * which cannot carry code. This file is part of the comparison and guarded by
 * the merge gate (`VISUAL_HARNESS` in `.alta/skills/cocoar-pr/scripts/pr.mjs`).
 * The options are documented in `apps/playground/visual/README.md`.
 */

import stories from './stories.json' with { type: 'json' };

export type VisualMode = 'default' | 'mobile';
export type VisualScheme = 'light' | 'dark';
export type VisualVariant = 'focus';

/**
 * A step the spec performs to open an overlay.
 * - `dispatch: 'click'`: a click event dispatched on the element, for overlays
 *   that open on click. No pointer moves, nothing is hovered, focus does not move.
 * - `keyboardFocus`: real keyboard focus on the element (as for `focus`
 *   images), for overlays that open on focus (tooltips, a tag select). Its ring
 *   is part of the picture: name the element in `open.focus`.
 * - `press`: a real key press on the element (it gets focus first).
 */
export type VisualAction =
  | { dispatch: 'click'; on: string }
  | { keyboardFocus: string }
  | { press: string; on: string };

export interface VisualOpen {
  /** The steps that open the overlays; omit them when the story opens its overlays itself on mount. */
  actions?: VisualAction[];
  /** How many overlays (`.coar-overlay-host`) must be open before the capture. */
  overlays: number;
  /** A selector that must exist before the capture, for overlays that finish setting up after they appear. */
  ready?: string;
  /**
   * The element the overlay focuses by itself (a dialog's first button). Its
   * focus ring is then part of the picture; anywhere else a ring fails the test.
   */
  focus?: string;
}

export interface VisualStory {
  /** File name in `./stories` without `.vue`; also the prefix of its baselines. */
  name: string;
  /**
   * `root` photographs the `[data-visual-root]` element; `page` the whole
   * viewport, for stories whose overlays are teleported to `body`.
   */
  capture?: 'root' | 'page';
  /** Overlays to open before the capture. */
  open?: VisualOpen;
  /** An ISO instant: `Date.now()` (and so `Temporal.Now`) is fixed to it before the page loads. */
  clock?: string;
  /**
   * A selector of one focusable element: adds `<story>--<mode>-<scheme>-focus.png`
   * with that element focused by the keyboard (`:focus-visible`).
   */
  focus?: string;
  /**
   * `html` (default): `mode=mobile` puts `coar-mobile` on `<html>`. `local`: the
   * story puts `coar-mobile` on its own container; only the mobile mode is
   * photographed and `<html>` gets no `coar-mobile`.
   */
  scope?: 'html' | 'local';
  /** Another viewport than the default 1024×768. */
  viewport?: { width: number; height: number };
  /**
   * The width of `[data-visual-root]` in px, instead of the default 760, for
   * components that react to their own width (the calendar's container
   * queries). At most the viewport's width minus the page's body margin.
   */
  width?: number;
}

export const visualModes: readonly VisualMode[] = ['default', 'mobile'];
export const visualSchemes: readonly VisualScheme[] = ['light', 'dark'];

/**
 * The smallest viewport: the 760px story root fits with room for overlays, and
 * the library's responsive typography (`max-width: 1023px` in base.css) stays
 * in its desktop range, so a story cannot dodge the default presentation by
 * shrinking the page. The largest keeps page captures reasonable in size.
 */
export const viewportLimits = { minWidth: 1024, minHeight: 768, maxWidth: 1920, maxHeight: 1200 };

/** The default width of the story root, and the least a `width` may be. */
export const rootWidth = 760;
/**
 * The page keeps the browser's default body margin (8px each side), as an app
 * without a reset does: a root wider than the viewport minus this would make
 * the page scroll sideways.
 */
export const bodyMargins = 16;

const STORY_KEYS = ['name', 'capture', 'open', 'clock', 'focus', 'scope', 'viewport', 'width'];
const OPEN_KEYS = ['actions', 'overlays', 'ready', 'focus'];
const isText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const unknownKeys = (o: Record<string, unknown>, known: string[]) =>
  Object.keys(o).filter((k) => !known.includes(k));

function actionProblems(action: unknown, where: string): string[] {
  if (!isObject(action)) return [`${where} must be an object`];
  const keys = Object.keys(action).sort().join(',');
  if (keys === 'dispatch,on' && action.dispatch === 'click' && isText(action.on)) return [];
  if (keys === 'keyboardFocus' && isText(action.keyboardFocus)) return [];
  if (keys === 'on,press' && isText(action.press) && isText(action.on)) return [];
  return [
    `${where} must be { dispatch: "click", on } | { keyboardFocus } | { press, on }, got ${JSON.stringify(action)}`,
  ];
}

/**
 * What is wrong with one entry of stories.json; empty when it is valid. Checked
 * at run time (the JSON is data a pull request can change): known keys only,
 * allowed values, a viewport within `viewportLimits`, known action kinds.
 */
export function storyProblems(entry: unknown): string[] {
  if (!isObject(entry)) return [`an entry must be an object, got ${JSON.stringify(entry)}`];
  const name = isText(entry.name) ? entry.name : '?';
  const p: string[] = unknownKeys(entry, STORY_KEYS).map((k) => `unknown option "${k}"`);
  if (!isText(entry.name) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(entry.name)) {
    p.push('name must be kebab-case: the file name of the story');
  }
  if (entry.capture !== undefined && entry.capture !== 'root' && entry.capture !== 'page') {
    p.push('capture must be "root" or "page"');
  }
  if (entry.clock !== undefined) {
    const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$/;
    if (!isText(entry.clock) || !iso.test(entry.clock) || Number.isNaN(Date.parse(entry.clock))) {
      p.push('clock must be a UTC instant like "2026-03-10T09:00:00Z"');
    }
  }
  if (entry.focus !== undefined && !isText(entry.focus)) p.push('focus must be a selector');
  if (entry.scope !== undefined && entry.scope !== 'html' && entry.scope !== 'local') {
    p.push('scope must be "html" or "local"');
  }
  // A local scope is about what leaves the local container: overlays, seen only on the page.
  if (entry.scope === 'local' && entry.capture !== 'page')
    p.push('scope "local" needs capture "page"');
  if (entry.viewport !== undefined) {
    const v = entry.viewport;
    const { minWidth, minHeight, maxWidth, maxHeight } = viewportLimits;
    if (
      !isObject(v) ||
      unknownKeys(v, ['width', 'height']).length ||
      !Number.isInteger(v.width) ||
      !Number.isInteger(v.height) ||
      (v.width as number) < minWidth ||
      (v.width as number) > maxWidth ||
      (v.height as number) < minHeight ||
      (v.height as number) > maxHeight
    ) {
      p.push(
        `viewport must be { width: ${minWidth}–${maxWidth}, height: ${minHeight}–${maxHeight} } (integers)`,
      );
    }
  }
  if (entry.width !== undefined) {
    const viewportWidth = isObject(entry.viewport) ? entry.viewport.width : 1024;
    const max = (Number.isInteger(viewportWidth) ? (viewportWidth as number) : 1024) - bodyMargins;
    if (
      !Number.isInteger(entry.width) ||
      (entry.width as number) < rootWidth ||
      (entry.width as number) > max
    ) {
      p.push(
        `width must be an integer from ${rootWidth} to ${max} (the viewport's width minus the body margins; a wider root needs a wider viewport)`,
      );
    }
  }
  if (entry.open !== undefined) {
    const o = entry.open;
    if (!isObject(o)) {
      p.push('open must be an object');
    } else {
      p.push(...unknownKeys(o, OPEN_KEYS).map((k) => `unknown option "open.${k}"`));
      if (
        !Number.isInteger(o.overlays) ||
        (o.overlays as number) < 1 ||
        (o.overlays as number) > 5
      ) {
        p.push('open.overlays must be 1–5');
      }
      if (o.ready !== undefined && !isText(o.ready)) p.push('open.ready must be a selector');
      if (o.focus !== undefined && !isText(o.focus)) p.push('open.focus must be a selector');
      if (o.actions !== undefined) {
        if (!Array.isArray(o.actions) || !o.actions.length)
          p.push('open.actions must be a non-empty list');
        else o.actions.forEach((a, i) => p.push(...actionProblems(a, `open.actions[${i}]`)));
        // A focused trigger shows a ring: it must be declared, so the ring guard expects it there.
        if (
          Array.isArray(o.actions) &&
          o.actions.some((a) => isObject(a) && 'keyboardFocus' in a) &&
          !isText(o.focus)
        ) {
          p.push('open.actions with keyboardFocus need open.focus (the element keeping the focus)');
        }
      }
      if (entry.capture !== 'page')
        p.push('open needs capture "page": overlays are teleported to body');
    }
  }
  return p.map((problem) => `${name}: ${problem}`);
}

export const visualStories: readonly VisualStory[] = stories as unknown as VisualStory[];

/** Every problem of stories.json; the spec fails while it is not empty, and the view shows it. */
export const manifestProblems: readonly string[] = (stories as unknown[]).flatMap(storyProblems);

/** The modes a story is photographed in. */
export function storyModes(story: VisualStory): readonly VisualMode[] {
  return story.scope === 'local' ? ['mobile'] : visualModes;
}

/** Whether `mode` puts `coar-mobile` on `<html>` for this story. */
export function mobileOnHtml(story: VisualStory, mode: VisualMode): boolean {
  return mode === 'mobile' && story.scope !== 'local';
}

/** The file name of one baseline, as the spec writes it under `visual/__screenshots__/`. */
export function baselineName(
  story: string,
  mode: VisualMode,
  scheme: VisualScheme,
  variant?: VisualVariant,
): string {
  return `${story}--${mode}-${scheme}${variant ? `-${variant}` : ''}.png`;
}

/** Every baseline a story has. */
export function storyBaselines(story: VisualStory): string[] {
  const variants: (VisualVariant | undefined)[] = [
    undefined,
    ...(story.focus ? ['focus' as const] : []),
  ];
  return storyModes(story).flatMap((mode) =>
    visualSchemes.flatMap((scheme) =>
      variants.map((variant) => baselineName(story.name, mode, scheme, variant)),
    ),
  );
}
