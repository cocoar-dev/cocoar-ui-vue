import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const editorUrl = `/@fs${resolve(import.meta.dirname, '../../../packages/ui/src/components/theme-editor/theme-editor-state.ts')}`;

for (const preset of ['Enterprise', 'Modern SaaS', 'Playful', 'Minimal', 'Compact']) {
  test(`${preset}: the panel unlocks dark base, text and palette step without touching light @touch`, async ({ page }) => {
    await page.goto('/visual.html#/visual/compact-interaction-theme-editor-open?mode=default&scheme=light');
    await expect(page.locator('[data-visual-state]')).toHaveAttribute('data-visual-state', 'ready');
    await page.getByTitle('Open theme editor', { exact: true }).click();
    const panel = page.locator('.te-panel');
    await panel.locator('.te-preset-card', { hasText: preset }).click();
    const paint = () => page.locator('[data-visual-root] > .coar-compact').evaluate(root => {
      const probe = document.createElement('span');
      probe.style.cssText = 'background:var(--coar-background-accent-primary);color:var(--coar-text-on-accent);border:1px solid var(--coar-color-accent-600)';
      root.appendChild(probe);
      const css = getComputedStyle(probe);
      const result = { fill: css.backgroundColor, ink: css.color, curve: css.borderTopColor };
      probe.remove();
      return result;
    });
    const scheme = panel.locator('[data-te-scheme]');
    const accent = panel.locator('[data-te-base="accent"]');
    const light = await paint();
    await expect(accent.locator('.te-ink-sample')).toHaveText('Aa');
    await expect(accent.locator('.te-ink-lc')).toHaveText(/^Lc \d+$/);
    // Light has no lock on its base: the control is the light color itself.
    await expect(accent.getByRole('button', { name: /dark Accent/ })).toHaveCount(0);

    await scheme.getByRole('button', { name: 'Dark', exact: true }).click();
    const dark = await paint();
    await expect(accent.getByLabel('Accent, dark')).toBeDisabled();
    await accent.getByRole('button', { name: 'Unlock dark Accent' }).click();
    await accent.getByLabel('Accent, dark').fill('#facc15');
    await expect.poll(async () => (await paint()).fill).not.toBe(dark.fill);

    await accent.getByRole('button', { name: 'Unlock text on Accent' }).click();
    await accent.getByLabel('Text on Accent, dark').fill('#123456');
    await expect.poll(async () => (await paint()).ink).toBe('rgb(18, 52, 86)');

    await accent.locator('.te-palette-btn').click();
    const palette = page.getByRole('dialog', { name: 'Accent palette editor' });
    await expect(palette.locator('.cpe-subtitle')).toContainText('Dark');
    const row = palette.locator('.cpe-row').filter({ has: page.locator('.cpe-row-step', { hasText: /^600$/ }) });
    await expect(row.locator('.cpe-val').first()).toHaveText('0.680');
    await row.locator('input[type=range]').first().fill('0.8');
    await palette.getByRole('button', { name: 'Close', exact: true }).click();
    const authoredDark = await paint();
    expect(authoredDark.curve).not.toBe(dark.curve);

    await scheme.getByRole('button', { name: 'Light', exact: true }).click();
    expect(await paint()).toEqual(light);
    await expect(accent.getByRole('button', { name: 'Unlock text on Accent' })).toBeVisible();

    const css = await page.evaluate(async editorUrl => {
      const state = await import(/* @vite-ignore */ editorUrl);
      return state.themeFileCss('channels') as string;
    }, editorUrl);
    expect(css).toMatch(/--coar-theme-accent: light-dark\(#[\da-f]{6}, #facc15\);/i);
    expect(css).toContain('--coar-text-on-accent: light-dark(var(--coar-d-text-on-accent), #123456);');
    expect(css).toContain('--coar-color-accent-600-lc-dark: 0.8 ');
  });
}

test('the panel warns about text that is hard to read on its fill, without refusing it @touch', async ({ page }) => {
  await page.goto('/visual.html#/visual/compact-interaction-theme-editor-open?mode=default&scheme=light');
  await expect(page.locator('[data-visual-state]')).toHaveAttribute('data-visual-state', 'ready');
  await page.getByTitle('Open theme editor', { exact: true }).click();
  const accent = page.locator('.te-panel [data-te-base="accent"]');
  await expect(accent.locator('.te-ink-warning')).toHaveCount(0);
  await accent.getByRole('button', { name: 'Unlock text on Accent' }).click();
  const fill = await accent.locator('.te-ink-sample').evaluate(el => getComputedStyle(el).backgroundColor);
  const hex = `#${fill.match(/\d+/g)!.slice(0, 3).map(v => Number(v).toString(16).padStart(2, '0')).join('')}`;
  await accent.getByLabel('Text on Accent, light').fill(hex);
  await expect(accent.locator('.te-ink-warning')).toContainText('hard to read');
  await expect(accent.locator('.te-ink-lc')).toHaveClass(/te-ink-lc--low/);
  await expect(accent.locator('.te-ink-sample')).toHaveCSS('color', fill);
  await accent.getByRole('button', { name: 'Lock text on Accent' }).click();
  await expect(accent.locator('.te-ink-warning')).toHaveCount(0);
});

for (const scheme of ['light', 'dark']) {
  test(`existing panel edits palette and semantic colours in its ${scheme} preview @touch`, async ({ page }) => {
    // Use the existing interactive story: design-review thumbnails deliberately
    // hide their editor FAB. No fixture or visual story is changed here.
    await page.goto(`/visual.html#/visual/compact-interaction-theme-editor-open?mode=default&scheme=${scheme}`);
    await expect(page.locator('[data-visual-state]')).toHaveAttribute('data-visual-state', 'ready');
    await page.getByTitle('Open theme editor', { exact: true }).click();
    const panel = page.locator('.te-panel');
    await expect(panel).toBeVisible();
    await panel.locator('.te-preset-card', { hasText: 'Enterprise' }).click();
    const paint = () => page.locator('[data-visual-root] > .coar-compact').evaluate(root => {
      const probe = document.createElement('span');
      probe.style.cssText = 'color:var(--coar-color-accent-600);background:var(--coar-background-accent-primary)';
      root.appendChild(probe);
      const css = getComputedStyle(probe);
      const result = { curve: css.color, fill: css.backgroundColor };
      probe.remove();
      return result;
    });
    const before = await paint();
    await panel.locator('.te-palette-btn').first().click();
    const palette = page.getByRole('dialog', { name: 'Accent palette editor' });
    const row = palette.locator('.cpe-row').filter({ has: page.getByText('600', { exact: true }) });
    await row.locator('input[type=range]').first().fill('0.345');
    await expect(row.locator('.cpe-val').first()).toHaveText('0.345');
    expect((await paint()).curve).not.toBe(before.curve);
    await palette.getByRole('button', { name: 'Close', exact: true }).click();
    await panel.getByText('Semantic colors', { exact: true }).click();
    await panel.locator('.te-sem-row').first().getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Green', exact: true }).click();
    expect((await paint()).fill).not.toBe(before.fill);
    const authored = await page.evaluate(async ({ editorUrl, scheme }) => {
      const state = await import(/* @vite-ignore */ editorUrl);
      const other = scheme === 'dark' ? 'light' : 'dark';
      const token = '--coar-background-accent-primary';
      return {
        curve: state.paletteOverridesFor(scheme).accent[600]?.l,
        otherCurve: state.paletteOverridesFor(other).accent[600],
        semantic: state.semanticOverridesFor(scheme)[token]?.palette,
        otherSemantic: state.semanticOverridesFor(other)[token],
      };
    }, { editorUrl, scheme });
    expect(authored).toEqual({
      curve: .345, otherCurve: undefined, semantic: 'green', otherSemantic: undefined,
    });
  });
}

for (const preset of ['enterprise', 'saas', 'playful', 'minimal', 'compact']) {
  for (const scheme of ['light', 'dark']) {
    test(`${preset} authors independent ${scheme} base, ink and curve channels @touch`, async ({ page }) => {
      await page.goto(`/design-review?frame=1&kind=fields&profile=legacy&mode=${scheme}&mobile=false`);
      await expect(page.locator('.core-samples')).toBeVisible();
      await page.evaluate(async ({ editorUrl, preset }) => {
        const state = await import(/* @vite-ignore */ editorUrl);
        state.applyPreset(state.PRESETS.find((entry: { id: string }) => entry.id === preset));
      }, { editorUrl, preset });
      const paint = () => page.locator('.core-samples').evaluate(container => {
        const probe = document.createElement('span');
        probe.style.cssText = 'background:var(--coar-background-accent-primary);color:var(--coar-text-on-accent);border-color:var(--coar-color-accent-600)';
        container.appendChild(probe);
        const css = getComputedStyle(probe);
        const result = { fill: css.backgroundColor, ink: css.color, curve: css.borderTopColor };
        probe.remove();
        return result;
      });
      const before = await paint();
      await page.evaluate(async editorUrl => {
        const state = await import(/* @vite-ignore */ editorUrl);
        state.setSchemeColor('--coar-theme-accent', 'dark', '#facc15');
        state.setSchemeColor('--coar-text-on-accent', 'dark', '#123456');
      }, editorUrl);
      const darkBase = await paint();
      if (scheme === 'light') expect(darkBase).toEqual(before);
      else {
        expect(darkBase.fill).not.toBe(before.fill);
        expect(darkBase.ink).toBe('rgb(18, 52, 86)');
      }
      await page.evaluate(async editorUrl => {
        const state = await import(/* @vite-ignore */ editorUrl);
        state.paletteOverridesFor('dark').accent[600] = { l: .8, c: .05 };
      }, editorUrl);
      const darkCurve = await paint();
      if (scheme === 'light') expect(darkCurve).toEqual(darkBase);
      else expect(darkCurve.curve).not.toBe(darkBase.curve);
      await page.evaluate(async editorUrl => {
        const state = await import(/* @vite-ignore */ editorUrl);
        state.setSchemeColor('--coar-text-on-accent', 'light', '#654321');
        state.paletteOverridesFor('light').accent[600] = { l: .3, c: .1 };
      }, editorUrl);
      const authored = await paint();
      if (scheme === 'dark') expect(authored).toEqual(darkCurve);
      else {
        expect(authored.ink).toBe('rgb(101, 67, 33)');
        expect(authored.curve).not.toBe(darkCurve.curve);
      }
      await page.evaluate(async editorUrl => {
        const state = await import(/* @vite-ignore */ editorUrl);
        const css = state.themeFileCss('channels');
        state.cleanupThemeEditorState();
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        document.documentElement.classList.add('coar-theme--channels');
      }, editorUrl);
      expect(await paint()).toEqual(authored);
    });
  }
}
