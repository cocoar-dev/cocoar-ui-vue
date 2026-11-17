import { expect, test } from '@playwright/test';

for (const profile of ['legacy', 'compact'] as const) {
  for (const width of [390, 1440]) {
    test(`${profile} form-field layout examples are independent at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(
        (value) => localStorage.setItem('coar-docs-presentation', value),
        profile,
      );
      await page.goto('/components/form-field');
      const examples = page.locator('.layout-demo');
      const fields = examples.locator('.coar-form-field');
      const after = fields.nth(0);
      const before = fields.nth(1);
      const afterInput = after.getByRole('checkbox', { name: 'User active', exact: true });
      const beforeInput = before.getByRole('checkbox', { name: 'User active', exact: true });

      await expect(afterInput).not.toBeChecked();
      await expect(beforeInput).not.toBeChecked();
      expect(await afterInput.getAttribute('id')).not.toBe(await beforeInput.getAttribute('id'));
      await after.locator('.coar-form-field__label').click();
      await expect(afterInput).toBeChecked();
      await expect(beforeInput).not.toBeChecked();
      await before.locator('.coar-checkbox-wrapper').click();
      await expect(beforeInput).toBeChecked();
      await expect(afterInput).toBeChecked();
      await after.locator('.coar-form-field__label').click();
      await expect(afterInput).not.toBeChecked();
      await expect(beforeInput).toBeChecked();

      const inlineName = fields.nth(2).getByRole('textbox');
      const stackedName = fields.nth(3).getByRole('textbox');
      await inlineName.fill('Ada');
      await expect(stackedName).toHaveValue('');
      await stackedName.fill('Grace');
      await expect(inlineName).toHaveValue('Ada');

      if (profile === 'compact') {
        for (const boundary of ['document', 'field']) {
          if (boundary === 'field') {
            await fields.evaluateAll((elements) => {
              for (const el of elements) el.classList.add('coar-compact');
              document.documentElement.classList.remove('coar-compact');
            });
          }
          for (const mobile of [false, true]) {
            await examples.evaluate((el, on) => el.classList.toggle('coar-mobile', on), mobile);
            for (const [field, position] of [
              [after, 'after'],
              [before, 'before'],
            ] as const) {
              const geometry = await field.evaluate((el, position) => {
                const label = el.querySelector('.coar-form-field__label')!.getBoundingClientRect();
                const cluster = el
                  .querySelector('.coar-form-field__label-cluster')!
                  .getBoundingClientRect();
                const box = el.querySelector('.coar-checkbox-box')!.getBoundingClientRect();
                const control = el
                  .querySelector('.coar-form-field__control')!
                  .getBoundingClientRect();
                const target = el.querySelector('.coar-checkbox-wrapper')!.getBoundingClientRect();
                return {
                  centerOffset: Math.abs(label.top + label.height / 2 - (box.top + box.height / 2)),
                  gap:
                    position === 'after'
                      ? cluster.left - control.right
                      : control.left - cluster.right,
                  targetHeight: target.height,
                  boxHeight: box.height,
                };
              }, position);
              expect(geometry.centerOffset, `${position}, mobile=${mobile}`).toBeLessThanOrEqual(1);
              expect(geometry.gap).toBe(8);
              expect(geometry.boxHeight).toBe(16);
              expect(geometry.targetHeight).toBeGreaterThanOrEqual(mobile ? 44 : 36);
            }
          }
        }
      }
    });
  }
}
