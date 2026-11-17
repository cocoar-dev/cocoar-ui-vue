import { expect, test, type Page } from '@playwright/test';
import { clipping, contrast, edgeContrast, docOverflow, guard, open, record, smallTargets, swipe, type Look } from './compact-calendar-helpers';

/**
 * Calendar states that had no compact evidence: work week, expanded all-day band, real pointer
 * drag / resize / invalid drop / Escape / keyboard move, range selection with draft, clipped draft,
 * swipe paging with real touch, empty agenda, narrow month / month list / agenda / timeline / year.
 * Scenes: ./fixtures/calendar (own HTML host of the playground dev server: fonts, styles, overlay host, localization).
 * Legacy is only observed (invariants: no compact class, no page errors); no new look is demanded of it.
 * `.coar-mobile` is class emulation in desktop Chromium, not a device run.
 */
test.describe.configure({ timeout: 90_000 });

let problems: string[] = [];
test.beforeEach(async ({ page }) => { problems = guard(page); });
test.afterEach(() => { expect(problems, 'page errors, console errors/warnings, failed or external requests').toEqual([]); });

const SCHEMES = ['light', 'dark'] as const;
const root = (page: Page) => page.locator('[data-scene-root]');
const heads = (page: Page) => page.locator('[role=columnheader]');
const card = (page: Page, id: string) => page.locator(`.coar-time-grid-event[data-event-id="${id}"]`);

/** Column x-ranges from the real header boxes, and the y of a minute of the day (grid starts 07:00, 54 px/h). */
async function geometry(page: Page) {
  // The band reads its CSS lane metric through ResizeObserver. Wait for
  // that actual layout, rather than aiming with a pre-observer coordinate.
  await expect.poll(() => card(page, 'drag-me').evaluate(async (el) => {
    const y = el.getBoundingClientRect().y;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return el.getBoundingClientRect().y === y;
  })).toBe(true);
  const boxes = await heads(page).evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, w: r.width, label: e.textContent!.trim() }; }));
  // The column box starts above 07:00 (render buffer): anchor the minute scale on a drawn card, 'drag-me' = Wed 11:00.
  const anchor = (await card(page, 'drag-me').boundingBox())!;
  return {
    boxes,
    colX: (i: number) => boxes[i].x + boxes[i].w / 2,
    y: (minute: number) => anchor.y + ((minute - 11 * 60) * 54) / 60,
  };
}
const HM = (h: number, m = 0) => h * 60 + m;

async function dragTo(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, hold?: () => Promise<void>) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 6, from.y + 6, { steps: 2 });
  await page.mouse.move(to.x, to.y, { steps: 10 });
  if (hold) await hold();
}

// ───────────────────────────── work week ─────────────────────────────
for (const profile of ['compact', 'legacy'] as const) {
  for (const scheme of SCHEMES) {
    for (const mobile of [false, true]) {
      const look: Look = { profile, scheme, mobile };
      test(`work week: Mon-Fri only, real events, nav and semantics (${profile}, ${scheme}, mobile=${mobile})`, async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 });
        await open(page, 'work-week', look);
        await expect(heads(page)).toHaveCount(5);
        const labels = (await heads(page).allTextContents()).map((t) => t.trim());
        expect(labels.map((l) => l.split(',')[0])).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
        expect(labels.join(' ')).not.toMatch(/Sat|Sun/);
        // today is the only current column and says so to AT
        await expect(page.locator('[role=columnheader][aria-current=date]')).toHaveCount(1);
        await expect(page.locator('[role=columnheader][aria-current=date]')).toContainText('Wed, Apr 15');
        // real events, as buttons with names
        const standup = page.getByRole('button', { name: /Standup/ });
        await expect(standup).toHaveCount(5);
        await expect(page.getByRole('button', { name: /Design review/ })).toBeVisible();
        // the shell offers the view as a selected control
        await expect(page.getByRole('button', { name: 'Work week', pressed: true })).toBeVisible();
        // no weekend column of any kind: five column boxes, equal widths
        const boxes = await heads(page).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
        expect(boxes).toHaveLength(5);
        expect(Math.max(...boxes) - Math.min(...boxes)).toBeLessThan(1.5);
        // Paging goes by whole weeks and stays Mon-Fri. The range label names the full window
        // (Sun-Sat, core/rangeLabel.ts documents it: "the window is the full week for workWeek too"): recorded, not judged.
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page.locator('.coar-calendar__range-label')).toHaveText(/Apr 19\s*[–-]\s*25, 2026/);
        await expect(heads(page)).toHaveCount(5);
        await page.getByRole('button', { name: 'Today' }).click();
        await expect(page.locator('[role=columnheader][aria-current=date]')).toContainText('Wed, Apr 15');
        if (profile === 'compact') {
          await expect(root(page)).toHaveClass(/coar-compact/);
          expect(await clipping(root(page).locator('.coar-calendar__header'))).toEqual([]);
        } else {
          await expect(root(page)).not.toHaveClass(/coar-compact/);
        }
      });
    }
    test(`work week: text on real events and bands is >= 4.5:1 (${profile}, ${scheme})`, async ({ page }, info) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await open(page, 'work-week', { profile, scheme });
      const c = await contrast(root(page));
      expect(c.measured).toBeGreaterThan(15);
      // Text over a gradient (hatch / stripe bands) cannot be composited exactly: listed, not asserted.
      info.annotations.push({ type: 'unmeasured-gradient-text', description: c.unmeasured.join(' | ') });
      if (profile === 'legacy') {
        info.annotations.push({ type: 'legacy-observation', description: `below 4.5: ${c.bad.join(' | ') || 'none'}` });
      } else {
        expect(c.bad, 'compact: text below 4.5:1').toEqual([]);
      }
    });
  }
}

