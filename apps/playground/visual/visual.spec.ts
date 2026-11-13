import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { expect, test } from '@playwright/test';
import { baselineName, visualModes, visualSchemes, visualStories } from '../src/visual/manifest';

// One test per story × mode × scheme, all generated from the manifest that the
// /visual route reads too. Titles start with `story:<name> ` or `manifest:` so
// scripts/visual.mjs can select stories with --grep.

const storiesDir = fileURLToPath(new URL('../src/visual/stories/', import.meta.url));
const baselinesDir = fileURLToPath(new URL('./__screenshots__/', import.meta.url));

test('manifest: lists exactly the story files', () => {
  const files = fs
    .readdirSync(storiesDir)
    .filter((f) => f.endsWith('.vue'))
    .map((f) => f.slice(0, -'.vue'.length));
  const names = visualStories.map((s) => s.name);
  const withoutEntry = files.filter((f) => !names.includes(f));
  const withoutFile = names.filter((n) => !files.includes(n));
  const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
  expect(
    { withoutEntry, withoutFile, duplicates },
    'src/visual/stories/*.vue and src/visual/stories.json must name the same stories',
  ).toEqual({ withoutEntry: [], withoutFile: [], duplicates: [] });
});

test('manifest: every baseline belongs to a story', () => {
  const expected = new Set(
    visualStories.flatMap((s) =>
      visualModes.flatMap((m) => visualSchemes.map((c) => baselineName(s.name, m, c))),
    ),
  );
  const files = fs.existsSync(baselinesDir) ? fs.readdirSync(baselinesDir) : [];
  const orphans = files.filter((f) => !expected.has(f));
  expect(orphans, 'baselines without a story in stories.json: delete them').toEqual([]);
});

for (const story of visualStories) {
  for (const mode of visualModes) {
    for (const scheme of visualSchemes) {
      test(`story:${story.name} ${mode} ${scheme}`, async ({ page }) => {
        await page.goto(`/visual/${story.name}?mode=${mode}&scheme=${scheme}`);

        const root = page.locator('[data-visual-root]');
        await expect(root).toHaveAttribute('data-visual-state', /^(ready|error)$/);
        const state = await root.getAttribute('data-visual-state');
        expect(state, `the view reports: ${await root.textContent()}`).toBe('ready');
        await expect(page.locator('.coar-icon--loading')).toHaveCount(0);

        // The opt-ins sit on <html> and nothing else does: default/light is an
        // app that opted into nothing.
        const expectedClasses = [
          ...(mode === 'mobile' ? ['coar-mobile'] : []),
          ...(scheme === 'dark' ? ['dark-mode'] : []),
        ];
        const htmlClasses = await page.evaluate(() => [...document.documentElement.classList]);
        expect(htmlClasses.sort()).toEqual(expectedClasses.sort());

        const name = baselineName(story.name, mode, scheme);
        const target = story.capture === 'page' ? page : root;
        // Waits for a stable capture, compares, and gives the report its expected/actual/diff images.
        await expect(target).toHaveScreenshot(name);
        // toHaveScreenshot skips pixels it takes for anti-aliasing, even with threshold 0 and
        // maxDiffPixels 0. The promise is "pixel for pixel", so compare every pixel exactly.
        await expectExactPixels(name, await target.screenshot(captureOptions));
      });
    }
  }
}

// The same capture options as `expect.toHaveScreenshot` in playwright.visual.config.ts.
const captureOptions = { animations: 'disabled', caret: 'hide', scale: 'css' } as const;

async function expectExactPixels(name: string, actualPng: Buffer) {
  const info = test.info();
  const baselinePath = info.snapshotPath(name, { kind: 'screenshot' });
  const difference = comparePixels(decodePng(fs.readFileSync(baselinePath)), decodePng(actualPng));
  if (!difference) return;
  if (info.config.updateSnapshots === 'all' || info.config.updateSnapshots === 'changed') {
    // A change toHaveScreenshot let through is still a change: the update writes it.
    fs.writeFileSync(baselinePath, actualPng);
    console.log(`${name}: rewritten, ${difference}`);
    return;
  }
  await info.attach(`${name} (exact comparison, actual)`, {
    body: actualPng,
    contentType: 'image/png',
  });
  expect(difference, `${name} differs from the baseline pixel for pixel`).toBeNull();
}

interface Pixels {
  width: number;
  height: number;
  /** RGBA, 8 bits per channel. */
  data: Buffer;
}

/** Null when both images are identical; otherwise what differs, with the first differing pixel. */
function comparePixels(expected: Pixels, actual: Pixels): string | null {
  if (expected.width !== actual.width || expected.height !== actual.height) {
    return `size ${actual.width}×${actual.height} instead of ${expected.width}×${expected.height}`;
  }
  let count = 0;
  let first = -1;
  for (let i = 0; i < expected.data.length; i += 4) {
    if (expected.data.readUInt32BE(i) !== actual.data.readUInt32BE(i)) {
      count += 1;
      if (first < 0) first = i;
    }
  }
  if (!count) return null;
  const x = (first / 4) % expected.width;
  const y = Math.floor(first / 4 / expected.width);
  const rgba = (d: Buffer) => `rgba(${[...d.subarray(first, first + 4)].join(',')})`;
  return `${count} pixel(s) differ; first at (${x},${y}): expected ${rgba(expected.data)}, actual ${rgba(actual.data)}`;
}

/**
 * Decodes the PNGs Playwright writes (8-bit RGB or RGBA, not interlaced) without a
 * dependency; anything else throws rather than being compared wrongly.
 */
function decodePng(png: Buffer): Pixels {
  if (!png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new Error('not a PNG');
  }
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat: Buffer[] = [];
  for (let pos = 8; pos < png.length; ) {
    const length = png.readUInt32BE(pos);
    const type = png.toString('latin1', pos + 4, pos + 8);
    const body = png.subarray(pos + 8, pos + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const [bitDepth, colorType, , , interlace] = body.subarray(8, 13);
      if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6) || interlace !== 0) {
        throw new Error(
          `unsupported PNG: bit depth ${bitDepth}, color type ${colorType}, interlace ${interlace}`,
        );
      }
      channels = colorType === 6 ? 4 : 3;
    } else if (type === 'IDAT') {
      idat.push(body);
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + length;
  }
  if (!channels) throw new Error('PNG without IHDR');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  if (raw.length !== height * (stride + 1)) throw new Error('PNG data does not match its size');
  const data = Buffer.alloc(width * height * 4);
  let previous = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const current = Buffer.alloc(stride);
    for (let i = 0; i < stride; i += 1) {
      const a = i >= channels ? current[i - channels] : 0;
      const b = previous[i];
      const c = i >= channels ? previous[i - channels] : 0;
      let predictor: number;
      if (filter === 0) predictor = 0;
      else if (filter === 1) predictor = a;
      else if (filter === 2) predictor = b;
      else if (filter === 3) predictor = (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else throw new Error(`unknown PNG filter ${filter} in row ${y}`);
      current[i] = (line[i] + predictor) & 0xff;
    }
    for (let x = 0; x < width; x += 1) {
      const to = (y * width + x) * 4;
      current.copy(data, to, x * channels, x * channels + channels);
      if (channels === 3) data[to + 3] = 255;
    }
    previous = current;
  }
  return { width, height, data };
}
