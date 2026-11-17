import { chromium, type FullConfig } from '@playwright/test';
import { visualStories } from '../src/visual/manifest';
import { waitForRenderers } from './renderer-ready';

// A cold Vite dev server compiles the playground on the first request and may
// re-optimise dependencies and reload open pages while doing so. Visit every
// story once, alone, before the parallel tests start, so no test meets that.
export default async function warmUp(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });
  try {
    for (const story of visualStories) {
      await page.goto(`/visual.html#/visual/${story.name}`, { timeout: 180_000 });
      await page.waitForSelector('[data-visual-state="ready"], [data-visual-state="error"]', {
        timeout: 180_000,
      });
      const error = page.locator('[data-visual-state="error"]');
      if (await error.count()) {
        throw new Error(`warm-up ${story.name}: ${await error.textContent()}`);
      }
      try {
        await waitForRenderers(page, story, 180_000);
      } catch (cause) {
        const details = await page
          .evaluate(() => ({
            url: location.href,
            fonts: document.fonts.status,
            renderers: [...document.querySelectorAll('[data-status]')].map((el) => ({
              status: el.getAttribute('data-status'),
              text: el.textContent?.slice(0, 1200),
            })),
          }))
          .catch(() => '(page unavailable)');
        console.error(`renderer warm-up failed for ${story.name}: ${JSON.stringify(details)}`);
        throw cause;
      }
    }
  } finally {
    await browser.close();
  }
}