// ──────────────────────── expanded all-day band ────────────────────────
for (const scheme of SCHEMES) {
  for (const mobile of [false, true]) {
    test(`all-day band: +N folds, expands, collapses; every lane readable (compact, ${scheme}, mobile=${mobile})`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await open(page, 'week-allday', { scheme, mobile });
      const band = page.getByRole('region', { name: /all.?day/i });
      await expect(band).toBeVisible();
      const more = band.locator('button.coar-time-grid-all-day-overflow');
      await expect(more).toHaveAccessibleName(/4 more all-day events/);
      await expect(more).toHaveText('+4');
      const small = await more.boundingBox();
      expect.soft(small!.height, '"+N" target height (24 desktop = WCAG 2.5.8, 44 mobile = the library\'s own mobile target)').toBeGreaterThanOrEqual(mobile ? 44 : 24);
      const folded = (await band.boundingBox())!.height;
      const axisBefore = (await page.locator('.coar-time-grid__hour-label').first().boundingBox())!.y;
      await more.click();
      const collapse = band.locator('.coar-time-grid-all-day-band__collapse');
      await expect(collapse).toBeVisible();
      const open_ = (await band.boundingBox())!.height;
      expect(open_).toBeGreaterThan(folded + 30); // three more lanes
      for (const t of ['Conference', 'Holiday cover', 'Audit window', 'Release freeze', 'Company trip']) {
        await expect(band.getByText(t, { exact: true })).toBeVisible();
      }
      // the hour axis moved down by what the band grew
      const axisAfter = (await page.locator('.coar-time-grid__hour-label').first().boundingBox())!.y;
      expect(axisAfter - axisBefore).toBeCloseTo(open_ - folded, 0);
      const c = await contrast(band);
      expect(c.measured).toBeGreaterThan(4);
      expect(c.bad).toEqual([]);
      expect(await clipping(band)).toEqual([]);
      const cb = await collapse.boundingBox();
      expect.soft(cb!.height, 'collapse target height').toBeGreaterThanOrEqual(mobile ? 44 : 24);
      await collapse.click();
      await expect(more).toBeVisible();
      expect((await band.boundingBox())!.height).toBeCloseTo(folded, 0);
    });
  }
}

