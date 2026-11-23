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

const json = async (page: Page) => {
  await page.locator('details', { hasText: 'JSON' }).first().locator('summary').click();
  return JSON.parse(await page.locator('details pre').first().innerText());
};

test('a problem appears in its row', async ({ page }) => {
  const editor = product(page);
  // (A number below its minimum cannot be typed: the number input keeps the limit itself.)
  const email = row(editor, '/supportEmail');
  await email.locator('input').fill('support');
  await expect(email.locator('.coar-object-editor-error')).toHaveText('Not a valid email address.');
  await expect(editor.locator('.coar-object-editor-error')).toHaveCount(1);
});

test('an emptied text stays "", and only Remove deletes the key', async ({ page }) => {
  const editor = product(page);
  const name = row(editor, '/name');
  await name.locator('input').fill('');
  await expect(name.locator('.coar-object-editor-literal')).toHaveText('""');
  await expect(name.locator('.coar-object-editor-error')).toHaveCount(0);
  expect((await json(page)).name).toBe('');

  await name.getByRole('button', { name: 'Actions for Product name' }).click();
  await page.getByRole('menuitem', { name: 'Remove value' }).click();
  await expect(name.locator('.coar-object-editor-error')).toHaveText('Required.');
  expect('name' in JSON.parse(await page.locator('details pre').first().innerText())).toBe(false);
});

test.describe('inherited values', () => {
  const layered = (page: Page) =>
    page.locator('.coar-object-editor').filter({ has: page.locator('[data-pointer="/retries"]') }).first();
  const layer = async (page: Page) =>
    JSON.parse(await page.locator('.json').filter({ hasText: 'This layer' }).locator('pre').last().innerText());

  test('the local view shows only what the layer sets, and changes nothing', async ({ page }) => {
    const editor = layered(page);
    await editor.scrollIntoViewIfNeeded();
    const before = await layer(page);
    await page.getByRole('button', { name: 'Only this layer', exact: true }).click();
    const pointers = await editor.locator('[data-pointer]').evaluateAll((rows) => rows.map((r) => r.getAttribute('data-pointer')));
    expect(pointers).toEqual(['/retries', '/proxy', '/proxy/port']);
    expect(await layer(page)).toEqual(before);
  });

  test('editing an inherited value writes the layer; reset brings the inherited one back', async ({ page }) => {
    const editor = layered(page);
    await editor.scrollIntoViewIfNeeded();
    const host = row(editor, '/proxy/host');
    await expect(host).toHaveAttribute('data-state', 'inherited');
    await host.locator('input').fill('layer.example');
    await expect(host).toHaveAttribute('data-state', 'local');
    expect((await layer(page)).proxy).toEqual({ port: 3128, host: 'layer.example' });

    await host.getByRole('button', { name: 'Actions for Host' }).click();
    await page.getByRole('menuitem', { name: 'Reset to inherited' }).click();
    await expect(host).toHaveAttribute('data-state', 'inherited');
    expect((await layer(page)).proxy).toEqual({ port: 3128 });
  });
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
