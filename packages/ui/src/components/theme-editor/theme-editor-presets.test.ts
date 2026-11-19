import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { COMPACT_THEME } from '../../theme/compact-theme';
import { ENTERPRISE_THEME } from '../../theme/enterprise-theme';
import {
  DEFAULTS, PRESETS, applyPreset, cleanupThemeEditorState, hasEditorChanges,
  initThemeEditorState, reset, roleTheme, roleValue, themeFileCss,
  success, errorColor, warning, info,
  fieldPaddingX, fieldPaddingXEnabled,
} from './theme-editor-state';

beforeEach(() => {
  applyPreset(PRESETS[0]);
  cleanupThemeEditorState();
});

afterEach(() => {
  cleanupThemeEditorState();
  document.body.innerHTML = '';
  document.documentElement.className = '';
});

describe('five complete presets', () => {
  it.each(PRESETS)('$label supplies a complete model and standalone export', (preset) => {
    expect(preset.roleTheme).toBeDefined();
    initThemeEditorState(true);
    applyPreset(preset);
    expect(roleTheme.value).toBe(preset.roleTheme);
    expect(roleValue('--coar-ui-font-size')).not.toBe('');
    const css = themeFileCss('example');
    expect(css).toContain('--coar-role-derivation: ;');
    expect(css).toContain('--coar-theme-document-viewer-font-size:');
    expect(css).toContain('@scope (.coar-theme--example)');
  });

  it('starts with Enterprise without changing the app', () => {
    initThemeEditorState(true);
    expect(roleTheme.value).toBe(ENTERPRISE_THEME);
    expect(hasEditorChanges.value).toBe(false);
    expect(document.getElementById('coar-theme-editor')).toBeNull();
    expect(themeFileCss('example')).toContain('--coar-body-base-size: 16px;');
  });

  it.each(PRESETS)('$label routes every status base through its theme input', (preset) => {
    initThemeEditorState(true);
    applyPreset(preset);
    for (const input of [success, errorColor, warning, info]) input.value = '#facc15';
    const css = themeFileCss('example');
    for (const name of ['success', 'error', 'warning', 'info']) {
      expect(css).toContain(`--coar-theme-${name}: #facc15;`);
    }
  });

  it.each(PRESETS)('$label can disable and re-enable its field-padding override', async (preset) => {
    initThemeEditorState(true);
    applyPreset(preset);
    const original = preset.roleTheme.tokens['--coar-field-padding-x'];
    const padding = `--coar-field-padding-x: ${fieldPaddingX.value}px;`;
    const live = () => document.getElementById('coar-theme-editor')!.textContent!;

    fieldPaddingXEnabled.value = true;
    await nextTick();
    expect(live()).toContain(padding);
    expect(themeFileCss('example')).toContain(padding);

    fieldPaddingXEnabled.value = false;
    await nextTick();
    const normal = `--coar-field-padding-x: ${DEFAULTS.fieldPaddingX}px;`;
    expect(live()).toContain(normal);
    expect(themeFileCss('example')).toContain(normal);
    if (fieldPaddingX.value !== DEFAULTS.fieldPaddingX) {
      expect(live()).not.toContain(padding);
      expect(themeFileCss('example')).not.toContain(padding);
    }
    expect(preset.roleTheme.tokens['--coar-field-padding-x']).toBe(original);

    fieldPaddingXEnabled.value = true;
    await nextTick();
    expect(live()).toContain(padding);
    expect(themeFileCss('example')).toContain(padding);
  });

  it('starts with Compact in its area without applying a live editor theme', () => {
    const area = document.createElement('section');
    area.className = 'coar-compact';
    document.body.appendChild(area);
    initThemeEditorState(true, area);
    expect(roleTheme.value).toBe(COMPACT_THEME);
    expect(hasEditorChanges.value).toBe(false);
    expect(document.getElementById('coar-theme-editor')).toBeNull();
    expect(themeFileCss('example')).toContain('--coar-ui-font-size: 13px;');
  });

  it('puts the presets’ actual differences into their models', () => {
    const saas = PRESETS.find(preset => preset.id === 'saas')!.roleTheme!;
    expect(saas.roles?.['--coar-button-radius']).toBe('var(--coar-radius-m)');
    const playful = PRESETS.find(preset => preset.id === 'playful')!.roleTheme!;
    expect(playful.tokens['--coar-theme-accent']).toBe('#7C3AED');
    expect(playful.tokens['--coar-spacing-m']).toBe('20px');
    const minimal = PRESETS.find(preset => preset.id === 'minimal')!.roleTheme!;
    expect(minimal.tokens['--coar-radius-m']).toBe('0px');
    expect(minimal.tokens['--coar-card-shadow']).toBe('none');
  });

  it('reset restores the starting model and removes only the live editor changes', async () => {
    initThemeEditorState(true);
    applyPreset(PRESETS.find(preset => preset.id === 'compact')!);
    await nextTick();
    expect(hasEditorChanges.value).toBe(true);
    reset();
    await nextTick();
    expect(roleTheme.value).toBe(ENTERPRISE_THEME);
    expect(hasEditorChanges.value).toBe(false);
    expect(document.getElementById('coar-theme-editor')).toBeNull();
  });
});
