import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  baselineName,
  manifestProblems,
  mobileOnHtml,
  storyProblems,
  storyBaselines,
  storyModes,
  visualSchemes,
  visualStories,
  type VisualMode,
  type VisualOpen,
  type VisualScheme,
  type VisualStory,
  type VisualVariant,
} from '../src/visual/manifest';

// One test per story × mode × scheme (and one more per focus image), all
// generated from the manifest that the /visual route reads too. Titles start
// with `story:<name> ` or `manifest:` so scripts/visual.mjs can select stories
// with --grep. The options are documented in visual/README.md.

const storiesDir = fileURLToPath(new URL('../src/visual/stories/', import.meta.url));
const baselinesDir = fileURLToPath(new URL('./__screenshots__/', import.meta.url));

test('manifest: every entry of stories.json is valid', () => {
  expect(manifestProblems, 'fix these entries of src/visual/stories.json').toEqual([]);
});

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
  const expected = new Set(visualStories.flatMap(storyBaselines));
  const files = fs.existsSync(baselinesDir) ? fs.readdirSync(baselinesDir) : [];
  const orphans = files.filter((f) => !expected.has(f));
  expect(orphans, 'baselines without a story in stories.json: delete them').toEqual([]);
});

for (const story of visualStories) {
  for (const mode of storyModes(story)) {
    for (const scheme of visualSchemes) {
      test(`story:${story.name} ${mode} ${scheme}`, async ({ page }) => {
        await photograph(page, story, mode, scheme);
      });
      if (story.focus) {
        test(`story:${story.name} ${mode} ${scheme} focus`, async ({ page }) => {
          await photograph(page, story, mode, scheme, 'focus');
        });
      }
    }
  }
}

async function photograph(
  page: Page,
  story: VisualStory,
  mode: VisualMode,
  scheme: VisualScheme,
  variant?: VisualVariant,
) {
  expect(storyProblems(story), 'an invalid entry of stories.json').toEqual([]);
  if (story.viewport) await page.setViewportSize(story.viewport);
  // Before the page loads, so "today" is the same from the first render on.
  if (story.clock) await page.clock.setFixedTime(new Date(story.clock));
  await page.goto(`/visual.html#/visual/${story.name}?mode=${mode}&scheme=${scheme}`);

  const root = page.locator('[data-visual-root]');
  await expect(root).toHaveAttribute('data-visual-state', /^(ready|error)$/);
  const state = await root.getAttribute('data-visual-state');
  expect(state, `the view reports: ${await root.textContent()}`).toBe('ready');
  await expect(page.locator('.coar-icon--loading')).toHaveCount(0);

  // The opt-ins sit on <html> and nothing else does: default/light is an
  // app that opted into nothing; a local-scope story carries its own class.
  const expectedClasses = [
    ...(mobileOnHtml(story, mode) ? ['coar-mobile'] : []),
    ...(scheme === 'dark' ? ['dark-mode'] : []),
  ];
  const htmlClasses = await page.evaluate(() => [...document.documentElement.classList]);
  expect(htmlClasses.sort()).toEqual(expectedClasses.sort());

  if (story.open) await openOverlays(page, story.open);
  const focused = variant === 'focus' ? await focusByKeyboard(page, story.focus!) : undefined;

  // Nothing hovered, and a focus ring only where the image is about focus.
  expect(await page.evaluate(() => document.querySelectorAll('body :hover').length)).toBe(0);
  const ring = await page.evaluate((expected) => {
    const el = document.activeElement;
    if (!el || el === document.body || !el.matches(':focus-visible')) return null;
    return expected && el.matches(expected) ? 'expected' : el.outerHTML.slice(0, 120);
  }, story.open?.focus ?? null);
  if (focused) {
    const onTarget = await focused.evaluate(
      (el) => el === document.activeElement && el.matches(':focus-visible'),
    );
    expect(onTarget, `the focus ring must be on ${story.focus}`).toBe(true);
  } else if (story.open?.focus) {
    expect(ring, `the focus ring must be on ${story.open.focus}`).toBe('expected');
  } else {
    expect(ring, 'a focus ring nobody asked for').toBeNull();
  }

  const capturePage = story.capture === 'page';
  if (capturePage) {
    const overflow = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth - innerWidth,
      height: document.documentElement.scrollHeight - innerHeight,
    }));
    expect(overflow, 'a page capture must fit the viewport: nothing may scroll').toEqual({
      width: 0,
      height: 0,
    });
  }

  // An overlay or a focus may have asked for font faces the page did not need
  // before; then let pending idle work (OverlayScrollbars sets up in an idle
  // callback) run, and paint.
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestIdleCallback(resolve, { timeout: 1000 }));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });

  const name = baselineName(story.name, mode, scheme, variant);
  await expectSameAsBaseline(name, await stableCapture(capturePage ? page : root));
}

// The capture options; `animations: 'disabled'` ends finite animations and
// transitions and resets infinite ones.
const captureOptions = { animations: 'disabled', caret: 'hide', scale: 'css' } as const;

/**
 * Captures until two consecutive captures are byte-identical: only then is the
 * picture settled (positions, scroll offsets, fonts, child geometry — anything
 * visible). toHaveScreenshot does not give that: it stops at the first capture
 * that matches the baseline with its comparator, which skips antialiased pixels.
 */
async function stableCapture(target: Page | Locator): Promise<Buffer> {
  let previous = await target.screenshot(captureOptions);
  for (let i = 0; i < 10; i += 1) {
    const current = await target.screenshot(captureOptions);
    if (current.equals(previous)) return current;
    previous = current;
  }
  throw new Error(
    'the picture never settled: 11 captures in a row, each differing from the one before',
  );
}

