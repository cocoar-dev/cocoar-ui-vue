import { chromium, type FullConfig } from '@playwright/test';
import { visualStories } from '../src/visual/manifest';

// A cold Vite dev server compiles the playground on the first request and may
// re-optimise dependencies and reload open pages while doing so. Visit every
// story once, alone, before the parallel tests start, so no test meets that.
export default async function warmUp(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });
  try {
    for (const story of visualStories) {
      await page.goto(`/visual/${story.name}`, { timeout: 180_000 });
      await page.waitForSelector('[data-visual-state="ready"], [data-visual-state="error"]', {
        timeout: 180_000,
      });
    }
  } finally {
    await browser.close();
  }
}