// ─────────────── real pointer work: drag, resize, invalid drop, Escape, keyboard ───────────────
// Week of Sun 12 - Sat 18 Apr (columns 0..6; Wed = 3, Thu = 4, Sat = 6); 07-19 h, 54 px/h.
// Rule of the scene (canDrop): weekdays only, nothing before 08:00.
for (const scheme of SCHEMES) {
  for (const mobile of [false, true]) {
    const look: Look = { scheme, mobile };
    const tag = `(compact, ${scheme}, mobile=${mobile})`;

    test(`drag: a real mouse drag moves the event to another day and time, with a preview and one drop ${tag}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await open(page, 'week-dnd', look);
      const g = await geometry(page);
      const src = card(page, 'drag-me');
      const box = (await src.boundingBox())!;
      expect((await card(page, 'resize-me').boundingBox())!.y).toBeCloseTo(g.y(HM(13)), 0); // the minute scale matches a second drawn card
      expect(box.height).toBeCloseTo(54, 0);
      const from = { x: g.colX(3), y: g.y(HM(11, 30)) };
      await dragTo(page, from, { x: g.colX(4), y: g.y(HM(14, 30)) }, async () => {
        // while dragging: a ghost preview carries the title, the source is left as a phantom
        await expect(page.locator('.coar-time-grid-event--ghost')).toBeVisible();
        await expect(page.locator('.coar-time-grid-event--ghost')).toContainText('Drag me');
        await expect(page.locator('.coar-time-grid-event--source-phantom')).toHaveCount(1);
        await expect(page.locator('.coar-time-grid-event--invalid')).toHaveCount(0);
      });
      await page.mouse.up();
      await expect.poll(async () => (await record(page)).drops).toHaveLength(1);
      const [drop] = (await record(page)).drops as Array<{ id: string; start: string; end: string; from: string }>;
      expect(drop.id).toBe('drag-me');
      expect(drop.from).toContain('2026-04-15T11:00:00');
      expect(drop.start).toContain('2026-04-16T14:00:00'); // Thu, +3 h, same duration
      expect(drop.end).toContain('2026-04-16T15:00:00');
      await expect(page.locator('.coar-time-grid-event--ghost, .coar-time-grid-event--source-phantom')).toHaveCount(0);
      // the card is now in Thursday's column at 14:00
      const moved = (await card(page, 'drag-me').boundingBox())!;
      expect(moved.x + moved.width / 2).toBeGreaterThan(g.boxes[4].x);
      expect(moved.x + moved.width / 2).toBeLessThan(g.boxes[4].x + g.boxes[4].w);
      expect(moved.y).toBeCloseTo(g.y(HM(14)), 0);
      // the live region said so
      await expect(page.locator('.coar-time-grid__a11y-live')).toContainText(/Drag me/);
    });

    test(`resize: dragging the bottom and top handle changes end / start only ${tag}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await open(page, 'week-dnd', look);
      const g = await geometry(page);
      const bottom = card(page, 'resize-me').locator('.coar-time-grid-event__resize--bottom');
      const hb = (await bottom.boundingBox())!;
      // Compact uses a side rail, leaving the body available for moving.
      // Short duration cards divide that rail: inflating or overlapping the
      // handles would lie about duration or make one edge unreachable.
      const eventBox = (await card(page, 'resize-me').boundingBox())!;
      const topBox = (await card(page, 'resize-me').locator('.coar-time-grid-event__resize--top').boundingBox())!;
      expect(hb.width).toBeGreaterThanOrEqual(mobile ? 44 : 24);
      expect(hb.height).toBeGreaterThanOrEqual(Math.min(mobile ? 44 : 24, eventBox.height / 2) - 1);
      expect(topBox.y + topBox.height).toBeLessThanOrEqual(hb.y + 1);
      expect(hb.width).toBeLessThan(eventBox.width / 2);
      await dragTo(page, { x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 }, { x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 + 54 });
      await page.mouse.up();
      await expect.poll(async () => (await record(page)).drops).toHaveLength(1);
      let drop = ((await record(page)).drops as Array<{ start: string; end: string }>)[0];
      expect(drop.start).toContain('2026-04-16T13:00:00');
      expect(drop.end).toContain('2026-04-16T15:30:00'); // +1 h at 54 px/h
      const top = card(page, 'resize-me').locator('.coar-time-grid-event__resize--top');
      const ht = (await top.boundingBox())!;
      await dragTo(page, { x: ht.x + ht.width / 2, y: ht.y + 2 }, { x: ht.x + ht.width / 2, y: ht.y + 2 + 27 });
      await page.mouse.up();
      await expect.poll(async () => (await record(page)).drops).toHaveLength(2);
      drop = ((await record(page)).drops as Array<{ start: string; end: string }>)[1];
      expect(drop.start).toContain('2026-04-16T13:30:00'); // +30 min
      expect(drop.end).toContain('2026-04-16T15:30:00');
      expect(g.boxes).toHaveLength(7);
    });

    test(`invalid drop: a weekend and an early slot show the invalid card, release calls nothing, Escape cancels ${tag}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await open(page, 'week-dnd', look);
      const g = await geometry(page);
      const from = { x: g.colX(3), y: g.y(HM(11, 30)) };
      // 1) Saturday: rejected by canDrop
      await dragTo(page, from, { x: g.colX(6), y: g.y(HM(12)) }, async () => {
        const invalid = page.locator('.coar-time-grid-event--invalid');
        await expect(invalid).toHaveCount(1);
        await expect(invalid).toContainText('Drag me');
        const stripe = await invalid.evaluate((e) => { const s = getComputedStyle(e); return { outline: s.outlineStyle, outlineColor: s.outlineColor, image: s.backgroundImage }; });
        expect(stripe.outline).toBe('dashed');
        expect(stripe.image).toContain('gradient'); // the stripe is not colour alone
        await expect(page.locator('.coar-time-grid-event--ghost')).toHaveCount(0);
      });
      await page.mouse.up();
      await expect(page.locator('.coar-time-grid-event--invalid')).toHaveCount(0, { timeout: 3000 });
      expect((await record(page)).drops).toEqual([]);
      expect((await card(page, 'drag-me').boundingBox())!.y).toBeCloseTo(g.y(HM(11)), 0); // snapped back
      // 2) Thursday 07:30 (before the allowed 08:00). Aim at 08:00:
      // the pointer grabbed the card 30 minutes below its start.
      await dragTo(page, from, { x: g.colX(4), y: g.y(HM(8)) }, async () => {
        await expect(page.locator('.coar-time-grid-event--invalid')).toHaveCount(1);
      });
      await page.mouse.up();
      await expect(page.locator('.coar-time-grid-event--invalid')).toHaveCount(0, { timeout: 3000 });
      expect((await record(page)).drops).toEqual([]);
      // 3) Escape while dragging to a valid slot cancels it
      await dragTo(page, from, { x: g.colX(4), y: g.y(HM(15)) }, async () => {
        await expect(page.locator('.coar-time-grid-event--ghost')).toBeVisible();
        await page.keyboard.press('Escape');
      });
      await page.mouse.up();
      await expect(page.locator('.coar-time-grid-event--ghost, .coar-time-grid-event--source-phantom')).toHaveCount(0);
      expect((await record(page)).drops).toEqual([]);
      expect((await card(page, 'drag-me').boundingBox())!.y).toBeCloseTo(g.y(HM(11)), 0);
    });

    test(`keyboard: one arrow stages a preview, Enter commits with the event's own id, Shift+Arrow resizes the end only ${tag}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await open(page, 'week-dnd', look);
      const ev = card(page, 'neighbour');
      await expect(ev).toHaveAttribute('role', 'button');
      await ev.focus();
      await expect(ev).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(page.locator('.coar-time-grid-event--ghost')).toHaveCount(1);
      await page.keyboard.press('Enter');
      await expect.poll(async () => (await record(page)).drops).toHaveLength(1);
      const first = ((await record(page)).drops as Array<{ id: string; start: string; end: string; from: string }>)[0];
      expect(first.id).toBe('neighbour');
      expect(first.from).toContain('T09:00:00');
      expect(first.start).toContain('2026-04-14T09:30:00'); // one slot (30 min)
      await expect(page.locator('.coar-time-grid__a11y-live')).toContainText(/Neighbour moved/);
      await expect(card(page, 'neighbour')).toBeFocused(); // focus returns to the moved event
      await page.keyboard.press('Shift+ArrowDown');
      await page.keyboard.press('Enter');
      await expect.poll(async () => (await record(page)).drops).toHaveLength(2);
      const second = ((await record(page)).drops as Array<{ id: string; start: string; end: string }>)[1];
      expect(second.id).toBe('neighbour');
      expect(second.start).toBe(first.start);
      expect(second.end).not.toBe(first.end);
    });

    test(`keyboard: several arrow presses keep the event's own id in the drop payload ${tag}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await open(page, 'week-dnd', look);
      await card(page, 'neighbour').focus();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown'); // the second press arrives on the preview card
      await page.keyboard.press('Enter');
      await expect.poll(async () => (await record(page)).drops).toHaveLength(1);
      const drop = ((await record(page)).drops as Array<{ id: string; start: string }>)[0];
      expect(drop.start).toContain('2026-04-14T10:00:00');
      // useTimeGridDnd.ts: the second keystroke stores the preview event (id "neighbour__preview") as kbd.event.
      expect(drop.id, 'drop payload event id').toBe('neighbour');
      await expect(card(page, 'neighbour')).toBeFocused();
    });

    test(`keyboard: Escape drops the preview and nothing is reported ${tag}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await open(page, 'week-dnd', look);
      await card(page, 'neighbour').focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('.coar-time-grid-event--ghost')).toHaveCount(1);
      await page.keyboard.press('Escape');
      await expect(page.locator('.coar-time-grid-event--ghost')).toHaveCount(0);
      expect((await record(page)).drops).toEqual([]);
      await expect(page.locator('.coar-time-grid__a11y-live')).toContainText(/cancel/i);
    });
  }
}

