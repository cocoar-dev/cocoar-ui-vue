import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { apcaContrast, APCA_TEXT_ON_THRESHOLD } from '../../../packages/ui/src/theme/color-contrast';
import { COLOR_PALETTES } from '../../../packages/ui/src/theme/palette-inputs';

const stateUrl = `/@fs${resolve(import.meta.dirname, '../../../packages/ui/src/components/theme-editor/theme-editor-state.ts')}`;
const hues = ['#334155', '#15803d', '#be185d', '#facc15', '#1183cd'];
const roles = ['accent', 'success', 'error', 'warning', 'info'] as const;

test('Compact keeps the chosen accent fill in both schemes @touch', async ({ page }) => {
  await page.goto('/design-review?kind=fields');
  const fills = await page.evaluate((hues) => {
    const theme = document.createElement('div');
    theme.className = 'coar-compact';
    theme.innerHTML = '<span></span>';
    document.body.appendChild(theme);
    const probe = theme.firstElementChild as HTMLElement;
    probe.style.color = 'var(--coar-background-accent-primary)';
    const context = document.createElement('canvas').getContext('2d')!;
    const read = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3);
    };
    const results = hues.flatMap((hue, index) => {
      const darkHue = hues[(index + 1) % hues.length]!;
      theme.style.setProperty('--coar-appearance-accent', `light-dark(${hue}, ${darkHue})`);
      return (['light', 'dark'] as const).map((scheme) => {
        theme.style.colorScheme = scheme;
        return {
          hue, scheme,
          expected: read(scheme === 'light' ? hue : darkHue),
          actual: read(getComputedStyle(probe).color),
        };
      });
    });
    theme.remove();
    return results;
  }, hues);
  for (const { hue, scheme, expected, actual } of fills) {
    expect(actual, `${hue} ${scheme}`).toEqual(expected);
  }
});

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

test('theme status inputs survive nested scheme boundaries while legacy defaults still reset @touch', async ({ page }) => {
  await page.goto('/design-review?kind=fields');
  const values = await page.evaluate(() => {
    const theme = document.createElement('div');
    theme.className = 'coar-theme--scheme-test';
    theme.style.setProperty('--coar-role-derivation', ' ');
    theme.style.setProperty('--coar-success', '#1183cd');
    theme.style.setProperty('--coar-theme-success', 'light-dark(#1183cd, #facc15)');
    theme.style.setProperty('--coar-color-green-500-lc', 'l c');
    theme.style.setProperty('--coar-color-green-500-lc-dark', 'l c');
    theme.innerHTML = '<div class="light-mode" style="color-scheme:light"><i></i></div><div class="dark-mode" style="color-scheme:dark"><i></i></div>';
    document.body.appendChild(theme);
    const read = (scheme: string, token: string) => {
      const probe = theme.querySelector(`.${scheme}-mode i`) as HTMLElement;
      probe.style.color = `var(${token})`;
      const context = document.createElement('canvas').getContext('2d')!;
      context.fillStyle = getComputedStyle(probe).color;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3);
    };
    const result = {
      legacyLight: read('light', '--coar-success'),
      light: read('light', '--coar-color-green-500'),
      dark: read('dark', '--coar-color-green-500'),
    };
    theme.remove();
    return result;
  });
  // The existing primitive declaration resets the old base name at .light-mode.
  expect(values.legacyLight).toEqual([30, 143, 72]);
  expect(values.light).toEqual([17, 131, 205]);
  expect(values.dark).toEqual([250, 204, 21]);
});

