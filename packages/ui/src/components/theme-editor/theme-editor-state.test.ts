import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import {
  DEFAULTS, FONT_OPTIONS_BODY, FONT_OPTIONS_TITLE, PRESETS, accent, applyPreset, baseline, cleanupThemeEditorState, downloadCSS, fontBody,
  hasEditorChanges, initThemeEditorState, isDark, radiusM, reset, resetRoleValue, roleTheme, roleValue, setRoleValue,
  themeFileCss,
} from './theme-editor-state';
import { COMPACT_THEME } from '../../theme/compact-theme';
import { ENTERPRISE_THEME } from '../../theme/enterprise-theme';
import { serializeRoleTheme } from '../../theme/role-theme';

// A font preview is a stylesheet link, which the test environment would fetch: an
// anchor stands in for it (it resolves `href` the same way and loads nothing).
beforeEach(() => {
  const create = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation(((tag: string, options?: ElementCreationOptions) =>
    create(tag === 'link' ? 'a' : tag, options)) as typeof document.createElement);
});

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

describe('theme editor fonts', () => {
  it('offers Onest for body text and titles and writes it into the theme', async () => {
    expect(FONT_OPTIONS_BODY).toContain('Onest');
    expect(FONT_OPTIONS_TITLE).toContain('Onest');
    initThemeEditorState(true);
    fontBody.value = 'Onest';
    await nextTick();
    const css = themeFileCss('acme');
    expect(css).toContain('--coar-font-family-body: var(--coar-appearance-font-body, Onest, ui-sans-serif, system-ui, sans-serif);');
    expect(css).not.toContain('--coar-titles-title-family: Onest');
  });

  it.each(PRESETS)('names the font once in $label, which derives the text roles from it', async (preset) => {
    initThemeEditorState(true);
    applyPreset(preset);
    fontBody.value = 'Onest';
    await nextTick();
    const css = themeFileCss('acme');
    expect(css).toContain('--coar-font-family-body: var(--coar-appearance-font-body, Onest, ui-sans-serif, system-ui, sans-serif);');
    expect(css).toContain('--coar-body-base-family: var(--coar-d-body-base-family, inherit);');
    expect(css).not.toContain('--coar-body-base-family: Onest');
  });
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
      expect(text).toContain('--coar-theme-accent: #a21caf;');
      expect(text).not.toContain('--coar-appearance-accent: #a21caf;');
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
    // The same text as the `.coar-compact` entry, in the same cascade layer.
    expect(live()).toBe(`@layer cocoar.tokens {\n${serializeRoleTheme('.coar-theme-editor', COMPACT_THEME)}}\n`);
    expect(live().split('@scope')[0]).not.toContain('.coar-compact');
    expect(live()).toContain('@scope (.coar-theme-editor) to (:scope');
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
    // The same text; the file is headed by what to load for the fonts it names.
    const notes = file.slice(0, file.indexOf('@layer'));
    expect(notes).toContain('Nunito: not part of @cocoar/vue-ui');
    expect(file.slice(notes.length).replaceAll('.coar-theme--acme', '.coar-theme-editor')).toBe(live());
    expect(file).toContain('  --coar-ui-font-size: 15px;');
    expect(file).toContain('  --coar-theme-accent: #a21caf;');
    // A surrounding CoarThemeScope may still name another font.
    expect(file).toContain('  --coar-font-family-body: var(--coar-appearance-font-body, Nunito, ui-sans-serif, system-ui, sans-serif);');
    // Every value a fresh app needs, not the changes against a preset it does not have.
    expect(file).toContain('  --coar-role-derivation: ;');
    expect(file).toContain('  --coar-component-m-height: 36px;');
    expect(file.split('@scope')[0]).not.toContain('.coar-compact');
    expect(file).toContain('@scope (.coar-theme--acme) to (:scope');
  });

  it('repeats a changed derived token on the boundaries inside the scope', async () => {
    initThemeEditorState(true, null);
    applyPreset(compact);
    setRoleValue('--coar-menu-radius', '14px');
    await nextTick();
    expect(live()).toMatch(/\.coar-theme-editor,\n\.coar-theme-editor :where\([^)]*\.coar-mobile[^)]*\) \{\n {2}--coar-menu-radius: 14px;\n\}/);
    // The edit replaces the input, both in the legacy fallback and scoped rules.
    setRoleValue('--coar-panel-radius', '10px');
    await nextTick();
    expect(live().split('@scope')[0].match(/--coar-panel-radius:/g)).toHaveLength(1);
    expect([...live().matchAll(/--coar-panel-radius: ([^;]+);/g)]
      .every(([, value]) => value === '10px')).toBe(true);
  });

  it.each([
    ['--coar-menu-radius', 'var(--coar-panel-radius)', '14px'],
    ['--coar-text-neutral-primary', 'light-dark(#123456, #abcdef)', '#112233'],
  ])('uses one serializer for the preset role %s, edits and resets in live and exported themes', async (token, presetValue, editedValue) => {
    const theme = {
      ...COMPACT_THEME,
      roles: { [token]: presetValue },
    };
    initThemeEditorState(true, null);
    applyPreset({ ...compact, roleTheme: theme });
    expect(roleValue(token)).toBe(presetValue);
    expect(live()).toBe(`@layer cocoar.tokens {\n${serializeRoleTheme('.coar-theme-editor', theme)}}\n`);

    setRoleValue(token, editedValue);
    await nextTick();
    const edited = { ...theme, roles: { [token]: editedValue } };
    expect(live()).toBe(`@layer cocoar.tokens {\n${serializeRoleTheme('.coar-theme-editor', edited)}}\n`);
    const file = themeFileCss('acme');
    expect(file.slice(file.indexOf('@layer')).replaceAll('.coar-theme--acme', '.coar-theme-editor'))
      .toBe(live());

    // Typing the preset value again removes the edit, just like the reset button.
    setRoleValue(token, presetValue);
    await nextTick();
    expect(live()).toBe(`@layer cocoar.tokens {\n${serializeRoleTheme('.coar-theme-editor', theme)}}\n`);
    setRoleValue(token, editedValue);
    resetRoleValue(token);
    await nextTick();
    expect(roleValue(token)).toBe(presetValue);
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

  it('gives Modern SaaS its complete model in the same layer as Compact', () => {
    initThemeEditorState(true, null);
    applyPreset(PRESETS.find((preset) => preset.id === 'saas')!);
    expect(roleTheme.value).toBe(PRESETS.find((preset) => preset.id === 'saas')!.roleTheme);
    expect(live()).toContain('--coar-button-radius: var(--coar-radius-m);');
    expect(live()).toContain('--coar-role-derivation: ;');
    const file = themeFileCss('saas');
    expect(file.slice(file.indexOf('@layer')).replaceAll('.coar-theme--saas', '.coar-theme-editor')).toBe(live());
    expect(live()).toContain('@layer cocoar.tokens');
  });

  it('tells attribute observers of each live change, and leaves no trace after a reset', async () => {
    initThemeEditorState(true);
    const root = document.documentElement;
    const seen: string[] = [];
    const observer = new MutationObserver((records) => seen.push(...records.map((r) => r.attributeName ?? '')));
    observer.observe(root, { attributes: true, attributeFilter: ['class', 'style'] });
    applyPreset(PRESETS.find((preset) => preset.id === 'compact')!);
    await nextTick();
    await nextTick();
    expect(seen).toContain('style');
    const first = root.style.getPropertyValue('--theme-editor-revision');
    setRoleValue('--coar-ui-font-size', '15px');
    await nextTick();
    await nextTick();
    expect(root.style.getPropertyValue('--theme-editor-revision')).not.toBe(first);
    reset();
    await nextTick();
    expect(root.hasAttribute('style')).toBe(false);
    observer.disconnect();
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
    expect(roleTheme.value).toBe(ENTERPRISE_THEME);
    expect(radiusM.value).toBe(9);
    expect(document.getElementById('coar-theme-editor')).toBeNull();
    expect(document.documentElement.className).toBe('dark-mode coar-mobile app-state');
    expect(hasEditorChanges.value).toBe(false);
    document.documentElement.removeAttribute('style');
  });
});