// ─────────────── selection: hover indicator, range drag, draft, Escape ───────────────
for (const scheme of SCHEMES) {
  for (const mobile of [false, true]) {
    const look: Look = { scheme, mobile };
    const tag = `(compact, ${scheme}, mobile=${mobile})`;
    test(`selection: hover marks the slot, a drag selects a range with axis marker, release reports it and shows the draft ${tag}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await open(page, 'week-dnd', look);
      const g = await geometry(page);
      await page.mouse.move(g.colX(2), g.y(HM(13)));
      await expect(page.locator('.coar-time-grid__hover-line')).toHaveCount(1);
      await expect(page.locator('[data-time-selection]')).toHaveCount(1);
      await page.mouse.down();
      await page.mouse.move(g.colX(2), g.y(HM(14)), { steps: 6 });
      const marker = page.locator('.coar-time-axis-marker');
      await expect(marker).toContainText('1:00 h');
      // the marker's pills are text on a fill: they must be readable and fully inside the page
      const c = await contrast(marker);
      expect(c.measured).toBeGreaterThan(2);
      expect(c.bad, 'axis marker text < 4.5:1').toEqual([]);
      for (const pill of await marker.locator('[class*=pill]').all()) {
        const b = (await pill.boundingBox())!;
        expect(b.x).toBeGreaterThanOrEqual(0);
      }
      // the range being dragged and its outline must be seen against the column (WCAG 1.4.11, 3:1)
      expect.soft(await edgeContrast(page.locator('[data-time-selection]'), 'borderTopColor'), 'selection outline vs column').toBeGreaterThanOrEqual(3);
      await page.mouse.move(g.colX(2), g.y(HM(14, 30)), { steps: 6 });
      await expect(marker).toContainText('1:30 h');
      await page.mouse.up();
      await expect.poll(async () => (await record(page)).selects).toHaveLength(1);
      const [sel] = (await record(page)).selects as Array<{ date: string; start: string; end: string; source: string }>;
      expect(sel).toMatchObject({ date: '2026-04-14', source: 'drag' });
      expect(sel.start).toContain('T13:00:00');
      expect(sel.end).toContain('T14:30:00');
      expect((await record(page)).timeClicks).toEqual([]); // a drag is not a click
      const draft = page.locator('[data-time-draft]');
      await expect(draft).toHaveCount(1);
      const d = (await draft.boundingBox())!;
      expect(d.y).toBeCloseTo(g.y(HM(13)), 0);
      expect(d.height).toBeCloseTo(81, 0); // 1.5 h at 54 px/h
      expect.soft(await edgeContrast(draft, 'borderTopColor'), 'draft outline vs column').toBeGreaterThanOrEqual(3);
      // it never takes the pointer from what is below: an event under it stays reachable
      expect(await draft.evaluate((e) => getComputedStyle(e).pointerEvents)).toBe('none');
    });

    test(`selection: Escape cancels a range drag without a call, a subsequent range drag still works ${tag}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await open(page, 'week-dnd', look);
      const g = await geometry(page);
      await page.mouse.move(g.colX(2), g.y(HM(13)));
      await page.mouse.down();
      await page.mouse.move(g.colX(2), g.y(HM(15)), { steps: 6 });
      await expect(page.locator('[data-time-selection]')).toHaveCount(1);
      await page.keyboard.press('Escape');
      await page.mouse.up();
      await expect(page.locator('[data-time-draft]')).toHaveCount(0);
      expect((await record(page)).selects).toEqual([]);
      // After cancellation, a new drag on an empty slot still selects a range.
      await page.mouse.move(g.colX(1) /* Mon is empty */, g.y(HM(9)));
      await page.mouse.down();
      await page.mouse.move(g.colX(1), g.y(HM(10)), { steps: 4 });
      await page.mouse.up();
      expect(((await record(page)).selects as unknown[]).length).toBe(1);
    });
  }
}

