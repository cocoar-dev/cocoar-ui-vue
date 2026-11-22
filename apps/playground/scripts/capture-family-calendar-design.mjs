/**
 * Measures the family calendar design and writes the numbers the proof
 * test compares against (`e2e/fixtures/family-calendar-design.json`).
 *
 *   node apps/playground/scripts/capture-family-calendar-design.mjs <path to design/neu/kalender/index.html>
 *
 * The design lives in the amZettel repository, so CI cannot read it: the
 * numbers are committed, and this script is how they were made.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const designPath = process.argv[2];
if (!designPath) throw new Error('usage: capture-family-calendar-design.mjs <index.html>');

/** Figure caption → element name → selector inside that figure. */
const VIEWS = {
  week: {
    caption: 'Die Startansicht im Web',
    parts: {
      root: '.k-board',
      header: '.k-b-h:nth-child(2)',
      headerToday: '.k-b-h.tdy',
      headerNumber: '.k-b-h.tdy b',
      headerWeekday: '.k-b-h small',
      label: '.k-b-lab:not(.k-b-rowlab):not(.k-b-labmeal)',
      cell: '.k-b-c:not(.k-b-meal)',
      cellToday: '.k-b-c.tdy',
      bar: '.k-b-all .bar',
      event: '.k-b-c .k-ev.mini',
      eventTitle: '.k-b-c .k-ev.mini b',
      eventTime: '.k-b-c .k-ev.mini time',
    },
  },
  people: {
    caption: 'Die Spalten der Personen',
    parts: {
      head: '.k-pg-head',
      block: '.k-pg .k-ev',
      blockTitle: '.k-pg .k-ev b',
      meal: '.k-pg .k-meal',
      hourLine: '.k-pg-h',
      columnLine: '.k-pg-v',
      now: '.k-pg-now',
    },
  },
  month: {
    caption: 'Der Monat mit Tagesspalte',
    parts: {
      root: '.k-bigm',
      weekday: '.k-bigm .wd',
      cell: '.k-bigm .c:not(.out):not(.we):not(.today):not(.past)',
      cellOther: '.k-bigm .c.out',
      cellWeekend: '.k-bigm .c.we:not(.out)',
      cellSelected: '.k-bigm .c.sel',
      number: '.k-bigm .c:not(.out):not(.today) .k-c-n span',
      marks: '.k-bigm .k-tri',
      mark: '.k-bigm .k-tri i',
    },
  },
  year: {
    caption: 'Wandplaner mit Zahlen',
    parts: {
      root: '.k-yr',
      row: '.k-yr-r',
      month: '.k-yr-m',
      cell: '.k-yr-c:not(.we):not(.none)',
      weekend: '.k-yr-c.we',
      none: '.k-yr-c.none',
      band: '.k-yr-b',
    },
  },
  whoWeek: {
    caption: 'Jede Zeile ein Mensch',
    parts: {
      root: '.k-wp',
      person: '.k-wp-p',
      cell: '.k-wp .k-b-c',
      event: '.k-wp .k-ev.mini',
      freeLabel: '.k-wp-f',
      freeCell: '.k-wp-fc',
    },
  },
  phoneWeek: {
    gallery: 'g-mobile',
    title: 'Woche · Startansicht',
    parts: {
      row: '.k-wk-r:not(.past):not(.tdy)',
      rowToday: '.k-wk-r.tdy',
      rowPast: '.k-wk-r.past',
      number: '.k-wk-r.tdy .k-wk-d b',
      weekday: '.k-wk-d small',
      line: '.k-line',
      lineTime: '.k-line time',
    },
  },
  phoneWho: {
    gallery: 'g-mobile',
    title: 'Woche · Personen',
    parts: {
      root: '.k-who',
      head: '.k-who .h',
      headNumber: '.k-who .h.tdy b',
      ticks: '.k-ticks:not(.tdy)',
      ticksToday: '.k-ticks.tdy',
      tick: '.k-ticks:not(.tdy) i:not([style*="--t"])',
    },
  },
  phoneRaster: {
    gallery: 'g-mobile',
    title: 'Tag · Raster',
    parts: { block: '.k-pg .k-ev', blockTitle: '.k-pg .k-ev b', meal: '.k-pg .k-meal' },
  },
  phoneMonth: {
    gallery: 'g-mobile',
    title: 'Monat',
    parts: {
      root: '.k-mo',
      weekday: '.k-mo .wd',
      day: '.k-d:not(.out):not(.today):not(.past):not(.we)',
      selected: '.k-d.sel',
      number: '.k-d:not(.out):not(.today):not(.past):not(.we) .n',
      todayNumber: '.k-d.today .n',
      marks: '.k-d .k-tri',
    },
  },
  phoneFree: {
    gallery: 'g-mobile',
    title: 'Monat · Frei finden',
    parts: { fit: '.k-d.fit', fitNumber: '.k-d.fit:not(.today) .n' },
  },
  phoneYear: {
    gallery: 'g-mobile',
    title: 'Jahr',
    parts: { root: '.k-yr', month: '.k-yr-m', band: '.k-yr-b', weekend: '.k-yr-c.we' },
  },
  tabletWeek: {
    gallery: 'g-tablet',
    title: 'Woche · Brett',
    parts: {
      root: '.k-board',
      header: '.k-b-h:nth-child(2)',
      headerToday: '.k-b-h.tdy',
      cell: '.k-b-c:not(.k-b-meal)',
      bar: '.k-b-all .bar',
      event: '.k-b-c .k-ev.mini',
    },
  },
  tabletDay: {
    gallery: 'g-tablet',
    title: 'Tag · Raster',
    parts: { block: '.k-pg .k-ev', blockTitle: '.k-pg .k-ev b', meal: '.k-pg .k-meal' },
  },
  tabletMonth: {
    gallery: 'g-tablet',
    title: 'Monat + Tag',
    parts: {
      root: '.k-bigm',
      weekday: '.k-bigm .wd',
      cellOther: '.k-bigm .c.out',
      number: '.k-bigm .c:not(.out):not(.today) .k-c-n span',
      marks: '.k-bigm .k-tri',
    },
  },
  tabletYear: {
    gallery: 'g-tablet',
    title: 'Jahr',
    parts: { root: '.k-yr', month: '.k-yr-m', band: '.k-yr-b', weekend: '.k-yr-c.we' },
  },
};

