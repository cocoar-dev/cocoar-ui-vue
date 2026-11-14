import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * The mobile form, operated by tap only: `/mobile-form`. Runs in `chromium` (desktop Chrome
 * with touch), `webkit-tablet` and `webkit-phone`. The spec taps (`locator.tap()`), never
 * clicks or hovers. The geometry tests measure what a finger and iOS need under
 * `.coar-mobile`: tap targets of at least 44 px, editable text of at least 16 px (smaller
 * text makes iOS Safari zoom into the field).
 */

test.use({ hasTouch: true });

const MIN_TARGET = 44;
const MIN_FONT = 16;

const field = (page: Page, id: string): Locator => page.getByTestId(`field-${id}`);
const status = (page: Page): Locator => page.getByTestId('form-status');
const heading = (page: Page): Locator => page.getByRole('heading', { name: 'Mobile form' });

/** A tap on the page heading: outside every control and overlay of the form. */
const tapOutside = (page: Page) => heading(page).tap();

test.beforeEach(async ({ page }) => {
  await page.goto('/mobile-form');
  await expect(heading(page)).toBeVisible();
});

test.describe('mobile form', { tag: '@touch' }, () => {
  test('every field is operated by tap, and the form saves what was entered', async ({ page }) => {
    // Text: the clear button empties it, then a tap focuses it for typing.
    const name = field(page, 'name');
    await name.locator('.coar-text-input-clear').tap();
    await expect(name.getByRole('textbox')).toHaveValue('');
    await name.getByRole('textbox').tap();
    await page.keyboard.type('Team offsite');
    await expect(name.getByRole('textbox')).toHaveValue('Team offsite');

    // Number: the stepper.
    await field(page, 'seats').getByRole('button', { name: 'Increase value' }).tap();
    await expect(field(page, 'seats').locator('.coar-number-input-field')).toHaveValue('13');

    // Select: a tap opens the panel, a tap on an option selects it and closes.
    await field(page, 'country').getByRole('combobox').tap();
    const listbox = page.getByRole('listbox');
    await expect(listbox).toBeVisible();
    await listbox.getByRole('option', { name: 'Germany', exact: true }).tap();
    await expect(listbox).toBeHidden();
    await expect(field(page, 'country').getByRole('combobox')).toContainText('Germany');

    // Multi-select: a tap adds an option, a tap outside closes.
    await field(page, 'topics').getByRole('combobox').tap();
    await expect(listbox).toBeVisible();
    await listbox.getByRole('option', { name: 'Research', exact: true }).tap();
    await tapOutside(page);
    await expect(listbox).toBeHidden();

    // Plain date: a tap on a day commits it and closes the picker.
    await field(page, 'start-date').getByRole('button', { name: 'Open picker' }).tap();
    const startDay = page.locator('button[data-date="2026-03-20"]');
    await expect(startDay).toBeVisible();
    await startDay.tap();
    await expect(startDay).toBeHidden();

    // Zoned date-time: a tap on a day changes the date and keeps the time; the panel stays
    // open. Escape closes it: on a phone the 600 px panel can cover its own field and open
    // button, so a tap cannot be relied on to close it there (see the test below).
    await field(page, 'meeting').getByRole('button', { name: 'Open date and time picker' }).tap();
    const meetingDay = page.locator('button[data-date="2026-03-24"]');
    await expect(meetingDay).toBeVisible();
    await meetingDay.tap();
    await page.keyboard.press('Escape');
    await expect(meetingDay).toBeHidden();

    // Segmented control, switch and checkbox.
    await field(page, 'visibility').getByRole('button', { name: 'Public' }).tap();
    await expect(field(page, 'visibility').getByRole('button', { name: 'Public' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await field(page, 'notify').getByText('Notify participants', { exact: true }).tap();
    await field(page, 'terms').getByText('I accept the terms', { exact: true }).tap();

    await page.getByTestId('action-save').tap();
    await expect(status(page)).toHaveText(
      'Saved: name=Team offsite; seats=13; country=de; topics=design,research; ' +
        'start=2026-03-20; meeting=2026-03-24T10:00:00; visibility=public; notify=true; terms=true',
    );
  });

  test("the zoned date-time picker's panel closes by a tap on its button", async ({
    page,
  }, testInfo) => {
    // stage E of 2026-11-14-mobile-library-expansion: the picker as a sheet. In `webkit-phone`
    // the panel is 600 px high in a 664 px viewport: it fits on neither side of the field and
    // covers the field and its open button, so the second tap lands on the panel.
    test.fixme(testInfo.project.name === 'webkit-phone', 'the panel covers its open button');
    const openMeeting = field(page, 'meeting').getByRole('button', {
      name: 'Open date and time picker',
    });
    await openMeeting.tap();
    const meetingDay = page.locator('button[data-date="2026-03-24"]');
    await expect(meetingDay).toBeVisible();
    await meetingDay.tap();
    await openMeeting.tap();
    await expect(meetingDay).toBeHidden();
  });

  test('cancel restores the initial values', async ({ page }) => {
    await field(page, 'seats').getByRole('button', { name: 'Decrease value' }).tap();
    await field(page, 'terms').getByText('I accept the terms', { exact: true }).tap();
    await page.getByTestId('action-cancel').tap();
    await expect(status(page)).toHaveText('Cancelled');
    await page.getByTestId('action-save').tap();
    await expect(status(page)).toHaveText(
      'Saved: name=Workshop Vienna; seats=12; country=at; topics=design; ' +
        'start=2026-03-14; meeting=2026-03-20T10:00:00; visibility=team; notify=false; terms=false',
    );
  });

  test('delete asks for confirmation; Delete confirms, Keep does not', async ({ page }) => {
    const confirm = page.getByRole('dialog', { name: 'Delete the event?' });

    await page.getByTestId('action-delete').tap();
    await expect(confirm).toBeVisible();
    await expect(status(page)).toHaveText('Confirming delete');
    await confirm.getByRole('button', { name: 'Keep', exact: true }).tap();
    await expect(confirm).toBeHidden();
    await expect(status(page)).toHaveText('Kept');

    await page.getByTestId('action-delete').tap();
    await confirm.getByRole('button', { name: 'Delete', exact: true }).tap();
    await expect(confirm).toBeHidden();
    await expect(status(page)).toHaveText('Deleted');
  });
});

// ─── Geometry ──────────────────────────────────────────────────────────────────

/** What is too small about one element: its box against MIN_TARGET, its font against MIN_FONT. */
async function problems(
  what: string,
  locator: Locator,
  check: { target?: boolean; font?: boolean },
): Promise<string[]> {
  const found: string[] = [];
  const all = await locator.all();
  expect(all.length, `${what} exists`).toBeGreaterThan(0);
  for (const element of all) {
    await element.scrollIntoViewIfNeeded();
    const measured = await element.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height, font: parseFloat(getComputedStyle(el).fontSize) };
    });
    const w = Math.round(measured.w * 10) / 10;
    const h = Math.round(measured.h * 10) / 10;
    if (check.target && (w < MIN_TARGET || h < MIN_TARGET)) {
      found.push(`${what}: ${w}×${h} px`);
    }
    if (check.font && measured.font < MIN_FONT) found.push(`${what}: font ${measured.font} px`);
  }
  return found;
}

