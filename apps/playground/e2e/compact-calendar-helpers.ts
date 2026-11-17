import { expect, type Locator, type Page } from '@playwright/test';

/** The test host of these scenes: a page of the playground dev server, served from this folder. */
const HOST = '/e2e/fixtures/calendar/index.html';
export const NOW = new Date('2026-04-15T08:30:00Z'); // Wed 15 Apr 2026, 10:30 Vienna

export interface Look { profile?: 'compact' | 'legacy'; scheme?: 'light' | 'dark'; mobile?: boolean; w?: number; h?: number; extra?: string }

/** Everything that must not happen while a scene is shown. No ignore rules. */
export function guard(page: Page): string[] {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`console ${m.type()}: ${m.text()}`); });
  page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (/^https?:$/.test(u.protocol) && !['localhost', '127.0.0.1'].includes(u.hostname)) problems.push(`external request: ${r.url()}`);
  });
  return problems;
}

/** Opens a scene of ./fixtures/calendar in a document of its own, with fixed time and the opt-ins on <html>. */
export async function open(page: Page, scene: string, look: Look = {}) {
  const { profile = 'compact', scheme = 'light', mobile = false, w, h, extra = '' } = look;
  await page.clock.setFixedTime(NOW);
  await page.addInitScript(([dark, mob]) => {
    // <html> does not exist yet when init scripts run: put the opt-ins on it the moment it does.
    const apply = () => {
      const html = document.documentElement;
      if (!html) return false;
      html.classList.toggle('dark-mode', dark as boolean);
      html.classList.toggle('coar-mobile', mob as boolean);
      return true;
    };
    if (!apply()) new MutationObserver((_m, o) => { if (apply()) o.disconnect(); }).observe(document, { childList: true });
  }, [scheme === 'dark', mobile]);
  const qs = new URLSearchParams({ scene, profile, ...(w ? { w: String(w) } : {}), ...(h ? { h: String(h) } : {}) });
  await page.goto(`${HOST}?${qs}${extra}`);
  await expect(page.locator('[data-scene-root]')).toBeVisible();
  await page.evaluate(async () => { await document.fonts.ready; });
}

/** Everything the host recorded through the builder hooks. */
export const record = (page: Page) =>
  page.evaluate(() => (window as unknown as { __cal: Record<string, unknown[]> }).__cal);

/** WCAG contrast of every visible text run in `scope`; layered translucent fills are composited, gradients are listed as unmeasured. */
export async function contrast(scope: Locator, min = 4.5) {
  return scope.evaluate((root, floor) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 1;
    const cx = cv.getContext('2d', { willReadFrequently: true })!;
    const rgba = (css: string): [number, number, number, number] => {
      cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = css; cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255];
    };
    const over = (top: number[], bot: number[]) => {
      const a = top[3] + bot[3] * (1 - top[3]);
      return a === 0 ? [0, 0, 0, 0] : [0, 1, 2].map((i) => (top[i] * top[3] + bot[i] * bot[3] * (1 - top[3])) / a).concat(a);
    };
    const lum = (c: number[]) => { const f = c.slice(0, 3).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
    const bad: string[] = []; const unmeasured: string[] = []; let measured = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent!.trim()) continue;
      const el = n.parentElement!;
      const r = el.getBoundingClientRect();
      if (r.width <= 2 || r.height <= 2) continue; // visually hidden (sr-only) text is not painted
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || el.closest('[aria-hidden=true]')?.hasAttribute('data-time-draft')) continue;
      let alpha = 1; let hiddenByOpacity = false;
      let bg: number[] = [0, 0, 0, 0]; let gradient = false;
      for (let a: Element | null = el; a; a = a.parentElement) {
        const s = getComputedStyle(a);
        alpha *= parseFloat(s.opacity); if (parseFloat(s.opacity) === 0) hiddenByOpacity = true;
        if (s.backgroundImage !== 'none') gradient = true;
        bg = over(bg, rgba(s.backgroundColor)) as number[];
        if (bg[3] >= 0.999) break;
      }
      if (hiddenByOpacity) continue;
      if (bg[3] < 0.999) bg = over(bg, [255, 255, 255, 1]) as number[];
      let fg = rgba(cs.color); fg[3] *= alpha;
      const fgc = over(fg, bg);
      const ratio = (Math.max(lum(fgc), lum(bg)) + 0.05) / (Math.min(lum(fgc), lum(bg)) + 0.05);
      const label = `${el.className || el.tagName}: "${n.textContent!.trim().slice(0, 30)}" ${cs.fontSize} ${ratio.toFixed(2)}`;
      if (gradient) { unmeasured.push(label); continue; }
      measured++;
      if (ratio < floor) bad.push(label);
    }
    return { bad, unmeasured, measured };
  }, min, { timeout: 40_000 });
}

