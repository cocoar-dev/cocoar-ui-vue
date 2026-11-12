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
 */

import stories from './stories.json' with { type: 'json' };

export type VisualMode = 'default' | 'mobile';
export type VisualScheme = 'light' | 'dark';

export interface VisualStory {
  /** File name in `./stories` without `.vue`; also the prefix of its baselines. */
  name: string;
  /**
   * `root` photographs the `[data-visual-root]` element; `page` the whole
   * viewport, for stories whose overlays are teleported to `body`.
   */
  capture?: 'root' | 'page';
}

export const visualModes: readonly VisualMode[] = ['default', 'mobile'];
export const visualSchemes: readonly VisualScheme[] = ['light', 'dark'];

export const visualStories: readonly VisualStory[] = stories as VisualStory[];

/** The file name of one baseline, as the spec writes it under `visual/__screenshots__/`. */
export function baselineName(story: string, mode: VisualMode, scheme: VisualScheme): string {
  return `${story}--${mode}-${scheme}.png`;
}