// ──────────────────────────── clipped draft / clipped event ────────────────────────────
for (const scheme of SCHEMES) {
  for (const draftKind of ['bottom', 'top'] as const) {
    test(`clipped draft: a draft and events beyond the visible hours are cut at the grid edge, marked, and stay inside the column (compact, ${scheme}, ${draftKind})`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await open(page, 'week-draft-clipped', { scheme, extra: `&draft=${draftKind}` });
      const draft = page.locator('[data-time-draft]');
      await expect(draft).toHaveCount(1);
      await expect(draft).toHaveClass(draftKind === 'bottom' ? /clipped-end/ : /clipped-start/);
      await expect(draft).not.toHaveClass(draftKind === 'bottom' ? /clipped-start/ : /clipped-end/);
      const body = (await page.locator('.coar-time-grid__body').boundingBox())!;
      const col = (await page.locator('.coar-time-grid-column').nth(3).boundingBox())!;
      const d = (await draft.boundingBox())!;
      expect(d.x).toBeGreaterThanOrEqual(col.x - 1);
      expect(d.x + d.width).toBeLessThanOrEqual(col.x + col.width + 1);
      // The hour scale ends at 19:00 (body bottom) and starts at 07:00; the draft stops there.
      expect(d.y + d.height).toBeLessThanOrEqual(body.y + body.height + 1);
      expect(d.y).toBeGreaterThanOrEqual(body.y - 1);
      // the clipped side says "continues": dashed, square, on exactly that side; the other side is a normal solid rounded edge
      const sides = await draft.evaluate((e) => { const x = getComputedStyle(e); return { top: [x.borderTopStyle, x.borderTopLeftRadius], bottom: [x.borderBottomStyle, x.borderBottomLeftRadius] }; });
      const [cut, whole] = draftKind === 'bottom' ? [sides.bottom, sides.top] : [sides.top, sides.bottom];
      expect(cut, 'clipped side').toEqual(['dashed', '0px']);
      expect(whole[0], 'unclipped side').toBe('solid');
      expect(whole[1], 'unclipped side radius').not.toBe('0px');
      // the matching event card is clipped too and is a button with a full name
      const late = card(page, draftKind === 'bottom' ? 'late' : 'early');
      await expect(late).toHaveClass(draftKind === 'bottom' ? /clipped-bottom/ : /clipped-top/);
      await expect(late).toHaveAttribute('aria-label', /Late deployment|Early shift/);
      const lb = (await late.boundingBox())!;
      expect(lb.y + lb.height).toBeLessThanOrEqual(body.y + body.height + 1);
      expect(lb.y).toBeGreaterThanOrEqual(body.y - 1);
      const c = await contrast(page.locator('.coar-time-grid__body'));
      expect(c.bad, 'text < 4.5:1 in the clipped scene, including event time/location').toEqual([]);
      expect(await page.locator('.coar-time-grid__body').evaluate((e) => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(1);
    });
  }
}

// ─────────────────────── swipe paging: real touch, day view, phone width ───────────────────────
test.describe('swipe', () => {
  test.use({ hasTouch: true });
  for (const scheme of SCHEMES) {
    test(`swipe: a horizontal touch pan pages by a day, a short one springs back, a vertical one scrolls and a mouse never pages (compact, ${scheme}, mobile)`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await open(page, 'day-swipe', { scheme, mobile: true, w: 390, h: 780 });
      const label = page.locator('.coar-calendar__range-label');
      const start = (await label.textContent())!;
      // A point on an empty slot of the grid's column (no event, no band label under the finger); found again after every scroll.
      const freeSpot = (fxs = [0.8, 0.9, 0.95]) => page.evaluate((cols) => {
        const col = document.querySelector('.coar-time-grid:not(.coar-time-grid--ghost) .coar-time-grid-column')!.getBoundingClientRect();
        for (let y = Math.max(col.top, 0) + 40; y < Math.min(col.bottom, innerHeight) - 20; y += 10) {
          for (const fx of cols) {
            const x = col.left + col.width * fx;
            const hit = document.elementFromPoint(x, y);
            if (hit && hit.classList.contains('coar-time-grid-column')) return { x, y };
          }
        }
        throw new Error('no free slot visible');
      }, fxs);
      let at = await freeSpot();
      // 1) a short pan (below the commit distance, slow): springs back, no paging
      await swipe(page, at, -30, 0, 6, 40);
      await expect.poll(async () => page.locator('.coar-time-grid--swiping, .coar-time-grid--settling').count()).toBe(0);
      expect(await label.textContent()).toBe(start);
      // 2) a vertical pan does not page
      await swipe(page, at, 4, -120, 8, 30);
      expect(await label.textContent()).toBe(start);
      await page.waitForTimeout(300);
      await page.evaluate(() => { window.scrollTo(0, 0); for (const e of document.querySelectorAll('*')) if (e.scrollTop) e.scrollTop = 0; });
      at = await freeSpot();
      // 3) a long left pan pages forward by one day; the grid follows the finger while panning
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: at.x, y: at.y, id: 1 }] });
      for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: at.x - i * 20, y: at.y, id: 1 }] }); await page.waitForTimeout(30); }
      await expect(page.locator('.coar-time-grid.coar-time-grid--swiping:not(.coar-time-grid--ghost)')).toHaveCount(1);
      const offset = await page.locator('.coar-time-grid:not(.coar-time-grid--ghost)').evaluate((e) => parseFloat(getComputedStyle(e).getPropertyValue('--coar-time-grid-swipe-x')));
      expect(offset).toBeLessThan(-100);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.detach();
      await expect(label).not.toHaveText(start);
      await page.evaluate(() => window.scrollTo(0, 0));
      const forward = (await label.textContent())!;
      expect(forward).toMatch(/April 16, 2026/);
      // 4) right pan pages back to the starting day
      at = await freeSpot([0.1, 0.15, 0.2, 0.25]);
      await swipe(page, at, 150, 0, 8, 30);
      await expect(label).toHaveText(start);
      // 5) mouse never pages by dragging the grid horizontally (it selects/does nothing)
      await page.mouse.move(at.x, at.y);
      await page.mouse.down(); await page.mouse.move(at.x - 200, at.y, { steps: 8 }); await page.mouse.up();
      await expect(label).toHaveText(start);
      // the page itself never scrolls sideways
      const o = await docOverflow(page);
      expect(o.scroll).toBeLessThanOrEqual(o.client);
    });
  }
});

