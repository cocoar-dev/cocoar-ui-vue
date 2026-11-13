import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Components operated by tap only: `/touch-lab`. Runs in the `chromium` project (desktop
 * Chrome with touch enabled) and in `webkit-tablet` (WebKit with the iPad profile). The
 * spec taps (`locator.tap()`), never clicks or hovers, and reads the result line each part
 * of the lab prints.
 */

test.use({ hasTouch: true });

const section = (page: Page, id: string): Locator => page.getByTestId(id);
const result = (page: Page, id: string): Locator => page.getByTestId(`${id}-result`);

/** A tap on the page heading: outside every control and overlay of the lab. */
const tapOutside = (page: Page) => page.getByRole('heading', { name: 'Touch lab' }).tap();

test.beforeEach(async ({ page }) => {
  await page.goto('/touch-lab');
  await expect(page.getByRole('heading', { name: 'Touch lab' })).toBeVisible();
});

test.describe('touch lab', { tag: '@touch' }, () => {
  test('select: a tap opens the panel, a tap on an option selects it and closes', async ({
    page,
  }) => {
    await section(page, 'select').getByRole('combobox').tap();
    const listbox = page.getByRole('listbox');
    await expect(listbox).toBeVisible();
    await listbox.getByRole('option', { name: 'Berlin', exact: true }).tap();
    await expect(result(page, 'select')).toHaveText('Select: ber');
    await expect(listbox).toBeHidden();
  });

  test('multi-select: taps toggle two options, a tap outside closes', async ({ page }) => {
    await section(page, 'multi-select').getByRole('combobox').tap();
    const listbox = page.getByRole('listbox');
    await expect(listbox).toBeVisible();
    await listbox.getByRole('option', { name: 'Vienna', exact: true }).tap();
    await listbox.getByRole('option', { name: 'Munich', exact: true }).tap();
    await expect(result(page, 'multi-select')).toHaveText('Multi-select: vie,muc');
    await listbox.getByRole('option', { name: 'Vienna', exact: true }).tap();
    await expect(result(page, 'multi-select')).toHaveText('Multi-select: muc');
    await tapOutside(page);
    await expect(listbox).toBeHidden();
    await expect(result(page, 'multi-select')).toHaveText('Multi-select: muc');
  });

  test('menu: a tap opens it, a tap on the parent opens the submenu, a tap on an item fires', async ({
    page,
  }) => {
    await section(page, 'menu').getByRole('button', { name: 'Actions' }).tap();
    const parent = page.getByRole('menuitem', { name: 'Move to' });
    await expect(parent).toBeVisible();
    await parent.tap();
    await expect(parent).toHaveAttribute('aria-expanded', 'true');
    const submenu = page.locator('.coar-submenu-panel');
    await expect(submenu).toBeVisible();
    await submenu.getByRole('menuitem', { name: 'Archive' }).tap();
    await expect(result(page, 'menu')).toHaveText('Menu: Archive');
    await expect(submenu).toBeHidden();
  });

  test('menu: a second tap on the parent closes the submenu again', async ({ page }) => {
    await section(page, 'menu').getByRole('button', { name: 'Actions' }).tap();
    const parent = page.getByRole('menuitem', { name: 'Move to' });
    const submenu = page.locator('.coar-submenu-panel');
    await parent.tap();
    await expect(parent).toHaveAttribute('aria-expanded', 'true');
    await expect(submenu).toBeVisible();
    await parent.tap();
    await expect(parent).toHaveAttribute('aria-expanded', 'false');
    await expect(submenu).toBeHidden();
    await expect(parent).toBeVisible();
  });

  test('menu: with the submenu open, a tap on a submenu item fires and closes it', async ({
    page,
  }) => {
    await section(page, 'menu').getByRole('button', { name: 'Actions' }).tap();
    const parent = page.getByRole('menuitem', { name: 'Move to' });
    await parent.tap();
    const submenu = page.locator('.coar-submenu-panel');
    await expect(submenu).toBeVisible();
    await submenu.getByRole('menuitem', { name: 'Archive' }).tap();
    await expect(result(page, 'menu')).toHaveText('Menu: Archive');
    await expect(submenu).toBeHidden();
  });

  test('menu: nested overlays keep the right state on a tap inside and close together on a tap outside', async ({
    page,
  }) => {
    const parent = page.getByRole('menuitem', { name: 'Move to' });
    const menuPanel = page.locator('.coar-popover-panel', { has: parent });
    const submenu = page.locator('.coar-submenu-panel');
    const openSubmenu = async () => {
      await parent.tap();
      await expect(submenu).toBeVisible();
      await expect(parent).toHaveAttribute('aria-expanded', 'true');
    };

    await section(page, 'menu').getByRole('button', { name: 'Actions' }).tap();
    await expect(menuPanel).toBeVisible();
    await openSubmenu();

    // A tap on a submenu item fires it and closes the submenu; the menu it came from stays.
    await submenu.getByRole('menuitem', { name: 'Projects' }).tap();
    await expect(result(page, 'menu')).toHaveText('Menu: Projects');
    await expect(submenu).toBeHidden();
    await expect(parent).toHaveAttribute('aria-expanded', 'false');
    await expect(menuPanel).toBeVisible();

    // A tap outside closes the submenu and the menu together, and fires nothing.
    await openSubmenu();
    await tapOutside(page);
    await expect(submenu).toBeHidden();
    await expect(menuPanel).toBeHidden();
    await expect(result(page, 'menu')).toHaveText('Menu: Projects');
  });

  test('popover: a tap opens and closes it, a tap on its content works', async ({ page }) => {
    const trigger = section(page, 'popover').getByRole('button', { name: 'Details' });
    const panel = page.locator('.coar-popover-panel', { hasText: 'Shared with 3 people.' });

    await trigger.tap();
    await expect(panel).toBeVisible();
    await expect(result(page, 'popover')).toHaveText('Popover: open, action none');
    await panel.getByRole('button', { name: 'Manage access' }).tap();
    await expect(result(page, 'popover')).toHaveText('Popover: open, action manage');

    await trigger.tap();
    await expect(panel).toBeHidden();
    await expect(result(page, 'popover')).toHaveText('Popover: closed, action manage');

    await trigger.tap();
    await expect(panel).toBeVisible();
    await tapOutside(page);
    await expect(panel).toBeHidden();
    await expect(result(page, 'popover')).toHaveText('Popover: closed, action manage');
  });

  test('dialog: a tap opens it; its close button and its footer buttons work by tap', async ({
    page,
  }) => {
    const notice = page.getByRole('dialog', { name: 'Draft saved' });
    await section(page, 'dialog').getByRole('button', { name: 'Show notice' }).tap();
    await expect(notice).toBeVisible();
    await expect(result(page, 'dialog')).toHaveText('Dialog: open');
    await notice.getByRole('button', { name: 'Close dialog' }).tap();
    await expect(notice).toBeHidden();
    await expect(result(page, 'dialog')).toHaveText('Dialog: undefined');

    await section(page, 'dialog').getByRole('button', { name: 'Show notice' }).tap();
    await notice.getByRole('button', { name: 'OK', exact: true }).tap();
    await expect(notice).toBeHidden();
    await expect(result(page, 'dialog')).toHaveText('Dialog: true');

    const confirm = page.getByRole('dialog', { name: 'Delete the draft?' });
    await section(page, 'dialog').getByRole('button', { name: 'Delete draft' }).tap();
    await confirm.getByRole('button', { name: 'Keep', exact: true }).tap();
    await expect(confirm).toBeHidden();
    await expect(result(page, 'dialog')).toHaveText('Dialog: false');
  });

  test('date picker: a tap opens the calendar, a tap on a day sets the value', async ({ page }) => {
    await expect(result(page, 'date-picker')).toHaveText('Date: 2026-03-14');
    await section(page, 'date-picker').getByRole('button', { name: 'Open picker' }).tap();
    const day = page.locator('button[data-date="2026-03-20"]');
    await expect(day).toBeVisible();
    await day.tap();
    await expect(result(page, 'date-picker')).toHaveText('Date: 2026-03-20');
    await expect(day).toBeHidden();
  });

  test('dialog: a tap on the backdrop dismisses it and resolves it as dismissed', async ({
    page,
  }) => {
    const confirm = page.getByRole('dialog', { name: 'Delete the draft?' });
    await section(page, 'dialog').getByRole('button', { name: 'Delete draft' }).tap();
    await expect(confirm).toBeVisible();
    await expect(result(page, 'dialog')).toHaveText('Dialog: open');
    // The top left corner of the viewport: on the backdrop, outside the dialog.
    await page.locator('.coar-overlay-backdrop').tap({ position: { x: 8, y: 8 } });
    await expect(confirm).toBeHidden();
    await expect(result(page, 'dialog')).toHaveText('Dialog: undefined');
  });

  test('date picker: a tap navigates to another month, a tap on a day there commits it', async ({
    page,
  }) => {
    await section(page, 'date-picker').getByRole('button', { name: 'Open picker' }).tap();
    const months = page.getByRole('listbox', { name: 'Months' });
    await expect(months).toBeVisible();
    await page.getByRole('button', { name: 'Next year' }).tap();
    await expect(page.locator('.coar-plain-date-picker-year')).toHaveText('2027');
    await months.getByRole('option', { name: /^Jun/ }).tap();
    await expect(months.getByRole('option', { name: /^Jun/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const day = page.locator('button[data-date="2027-06-10"]');
    await expect(day).toBeVisible();
    await day.tap();
    await expect(result(page, 'date-picker')).toHaveText('Date: 2027-06-10');
    await expect(months).toBeHidden();
    await expect(day).toBeHidden();
  });

  test('tabs and segmented control switch by tap', async ({ page }) => {
    await section(page, 'tabs').getByRole('tab', { name: 'Members' }).tap();
    await expect(result(page, 'tabs')).toHaveText('Tab: members');
    await expect(section(page, 'tabs').getByRole('tab', { name: 'Members' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await section(page, 'segmented').getByRole('button', { name: 'Month' }).tap();
    await expect(result(page, 'segmented')).toHaveText('View: month');
    await section(page, 'segmented').getByRole('button', { name: 'Day' }).tap();
    await expect(result(page, 'segmented')).toHaveText('View: day');
  });

  test('checkbox and switch toggle by a tap on their label', async ({ page }) => {
    const checkboxLabel = section(page, 'checkbox').getByText('Accept the terms', { exact: true });
    await checkboxLabel.tap();
    await expect(result(page, 'checkbox')).toHaveText('Checkbox: true');
    await checkboxLabel.tap();
    await expect(result(page, 'checkbox')).toHaveText('Checkbox: false');

    const switchLabel = section(page, 'checkbox').getByText('Notifications', { exact: true });
    await switchLabel.tap();
    await expect(result(page, 'switch')).toHaveText('Switch: true');
    await switchLabel.tap();
    await expect(result(page, 'switch')).toHaveText('Switch: false');
  });

  test('text input: a tap on the clear button clears it', async ({ page }) => {
    await expect(result(page, 'text-input')).toHaveText('Text: "Hello"');
    await section(page, 'text-input').locator('.coar-text-input-clear').tap();
    await expect(result(page, 'text-input')).toHaveText('Text: ""');
    await expect(section(page, 'text-input').getByRole('textbox')).toHaveValue('');
  });

  test('tag: a tap on the close button closes the tag', async ({ page }) => {
    await section(page, 'tag').getByRole('button', { name: 'Remove tag' }).tap();
    await expect(result(page, 'tag')).toHaveText('Tag: closed');
    await expect(section(page, 'tag').getByText('Draft', { exact: true })).toBeHidden();
  });

  test('number input: taps on the steppers change the value', async ({ page }) => {
    const input = section(page, 'number-input');
    await input.locator('.coar-number-input-button--increment').tap();
    await expect(result(page, 'number-input')).toHaveText('Number: 2');
    await input.locator('.coar-number-input-button--increment').tap();
    await expect(result(page, 'number-input')).toHaveText('Number: 3');
    await input.locator('.coar-number-input-button--decrement').tap();
    await expect(result(page, 'number-input')).toHaveText('Number: 2');
  });
});
