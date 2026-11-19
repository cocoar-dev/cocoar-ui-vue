import { describe, expect, it } from 'vitest';
import { COMPACT_THEME } from './compact-theme';
import { ENTERPRISE_THEME } from './enterprise-theme';
import { DEFAULT_PALETTE_INPUTS } from './palette-inputs';
import { ROLE_VALUE_GROUPS } from '../components/theme-editor/theme-editor-state';
import { ENTERPRISE_MARKDOWN_TOKENS } from './enterprise-packages/markdown';
import { ENTERPRISE_MERMAID_TOKENS } from './enterprise-packages/mermaid';
import { ENTERPRISE_SCRIPT_EDITOR_TOKENS } from './enterprise-packages/script-editor';
import { ENTERPRISE_DOCUMENT_VIEWER_TOKENS } from './enterprise-packages/document-viewer';
import { ENTERPRISE_MAP_TOKENS } from './enterprise-packages/map';
import { ENTERPRISE_PAGE_BUILDER_TOKENS } from './enterprise-packages/page-builder';
import { ENTERPRISE_CALENDAR_TOKENS } from './enterprise-packages/calendar';

describe('Enterprise theme values', () => {
  it('has the same complete curve contract as Compact, with the common palette', () => {
    const curves = (tokens: Record<string, string>) =>
      Object.keys(tokens).filter((token) => /-lc(?:-dark)?$/.test(token)).sort();
    expect(curves(ENTERPRISE_THEME.tokens)).toEqual(curves(COMPACT_THEME.tokens));
    for (const [token, value] of Object.entries(DEFAULT_PALETTE_INPUTS)) {
      expect(ENTERPRISE_THEME.tokens[token], token).toBe(value);
    }
  });

  it('supplies every value exposed by the shared editor', () => {
    const values = { ...ENTERPRISE_THEME.tokens, ...ENTERPRISE_THEME.roles };
    for (const group of ROLE_VALUE_GROUPS) {
      for (const entry of group.entries) expect(values[entry.token], entry.token).toBeDefined();
    }
  });

  it('keeps automatic ink and the shared APCA threshold', () => {
    expect(ENTERPRISE_THEME.tokens['--coar-text-on-threshold']).toBeUndefined();
    for (const role of ['accent', 'success', 'error', 'warning', 'info']) {
      expect(ENTERPRISE_THEME.tokens[`--coar-text-on-${role}`]).toBeUndefined();
      expect(ENTERPRISE_THEME.roles?.[`--coar-text-on-${role}`]).toBeUndefined();
    }
    expect(Object.keys(ENTERPRISE_THEME.tokens).some((token) => token.startsWith('--coar-d-'))).toBe(false);
  });

  it('supplies package inputs without changing Compact or private derivations', () => {
    const packages = {
      ...ENTERPRISE_MARKDOWN_TOKENS,
      ...ENTERPRISE_MERMAID_TOKENS,
      ...ENTERPRISE_SCRIPT_EDITOR_TOKENS,
      ...ENTERPRISE_DOCUMENT_VIEWER_TOKENS,
      ...ENTERPRISE_MAP_TOKENS,
      ...ENTERPRISE_PAGE_BUILDER_TOKENS,
      ...ENTERPRISE_CALENDAR_TOKENS,
    };
    for (const [input, value] of Object.entries(packages)) {
      expect(input).toMatch(/^--coar-theme-(markdown|mermaid|script-editor|document-viewer|map|page-builder|calendar)-/);
      expect(ENTERPRISE_THEME.roles?.[input], input).toBe(value);
      expect(COMPACT_THEME.tokens[input], input).toBeUndefined();
      expect(COMPACT_THEME.roles?.[input], input).toBeUndefined();
    }
  });
});
