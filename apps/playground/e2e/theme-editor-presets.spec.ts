import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';

const editorUrl = `/@fs${resolve(import.meta.dirname, '../../../packages/ui/src/components/theme-editor/theme-editor-state.ts')}`;

for (const [preset, padding] of [['playful', '20px'], ['compact', '10px']]) {
  test(`${preset} field-padding override returns to normal when disabled @touch`, async ({ page }) => {
    await page.goto('/design-review?frame=1&kind=fields&profile=legacy&mode=light&mobile=false');
    const field = page.locator('.core-samples .coar-input-frame--m:not(.coar-input-frame--has-leading) > .coar-input-frame__field').first();
    await expect(field).toBeVisible();
    await page.evaluate(async ({ editorUrl, preset }) => {
      const state = await import(/* @vite-ignore */ editorUrl);
      state.applyPreset(state.PRESETS.find((entry: { id: string }) => entry.id === preset));
    }, { editorUrl, preset });
    await expect(field).toHaveCSS('padding-left', padding);
    await page.evaluate(async editorUrl => {
      const state = await import(/* @vite-ignore */ editorUrl);
      state.fieldPaddingXEnabled.value = false;
    }, editorUrl);
    await expect(field).toHaveCSS('padding-left', '12px');
    await page.evaluate(async editorUrl => {
      const state = await import(/* @vite-ignore */ editorUrl);
      const css = state.themeFileCss('padding');
      state.cleanupThemeEditorState();
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
      document.documentElement.classList.add('coar-theme--padding');
    }, editorUrl);
    await expect(field).toHaveCSS('padding-left', '12px');
  });
}

for (const preset of ['enterprise', 'saas', 'playful', 'minimal', 'compact']) {
  for (const scheme of ['light', 'dark']) {
    test(`${preset} live preview and standalone export render the same ${scheme} fields @touch`, async ({ page }, testInfo) => {
      await page.goto(`/design-review?frame=1&kind=fields&profile=legacy&mode=${scheme}&mobile=false`);
      await expect(page.locator('.core-samples')).toBeVisible();
      const initiallyInert = await page.evaluate(async editorUrl => {
        const state = await import(/* @vite-ignore */ editorUrl);
        // The real page already mounts its editor. Do not create a second set
        // of module watches just to exercise the same instance from this test.
        return !document.getElementById('coar-theme-editor') && !state.hasEditorChanges.value;
      }, editorUrl);
      expect(initiallyInert).toBe(true);
      await page.evaluate(async ({ editorUrl, preset }) => {
        const state = await import(/* @vite-ignore */ editorUrl);
        state.applyPreset(state.PRESETS.find((entry: { id: string }) => entry.id === preset));
      }, { editorUrl, preset });
      const radii: Record<string, string> = {
        enterprise: '2px', saas: '4px', playful: '999px', minimal: '0px', compact: '6px',
      };
      await expect(page.locator('.coar-button').first()).toHaveCSS('border-radius', radii[preset]);
      await page.evaluate(() => document.fonts.ready);
      const rootState = () => page.locator('html').evaluate(element => {
        const css = getComputedStyle(element);
        return { classes: element.className, ui: css.getPropertyValue('--coar-ui-font-size'),
          field: css.getPropertyValue('--coar-field-font-size'), mobile: css.getPropertyValue('--coar-control-min-font-size') };
      });
      const previewRoot = await rootState();
      const paint = async () => {
        // Finish finite theme colour transitions before comparing their target
        // styles, just as the existing visual captures do.
        await page.screenshot({ animations: 'disabled', caret: 'hide' });
        return page.locator('.core-samples, .core-samples *').evaluateAll(elements =>
        elements.map(element => {
          const css = getComputedStyle(element);
          return Object.fromEntries([
            'font-family', 'font-size', 'font-weight', 'line-height', 'color',
            'background-color', 'border-radius', 'border-color', 'padding', 'width', 'height',
          ].map(name => [name, css.getPropertyValue(name)]));
        }));
      };
      const preview = await paint();
      const exportedCss = await page.evaluate(async editorUrl => {
        const state = await import(/* @vite-ignore */ editorUrl);
        const css = state.themeFileCss('transfer');
        state.cleanupThemeEditorState();
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        document.documentElement.classList.add('coar-theme--transfer');
        return css;
      }, editorUrl);
      await page.evaluate(() => document.fonts.ready);
      const exported = await paint();
      const equal = JSON.stringify(exported) === JSON.stringify(preview);
      if (!equal) {
        await writeFile(testInfo.outputPath('export.css'), exportedCss);
        const differences = preview.flatMap((before, index) => Object.entries(before)
          .filter(([property, value]) => value !== exported[index]?.[property])
          .map(([property, value]) => ({ index, property, before: value, after: exported[index]?.[property] })));
        await writeFile(testInfo.outputPath('paint.json'), JSON.stringify({
          previewRoot, exportedRoot: await rootState(), differences,
        }, null, 2));
      }
      expect(equal, 'the exported complete preset must preserve the actual live presentation').toBe(true);
    });
  }
}
