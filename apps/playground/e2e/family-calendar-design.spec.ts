/**
 * Proof: the family calendar design can be reached with the library's
 * public tokens and slots.
 *
 * The `family-design-*` stories style the library from outside. This spec
 * measures them and compares with the numbers of the real design
 * (`fixtures/family-calendar-design.json`, made by
 * `scripts/capture-family-calendar-design.mjs`), in light and dark. It also
 * fails when the skin reaches for a private class, `:deep` or `!important`:
 * then the look would prove nothing about the public surface.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

type Measured = Record<string, string | number>;
const design = JSON.parse(
  readFileSync(resolve(import.meta.dirname, 'fixtures/family-calendar-design.json'), 'utf8'),
) as { schemes: Record<string, Record<string, Record<string, Measured>>> };

const SIZE_TOLERANCE_PX = 1.5;
const COLOR_TOLERANCE = 2;

const TYPE = ['color', 'fontSize', 'fontWeight'];
const BOX = ['backgroundColor', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopLeftRadius'];

interface Claim {
  part: string;
  selector: string;
  props: string[];
  /** Also compare the width / height. */
  size?: ('width' | 'height')[];
  /** Compare the design's right line with this element's left line. */
  line?: boolean;
}

const cell = (row: string) =>
  `[data-row-key="${row}"] .coar-calendar-board__cell:not(.coar-calendar-board__cell--today):not(.coar-calendar-board__cell--weekend)`;

