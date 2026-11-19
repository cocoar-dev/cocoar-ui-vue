import { describe, expect, it } from 'vitest';
import { COMPACT_THEME } from './compact-theme';
import { ENTERPRISE_THEME } from './enterprise-theme';
import { ROLE_THEME_INPUT_DEFAULTS, ROLE_THEME_ROLES } from './role-theme-contract';
import { NESTED_BOUNDARIES, serializeRoleTheme } from './role-theme';
import { ROLE_INPUT_DEFAULTS } from './role-input-defaults';

describe('complete preset boundary contract', () => {
  it('reads grouped root declarations and retains scheme-dependent input colours', () => {
    expect(ROLE_INPUT_DEFAULTS['--coar-text-on-brand-primary']).toBe('var(--coar-color-white)');
    expect(ROLE_INPUT_DEFAULTS['--coar-scrollbar-thumb'])
      .toBe('light-dark(rgba(0, 0, 0, 0.2), rgba(255, 255, 255, 0.2))');
    expect(ROLE_INPUT_DEFAULTS['--coar-scrollbar-thumb-hover'])
      .toBe('light-dark(rgba(0, 0, 0, 0.3), rgba(255, 255, 255, 0.3))');
  });

  it('covers every first-party input and role, including mobile-only values', () => {
    const slots = new Set([...Object.keys(ROLE_THEME_INPUT_DEFAULTS), ...ROLE_THEME_ROLES]);
    for (const theme of [COMPACT_THEME, ENTERPRISE_THEME]) {
      for (const name of [
        ...Object.keys(theme.tokens), ...Object.keys(theme.mobileTokens), ...Object.keys(theme.roles ?? {}),
      ]) expect(slots.has(name), name).toBe(true);
    }
  });

  it('clears missing package slots without overriding private derivations', () => {
    const css = serializeRoleTheme('.coar-theme--compact', COMPACT_THEME);
    const scoped = css.slice(css.indexOf('@scope'));
    expect(scoped).toContain('--coar-theme-document-viewer-small-font-size: initial;');
    expect(scoped).toContain('--coar-theme-calendar-avatar-auto-bg: initial;');
    expect(scoped).toContain('--coar-code-block-caption-font-size: initial;');
    expect(scoped).toContain('--coar-menu-radius: var(--coar-d-menu-radius, inherit);');
    expect(scoped).not.toMatch(/^\s*--coar-d-[\w-]+:/m);
  });

  it('retains contextual expressions instead of computing them at export time', () => {
    const css = serializeRoleTheme('.coar-theme--enterprise', ENTERPRISE_THEME);
    const scoped = css.slice(css.indexOf('@scope'));
    expect(scoped).toContain('--coar-theme-markdown-inline-code-color: var(--coar-text-accent-secondary);');
    expect(scoped).toContain('--coar-code-block-caption-font-size: var(--coar-component-xs-font-size);');
    expect(scoped).toContain('--coar-ui-font-size: inherit;');
    expect(scoped).toContain('--coar-control-min-size: 48px;');
  });

  it('does not reapply root-only colours on ordinary Compact boundaries', () => {
    const css = serializeRoleTheme('.coar-theme--compact', COMPACT_THEME);
    const scoped = css.slice(css.indexOf('@scope'));
    const boundary = scoped.split(`:scope ${NESTED_BOUNDARIES} {\n`)[1].split('\n}')[0];
    expect(boundary).toContain('--coar-text-neutral-primary: inherit;');
    expect(boundary).not.toContain(COMPACT_THEME.tokens['--coar-text-neutral-primary']);
    for (const scheme of ['light', 'dark']) {
      const mode = scoped.split(`:scope .${scheme}-mode:where(:not(.coar-theme-none)) {\n`)[1].split('\n}')[0];
      expect(mode).toContain('--coar-text-neutral-primary: var(--coar-color-gray-900);');
    }
  });

  it('keeps inherited mobile defaults unless the theme explicitly replaces them', () => {
    const mobileRoot = (theme: typeof COMPACT_THEME) =>
      serializeRoleTheme('.coar-theme--test', theme)
        .split('.coar-mobile :scope,\n:scope.coar-mobile {\n')[1].split('\n}')[0];
    expect(mobileRoot(COMPACT_THEME)).toContain('--coar-control-clear-opacity: 1;');
    expect(mobileRoot(COMPACT_THEME)).toContain('--coar-control-align-items: center;');
    expect(mobileRoot({
      ...COMPACT_THEME,
      tokens: { ...COMPACT_THEME.tokens, '--coar-control-clear-opacity': '0.4' },
    })).toContain('--coar-control-clear-opacity: 0.4;');
  });

  it('preserves component fallbacks when a theme intentionally leaves an input unset', () => {
    const css = serializeRoleTheme('.coar-theme--enterprise', ENTERPRISE_THEME);
    const root = css.slice(css.indexOf('@scope')).split(':scope .coar-theme-none {\n')[2].split('\n}')[0];
    expect(root).toContain('--coar-card-radius: var(--coar-d-card-radius, var(--coar-radius-s));');
  });

  it('keeps generated raw input defaults in sync with the token stylesheets', async () => {
    const childModule = 'node:child_process';
    const processModule = 'node:process';
    const { execFileSync } = await import(/* @vite-ignore */ childModule) as {
      execFileSync(file: string, args: string[]): unknown;
    };
    const { execPath } = await import(/* @vite-ignore */ processModule) as { execPath: string };
    const directory = decodeURIComponent(import.meta.url)
      .replace(/^file:\/\//, '').replace(/\/[^/]*$/, '');
    expect(() => execFileSync(execPath, [
      '--experimental-strip-types', `${directory}/../../scripts/write-role-input-defaults.mjs`, '--check',
    ])).not.toThrow();
  });
});
