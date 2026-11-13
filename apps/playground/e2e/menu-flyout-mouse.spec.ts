import { expect, test } from '@playwright/test';

/**
 * CoarSubFlyout with a mouse, on the menu of `/touch-lab`: hover opens the submenu, a click
 * on the open parent closes it, a click on the closed parent opens it. The counterpart of
 * the tap tests in `touch-lab.spec.ts`; runs in the desktop `chromium` project only.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/touch-lab');
  await expect(page.getByRole('heading', { name: 'Touch lab' })).toBeVisible();
});

test('flyout submenu: hover opens, a click on the open parent closes, a click on the closed parent opens', async ({
  page,
}) => {
  await page.getByTestId('menu').getByRole('button', { name: 'Actions' }).click();
  const parent = page.getByRole('menuitem', { name: 'Move to' });
  const submenu = page.locator('.coar-submenu-panel');
  await expect(parent).toBeVisible();

  await parent.hover();
  await expect(parent).toHaveAttribute('aria-expanded', 'true');
  await expect(submenu).toBeVisible();

  await parent.click();
  await expect(parent).toHaveAttribute('aria-expanded', 'false');
  await expect(submenu).toBeHidden();

  await parent.click();
  await expect(parent).toHaveAttribute('aria-expanded', 'true');
  await expect(submenu).toBeVisible();
});

test('flyout submenu: a left click chorded with a held middle button closes the open submenu', async ({
  page,
}) => {
  await page.getByTestId('menu').getByRole('button', { name: 'Actions' }).click();
  const parent = page.getByRole('menuitem', { name: 'Move to' });
  const submenu = page.locator('.coar-submenu-panel');
  await parent.hover();
  await parent.click();
  await expect(parent).toHaveAttribute('aria-expanded', 'false');

  const box = (await parent.boundingBox())!;
  const inside = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  // Middle button held: the one `pointerdown` of the whole chord.
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(inside.x, box.y + box.height + 60);
  await page.mouse.move(inside.x, inside.y);
  await expect(parent).toHaveAttribute('aria-expanded', 'true');
  await expect(submenu).toBeVisible();
  // Left click while the middle button is still held: mousedown/mouseup/click, no new
  // pointerdown. The click toggles by the current state and closes.
  await page.mouse.down({ button: 'left' });
  await page.mouse.up({ button: 'left' });
  await expect(parent).toHaveAttribute('aria-expanded', 'false');
  await expect(submenu).toBeHidden();
  await page.mouse.up({ button: 'middle' });
});

test.describe('hybrid device (mouse and touch)', () => {
  test.use({ hasTouch: true });

  test('flyout submenu: after taps on A and B, a mouse move within A opens A again', async ({
    page,
  }) => {
    await page.getByTestId('menu').getByRole('button', { name: 'Actions' }).click();
    const a = page.getByRole('menuitem', { name: 'Move to' });
    const b = page.getByRole('menuitem', { name: 'Share' });
    const boxA = (await a.boundingBox())!;
    const boxB = (await b.boundingBox())!;
    const centerA = { x: boxA.x + boxA.width / 2, y: boxA.y + boxA.height / 2 };

    // The mouse hovers A open and rests there.
    await page.mouse.move(centerA.x, centerA.y);
    await expect(a).toHaveAttribute('aria-expanded', 'true');
    // A finger taps A closed (no compatibility `mouseenter`: the mouse is already over A),
    // then taps B. The tap opens B, but right after its `click` Chromium moves the
    // compatibility mouse back to the resting cursor (`mouseleave(B)`, `mouseenter(A)`
    // without a new `pointerenter(mouse)`), which opens A and closes B. `HEAD` ends the
    // same way, so B's short open state is not asserted (it races).
    await page.touchscreen.tap(centerA.x, centerA.y);
    await expect(a).toHaveAttribute('aria-expanded', 'false');
    await page.touchscreen.tap(boxB.x + boxB.width / 2, boxB.y + boxB.height / 2);
    // The resting mouse moves slightly within A. A genuine mouse entry must open A: the
    // touch mark of the tap that closed A must not swallow it.
    await page.mouse.move(centerA.x - 3, centerA.y + 1);
    await expect(a).toHaveAttribute('aria-expanded', 'true');
    await expect(b).toHaveAttribute('aria-expanded', 'false');
  });
});