const VIEWS: Record<string, { story: string; frame?: string; claims: Claim[] }> = {
  week: {
    story: 'family-design-week',
    claims: [
      { part: 'root', selector: '.family-design', props: ['backgroundColor', 'borderTopLeftRadius'], size: ['width', 'height'] },
      { part: 'header', selector: '.coar-calendar-board__column-header:not(.coar-calendar-board__column-header--today)', props: BOX, size: ['width', 'height'] },
      { part: 'headerToday', selector: '.coar-calendar-board__column-header--today', props: ['backgroundColor'] },
      { part: 'headerNumber', selector: '.family-day-number--today', props: TYPE },
      { part: 'headerWeekday', selector: '.family-weekday', props: [...TYPE, 'textTransform', 'letterSpacing'] },
      { part: 'label', selector: '[data-row-key="morning"] .coar-calendar-board__label', props: [...TYPE, 'paddingTop', 'paddingLeft', 'textTransform'], size: ['width'] },
      { part: 'cell', selector: cell('morning'), props: ['paddingTop', 'paddingLeft'], size: ['width'], line: true },
      { part: 'cellToday', selector: '[data-row-key="morning"] .coar-calendar-board__cell--today', props: ['backgroundColor'] },
      { part: 'bar', selector: '.family-bar', props: [...BOX, 'fontSize', 'fontWeight'] },
      { part: 'event', selector: '.family-card:not(.family-card--all)', props: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopLeftRadius'], size: ['width'] },
      { part: 'eventTitle', selector: '.family-card:not(.family-card--all) b', props: ['fontSize', 'fontWeight', 'color'] },
      { part: 'eventTime', selector: '.family-card:not(.family-card--all) time', props: ['fontSize', 'color'] },
    ],
  },
  people: {
    story: 'family-design-people',
    claims: [
      { part: 'block', selector: '[data-event-id="Training"] .family-people-card', props: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopLeftRadius'], size: ['width'] },
      { part: 'blockTitle', selector: '.family-people-card b', props: ['fontSize', 'fontWeight', 'color'] },
      { part: 'meal', selector: '.family-meal', props: [...TYPE, 'backgroundColor', 'paddingLeft', 'paddingRight', 'borderTopLeftRadius'], size: ['width', 'height'] },
    ],
  },
  month: {
    story: 'family-design-month',
    claims: [
      { part: 'root', selector: '.family-design', props: ['backgroundColor', 'borderTopLeftRadius'], size: ['width', 'height'] },
      { part: 'weekday', selector: '.coar-month-grid__weekday-cell', props: [...TYPE, 'textTransform', 'paddingTop', 'paddingLeft', 'paddingBottom'] },
      { part: 'cellOther', selector: '.coar-month-cell--other-month:not(.coar-month-cell--weekend)', props: ['backgroundColor'], size: ['width'] },
      { part: 'cellWeekend', selector: '.coar-month-cell--weekend:not(.coar-month-cell--other-month)', props: ['backgroundColor'] },
      { part: 'number', selector: '.coar-month-cell:not(.coar-month-cell--other-month):not(.coar-month-cell--today) .coar-month-cell__day-number', props: ['fontSize', 'fontWeight', 'color'] },
      { part: 'marks', selector: '.family-marks', props: [], size: ['width', 'height'] },
      { part: 'mark', selector: '.family-marks i:not([style])', props: ['backgroundColor', 'borderTopLeftRadius'], size: ['height'] },
    ],
  },
  year: {
    story: 'family-design-year',
    claims: [
      { part: 'root', selector: '.family-design', props: [], size: ['width', 'height'] },
      { part: 'month', selector: '.coar-calendar-board__row--cells .coar-calendar-board__label', props: ['color', 'fontSize', 'fontWeight'] },
      { part: 'weekend', selector: '.coar-calendar-board__cell--weekend:not(.coar-calendar-board__cell--today)', props: ['backgroundColor'] },
      { part: 'band', selector: '.family-band', props: ['color', 'backgroundColor', 'paddingLeft', 'borderTopLeftRadius'], size: ['height'] },
    ],
  },
  whoWeek: {
    story: 'family-design-who',
    claims: [
      { part: 'root', selector: '.family-design', props: ['backgroundColor', 'borderTopLeftRadius'], size: ['width', 'height'] },
      { part: 'person', selector: '[data-row-key="jonas"] .coar-calendar-board__label', props: [...TYPE, 'paddingLeft', 'paddingRight'], size: ['width'] },
      { part: 'cell', selector: cell('jonas'), props: ['paddingTop', 'paddingLeft'], line: true },
      { part: 'freeLabel', selector: '.family-row-free .coar-calendar-board__label', props: ['color', 'fontSize', 'fontWeight', 'paddingTop', 'paddingLeft'], size: ['width'] },
      { part: 'freeCell', selector: '.family-row-free .coar-calendar-board__cell', props: ['backgroundColor', 'paddingTop', 'paddingLeft'], size: ['width'] },
    ],
  },
  phoneWeek: {
    story: 'family-design-phone',
    frame: 'phoneWeek',
    claims: [
      { part: 'row', selector: '.family-phone-row--plain', props: BOX, size: ['width', 'height'] },
      { part: 'rowToday', selector: '.family-phone-row--today', props: ['backgroundColor'] },
      { part: 'rowPast', selector: '.family-phone-row--past', props: ['backgroundColor'] },
      { part: 'number', selector: '.family-phone-row--today .family-phone-number', props: TYPE },
      { part: 'weekday', selector: '.family-phone-weekday', props: [...TYPE, 'letterSpacing'] },
      { part: 'line', selector: '.family-phone-line', props: ['fontSize', 'fontWeight'] },
      { part: 'lineTime', selector: '.family-phone-line time', props: TYPE },
    ],
  },
  phoneWho: {
    story: 'family-design-phone',
    frame: 'phoneWho',
    claims: [
      { part: 'root', selector: '.family-who', props: [], size: ['width'] },
      { part: 'head', selector: '.family-who-head', props: TYPE },
      { part: 'headNumber', selector: '.family-who-today', props: TYPE },
      { part: 'ticks', selector: '.family-ticks:not(.family-ticks--today)', props: ['paddingTop', 'paddingLeft', 'borderTopLeftRadius'], size: ['width', 'height'] },
      { part: 'ticksToday', selector: '.family-ticks--today', props: ['backgroundColor'] },
      { part: 'tick', selector: '.family-ticks:not(.family-ticks--today) i:not([style])', props: ['backgroundColor', 'borderTopLeftRadius'], size: ['height'] },
    ],
  },
  phoneRaster: {
    story: 'family-design-phone',
    frame: 'phoneRaster',
    claims: [
      { part: 'block', selector: '[data-event-id="Training"] .family-people-card', props: ['paddingTop', 'paddingLeft', 'borderTopLeftRadius'], size: ['width'] },
      { part: 'blockTitle', selector: '.family-people-card b', props: ['fontSize', 'fontWeight', 'color'] },
      { part: 'meal', selector: '.family-meal', props: [...TYPE, 'backgroundColor', 'borderTopLeftRadius'], size: ['width', 'height'] },
    ],
  },
  phoneMonth: {
    story: 'family-design-phone',
    frame: 'phoneMonth',
    claims: [
      { part: 'root', selector: '.family-design', props: [], size: ['width', 'height'] },
      { part: 'weekday', selector: '.coar-month-grid__weekday-cell', props: [...TYPE, 'textTransform', 'paddingTop', 'paddingBottom'] },
      { part: 'selected', selector: '.family-phone-selected', props: ['backgroundColor', 'borderTopLeftRadius'], size: ['width', 'height'] },
      { part: 'number', selector: '.family-n:not(.family-n--other):not(.family-n--today):not(.family-n--past):not(.family-n--weekend)', props: TYPE, size: ['width', 'height'] },
      { part: 'todayNumber', selector: '.family-n--today', props: [...TYPE, 'backgroundColor', 'borderTopLeftRadius'] },
      { part: 'marks', selector: '.family-marks', props: [], size: ['width', 'height'] },
    ],
  },
  phoneFree: {
    story: 'family-design-phone',
    frame: 'phoneFree',
    claims: [
      { part: 'fit', selector: '.family-phone-fit', props: ['backgroundColor', 'borderTopLeftRadius'] },
      { part: 'fitNumber', selector: '.family-n--fit', props: ['color', 'fontWeight'] },
    ],
  },
  phoneYear: {
    story: 'family-design-phone',
    frame: 'phoneYear',
    claims: [
      { part: 'root', selector: '.family-design', props: [], size: ['width', 'height'] },
      { part: 'month', selector: '.coar-calendar-board__row--cells .coar-calendar-board__label', props: ['color', 'fontSize', 'fontWeight'] },
      { part: 'weekend', selector: '.coar-calendar-board__cell--weekend:not(.coar-calendar-board__cell--today)', props: ['backgroundColor'] },
      { part: 'band', selector: '.family-band', props: ['backgroundColor', 'borderTopLeftRadius'], size: ['height'] },
    ],
  },
  tabletWeek: {
    story: 'family-design-tablet',
    frame: 'tabletWeek',
    claims: [
      { part: 'root', selector: '.family-design', props: ['backgroundColor', 'borderTopLeftRadius'], size: ['width', 'height'] },
      { part: 'header', selector: '.coar-calendar-board__column-header:not(.coar-calendar-board__column-header--today)', props: BOX, size: ['width'] },
      { part: 'headerToday', selector: '.coar-calendar-board__column-header--today', props: ['backgroundColor'] },
      { part: 'cell', selector: cell('morning'), props: ['paddingTop', 'paddingLeft'], size: ['width'], line: true },
      { part: 'bar', selector: '.family-bar', props: [...BOX, 'fontSize', 'fontWeight'] },
      { part: 'event', selector: '.family-card:not(.family-card--all)', props: ['paddingTop', 'paddingLeft', 'borderTopLeftRadius'], size: ['width'] },
    ],
  },
  tabletDay: {
    story: 'family-design-tablet',
    frame: 'tabletDay',
    claims: [
      { part: 'block', selector: '[data-event-id="Training"] .family-people-card', props: ['paddingTop', 'paddingLeft', 'borderTopLeftRadius'], size: ['width'] },
      { part: 'blockTitle', selector: '.family-people-card b', props: ['fontSize', 'fontWeight', 'color'] },
      { part: 'meal', selector: '.family-meal', props: [...TYPE, 'backgroundColor', 'borderTopLeftRadius'], size: ['width', 'height'] },
    ],
  },
  tabletMonth: {
    story: 'family-design-tablet',
    frame: 'tabletMonth',
    claims: [
      { part: 'root', selector: '.family-design', props: ['backgroundColor', 'borderTopLeftRadius'], size: ['width', 'height'] },
      { part: 'weekday', selector: '.coar-month-grid__weekday-cell', props: [...TYPE, 'textTransform', 'paddingTop', 'paddingLeft'] },
      { part: 'cellOther', selector: '.coar-month-cell--other-month:not(.coar-month-cell--weekend)', props: ['backgroundColor'] },
      { part: 'number', selector: '.coar-month-cell:not(.coar-month-cell--other-month):not(.coar-month-cell--today) .coar-month-cell__day-number', props: ['fontSize', 'fontWeight', 'color'] },
      { part: 'marks', selector: '.family-marks', props: [], size: ['width', 'height'] },
    ],
  },
  tabletYear: {
    story: 'family-design-tablet',
    frame: 'tabletYear',
    claims: [
      { part: 'root', selector: '.family-design', props: [], size: ['width', 'height'] },
      { part: 'month', selector: '.coar-calendar-board__row--cells .coar-calendar-board__label', props: ['color', 'fontWeight'] },
      { part: 'weekend', selector: '.coar-calendar-board__cell--weekend:not(.coar-calendar-board__cell--today)', props: ['backgroundColor'] },
      { part: 'band', selector: '.family-band', props: ['backgroundColor', 'borderTopLeftRadius'], size: ['height'] },
    ],
  },
};

/** Any CSS colour as sRGB 0–255 with alpha, as the browser resolves it. */
async function rgba(page: Page, value: string): Promise<number[]> {
  return page.evaluate((color) => {
    const canvas = new OffscreenCanvas(1, 1).getContext('2d', { willReadFrequently: true })!;
    canvas.fillStyle = color;
    canvas.fillRect(0, 0, 1, 1);
    return [...canvas.getImageData(0, 0, 1, 1).data];
  }, value);
}

async function measure(page: Page, selector: string): Promise<Record<string, string | number> | null> {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const out: Record<string, string | number> = { width: rect.width, height: rect.height, borderLeftColor: cs.borderLeftColor };
    for (const p of ['color', 'backgroundColor', 'fontSize', 'fontWeight', 'textTransform', 'letterSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopLeftRadius'] as const) {
      out[p] = cs[p];
    }
    return out;
  }, selector);
}

