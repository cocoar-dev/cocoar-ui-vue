#!/usr/bin/env node
/**
 * Measures the mount cost of the continuous month view
 * (`/calendar-month-perf`) in headless Chromium with a phone-sized
 * viewport and CPU throttling, the way the amZettel report measured it
 * on a Pixel 8a.
 *
 *   pnpm --filter playground exec vite build
 *   pnpm --filter playground exec vite preview --port 4188 &
 *   node apps/playground/scripts/month-perf.mjs http://localhost:4188 [runs] [cpuRate]
 */

import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:4188';
const runs = Number(process.argv[3] ?? 5);
const cpuRate = Number(process.argv[4] ?? 4);

const browser = await chromium.launch();
const results = [];
for (let i = 0; i < runs; i++) {
  // A fresh page per run: the first mount also pays for series expansion
  // and the re-render when its occurrences arrive.
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
  const cdp = await page.context().newCDPSession(page);
  await page.goto(`${base}/calendar-month-perf`);
  await page.getByTestId('perf-mount').waitFor();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
  await page.getByTestId('perf-mount').click();
  const handle = await page.waitForFunction(
    () => document.querySelector('[data-testid="perf-result"]')?.textContent || null,
    null,
    { timeout: 120_000 },
  );
  results.push(JSON.parse(await handle.jsonValue()));
  await page.close();
}
await browser.close();

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
for (const r of results) console.log(JSON.stringify(r));
console.log(
  JSON.stringify({
    cpuRate,
    medianMountMs: median(results.map((r) => r.mountMs)),
    medianFirstFrameMs: median(results.map((r) => r.firstFrameMs)),
    medianLongestTaskMs: median(results.map((r) => Math.max(0, ...r.longTasks))),
  }),
);
