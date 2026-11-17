import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import {
  DEFAULTS, accent, cleanupThemeEditorState, downloadCSS, initThemeEditorState, isDark,
} from './theme-editor-state';

afterEach(() => {
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