const isColor = (prop: string) => /color/i.test(prop);

test.describe('the family calendar design is reachable', () => {
  test.use({ viewport: { width: 1280, height: 1200 } });

  test('the skin uses only the public surface', () => {
    const stories = resolve(import.meta.dirname, '../src/visual/stories');
    const skin = resolve(import.meta.dirname, '../src/visual/family-design');
    const files = [
      ...readdirSync(stories).filter((f) => f.startsWith('family-design')).map((f) => resolve(stories, f)),
      ...readdirSync(skin).map((f) => resolve(skin, f)),
    ];
    expect(files.length).toBeGreaterThanOrEqual(12);
    for (const file of files) {
      const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      expect(text, `${file} reaches for a private class`).not.toMatch(/\.coar-[a-z]/);
      expect(text, `${file} uses :deep`).not.toMatch(/:deep/);
      expect(text, `${file} uses !important`).not.toMatch(/!important/);
    }
  });

  for (const scheme of ['light', 'dark']) {
    for (const [view, { story, frame, claims }] of Object.entries(VIEWS)) {
      test(`${view} ${scheme}`, async ({ page }) => {
        await page.clock.setFixedTime(new Date('2026-11-19T13:12:00Z'));
        // Phone and tablet run in the mobile presentation, as an app on those devices does.
        await page.goto(`/visual.html#/visual/${story}?mode=${frame ? 'mobile' : 'default'}&scheme=${scheme}`);
        await expect(page.locator('[data-visual-root][data-visual-state="ready"]')).toBeVisible({ timeout: 30_000 });
        await page.evaluate(() => document.fonts.ready);

        const misses: string[] = [];
        for (const claim of claims) {
          const expected = design.schemes[scheme][view][claim.part];
          const actual = await measure(page, frame ? `[data-family-frame="${frame}"] ${claim.selector}` : claim.selector);
          if (!actual) {
            misses.push(`${claim.part}: nothing matches ${claim.selector}`);
            continue;
          }
          for (const dimension of claim.size ?? []) {
            const delta = Math.abs(Number(actual[dimension]) - Number(expected[dimension]));
            if (delta > SIZE_TOLERANCE_PX) misses.push(`${claim.part}.${dimension}: design ${expected[dimension]}, got ${actual[dimension]}`);
          }
          const pairs: Array<[string, string | number, string | number]> = claim.props.map((p) => [p, expected[p], actual[p]]);
          if (claim.line) pairs.push(['line', expected.borderRightColor, actual.borderLeftColor]);
          for (const [prop, want, got] of pairs) {
            if (isColor(prop) || prop === 'line') {
              const [a, b] = [await rgba(page, String(want)), await rgba(page, String(got))];
              if (a.some((v, i) => Math.abs(v - b[i]) > COLOR_TOLERANCE)) misses.push(`${claim.part}.${prop}: design ${want}, got ${got}`);
            } else if (String(want).endsWith('px')) {
              if (Math.abs(parseFloat(String(want)) - parseFloat(String(got))) > 0.51) misses.push(`${claim.part}.${prop}: design ${want}, got ${got}`);
            } else if (String(want) !== String(got)) {
              misses.push(`${claim.part}.${prop}: design ${want}, got ${got}`);
            }
          }
        }
        // What numbers on one element cannot see: nothing squeezed, nothing wrapped.
        const squeezed = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('.family-card:not(.family-people-card)')]
            .filter((card) => card.scrollHeight > card.clientHeight + 1)
            .map((card) => card.textContent),
        );
        expect(squeezed, 'event cards keep their height in a full cell').toEqual([]);
        const hiddenTitles = await page.locator('.family-card b').evaluateAll((titles) =>
          titles.filter((title) => title.getBoundingClientRect().height < 8).length,
        );
        expect(hiddenTitles, 'a short card keeps its title').toBe(0);
        const hours = await page.locator('.family-hour').evaluateAll((labels) =>
          labels.filter((label) => label.getBoundingClientRect().height > 20).length,
        );
        expect(hours, 'hour labels stay on one line').toBe(0);
        expect(misses, 'what differs from the design').toEqual([]);
      });
    }
  }
});
