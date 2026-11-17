import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  COAR_THEME_COMPACT_DARK,
  COAR_THEME_COMPACT_LIGHT,
  COAR_THEME_DARK,
  COAR_THEME_LIGHT,
  ensureCoarThemes,
  isCompactDocument,
  resolveTheme,
} from './theme';

afterEach(() => {
  document.documentElement.className = '';
  document.body.className = '';
});

describe('compact Monaco themes', () => {
  it('keeps the legacy theme names in a default document', () => {
    expect(isCompactDocument()).toBe(false);
    expect(resolveTheme('light')).toBe(COAR_THEME_LIGHT);
    expect(resolveTheme('dark')).toBe(COAR_THEME_DARK);
    expect(resolveTheme('auto')).toBe(COAR_THEME_LIGHT);
  });

  it('keeps the legacy theme for a local .coar-compact area', () => {
    const area = document.createElement('div');
    area.className = 'coar-compact';
    document.body.appendChild(area);
    expect(resolveTheme('light')).toBe(COAR_THEME_LIGHT);
    area.remove();
  });

  it('maps every theme value to its compact variant in a compact document', () => {
    document.documentElement.classList.add('coar-compact');
    expect(isCompactDocument()).toBe(true);
    expect(resolveTheme('light')).toBe(COAR_THEME_COMPACT_LIGHT);
    expect(resolveTheme('dark')).toBe(COAR_THEME_COMPACT_DARK);
    expect(resolveTheme('auto')).toBe(COAR_THEME_COMPACT_LIGHT);
    document.documentElement.classList.add('dark-mode');
    expect(resolveTheme('auto')).toBe(COAR_THEME_COMPACT_DARK);
  });

  it('detects .coar-compact on body too', () => {
    document.body.classList.add('coar-compact');
    expect(resolveTheme('dark')).toBe(COAR_THEME_COMPACT_DARK);
  });

  it('registers the compact themes next to unchanged legacy themes', () => {
    const defineTheme = vi.fn();
    ensureCoarThemes({ editor: { defineTheme } } as never);
    const byName = Object.fromEntries(defineTheme.mock.calls.map(([name, data]) => [name, data]));
    expect(Object.keys(byName)).toEqual([
      COAR_THEME_LIGHT,
      COAR_THEME_DARK,
      COAR_THEME_COMPACT_LIGHT,
      COAR_THEME_COMPACT_DARK,
    ]);
    // Legacy contents, as released before the compact profile.
    expect(byName[COAR_THEME_LIGHT].colors['editor.background']).toBe('#ffffff');
    expect(byName[COAR_THEME_LIGHT].colors['editor.foreground']).toBe('#1a1a1a');
    expect(byName[COAR_THEME_LIGHT].colors['editorLineNumber.foreground']).toBe('#9ca3af');
    expect(byName[COAR_THEME_DARK].colors['editor.background']).toBe('#1a1a1a');
    expect(byName[COAR_THEME_DARK].colors['editor.selectionBackground']).toBe('#1e40af');
    // Monaco only accepts hex colors.
    for (const name of [COAR_THEME_COMPACT_LIGHT, COAR_THEME_COMPACT_DARK]) {
      for (const value of Object.values(byName[name].colors)) {
        expect(value).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });
});

describe('script-editor compact stylesheet', () => {
  it('defines nothing outside .coar-compact', () => {
    const css = readFileSync(resolve(__dirname, 'styles/script-editor-compact.css'), 'utf8');
    const selectors = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)].flatMap(
      (match) => match[1]!.split(','),
    );
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) expect(selector).toContain('.coar-compact');
  });
});
