import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Playground hooks exposed on `window.__playground` by ConstrainedEditorView when mounted.
 * Keep in sync with the type declaration in that component.
 */
export interface PlaygroundHooks {
  getValue(): string;
  setValue(value: string): void;
  getRejections(): ReadonlyArray<{ reason: string }>;
  clearRejections(): void;
  setAuthoring(u: boolean): void;
  getCursor(): { lineNumber: number; column: number } | null;
  setCursor(lineNumber: number, column: number): void;
  focusEditor(): void;
  executeEdit(startLine: number, startCol: number, endLine: number, endCol: number, text: string): void;
}

export async function executeEdit(
  page: Page,
  startLine: number,
  startCol: number,
  endLine: number,
  endCol: number,
  text: string,
): Promise<void> {
  await page.evaluate(
    ({ sl, sc, el, ec, t }) => {
      const p = (window as unknown as { __playground: PlaygroundHooks }).__playground;
      p.executeEdit(sl, sc, el, ec, t);
    },
    { sl: startLine, sc: startCol, el: endLine, ec: endCol, t: text },
  );
  await page.waitForTimeout(50);
}

export async function gotoConstrainedEditor(page: Page): Promise<void> {
  await page.goto('/constrained-editor');
  // Wait for the editor wrap to appear and Monaco to finish mounting.
  await page.locator('[data-testid="editor-wrap"] .monaco-editor').waitFor();
  // Wait for the hooks to be attached (onMounted has run).
  await page.waitForFunction(() => '__playground' in window);
}

export async function getValue(page: Page): Promise<string> {
  return page.evaluate(() => {
    const p = (window as unknown as { __playground: PlaygroundHooks }).__playground;
    return p.getValue();
  });
}

export async function setValue(page: Page, value: string): Promise<void> {
  await page.evaluate((v) => {
    const p = (window as unknown as { __playground: PlaygroundHooks }).__playground;
    p.setValue(v);
  }, value);
  // Yield so the watcher flushes setValue into Monaco.
  await page.waitForTimeout(50);
}

export async function getRejections(page: Page): Promise<ReadonlyArray<{ reason: string }>> {
  return page.evaluate(() => {
    const p = (window as unknown as { __playground: PlaygroundHooks }).__playground;
    return [...p.getRejections()];
  });
}

export async function clearRejections(page: Page): Promise<void> {
  await page.evaluate(() => {
    const p = (window as unknown as { __playground: PlaygroundHooks }).__playground;
    p.clearRejections();
  });
}

export async function setAuthoring(page: Page, authoring: boolean): Promise<void> {
  await page.evaluate((u) => {
    const p = (window as unknown as { __playground: PlaygroundHooks }).__playground;
    p.setAuthoring(u);
  }, authoring);
  await page.waitForTimeout(50);
}

export async function getCursor(
  page: Page,
): Promise<{ lineNumber: number; column: number } | null> {
  return page.evaluate(() => {
    const p = (window as unknown as { __playground: PlaygroundHooks }).__playground;
    return p.getCursor();
  });
}

export async function setCursor(
  page: Page,
  lineNumber: number,
  column: number,
): Promise<void> {
  await page.evaluate(
    ({ l, c }) => {
      const p = (window as unknown as { __playground: PlaygroundHooks }).__playground;
      p.setCursor(l, c);
    },
    { l: lineNumber, c: column },
  );
  await page.waitForTimeout(50);
}

export async function focusEditor(page: Page): Promise<void> {
  await page.evaluate(() => {
    const p = (window as unknown as { __playground: PlaygroundHooks }).__playground;
    p.focusEditor();
  });
}

/**
 * Type a key-sequence into the focused editor. Wrapper around Playwright's `keyboard.type`
 * with a small delay so Monaco can process each char — prevents occasional drops on fast runs.
 */
export async function type(page: Page, text: string): Promise<void> {
  await page.keyboard.type(text, { delay: 10 });
}

/**
 * Assert that the editor's current value equals the given string. Uses Playwright's
 * `expect.poll` so Monaco has a moment to settle if needed.
 */
export async function expectValue(page: Page, expected: string): Promise<void> {
  await expect.poll(async () => await getValue(page)).toBe(expected);
}

/**
 * Assert that the current value contains the given substring.
 */
export async function expectValueContains(page: Page, substring: string): Promise<void> {
  await expect.poll(async () => await getValue(page)).toContain(substring);
}

/**
 * Assert that no rejection has been recorded. Useful after a legal edit to confirm the
 * guard didn't fire.
 */
export async function expectNoRejections(page: Page): Promise<void> {
  const rejections = await getRejections(page);
  expect(rejections, 'Unexpected rejection(s) recorded').toEqual([]);
}

export async function expectRejection(page: Page, reason: string): Promise<void> {
  await expect
    .poll(async () => (await getRejections(page)).some((r) => r.reason === reason))
    .toBe(true);
}

/**
 * The builder keeps its outline and its element library in flyouts behind the
 * activity rail, so a spec has to open the one it needs before the tree rows or
 * palette cards exist in the DOM. Idempotent: `aria-pressed` says whether the
 * drawer is already open, so calling it twice does not close it again.
 */
export async function openBuilderTool(
  builder: Locator,
  tool: 'Structure' | 'Insert elements',
): Promise<void> {
  const button = builder.getByRole('button', { name: tool, exact: true });
  if ((await button.getAttribute('aria-pressed')) === 'true') return;
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
}

/**
 * Drag a palette card onto the canvas. The builder's drag-and-drop is
 * pointer-based, so `dragTo` is the wrong tool twice over: the canvas insert
 * bars are hairlines that only lay out once a drag is in flight, and the drop
 * is resolved by proximity to the pointer rather than by a DOM hit on the
 * target. Press, cross the 5px threshold to arm the drag, move over the canvas
 * so the bars render, and only then aim at one.
 */
export async function dragCardOntoCanvas(
  page: Page,
  card: Locator,
  zone: Locator,
): Promise<void> {
  // `boundingBox()` does not scroll the way `click()` does — without this the
  // press lands outside the viewport and the browser starts a text selection
  // instead, which looks exactly like a drag that did nothing.
  await card.scrollIntoViewIfNeeded();
  const from = await card.boundingBox();
  if (!from) throw new Error('Palette card is not on screen.');
  const canvas = page.locator('.pb-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const over = await canvas.boundingBox();
  if (!over) throw new Error('Canvas is not on screen — is the Editor tab active?');

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  // Below the threshold the builder treats this as a plain click, not a drag.
  await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2 + 12, { steps: 4 });
  await page.mouse.move(over.x + over.width / 2, over.y + over.height / 2, { steps: 8 });

  // The bar has a real box only now; without the poll we would aim at (0, 0).
  const target = await expect
    .poll(async () => (await zone.boundingBox())?.width ?? 0)
    .toBeGreaterThan(0)
    .then(() => zone.boundingBox());
  await page.mouse.move(target!.x + target!.width / 2, target!.y + target!.height / 2, { steps: 8 });
  await page.mouse.up();
}
