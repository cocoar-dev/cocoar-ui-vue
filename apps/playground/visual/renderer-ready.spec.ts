import { expect, test } from '@playwright/test';
import { waitForRenderers } from './renderer-ready';

test('manifest: a failed renderer module reports error instead of remaining loading', async ({
  page,
}) => {
  await page.route('**/src/visual/stories/builder-editors.vue', (route) => route.abort());
  await page.goto('/visual.html#/visual/builder-editors');
  const root = page.locator('[data-visual-root]');
  await expect(root).toHaveAttribute('data-visual-state', 'error');
  await expect(root).toContainText('cannot load story "builder-editors"');
});

test('manifest: renderer readiness requires every visible result, not mounted placeholders', async ({
  page,
}) => {
  await page.setContent('<div class="monaco"></div><div class="diagram"></div>');
  const story = { name: 'renderers', ready: ['.monaco .line', '.diagram svg'] };
  await expect(waitForRenderers(page, story, 100)).rejects.toThrow(/exactly once/);
  await page.locator('.monaco').evaluate((el) => {
    el.innerHTML = '<div class="line">Actual source</div>';
  });
  await expect(waitForRenderers(page, story, 100)).rejects.toThrow(/exactly once/);
  await page.locator('.diagram').evaluate((el) => {
    el.innerHTML = '<svg width="40" height="20"><rect width="40" height="20"/></svg>';
  });
  await waitForRenderers(page, story);
});

test('manifest: hidden and ambiguous renderer results fail readiness', async ({ page }) => {
  const story = { name: 'renderers', ready: ['.result'] };
  await page.setContent('<div class="result" hidden>Hidden renderer</div>');
  await expect(waitForRenderers(page, story, 100)).rejects.toThrow(/visible/);
  await page.setContent('<div class="result">One</div><div class="result">Two</div>');
  await expect(waitForRenderers(page, story, 100)).rejects.toThrow(/exactly once/);
});

test('manifest: stories without asynchronous renderers need no new readiness gate', async ({
  page,
}) => {
  await waitForRenderers(page, { name: 'plain' });
});
