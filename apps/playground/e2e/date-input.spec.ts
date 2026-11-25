import { expect, test, type Page } from '@playwright/test';

// What the date pickers commit for typed, pasted and filled text (#109, #110, #111).
// Every case asserts the model, not only the text in the field.

test.use({ timezoneId: 'Europe/Berlin', permissions: ['clipboard-read', 'clipboard-write'] });

type Entry = 'type' | 'paste' | 'fill';

async function enter(page: Page, picker: string, text: string, how: Entry) {
  const input = page.getByTestId(picker).locator('input');
  await input.click();
  if (how === 'type') await page.keyboard.type(text);
  else if (how === 'fill') await input.fill(text);
  else {
    await page.evaluate((t) => navigator.clipboard.writeText(t), text);
    await page.keyboard.press('ControlOrMeta+V');
  }
  await page.keyboard.press('Tab');
  return input;
}

const value = (page: Page, picker: string) => page.getByTestId(picker).getByTestId('value');
const refused = (page: Page, picker: string) => page.getByTestId(picker).getByTestId('refused');

for (const how of ['type', 'paste', 'fill'] as const) {
  test.describe(`${how}d`, () => {
    for (const [locale, text] of [
      ['de-DE', '30.02.2026'],
      ['en-US', '02/30/2026'],
      ['de-DE', '29.02.2026'],
      ['en-US', '02/29/2026'],
    ] as const) {
      test(`${locale} refuses ${text} without changing the model`, async ({ page }) => {
        await page.goto(`/date-input?locale=${locale}`);
        const input = await enter(page, 'date', text, how);
        await expect(input).toHaveValue(text);
        await expect(input).toHaveAttribute('aria-invalid', 'true');
        await expect(value(page, 'date')).toHaveText('none');
        await expect(refused(page, 'date')).toHaveText('true');
        await input.focus();
        await page.keyboard.press('Escape');
        await expect(input).toHaveValue('');
        await expect(refused(page, 'date')).toHaveText('false');
      });
    }

    for (const [locale, text] of [['de-DE', '29.02.2028'], ['en-US', '02/29/2028']] as const) {
      test(`${locale} commits the leap day ${text}`, async ({ page }) => {
        await page.goto(`/date-input?locale=${locale}`);
        await enter(page, 'date', text, how);
        await expect(value(page, 'date')).toHaveText('2028-02-29');
        await expect(refused(page, 'date')).toHaveText('false');
      });
    }

    for (const [text, expected] of [
      ['07/01/2026 03:46 PM', '2026-07-01T15:46:00+02:00[Europe/Berlin]'],
      ['07/01/2026 12:00 AM', '2026-07-01T00:00:00+02:00[Europe/Berlin]'],
      ['07/01/2026 12:00 PM', '2026-07-01T12:00:00+02:00[Europe/Berlin]'],
    ] as const) {
      test(`en-US zoned ${text} gives ${expected}`, async ({ page }) => {
        await page.goto('/date-input?locale=en-US');
        await enter(page, 'zoned', text, how);
        await expect(value(page, 'zoned')).toHaveText(expected);
      });
    }

    test('en-US plain date-time keeps PM', async ({ page }) => {
      await page.goto('/date-input?locale=en-US');
      await enter(page, 'date-time', '07/01/2026 03:46 PM', how);
      await expect(value(page, 'date-time')).toHaveText('2026-07-01T15:46:00');
    });

    test('de-DE zoned with milliseconds keeps 15:46:56.123 (#111)', async ({ page }) => {
      await page.goto('/date-input?locale=de-DE');
      await enter(page, 'precise', '01.07.2026 15:46:56.123', how);
      await expect(value(page, 'precise')).toHaveText('2026-07-01T15:46:56.123+02:00[Europe/Berlin]');
    });

    test('de-DE zoned with minutes refuses 15:46:56.123 instead of cutting it (#111)', async ({ page }) => {
      test.skip(how === 'type', 'the mask of a minute field takes no seconds keystrokes');
      await page.goto('/date-input?locale=de-DE');
      const input = await enter(page, 'zoned', '01.07.2026 15:46:56.123', how);
      await expect(input).toHaveValue('01.07.2026 15:46:56.123');
      await expect(value(page, 'zoned')).toHaveText('none');
      await expect(refused(page, 'zoned')).toHaveText('true');
    });

    for (const [locale, text] of [
      ['de-DE', '2026-07-01T15:46:56.1234567+05:45'],
      ['en-US', '2026-07-01T15:46:56.1234567+05:45'],
      ['de-DE', '01.07.2026 15:46:56.1234567'],
      ['en-US', '07/01/2026 03:46:56.1234567 PM'],
    ] as const) {
      test(`${locale} refuses ${text} instead of committing part of it (#115)`, async ({ page }) => {
        test.skip(how === 'type', 'keystrokes go through the mask one by one');
        await page.goto(`/date-input?locale=${locale}`);
        const input = await enter(page, 'precise', text, how);
        await expect(input).toHaveValue(text);
        // The zoned picker marks its combobox frame, not the inner input.
        await expect(page.getByTestId('precise').getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
        await expect(value(page, 'precise')).toHaveText('none');
        await expect(refused(page, 'precise')).toHaveText('true');
      });
    }

    test('de-DE zoned refuses 30.02.2026 10:30', async ({ page }) => {
      await page.goto('/date-input?locale=de-DE');
      const input = await enter(page, 'zoned', '30.02.2026 10:30', how);
      await expect(input).toHaveValue('30.02.2026 10:30');
      await expect(value(page, 'zoned')).toHaveText('none');
      await expect(refused(page, 'zoned')).toHaveText('true');
    });
  });
}
