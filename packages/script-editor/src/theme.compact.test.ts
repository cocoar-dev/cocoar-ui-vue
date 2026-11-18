import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { COMPACT_SCRIPT_EDITOR_TOKENS } from '../../ui/src/theme/compact-packages/script-editor';
import {
  COAR_THEME_COMPACT_DARK,
  COAR_THEME_COMPACT_LIGHT,
  COAR_THEME_DARK,
  COAR_THEME_LIGHT,
  ensureCoarThemes,
  isCompactDocument,
  resolveTheme,
} from './theme';

/**
 * A role theme on `element`, as a browser sees it: the class that carries the values,
 * and the marker `derived.css` of `@cocoar/vue-ui` resolves to where the values are
 * in effect (happy-dom does not evaluate that stylesheet).
 */
function applyRoleTheme(element: HTMLElement, themeClass: string): void {
  element.classList.add(themeClass);
  element.style.setProperty('--coar-d-role-derivation', 'on');
}

afterEach(() => {
  for (const element of [document.documentElement, document.body]) {
    element.className = '';
    element.removeAttribute('style');
  }
});

describe('Monaco themes of a role theme document', () => {
  it('keeps the legacy theme names in a default document', () => {
    expect(isCompactDocument()).toBe(false);
    expect(resolveTheme('light')).toBe(COAR_THEME_LIGHT);
    expect(resolveTheme('dark')).toBe(COAR_THEME_DARK);
    expect(resolveTheme('auto')).toBe(COAR_THEME_LIGHT);
  });

  it('keeps the legacy theme for a themed area in a default page', () => {
    const area = document.createElement('div');
    applyRoleTheme(area, 'coar-compact');
    document.body.appendChild(area);
    expect(resolveTheme('light')).toBe(COAR_THEME_LIGHT);
    area.remove();
  });

  it.each(['coar-compact', 'coar-theme--compact'])(
    'maps every theme value to its role variant where <html> carries the values as .%s',
    (themeClass) => {
      applyRoleTheme(document.documentElement, themeClass);
      expect(isCompactDocument()).toBe(true);
      expect(resolveTheme('light')).toBe(COAR_THEME_COMPACT_LIGHT);
      expect(resolveTheme('dark')).toBe(COAR_THEME_COMPACT_DARK);
      expect(resolveTheme('auto')).toBe(COAR_THEME_COMPACT_LIGHT);
      document.documentElement.classList.add('dark-mode');
      expect(resolveTheme('auto')).toBe(COAR_THEME_COMPACT_DARK);
    },
  );

  it('detects a role theme on body too', () => {
    applyRoleTheme(document.body, 'coar-theme--compact');
    expect(resolveTheme('dark')).toBe(COAR_THEME_COMPACT_DARK);
  });

  it('decides on the values in effect, not on the class name', () => {
    document.documentElement.classList.add('coar-compact');
    expect(isCompactDocument()).toBe(false);
    expect(resolveTheme('light')).toBe(COAR_THEME_LIGHT);
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

describe('script-editor role stylesheet', () => {
  const read = (file: string) =>
    readFileSync(resolve(__dirname, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const css = read('styles/script-editor-compact.css');
  const component = read('CoarScriptEditor.vue').replace(/\s+/g, ' ');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: match[1]!.trim(),
    declarations: match[2]!
      .split(';')
      .map((declaration) => declaration.trim())
      .filter(Boolean)
      .map((declaration) => {
        const colon = declaration.indexOf(':');
        return [declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim()] as const;
      }),
  }));
  const declarations = new Map(rules.flatMap((rule) => rule.declarations));

  it('changes nothing without a role theme', () => {
    expect(rules.length).toBeGreaterThan(0);
    expect(css).not.toContain('coar-compact');
    for (const { selector } of rules) {
      // No specificity: a consumer rule on the editor element wins.
      expect(selector).toMatch(/^:where\([^()]+\)$/);
    }
    for (const [name, value] of declarations) {
      if (name.startsWith('--coar-d-')) {
        // Invalid unless a theme activates the derivation.
        expect(value.startsWith('var(--coar-role-derivation) ')).toBe(true);
      } else {
        // The role follows its derived value, else stays what the element inherited.
        expect(value).toBe(`var(${name.replace('--coar-', '--coar-d-')}, inherit)`);
      }
    }
  });

  it('derives the frame radius from the control radius of the theme', () => {
    expect(declarations.get('--coar-d-script-editor-radius')).toBe(
      'var(--coar-role-derivation) var(--coar-control-radius, 6px)',
    );
    expect(declarations.has('--coar-script-editor-radius')).toBe(true);
  });

  it('keeps the constants in the Compact values, not in the stylesheet', () => {
    expect(COMPACT_SCRIPT_EDITOR_TOKENS).toEqual({
      '--coar-script-editor-placeholder-font-family':
        "'Cascadia Code', 'Consolas', 'Monaco', 'Courier New', monospace",
    });
    for (const name of Object.keys(COMPACT_SCRIPT_EDITOR_TOKENS)) {
      expect(declarations.has(name)).toBe(false);
    }
  });

  it('reads every role with its historical fallback', () => {
    expect(component).toContain(
      'border-radius: var(--coar-script-editor-radius, var(--coar-radius-xs, 4px));',
    );
    expect(component).toContain(
      "font-family: var( --coar-script-editor-placeholder-font-family, 'Fira Code', 'Cascadia Code', 'Consolas', monospace );",
    );
  });
});