/** One element, required to exist exactly once. */
async function only(page: Page, selector: string): Promise<Locator> {
  const element = page.locator(selector);
  await expect(element, `${selector} must match exactly one element`).toHaveCount(1);
  return element;
}

async function openOverlays(page: Page, open: VisualOpen) {
  for (const action of open.actions ?? []) {
    if ('keyboardFocus' in action) await focusByKeyboard(page, action.keyboardFocus);
    else if ('dispatch' in action)
      await (await only(page, action.on)).dispatchEvent(action.dispatch);
    else await (await only(page, action.on)).press(action.press);
  }
  const hosts = page.locator('.coar-overlay-host');
  await expect(hosts).toHaveCount(open.overlays);
  // The overlay service shows a host (opacity 1) once it has positioned it.
  for (let i = 0; i < open.overlays; i += 1) await expect(hosts.nth(i)).toHaveCSS('opacity', '1');
  if (open.ready) await expect(page.locator(open.ready).first()).toBeAttached();
  // Settling is proven by the capture itself: see stableCapture.
}

/**
 * Focuses an element as keyboard focus: a key press (Shift, which moves
 * nothing) puts the page in keyboard modality, so the browser shows
 * `:focus-visible` on the focus that follows. Tabbing through the neighbours
 * instead would leave them changed (a blurred input re-rasterises its
 * corners), and the image must differ from the plain one only at the target.
 */
async function focusByKeyboard(page: Page, selector: string): Promise<Locator> {
  const element = await only(page, selector);
  await page.keyboard.press('Shift');
  await element.focus();
  const state = await element.evaluate((el) => ({
    focused: el === document.activeElement,
    visible: el.matches(':focus-visible'),
  }));
  expect(state, `${selector} must take keyboard focus and show :focus-visible`).toEqual({
    focused: true,
    visible: true,
  });
  return element;
}

/**
 * Compares a settled capture with its baseline, every pixel exactly. On a
 * difference the report gets expected, actual and diff images (named so the
 * HTML report shows them side by side); with --update the baseline is written.
 */
async function expectSameAsBaseline(name: string, actualPng: Buffer) {
  const info = test.info();
  const baselinePath = info.snapshotPath(name, { kind: 'screenshot' });
  // 'missing' may only create a baseline; replacing an existing one needs 'changed' or 'all' (visual.mjs --update).
  const mode = info.config.updateSnapshots;
  const creating = mode !== 'none';
  const replacing = mode === 'changed' || mode === 'all';
  if (!fs.existsSync(baselinePath)) {
    if (creating) {
      fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
      fs.writeFileSync(baselinePath, actualPng);
      console.log(`${name}: new baseline`);
      return;
    }
    await info.attach(name.replace(/\.png$/, '-actual.png'), {
      body: actualPng,
      contentType: 'image/png',
    });
    throw new Error(`${name}: no baseline; run scripts/visual.mjs --update`);
  }
  const expectedPng = fs.readFileSync(baselinePath);
  const expected = decodePng(expectedPng);
  const actual = decodePng(actualPng);
  const difference = comparePixels(expected, actual);
  if (!difference) return;
  if (replacing) {
    fs.writeFileSync(baselinePath, actualPng);
    console.log(`${name}: rewritten, ${difference}`);
    return;
  }
  const base = name.replace(/\.png$/, '');
  await info.attach(`${base}-expected.png`, { body: expectedPng, contentType: 'image/png' });
  await info.attach(`${base}-actual.png`, { body: actualPng, contentType: 'image/png' });
  if (expected.width === actual.width && expected.height === actual.height) {
    await info.attach(`${base}-diff.png`, {
      body: encodePng(diffImage(expected, actual)),
      contentType: 'image/png',
    });
  }
  expect(difference, `${name} differs from the baseline pixel for pixel`).toBeNull();
}

/** Red where the images differ, the expected image faded elsewhere. */
function diffImage(expected: Pixels, actual: Pixels): Pixels {
  const data = Buffer.alloc(expected.data.length);
  for (let i = 0; i < data.length; i += 4) {
    const same = expected.data.readUInt32BE(i) === actual.data.readUInt32BE(i);
    const grey =
      255 - ((255 - (expected.data[i] + expected.data[i + 1] + expected.data[i + 2]) / 3) >> 2);
    data[i] = same ? grey : 255;
    data[i + 1] = same ? grey : 0;
    data[i + 2] = same ? grey : 0;
    data[i + 3] = 255;
  }
  return { width: expected.width, height: expected.height, data };
}

/** A minimal PNG encoder (8-bit RGBA, no filter) for the diff image. */
function encodePng({ width, height, data }: Pixels): Buffer {
  const chunk = (type: string, body: Buffer) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(body.length, 0);
    head.write(type, 4, 'latin1');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(Buffer.concat([head.subarray(4), body])) >>> 0, 0);
    return Buffer.concat([head, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    data.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
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
  let maxDelta = 0;
  for (let i = 0; i < expected.data.length; i += 4) {
    if (expected.data.readUInt32BE(i) !== actual.data.readUInt32BE(i)) {
      count += 1;
      if (first < 0) first = i;
      for (let c = 0; c < 4; c += 1) {
        maxDelta = Math.max(maxDelta, Math.abs(expected.data[i + c] - actual.data[i + c]));
      }
    }
  }
  if (!count) return null;
  const x = (first / 4) % expected.width;
  const y = Math.floor(first / 4 / expected.width);
  const rgba = (d: Buffer) => `rgba(${[...d.subarray(first, first + 4)].join(',')})`;
  return `${count} pixel(s) differ, at most ${maxDelta} level(s) per channel; first at (${x},${y}): expected ${rgba(expected.data)}, actual ${rgba(actual.data)}`;
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