// ───────────────────────────── empty agenda ─────────────────────────────
for (const profile of ['compact', 'legacy'] as const) {
  for (const scheme of SCHEMES) {
    test(`empty agenda: no events gives a labelled, empty list, no errors, nothing sticks out (${profile}, ${scheme})`, async ({ page }, info) => {
      await page.setViewportSize({ width: 1280, height: 700 });
      await open(page, 'agenda-empty', { profile, scheme, h: 500 });
      const region = page.getByRole('region', { name: 'Agenda view' });
      await expect(region).toBeVisible();
      await expect(region.getByRole('list', { name: 'Agenda' })).toBeVisible();
      await expect(region.getByRole('listitem')).toHaveCount(0);
      await expect(page.locator('.coar-calendar__range-label')).toHaveText(/Apr 15\s*[–-]\s*May 14, 2026/);
      // The default draws nothing at all for "no events" (no message): recorded for the review, not judged.
      const text = (await region.innerText()).trim();
      info.annotations.push({ type: 'default-empty-text', description: JSON.stringify(text) });
      // the shell still works: next/prev keep the empty list and the header
      await page.getByRole('button', { name: 'Next' }).click();
      await expect(page.locator('.coar-calendar__range-label')).toHaveText(/May 15\s*[–-]\s*Jun 13, 2026/);
      await expect(region.getByRole('listitem')).toHaveCount(0);
      expect(await clipping(root(page).locator('.coar-calendar__header'))).toEqual([]);
    });

    test(`empty agenda: a consumer's empty note is a live status region with readable text (${profile}, ${scheme})`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 700 });
      await open(page, 'agenda-empty-slot', { profile, scheme, h: 500 });
      const status = page.getByRole('status');
      await expect(status).toBeVisible();
      await expect(status).toContainText('Nothing planned in this range.');
      await expect(status).toHaveAttribute('aria-live', 'polite');
      const box = (await status.boundingBox())!;
      const host = (await root(page).boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(host.x);
      expect(box.x + box.width).toBeLessThanOrEqual(host.x + host.width + 1);
      const c = await contrast(status);
      expect(c.measured).toBeGreaterThan(0);
      expect(c.bad, 'empty note < 4.5:1').toEqual([]);
    });
  }
}

