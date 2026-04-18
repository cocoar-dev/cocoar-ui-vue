import { expect, test } from '@playwright/test';

// Verifies the fix for IntelliSense / overflow widgets when the editor lives inside a
// Cocoar dialog. Without `overflowWidgetsDomNode` auto-detection, Monaco renders widgets
// in document.body — which on a modal page either clips them, places them in the wrong
// stacking context, or hides them behind the modal backdrop.

test.describe('Editor inside Cocoar dialog — overflow widgets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor-in-modal');
    await page.getByRole('button', { name: 'Open editor modal' }).click();
    // Wait for the dialog to mount AND for Monaco inside it to finish initialising.
    await page.locator('.coar-dialog .monaco-editor').waitFor();
    await page.waitForTimeout(500);
  });

  test('overlay host does not trap fixed-positioned widgets (no transform)', async ({ page }) => {
    // The root-cause fix: the Cocoar overlay system positions via `top`/`left` instead of
    // `transform: translate3d`. Without a transform on an ancestor, Monaco's overflow
    // widgets (`position: fixed`) resolve against the viewport correctly — no workaround
    // host needed, no dialog-transform trap.
    const overlayState = await page.evaluate(() => {
      const overlay = document.querySelector('.coar-overlay-host');
      if (!overlay) return null;
      const s = getComputedStyle(overlay);
      return {
        transform: s.transform,
        position: s.position,
        top: s.top,
        left: s.left,
      };
    });
    expect(overlayState, 'overlay host must be present').not.toBeNull();
    expect(overlayState!.transform, 'overlay must NOT use transform (creates containing block for fixed descendants)').toBe('none');
    expect(overlayState!.position).toBe('fixed');
  });

  test('IntelliSense popup is visible and positioned inside the modal viewport', async ({ page }) => {
    // Programmatically trigger suggestions via Monaco's command — more reliable than
    // simulating Ctrl+Space through the OS keyboard layer in headless.
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const monaco = (window as any).monaco;
      const editors = monaco.editor.getEditors();
      const ed = editors[editors.length - 1]; // most-recently-mounted = the modal one
      // Place cursor right after the dot in `ctx.` — line 5, after "  const x = ctx."
      const model = ed.getModel();
      const text = model.getValue();
      const dotIdx = text.indexOf('ctx.');
      if (dotIdx < 0) throw new Error('test fixture changed: `ctx.` not found');
      const pos = model.getPositionAt(dotIdx + 'ctx.'.length);
      ed.setPosition(pos);
      ed.focus();
      ed.trigger('test', 'editor.action.triggerSuggest', {});
    });

    // Wait for the suggestion widget to materialise.
    const suggestWidget = page.locator('.monaco-editor .suggest-widget.visible').first();
    await suggestWidget.waitFor({ timeout: 5000 });

    // Box of the suggest widget vs box of the modal.
    const widgetBox = await suggestWidget.boundingBox();
    const dialogBox = await page.locator('.coar-dialog').boundingBox();
    expect(widgetBox, 'suggest widget should have a bounding box').not.toBeNull();
    expect(dialogBox).not.toBeNull();
    if (!widgetBox || !dialogBox) return;

    // The widget should overlap the dialog area — not be way offscreen.
    const widgetCenterX = widgetBox.x + widgetBox.width / 2;
    const widgetCenterY = widgetBox.y + widgetBox.height / 2;
    expect(widgetCenterX).toBeGreaterThan(dialogBox.x - 50);
    expect(widgetCenterX).toBeLessThan(dialogBox.x + dialogBox.width + 50);
    expect(widgetCenterY).toBeGreaterThan(dialogBox.y - 50);
    expect(widgetCenterY).toBeLessThan(dialogBox.y + dialogBox.height + 50);
  });

  test('suggest widget is the topmost element at its centre (not behind the modal)', async ({ page }) => {
    // Trigger suggestions and verify the widget is hit-testable on top.
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const monaco = (window as any).monaco;
      const editors = monaco.editor.getEditors();
      const ed = editors[editors.length - 1];
      const model = ed.getModel();
      const dotIdx = model.getValue().indexOf('ctx.');
      ed.setPosition(model.getPositionAt(dotIdx + 'ctx.'.length));
      ed.focus();
      ed.trigger('test', 'editor.action.triggerSuggest', {});
    });

    const suggestWidget = page.locator('.monaco-editor .suggest-widget.visible').first();
    await suggestWidget.waitFor({ timeout: 5000 });
    const box = await suggestWidget.boundingBox();
    if (!box) throw new Error('no widget box');

    // Read what's at the widget's centre via elementsFromPoint. The first element should
    // be inside the suggest widget — if the modal is above, it would shadow it.
    const topMostIsSuggest = await page.evaluate(({ x, y }) => {
      const els = document.elementsFromPoint(x, y);
      return els.length > 0 && els[0].closest('.suggest-widget') !== null;
    }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
    expect(topMostIsSuggest, 'suggest widget must be the topmost element at its centre').toBe(true);
  });
});
