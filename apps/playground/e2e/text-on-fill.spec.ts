import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { apcaContrast, APCA_TEXT_ON_THRESHOLD } from '../../../packages/ui/src/theme/color-contrast';

const stateUrl = `/@fs${resolve(import.meta.dirname, '../../../packages/ui/src/components/theme-editor/theme-editor-state.ts')}`;
const hues = ['#334155', '#15803d', '#be185d', '#facc15', '#1183cd'];
const roles = ['accent', 'success', 'error', 'warning', 'info'] as const;

for (const scheme of ['light', 'dark']) {
  // @touch runs the same CSS calculation in both WebKit device projects too.
  test(`filled roles choose the better APCA ink with every preset (${scheme}) @touch`, async ({ page }) => {
    await page.goto('/design-review?kind=fields');
    await expect(page.locator('[data-review-profile=legacy] input').first()).toBeVisible();
    await page.evaluate(({ scheme }) => {
      document.documentElement.classList.remove('light-mode', 'dark-mode');
      document.documentElement.classList.add(`${scheme}-mode`);
      document.documentElement.style.colorScheme = scheme;
    }, { scheme });

    for (const preset of [null, 'enterprise', 'saas', 'playful', 'minimal', 'compact']) {
      if (preset) {
        await page.evaluate(async ({ url, preset }) => {
          const state = await import(/* @vite-ignore */ url);
          if (preset === 'enterprise') state.initThemeEditorState(true, null, { fontPreview: false });
          state.applyPreset(state.PRESETS.find((p: { id: string }) => p.id === preset));
        }, { url: stateUrl, preset });
      }
      for (const hue of hues) {
        const results = await page.evaluate(({ hue, roles }) => {
          const root = document.documentElement;
          root.style.setProperty('--coar-accent', hue);
          root.style.setProperty('--coar-theme-accent', hue);
          root.style.setProperty('--coar-appearance-accent', hue);
          for (const role of roles.slice(1)) root.style.setProperty(`--coar-${role}`, hue);
          const probe = document.createElement('span');
          root.appendChild(probe);
          const context = document.createElement('canvas').getContext('2d')!;
          const read = (token: string) => {
            probe.style.color = `var(${token})`;
            context.clearRect(0, 0, 1, 1);
            context.fillStyle = getComputedStyle(probe).color;
            context.fillRect(0, 0, 1, 1);
            return Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3) as [number, number, number];
          };
          const values = roles.map((role) => ({
            role,
            fill: read(role === 'accent' ? '--coar-background-accent-primary' : `--coar-background-semantic-${role}-bold`),
            ink: read(`--coar-text-on-${role}`),
          }));
          probe.remove();
          return values;
        }, { hue, roles });
        for (const { role, fill, ink } of results) {
          const white = Math.abs(apcaContrast([255, 255, 255], fill));
          const black = Math.abs(apcaContrast([0, 0, 0], fill));
          expect(ink, `${preset ?? 'no theme'} ${scheme} ${hue} ${role}`).toEqual(
            white >= black ? [255, 255, 255] : [0, 0, 0],
          );
          // Both candidates meet here: this bound follows from the APCA crossing,
          // not a WCAG ratio or a text-size accessibility promise.
          expect(Math.abs(apcaContrast(ink, fill))).toBeGreaterThanOrEqual(54.5);
        }
      }
    }
  });
}

test('filled roles accept arbitrary scheme-specific ink and keep the legacy white token @touch', async ({ page }) => {
  await page.goto('/design-review?kind=fields');
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    root.style.setProperty('--coar-text-on-accent', 'light-dark(#123456, #abcdef)');
    const child = document.createElement('span');
    child.style.color = 'var(--coar-text-on-accent)';
    root.appendChild(child);
    root.style.colorScheme = 'light';
    const light = getComputedStyle(child).color;
    root.style.colorScheme = 'dark';
    const dark = getComputedStyle(child).color;
    child.style.color = 'var(--coar-text-on-bold)';
    const legacy = getComputedStyle(child).color;
    child.remove();
    return { light, dark, legacy };
  });
  expect(result).toEqual({ light: 'rgb(18, 52, 86)', dark: 'rgb(171, 205, 239)', legacy: 'rgb(255, 255, 255)' });
});

test('CSS threshold and APCA calculation use the same crossing', async ({ page }) => {
  await page.goto('/design-review?kind=fields');
  const value = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--coar-text-on-threshold'));
  expect(Number(value)).toBeCloseTo(APCA_TEXT_ON_THRESHOLD, 14);
});