// ───────────────────── narrow (phone width) month / list / agenda / timeline / year / week / day ─────────────────────
// 390 px host box in a 390 px viewport, `.coar-mobile` class emulation (not a device run).
const NARROW = [
  ['month', 'Month (details, shell)'], ['month-continuous', 'continuous month'], ['month-list', 'month list'],
  ['agenda', 'agenda'], ['day-agenda', 'day agenda'], ['timeline', 'timeline'], ['year', 'year'],
  ['week', 'week'], ['day', 'day'],
] as const;
for (const [scene, name] of NARROW) {
  for (const scheme of SCHEMES) {
    test(`narrow ${name}: fits 390 px, header and content stay usable, text >= 4.5:1 (compact, ${scheme}, mobile)`, async ({ page }, info) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await open(page, scene, { scheme, mobile: true, w: 390, h: 780 });
      await page.waitForTimeout(400); // virtual surfaces / month metrics settle
      // The continuous month mounts many month sections: its first section is the measured scope (the others are the same component).
      const host = scene === 'month-continuous' ? root(page).locator('.coar-continuous-month-view__section').first() : root(page);
      const o = await docOverflow(page);
      expect(o.scroll, 'document scroll width').toBeLessThanOrEqual(o.client);
      // header: every control is whole inside the box and at least the mobile target (44) high
      if (scene !== 'month-continuous') expect(await smallTargets(root(page).locator('.coar-calendar__header'), 44)).toEqual([]);
      expect(await clipping(host)).toEqual([]);
      const c = await contrast(host);
      expect(c.measured).toBeGreaterThan(10);
      info.annotations.push({ type: 'unmeasured-gradient-text', description: String(c.unmeasured.length) });
      expect(c.bad, `text < 4.5:1 (${name})`).toEqual([]);
      // dense event chips: recorded, not asserted (month pills, timeline bars and overlapping week cards are dense by design)
      info.annotations.push({ type: 'targets-below-24', description: (await smallTargets(host, 24)).slice(0, 12).join(' | ') });
      // no real button (a control, not an event chip) below 24 px
      const buttons = await host.evaluate((r) => [...r.querySelectorAll<HTMLElement>('button')].map((b) => { const q = b.getBoundingClientRect(); return { n: `${b.className.split(' ')[0]} "${(b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 20)}"`, w: q.width, h: q.height }; }).filter((b) => b.w > 0 && (b.w < 24 || b.h < 24)));
      expect.soft(buttons.filter((b) => !/timeline-view__bar/.test(b.n)).map((b) => `${b.n} ${Math.round(b.w)}x${Math.round(b.h)}`), 'buttons below 24 px').toEqual([]);
    });
  }
}

