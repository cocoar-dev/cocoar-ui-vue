import { expect, type Page } from '@playwright/test';
import type { VisualStory } from '../src/visual/manifest';

/**
 * Vue mounting is not renderer readiness. Require the story's actual results,
 * in warm-up and capture alike. No sleeps, retries, substitutes or hidden matches.
 * Warm-up passes its existing timeout; captures keep the configured assertion budget.
 */
export async function waitForRenderers(page: Page, story: VisualStory, timeout?: number) {
  for (const selector of story.ready ?? []) {
    const result = page.locator(selector);
    await expect(result, `renderer selector must match exactly once: ${selector}`).toHaveCount(1, {
      timeout,
    });
    await expect(result, `renderer must be visible: ${selector}`).toBeVisible({ timeout });
  }
}