test('all base palettes keep independent light and dark curves in nested scopes @touch', async ({ page }) => {
  await page.goto('/design-review?kind=fields');
  const measured = await page.evaluate((palettes) => {
    const theme = document.createElement('div');
    theme.className = 'coar-compact';
    for (const [role, palette] of Object.entries(palettes)) {
      theme.style.setProperty(`--coar-theme-${role}`, 'light-dark(#1183cd, #facc15)');
      theme.style.setProperty(`--coar-color-${palette}-600-lc`, '0.4 0.04');
      theme.style.setProperty(`--coar-color-${palette}-600-lc-dark`, '0.8 0.03');
    }
    theme.innerHTML = '<div class="light-mode" style="color-scheme:light"><i></i><div class="dark-mode" style="color-scheme:dark"><i></i></div></div>';
    document.body.appendChild(theme);
    const read = (scheme: string, token: string) => {
      const probe = theme.querySelector(`.${scheme}-mode > i`) as HTMLElement;
      probe.style.color = `var(${token})`;
      return getComputedStyle(probe).color;
    };
    const result = Object.values(palettes).map((palette) => ({
      palette,
      light: read('light', `--coar-color-${palette}-600`),
      dark: read('dark', `--coar-color-${palette}-600`),
    }));
    theme.remove();
    return result;
  }, COLOR_PALETTES);
  for (const { light, dark } of measured) {
    expect(light).toMatch(/^oklch\(0\.4 0\.04 245\./);
    expect(dark).toMatch(/^oklch\(0\.8 0\.03 91\./);
  }
});

test('teleported overlays carry scheme-specific bases and palette inputs @touch', async ({ page }) => {
  await page.goto('/visual.html#/visual/compact-edge-dialogs?mode=default&scheme=dark');
  await expect(page.locator('[data-visual-root]')).toHaveAttribute('data-visual-state', 'ready');
  await page.locator('[data-visual-root] .coar-compact').first().evaluate((scope: HTMLElement) => {
    scope.style.setProperty('--coar-theme-success', 'light-dark(#1183cd, #facc15)');
    scope.style.setProperty('--coar-color-green-500-lc', 'l c');
    scope.style.setProperty('--coar-color-green-500-lc-dark', 'l c');
  });
  await page.locator('[data-size=m]').click();
  const dialog = page.locator('.coar-dialog--m');
  await expect(dialog).toBeVisible();
  const colors = await dialog.evaluate((element) => {
    const read = (parent: Element) => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--coar-color-green-500)';
      parent.appendChild(probe);
      const context = document.createElement('canvas').getContext('2d')!;
      context.fillStyle = getComputedStyle(probe).color;
      context.fillRect(0, 0, 1, 1);
      const rgb = Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3);
      probe.remove();
      return rgb;
    };
    const dark = read(element);
    const lightScope = document.createElement('div');
    lightScope.className = 'light-mode';
    lightScope.style.colorScheme = 'light';
    element.appendChild(lightScope);
    const light = read(lightScope);
    lightScope.remove();
    return { light, dark };
  });
  expect(colors).toEqual({ light: [17, 131, 205], dark: [250, 204, 21] });
});

test('the editor reads the Compact base, not a derived palette expression @touch', async ({ page }) => {
  await page.goto('/visual.html#/visual/compact-interaction-theme-editor-open?mode=default&scheme=light');
  await expect(page.locator('[data-visual-root]')).toHaveAttribute('data-visual-state', 'ready');
  await page.getByTitle('Open theme editor', { exact: true }).click();
  const row = page.locator('.te-color-row').filter({ has: page.locator('.te-color-name', { hasText: /^Accent$/ }) });
  await expect(row.locator('input[type=color]')).toHaveValue('#334155');
  await expect(row.locator('.te-color-hex')).toHaveText('#334155');
});

for (const [scheme, expected] of [['light', '#1183cd'], ['dark', '#facc15']] as const) {
  test(`the editor resolves paired bases for native colour inputs (${scheme}) @touch`, async ({ page }) => {
    await page.goto(`/visual.html#/visual/compact-interaction-theme-editor-open?mode=default&scheme=${scheme}`);
    await expect(page.locator('[data-visual-root]')).toHaveAttribute('data-visual-state', 'ready');
    await page.locator('[data-visual-root] .coar-compact').first().evaluate(async (scope: HTMLElement, url) => {
      for (const role of ['accent', 'success', 'error', 'warning', 'info']) {
        scope.style.setProperty(`--coar-theme-${role}`, 'light-dark(#1183cd, #facc15)');
      }
      // The editor initially reads on mount, before this test sets the app theme.
      // Reinitialize against that theme to exercise the normal mount-time read.
      const state = await import(/* @vite-ignore */ url);
      state.cleanupThemeEditorState();
      state.initThemeEditorState(false, scope, { fontPreview: false });
    }, stateUrl);
    await page.getByTitle('Open theme editor', { exact: true }).click();
    // The five base colours, as the scheme shown has them.
    const bases = page.locator('[data-te-base] .te-color-row .te-color-swatch');
    await expect(bases).toHaveCount(5);
    for (const input of await bases.all()) {
      await expect(input).toHaveValue(expected);
    }
  });
}
