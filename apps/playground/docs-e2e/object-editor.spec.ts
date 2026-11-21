import { expect, test, type Locator, type Page } from '@playwright/test';

// The Object Editor page: values are edited in their rows, problems appear in the
// row they belong to, and switching between view and edit moves nothing.

const product = (page: Page) => page.locator('.coar-object-editor').first();
const row = (editor: Locator, pointer: string) => editor.locator(`[data-pointer="${pointer}"]`);

test.skip(({ isMobile }) => isMobile, 'the editor is built for desktop and tablet; a phone layout is planned');

test.beforeEach(async ({ page }) => {
  await page.goto('/components/object-editor');
  await expect(product(page)).toBeVisible();
});

test('an edited value lands at its path in the JSON', async ({ page }) => {
  const editor = product(page);
  await row(editor, '/dimensions/width').locator('input').fill('20');
  await row(editor, '/dimensions/width').locator('input').blur();
  await row(editor, '/name').locator('input').fill('Desk lamp XL');
  await page.locator('details', { hasText: 'JSON' }).first().locator('summary').click();
  const json = JSON.parse(await page.locator('details pre').first().innerText());
  expect(json.name).toBe('Desk lamp XL');
  expect(json.dimensions.width).toBe(20);
});

test('a problem appears in its row and a cleared required value removes the key', async ({ page }) => {
  const editor = product(page);
  // (A number below its minimum cannot be typed: the number input keeps the limit itself.)
  const email = row(editor, '/supportEmail');
  await email.locator('input').fill('support');
  await expect(email.locator('.coar-object-editor-error')).toHaveText('Not a valid email address.');
  await expect(editor.locator('.coar-object-editor-error')).toHaveCount(1);

  await row(editor, '/name').locator('input').fill('');
  await expect(row(editor, '/name').locator('.coar-object-editor-error')).toHaveText('Required.');
  await page.locator('details', { hasText: 'JSON' }).first().locator('summary').click();
  const json = JSON.parse(await page.locator('details pre').first().innerText());
  expect('name' in json).toBe(false);
});

test('switching between view and edit moves no row', async ({ page }) => {
  const editor = product(page);
  const rows = editor.locator('.coar-object-editor-row');
  const boxes = () =>
    rows.evaluateAll((list) =>
      list.map((el) => {
        const rect = el.getBoundingClientRect();
        return [Math.round(rect.y), Math.round(rect.height)];
      }),
    );
  const editing = await boxes();
  await page.getByRole('button', { name: 'View', exact: true }).first().click();
  await expect(row(editor, '/stock').locator('input')).toHaveCount(0);
  expect(await boxes()).toEqual(editing);
});
