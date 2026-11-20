import { expect, test, type Locator } from '@playwright/test';

// appearance="inline" and width="content" on the Text Input page: the sentence demo
// and the property list share the inline look of all inputs.

const box = async (locator: Locator) => {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error('not rendered');
  return rect;
};
const background = (locator: Locator) =>
  locator.evaluate((el) => getComputedStyle(el).backgroundColor);
const transparent = (colour: string) => /\/ 0\)$|, 0\)$|^transparent$/.test(colour);

test.beforeEach(async ({ page }) => {
  await page.goto('/components/text-input');
});

test('an inline field fits its sentence and keeps the text after it in place on focus', async ({ page }) => {
  const sentence = page.locator('p', { hasText: 'ships from' });
  const field = sentence.locator('.coar-text-input--content').first();
  const frame = field.locator('.coar-input-frame');
  await frame.scrollIntoViewIfNeeded();
  // The text after the second field: where "· in stock" starts.
  const tail = () => sentence.evaluate((p) => {
    const text = [...p.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).pop()!;
    const range = document.createRange();
    range.selectNodeContents(text);
    const rect = range.getBoundingClientRect();
    return { x: rect.x, y: rect.y };
  });

  const restBox = await box(frame);
  const restTail = await tail();
  expect(transparent(await background(frame))).toBe(true);
  // Narrower than the line it sits in: the field does not fill it.
  expect(restBox.width).toBeLessThan((await box(sentence)).width - 40);

  await field.locator('input').focus();
  expect(await box(frame)).toEqual(restBox);
  expect(await tail()).toEqual(restTail);
  expect(transparent(await background(frame))).toBe(false);
  await expect(frame).toHaveCSS('box-shadow', 'none');

  // Only a changed value changes the width.
  await field.locator('input').pressSequentially(' XL');
  expect((await box(frame)).width).toBeGreaterThan(restBox.width);
});

test('hovering fills an inline field lightly, editing it more strongly', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'hover needs a pointer');
  const frame = page.locator('.inline-properties .coar-text-input-frame').first();
  await frame.scrollIntoViewIfNeeded();
  const rest = await background(frame);
  await frame.hover();
  const hover = await background(frame);
  await frame.locator('input').focus();
  const active = await background(frame);
  expect(transparent(rest)).toBe(true);
  expect(transparent(hover)).toBe(false);
  expect(active).not.toBe(hover);
});

test('only the box activates a field: the space next to it does nothing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'a phone row has no free space next to the box');
  const rows = page.locator('.inline-properties__row');
  for (const [row, control] of [[0, '.coar-input-frame'], [2, '.coar-select-trigger']] as const) {
    const frame = rows.nth(row).locator(control);
    await frame.scrollIntoViewIfNeeded();
    const rect = await box(frame);
    const rowRect = await box(rows.nth(row));
    // Free space of the row, right of the box.
    expect(rowRect.x + rowRect.width).toBeGreaterThan(rect.x + rect.width + 60);
    await page.mouse.click(rect.x + rect.width + 40, rect.y + rect.height / 2);
    expect(await frame.evaluate((el) => el.contains(document.activeElement))).toBe(false);
    await expect(page.locator('.coar-select-dropdown')).toHaveCount(0);
  }
});

test('a content-width select keeps its box while searching and is driven by the keyboard', async ({ page }) => {
  const select = page.locator('.inline-properties .coar-select--content');
  const trigger = select.locator('.coar-select-trigger');
  await trigger.scrollIntoViewIfNeeded();
  const rest = await box(trigger);

  await trigger.focus();
  await expect(page.locator('.coar-select-dropdown')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(page.locator('.coar-select-dropdown')).toBeVisible();
  const search = select.locator('.coar-select-inline-search');
  for (const letter of 'offi') {
    await search.press(letter);
    expect(await box(trigger)).toEqual(rest);
  }
  await expect(page.locator('.coar-select-option')).toHaveText(['Office supplies']);
  await page.keyboard.press('Escape');
  await expect(page.locator('.coar-select-dropdown')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('an inline field with an error keeps its red border at rest', async ({ page }) => {
  const frame = page.locator('.inline-properties__row', { hasText: 'SKU' }).locator('.coar-input-frame');
  await frame.scrollIntoViewIfNeeded();
  await expect(frame).toHaveClass(/coar-input-frame--error/);
  expect(transparent(await frame.evaluate((el) => getComputedStyle(el).borderTopColor))).toBe(false);
});