/** Opens a select's panel and measures its option rows, then closes it again. */
async function optionRows(page: Page, id: string): Promise<string[]> {
  await field(page, id).getByRole('combobox').tap();
  const options = page.getByRole('listbox').getByRole('option');
  await expect(options.first()).toBeVisible();
  const found = await problems('option row', options, { target: true });
  await tapOutside(page);
  await expect(page.getByRole('listbox')).toBeHidden();
  return found;
}

interface Measured {
  component: string;
  measure: (page: Page) => Promise<string[]>;
}

const measured: Measured[] = [
  {
    component: 'CoarTextInput',
    measure: async (page) => [
      ...(await problems('frame', field(page, 'name').locator('.coar-input-frame'), {
        target: true,
      })),
      ...(await problems('input', field(page, 'name').getByRole('textbox'), { font: true })),
      ...(await problems('clear', field(page, 'name').locator('.coar-text-input-clear'), {
        target: true,
      })),
    ],
  },
  {
    component: 'CoarNumberInput',
    measure: async (page) => [
      ...(await problems('frame', field(page, 'seats').locator('.coar-input-frame'), {
        target: true,
      })),
      ...(await problems('input', field(page, 'seats').locator('.coar-number-input-field'), {
        font: true,
      })),
      ...(await problems('stepper', field(page, 'seats').locator('.coar-number-input-button'), {
        target: true,
      })),
    ],
  },
  {
    component: 'CoarSelect',
    measure: async (page) => [
      ...(await problems('field', field(page, 'country').getByRole('combobox'), {
        target: true,
        font: true,
      })),
      ...(await optionRows(page, 'country')),
    ],
  },
  {
    component: 'CoarMultiSelect',
    measure: async (page) => [
      ...(await problems('field', field(page, 'topics').getByRole('combobox'), {
        target: true,
        font: true,
      })),
      ...(await optionRows(page, 'topics')),
    ],
  },
  {
    component: 'CoarPlainDatePicker',
    measure: async (page) => [
      ...(await problems('frame', field(page, 'start-date').locator('.coar-input-frame'), {
        target: true,
      })),
      ...(await problems('input', field(page, 'start-date').getByRole('textbox'), { font: true })),
      ...(await problems('open button', field(page, 'start-date').getByRole('button'), {
        target: true,
      })),
    ],
  },
  {
    component: 'CoarZonedDateTimePicker',
    measure: async (page) => [
      ...(await problems('frame', field(page, 'meeting').locator('.coar-input-frame'), {
        target: true,
      })),
      ...(await problems('input', field(page, 'meeting').getByRole('textbox'), { font: true })),
      ...(await problems(
        'open button',
        field(page, 'meeting').getByRole('button', { name: 'Open date and time picker' }),
        { target: true },
      )),
      ...(await problems(
        'time-zone indicator',
        field(page, 'meeting').locator('.coar-zdtp-tz-indicator'),
        { target: true },
      )),
    ],
  },
  {
    component: 'CoarSegmentedControl',
    measure: (page) =>
      problems('segment', field(page, 'visibility').getByRole('button'), { target: true }),
  },
  {
    component: 'CoarSwitch',
    measure: (page) =>
      problems('label', field(page, 'notify').locator('.coar-switch-wrapper'), { target: true }),
  },
  {
    component: 'CoarCheckbox',
    measure: (page) =>
      problems('label', field(page, 'terms').locator('.coar-checkbox-wrapper'), { target: true }),
  },
  {
    component: 'CoarButton',
    measure: (page) =>
      problems('button', page.getByTestId('form-actions').getByRole('button'), { target: true }),
  },
  {
    component: 'useDialog().confirm',
    measure: async (page) => {
      await page.getByTestId('action-delete').tap();
      const confirm = page.getByRole('dialog', { name: 'Delete the event?' });
      await expect(confirm).toBeVisible();
      return problems('button', confirm.getByRole('button'), { target: true });
    },
  },
];

test.describe(
  `mobile form geometry: targets ≥ ${MIN_TARGET} px, editable text ≥ ${MIN_FONT} px`,
  { tag: '@touch' },
  () => {
    for (const { component, measure } of measured) {
      test(component, async ({ page }) => {
        expect(await measure(page)).toEqual([]);
      });
    }
  },
);