test('narrow week: the Saturday column and its events are reachable by scrolling, not cut by the box (compact, mobile)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, 'week', { mobile: true, w: 390, h: 780 });
  const reach = await page.evaluate(() => {
    const sat = [...document.querySelectorAll('[role=columnheader]')].find((e) => /Sat/.test(e.textContent!))!;
    for (let a: HTMLElement | null = sat as HTMLElement; a; a = a.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(a).overflowX) && a.scrollWidth > a.clientWidth) {
        const before = sat.getBoundingClientRect().right;
        a.scrollLeft = a.scrollWidth;
        const r = sat.getBoundingClientRect();
        return { scroller: a.className, before, right: r.right, left: r.left, vw: innerWidth };
      }
    }
    return { scroller: null, before: sat.getBoundingClientRect().right, right: sat.getBoundingClientRect().right, left: sat.getBoundingClientRect().left, vw: innerWidth };
  });
  expect(reach.right, `Saturday header right edge (scroller: ${reach.scroller}, before: ${reach.before})`).toBeLessThanOrEqual(reach.vw + 1);
  expect(reach.left).toBeGreaterThanOrEqual(0);
});

test('narrow week: overlapping events keep a title-bearing target of at least 24 px width (compact, mobile)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, 'week', { mobile: true, w: 390, h: 780 });
  const narrow = await page.locator('.coar-time-grid-event[data-event-id]').evaluateAll((els) => els.map((e) => ({ id: e.getAttribute('data-event-id'), w: Math.round(e.getBoundingClientRect().width) })).filter((e) => e.w < 24));
  expect(narrow, 'timed event cards narrower than 24 px in the 390 px week').toEqual([]);
});

for (const [scene, name] of NARROW) {
  test(`narrow ${name}: legacy is only observed (document overflow, no page errors)`, async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, scene, { profile: 'legacy', mobile: true, w: 390, h: 780 });
    await page.waitForTimeout(400);
    const o = await docOverflow(page);
    info.annotations.push({ type: 'legacy-observation', description: `${name}: document ${o.scroll}/${o.client}` });
    await expect(root(page)).not.toHaveClass(/coar-compact/);
  });
}

// ──────────────── legacy: observed, never judged (same pointer work as the compact selection test) ────────────────
for (const scheme of SCHEMES) {
  test(`legacy observation: drag, invalid drop and range marker run as before (${scheme})`, async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, 'week-dnd', { profile: 'legacy', scheme });
    await expect(root(page)).not.toHaveClass(/coar-compact/);
    const g = await geometry(page);
    // behaviour invariants only: a valid drag drops once, a Saturday drop reports nothing
    await dragTo(page, { x: g.colX(3), y: g.y(HM(11, 30)) }, { x: g.colX(4), y: g.y(HM(14, 30)) });
    await page.mouse.up();
    await expect.poll(async () => (await record(page)).drops).toHaveLength(1);
    const dropped = ((await record(page)).drops as Array<{ start: string }>)[0].start;
    info.annotations.push({ type: 'legacy-observation', description: `same pointer path as the compact drag test (expects Thu 14:00) dropped at ${dropped}` });
    const moved = (await card(page, 'drag-me').boundingBox())!; // legacy lays the card out where its own geometry puts it
    await dragTo(page, { x: moved.x + moved.width / 2, y: moved.y + moved.height / 2 }, { x: g.colX(6), y: g.y(HM(12)) });
    await expect(page.locator('.coar-time-grid-event--invalid')).toHaveCount(1);
    await page.mouse.up();
    expect((await record(page)).drops).toHaveLength(1);
    // the range marker's measured contrast is recorded, not asserted
    await page.mouse.move(g.colX(2), g.y(HM(13)));
    await page.mouse.down();
    await page.mouse.move(g.colX(2), g.y(HM(14)), { steps: 6 });
    const c = await contrast(page.locator('.coar-time-axis-marker'));
    info.annotations.push({ type: 'legacy-observation', description: `axis marker text below 4.5: ${c.bad.join(' | ') || 'none'}` });
    await page.mouse.up();
  });
}
