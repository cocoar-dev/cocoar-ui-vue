import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import {
  PRESETS, SEMANTIC_GROUPS, accent, applyPreset, cleanupThemeEditorState,
  hasEditorChanges, initThemeEditorState, paletteOverridesFor, reset, roleTheme,
  schemeColorOverride, schemeColorOverrides, semanticOverridesFor,
  setSchemeColor, setSemantic, themeFileCss,
} from './theme-editor-state';

beforeEach(() => {
  cleanupThemeEditorState();
  initThemeEditorState(true);
});

afterEach(() => {
  cleanupThemeEditorState();
  document.documentElement.className = '';
});

describe('authored colour channels', () => {
  it('retains a model’s authored dark base when only light is changed', () => {
    roleTheme.value = {
      ...roleTheme.value,
      tokens: { ...roleTheme.value.tokens, '--coar-theme-accent': 'light-dark(#1183cd, #334155)' },
    };
    setSchemeColor('--coar-theme-accent', 'light', '#ff00aa');
    expect(themeFileCss('example')).toContain('--coar-theme-accent: light-dark(#ff00aa, #334155);');
    setSchemeColor('--coar-theme-accent', 'dark', '#facc15');
    expect(themeFileCss('example')).toContain('--coar-theme-accent: light-dark(#ff00aa, #facc15);');
    setSchemeColor('--coar-theme-accent', 'dark');
    expect(themeFileCss('example')).toContain('--coar-theme-accent: light-dark(#ff00aa, #334155);');
  });

  it.each(['accent', 'error', 'success', 'warning', 'info'])('%s has independent base channels', key => {
    const token = `--coar-theme-${key}`;
    setSchemeColor(token, 'light', '#ff00aa');
    setSchemeColor(token, 'dark', '#facc15');
    expect(themeFileCss('example')).toContain(`${token}: light-dark(#ff00aa, #facc15);`);
  });

  it.each(PRESETS)('$label keeps an unlocked dark base independent of later light edits', async preset => {
    applyPreset(preset);
    setSchemeColor('--coar-theme-accent', 'dark', '#facc15');
    expect(schemeColorOverride('--coar-theme-accent', 'dark')).toBe('#facc15');
    setSchemeColor('--coar-theme-accent', 'light', '#ff00aa');
    await nextTick();
    expect(accent.value).toBe('#ff00aa');
    expect(themeFileCss('example')).toContain('--coar-theme-accent: light-dark(#ff00aa, #facc15);');
    expect(document.getElementById('coar-theme-editor')!.textContent)
      .toContain('--coar-theme-accent: light-dark(#ff00aa, #facc15);');
    setSchemeColor('--coar-theme-accent', 'dark');
    expect(schemeColorOverride('--coar-theme-accent', 'dark')).toBeUndefined();
    expect(themeFileCss('example')).toContain('--coar-theme-accent: #ff00aa;');
    expect(themeFileCss('example')).not.toContain('light-dark(#ff00aa, #facc15)');
  });

  it.each(PRESETS)('$label only writes unlocked ink, retaining the other channel’s calculation', preset => {
    applyPreset(preset);
    const token = '--coar-text-on-accent';
    expect(schemeColorOverride(token, 'light')).toBeUndefined();
    expect(schemeColorOverride(token, 'dark')).toBeUndefined();
    setSchemeColor(token, 'dark', '#ffffff');
    expect(themeFileCss('example'))
      .toContain(`${token}: light-dark(var(--coar-d-text-on-accent), #ffffff);`);
    setSchemeColor(token, 'light', '#000000');
    expect(themeFileCss('example')).toContain(`${token}: light-dark(#000000, #ffffff);`);
    setSchemeColor(token, 'dark');
    expect(themeFileCss('example'))
      .toContain(`${token}: light-dark(#000000, var(--coar-d-text-on-accent));`);
    setSchemeColor(token, 'light');
    expect(schemeColorOverrides[token]).toBeUndefined();
    expect(themeFileCss('example')).not.toContain(`${token}: light-dark(#000000,`);
  });

  it.each(PRESETS)('$label writes palette curves to the selected scheme, including step 500', preset => {
    applyPreset(preset);
    paletteOverridesFor('light').accent[600] = { l: .53, c: .15 };
    paletteOverridesFor('dark').accent[600] = { l: .72, c: .12 };
    paletteOverridesFor('dark').accent[500] = { l: .7, c: .1 };
    const css = themeFileCss('example');
    expect(css).toContain('--coar-color-accent-600-lc: 0.53 0.15;');
    expect(css).toContain('--coar-color-accent-600-lc-dark: 0.72 0.12;');
    expect(css).toContain('--coar-color-accent-500-lc-dark: 0.7 0.1;');
    expect(css).not.toContain('--coar-color-accent-600: oklch(');
  });

  it('keeps semantic assignments independent in both schemes', () => {
    const entry = SEMANTIC_GROUPS[0].entries[0];
    setSemantic(entry, 'palette', 'green', 'light');
    setSemantic(entry, 'palette', 'amber', 'dark');
    expect(semanticOverridesFor('light')[entry.token].palette).toBe('green');
    expect(semanticOverridesFor('dark')[entry.token].palette).toBe('amber');
    expect(themeFileCss('example'))
      .toContain(`${entry.token}: light-dark(var(--coar-color-green-500), var(--coar-color-amber-500));`);
  });

  it('keeps the dark half of an app’s paired base until a preset replaces the model', async () => {
    cleanupThemeEditorState();
    document.documentElement.style.setProperty('--coar-theme-accent', 'light-dark(#111111, #222222)');
    try {
      initThemeEditorState(true);
      // The control is the light half; mounting writes nothing.
      expect(accent.value).toBe('#111111');
      expect(hasEditorChanges.value).toBe(false);
      expect(document.getElementById('coar-theme-editor')).toBeNull();
      expect(themeFileCss('example')).toContain('--coar-theme-accent: light-dark(#111111, #222222);');
      accent.value = '#333333';
      await nextTick();
      expect(document.getElementById('coar-theme-editor')!.textContent)
        .toContain('--coar-theme-accent: light-dark(#333333, #222222);');
      reset();
      await nextTick();
      expect(accent.value).toBe('#111111');
      expect(document.getElementById('coar-theme-editor')).toBeNull();
      applyPreset(PRESETS[0]);
      expect(themeFileCss('example')).not.toContain('#222222');
    } finally {
      document.documentElement.style.removeProperty('--coar-theme-accent');
    }
  });

  it('exports a locked channel as its calculation, not as the colour it shows now', () => {
    const css = themeFileCss('example');
    for (const key of ['accent', 'error', 'success', 'warning', 'info']) {
      expect(css).not.toMatch(new RegExp(`--coar-text-on-${key}: #`));
      expect(css).not.toMatch(new RegExp(`--coar-theme-${key}: light-dark\\(`));
    }
    for (const step of [50, 500, 900]) {
      expect(css).toContain(`--coar-color-accent-${step}-lc-dark:`);
    }
    expect(css).toContain('--coar-color-accent-500-lc: l c;');
  });

  it.each(['reset', 'preset'] as const)('%s removes every authored channel instead of retaining snapshots', async action => {
    setSchemeColor('--coar-theme-accent', 'dark', '#facc15');
    setSchemeColor('--coar-text-on-accent', 'light', '#123456');
    paletteOverridesFor('light').accent[600] = { l: .2, c: .3 };
    paletteOverridesFor('dark').accent[600] = { l: .8, c: .1 };
    setSemantic(SEMANTIC_GROUPS[0].entries[0], 'palette', 'green', 'dark');
    if (action === 'reset') reset();
    else applyPreset(PRESETS[0]);
    await nextTick();
    expect(schemeColorOverrides).toEqual({});
    for (const scheme of ['light', 'dark'] as const) {
      expect(paletteOverridesFor(scheme).accent).toEqual({});
      expect(semanticOverridesFor(scheme)).toEqual({});
    }
    expect(themeFileCss('example')).not.toContain('light-dark(#1183cd, #facc15)');
    if (action === 'reset') {
      expect(hasEditorChanges.value).toBe(false);
      expect(document.getElementById('coar-theme-editor')).toBeNull();
    }
  });
});