const STYLE_PROPS = [
  'color', 'backgroundColor', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopLeftRadius', 'borderRightWidth', 'borderRightColor', 'borderBottomWidth', 'borderBottomColor',
];

const browser = await chromium.launch();
const out = { source: 'amZettel design/neu/kalender', viewport: { width: 1600, height: 1200 }, schemes: {} };
for (const scheme of ['light', 'dark']) {
  const page = await browser.newPage({ viewport: out.viewport });
  await page.goto(pathToFileURL(resolve(designPath)).href);
  await page.waitForSelector('#g-desktop .shot');
  await page.evaluate(async (s) => {
    document.documentElement.dataset.theme = s;
    // The page shows its frames scaled down; measure them at their real size.
    const style = document.createElement('style');
    style.textContent = '.window, .tablet { zoom: 1 !important; }';
    document.head.append(style);
    await document.fonts.ready;
  }, scheme);
  out.schemes[scheme] = await page.evaluate(
    ({ views, props }) => {
      const result = {};
      for (const [view, { gallery = 'g-desktop', title, caption, parts }] of Object.entries(views)) {
        const figure = [...document.querySelectorAll(`#${gallery} figure`)].find((f) =>
          title
            ? f.querySelector('figcaption b')?.textContent === title
            : f.querySelector('figcaption')?.textContent.includes(caption),
        );
        if (!figure) throw new Error('no figure for ' + view);
        result[view] = {};
        for (const [name, selector] of Object.entries(parts)) {
          const el = figure.querySelector(selector);
          if (!el) throw new Error(view + '.' + name + ': nothing matches ' + selector);
          const cs = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          result[view][name] = {
            width: Math.round(rect.width * 10) / 10,
            height: Math.round(rect.height * 10) / 10,
            ...Object.fromEntries(props.map((p) => [p, cs[p]])),
          };
        }
      }
      return result;
    },
    { views: VIEWS, props: STYLE_PROPS },
  );
  await page.close();
}
await browser.close();
const target = resolve(import.meta.dirname, '../e2e/fixtures/family-calendar-design.json');
writeFileSync(target, JSON.stringify(out, null, 1) + '\n');
console.log('wrote', target);
