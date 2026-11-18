import { describe, expect, it } from 'vitest';
import { NESTED_BOUNDARIES, serializeRoleTheme } from './role-theme';

describe('role theme serialization', () => {
  const tokens = { '--coar-role-derivation': '', '--coar-panel-radius': '6px' };
  const mobileTokens = { '--coar-panel-radius': '10px' };

  it('writes explicit roles on the scope and each nested boundary', () => {
    const css = serializeRoleTheme('.coar-theme--acme', {
      tokens, mobileTokens,
      roles: {
        '--coar-menu-radius': 'var(--coar-panel-radius)',
        '--coar-text-neutral-primary': 'light-dark(#123456, #abcdef)',
      },
    });
    expect(css).toContain(
      `.coar-theme--acme,\n.coar-theme--acme ${NESTED_BOUNDARIES} {\n` +
      '  --coar-menu-radius: var(--coar-panel-radius);\n' +
      '  --coar-text-neutral-primary: light-dark(#123456, #abcdef);\n}',
    );
    expect(css).not.toContain('--coar-d-menu-radius:');
    expect(css).toContain('--coar-panel-radius: 10px;');
  });

  it('keeps themes without roles unchanged, including an empty role map', () => {
    const theme = { tokens, mobileTokens };
    expect(serializeRoleTheme('.x', theme)).toBe(
      serializeRoleTheme('.x', { ...theme, roles: {} }),
    );
  });

  it('keeps mobile overrides of explicit roles at nested boundaries too', () => {
    const css = serializeRoleTheme('.x', {
      tokens,
      mobileTokens: { '--coar-menu-radius': '10px' },
      roles: { '--coar-menu-radius': '6px' },
    });
    expect(css).toContain(
      `.coar-mobile .x ${NESTED_BOUNDARIES},\n` +
      `.x.coar-mobile ${NESTED_BOUNDARIES},\n` +
      `.x .coar-mobile ${NESTED_BOUNDARIES} {\n  --coar-menu-radius: 10px;\n}`,
    );
  });

  it('does not mutate the source values', () => {
    const theme = {
      tokens: Object.freeze({ ...tokens }),
      mobileTokens: Object.freeze({ ...mobileTokens }),
      roles: Object.freeze({ '--coar-menu-radius': 'var(--coar-panel-radius)' }),
    };
    const before = JSON.stringify(theme);
    serializeRoleTheme('.x', theme);
    expect(JSON.stringify(theme)).toBe(before);
  });
});
