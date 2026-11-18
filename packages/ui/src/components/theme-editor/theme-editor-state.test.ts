import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import {
  DEFAULTS, PRESETS, accent, applyPreset, baseline, cleanupThemeEditorState, downloadCSS, fontBody,
  hasEditorChanges, initThemeEditorState, isDark, radiusM, reset, resetRoleValue, roleTheme, setRoleValue,
  themeFileCss,
} from './theme-editor-state';
import { COMPACT_THEME } from '../../theme/compact-theme';
import { serializeRoleTheme } from '../../theme/role-theme';

afterEach(() => {
  cleanupThemeEditorState();
  // The controls are module state; happy-dom resolves no tokens to read them from.
  applyPreset(PRESETS[0]);
  cleanupThemeEditorState();
  accent.value = DEFAULTS.accent;
  document.body.innerHTML = '';
  document.documentElement.className = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('theme editor export', () => {
  it('gives a compact light preview its own boundary inside a dark document', async () => {
    document.documentElement.className = 'dark-mode';
    const scope = document.createElement('div');
    scope.className = 'coar-compact';
    scope.style.colorScheme = 'dark';
    document.body.appendChild(scope);
    initThemeEditorState(false, scope);
    expect(isDark.value).toBe(true);
    isDark.value = false;
    await nextTick();
    expect(scope.classList.contains('light-mode')).toBe(true);
    expect(scope.classList.contains('dark-mode')).toBe(false);
    expect(document.documentElement.className).toBe('dark-mode');
    isDark.value = true;
    await nextTick();
    expect(scope.classList.contains('dark-mode')).toBe(true);
    expect(scope.classList.contains('light-mode')).toBe(false);
  });

  it.each(['light', 'dark'])('initializes from the compact scope’s computed %s scheme', (scheme) => {
    document.documentElement.className = scheme === 'light' ? 'dark-mode' : 'light-mode';
    const scope = document.createElement('div');
    scope.className = `coar-compact ${scheme}-mode`;
    scope.style.colorScheme = scheme;
    document.body.appendChild(scope);
    initThemeEditorState(false, scope);
    expect(isDark.value).toBe(scheme === 'dark');
  });

  it.each([false, true])('exports the same accent inputs as its live scope (compact=%s)', async (compact) => {
    const scope = document.createElement('div');
    if (compact) scope.className = 'coar-compact';
    document.body.appendChild(scope);
    initThemeEditorState(true, scope);
    accent.value = '#a21caf';
    await nextTick();
    const live = document.getElementById('coar-theme-editor')!.textContent!;

    let exported: Blob | undefined;
    class TestURL extends URL {
      static createObjectURL(blob: Blob) { exported = blob; return 'blob:theme-export'; }
      static revokeObjectURL() {}
    }
    vi.stubGlobal('URL', TestURL);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadCSS();
    const css = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(exported!);
    });
    for (const text of [live, css]) {
      expect(text).toContain('--coar-accent: #a21caf;');
      expect(text.includes('--coar-appearance-accent: #a21caf;')).toBe(compact);
    }
  });
});

describe('theme editor presets on one value contract', () => {
  const compact = PRESETS.find((preset) => preset.id === 'compact')!;
  const live = () => document.getElementById('coar-theme-editor')?.textContent ?? '';

  it('loads Compact as values on the editor scope, without the compatibility class', () => {
    initThemeEditorState(true, null);
    applyPreset(compact);
    expect(roleTheme.value).toBe(COMPACT_THEME);
    expect(live()).toBe(serializeRoleTheme('.coar-theme-editor', COMPACT_THEME));
    expect(live()).not.toContain('.coar-compact');
    expect(document.documentElement.classList.contains('coar-theme-editor')).toBe(true);
    expect(document.querySelector('.coar-compact')).toBeNull();
  });

  it('writes the same theme for the live scope and the download', async () => {
    initThemeEditorState(true, null);
    applyPreset(compact);
    setRoleValue('--coar-ui-font-size', '15px');
    fontBody.value = 'Nunito';
    accent.value = '#a21caf';
    await nextTick();
    const file = themeFileCss('acme');
    expect(file).toBe(live().replaceAll('.coar-theme-editor', '.coar-theme--acme'));
    expect(file).toContain('  --coar-ui-font-size: 15px;');
    expect(file).toContain('  --coar-theme-accent: #a21caf;');
    // A surrounding CoarThemeScope may still name another font.
    expect(file).toContain('  --coar-font-family-body: var(--coar-appearance-font-body, Nunito, ui-sans-serif, system-ui, sans-serif);');
    // Every value a fresh app needs, not the changes against a preset it does not have.
    expect(file).toContain('  --coar-role-derivation: ;');
    expect(file).toContain('  --coar-component-m-height: 36px;');
    expect(file).not.toContain('.coar-compact');
  });

  it('repeats a changed derived token on the boundaries inside the scope', async () => {
    initThemeEditorState(true, null);
    applyPreset(compact);
    setRoleValue('--coar-menu-radius', '14px');
    await nextTick();
    expect(live()).toMatch(/\.coar-theme-editor,\n\.coar-theme-editor :where\([^)]*\.coar-mobile[^)]*\) \{\n {2}--coar-menu-radius: 14px;\n\}/);
    // An input is written once, in place of the preset value.
    setRoleValue('--coar-panel-radius', '10px');
    await nextTick();
    expect(live().match(/--coar-panel-radius:/g)).toHaveLength(1);
  });

  it('resets one value to the loaded preset', async () => {
    initThemeEditorState(true, null);
    applyPreset(compact);
    setRoleValue('--coar-ui-font-size', '15px');
    await nextTick();
    resetRoleValue('--coar-ui-font-size');
    await nextTick();
    expect(live()).toContain('  --coar-ui-font-size: 13px;');
    expect(baseline.value.fontBody).toBe('Inter');
    expect(baseline.value.accent).toBe('#334155');
  });

  it('keeps the other presets as changes of the controls alone', () => {
    initThemeEditorState(true, null);
    applyPreset(PRESETS.find((preset) => preset.id === 'saas')!);
    expect(roleTheme.value).toBeNull();
    expect(live()).toContain('--coar-button-radius: var(--coar-radius-m);');
    expect(live()).not.toContain('--coar-role-derivation');
    expect(live().match(/\{/g)).toHaveLength(1);
    expect(themeFileCss('saas')).toBe(live().replace('.coar-theme-editor', '.coar-theme--saas'));
  });

  it('resets to the theme the app has without the editor, and leaves mode and touch alone', async () => {
    document.documentElement.className = 'dark-mode coar-mobile app-state';
    document.documentElement.style.setProperty('--coar-radius-m', '9px');
    initThemeEditorState(false, null);
    expect(isDark.value).toBe(true);
    expect(radiusM.value).toBe(9);
    // The app's own theme is not the editor's change.
    expect(hasEditorChanges.value).toBe(false);
    expect(live()).toBe('');

    applyPreset(compact);
    radiusM.value = 12;
    await nextTick();
    expect(hasEditorChanges.value).toBe(true);
    // Loading a preset does not switch the app to light.
    expect(document.documentElement.classList.contains('dark-mode')).toBe(true);

    reset();
    await nextTick();
    expect(roleTheme.value).toBeNull();
    expect(radiusM.value).toBe(9);
    expect(document.getElementById('coar-theme-editor')).toBeNull();
    expect(document.documentElement.className).toBe('dark-mode coar-mobile app-state');
    expect(hasEditorChanges.value).toBe(false);
    document.documentElement.removeAttribute('style');
  });
});