/** Text that is cut off without an ellipsis, and boxes that leave the scene box. */
export async function clipping(scope: Locator) {
  return scope.evaluate((root) => {
    const out: string[] = [];
    const box = root.getBoundingClientRect();
    for (const el of root.querySelectorAll<HTMLElement>('*')) {
      const r = el.getBoundingClientRect();
      if (r.width <= 2 || r.height <= 2 || el.closest('[aria-hidden=true]')) continue; // sr-only text is 1px by design
      const own = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent!.trim());
      if (!own) continue;
      const cs = getComputedStyle(el);
      const clipsX = el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== 'visible' && cs.textOverflow !== 'ellipsis';
      if (clipsX) out.push(`cut off: ${el.className} "${el.textContent!.trim().slice(0, 30)}" ${el.scrollWidth}>${el.clientWidth}`);
      // Content of a horizontal scroller may lie outside the box until scrolled to: reachability is tested separately.
      let scrolled = false;
      for (let a: HTMLElement | null = el.parentElement; a && a !== root.parentElement; a = a.parentElement) {
        if (/(auto|scroll)/.test(getComputedStyle(a).overflowX) && a.scrollWidth > a.clientWidth + 1) { scrolled = true; break; }
      }
      if (!scrolled && (r.right > box.right + 1 || r.left < box.left - 1)) out.push(`outside box: ${el.className} "${el.textContent!.trim().slice(0, 30)}" ${Math.round(r.left)}..${Math.round(r.right)} of ${Math.round(box.left)}..${Math.round(box.right)}`);
    }
    return out;
  }, undefined, { timeout: 40_000 });
}

/** Interactive things (button, tab, radio…) smaller than `min` px, by what a person would call them. */
export async function smallTargets(scope: Locator, min: number) {
  return scope.evaluate((root, floor) => {
    const out: string[] = [];
    for (const el of root.querySelectorAll<HTMLElement>('button, [role=button], [role=tab], [role=radio], a[href], input, select, [tabindex="0"]')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.width < floor || r.height < floor) out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return out;
  }, min, { timeout: 40_000 });
}

export const docOverflow = (page: Page) =>
  page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));

/** Real touch swipe through CDP: touchStart/Move/End raise real touch pointer events. */
export async function swipe(page: Page, from: { x: number; y: number }, dx: number, dy = 0, steps = 8, stepMs = 16) {
  const cdp = await page.context().newCDPSession(page);
  const pt = (x: number, y: number) => [{ x, y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(from.x, from.y) });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(from.x + (dx * i) / steps, from.y + (dy * i) / steps) });
    await page.waitForTimeout(stepMs);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

/** WCAG 1.4.11 ratio of an element's border (or fill, `prop: 'backgroundColor'`) against what is behind it (the nearest opaque ancestor fills, composited). */
export async function edgeContrast(el: Locator, prop: 'borderTopColor' | 'borderBottomColor' | 'backgroundColor' = 'borderTopColor') {
  return el.evaluate((node, p) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 1;
    const cx = cv.getContext('2d', { willReadFrequently: true })!;
    const rgba = (css: string): number[] => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = css; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
    const over = (t: number[], b: number[]) => { const a = t[3] + b[3] * (1 - t[3]); return a === 0 ? [0, 0, 0, 0] : [0, 1, 2].map((i) => (t[i] * t[3] + b[i] * b[3] * (1 - t[3])) / a).concat(a); };
    const lum = (c: number[]) => { const f = c.slice(0, 3).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
    let bg = [0, 0, 0, 0];
    for (let a = node.parentElement; a && bg[3] < 0.999; a = a.parentElement) bg = over(bg, rgba(getComputedStyle(a).backgroundColor));
    if (bg[3] < 0.999) bg = over(bg, [255, 255, 255, 1]);
    const fg = over(rgba(getComputedStyle(node)[p as 'borderTopColor']), bg);
    const [hi, lo] = [Math.max(lum(fg), lum(bg)), Math.min(lum(fg), lum(bg))];
    return (hi + 0.05) / (lo + 0.05);
  }, prop);
}
