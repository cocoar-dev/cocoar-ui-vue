import { describe, it, expect } from 'vitest';
import { buildMermaidThemeVariables, readCssTokens } from './theme-bridge';

describe('buildMermaidThemeVariables', () => {
  it('maps resolved Cocoar tokens to Mermaid theme variables', () => {
    const tokens: Record<string, string> = {
      '--coar-font-family-body': 'Poppins, sans-serif',
      '--coar-background-accent-secondary': '#e0f2ff',
      '--coar-text-neutral-primary': '#111827',
      '--coar-border-accent-primary': '#1183cd',
      '--coar-border-neutral-secondary': '#374151',
    };
    const vars = buildMermaidThemeVariables((name) => tokens[name] ?? '');

    expect(vars.fontFamily).toBe('Poppins, sans-serif');
    expect(vars.primaryColor).toBe('#e0f2ff');
    expect(vars.mainBkg).toBe('#e0f2ff');
    expect(vars.primaryTextColor).toBe('#111827');
    expect(vars.primaryBorderColor).toBe('#1183cd');
    expect(vars.nodeBorder).toBe('#1183cd');
    expect(vars.lineColor).toBe('#374151');
  });

  it('trims whitespace from resolved values (getComputedStyle often pads)', () => {
    const vars = buildMermaidThemeVariables((name) =>
      name === '--coar-font-family-body' ? '  Poppins  ' : '',
    );
    expect(vars.fontFamily).toBe('Poppins');
  });

  it('omits unresolved tokens instead of emitting empty strings', () => {
    const vars = buildMermaidThemeVariables(() => '');
    expect(vars).toEqual({});
    expect('fontFamily' in vars).toBe(false);
  });

  it('applies the color resolver to color tokens but not to the font token', () => {
    const tokens: Record<string, string> = {
      '--coar-font-family-body': 'Poppins',
      '--coar-background-accent-secondary': 'oklch(from #1183CD 0.92 0.035 h)',
    };
    const vars = buildMermaidThemeVariables(
      (name) => tokens[name] ?? '',
      () => 'rgb(210, 232, 251)', // stand-in for the canvas sRGB resolver
    );
    // Font is passed through verbatim…
    expect(vars.fontFamily).toBe('Poppins');
    // …colors go through the resolver (so Mermaid never sees the oklch source).
    expect(vars.primaryColor).toBe('rgb(210, 232, 251)');
    expect(vars.mainBkg).toBe('rgb(210, 232, 251)');
  });

  it('drops a color the resolver rejects (returns empty) rather than emitting it', () => {
    const tokens: Record<string, string> = {
      '--coar-background-accent-secondary': 'oklch(from #1183CD 0.92 0.035 h)',
    };
    const vars = buildMermaidThemeVariables(
      (name) => tokens[name] ?? '',
      () => '', // resolver couldn't parse it
    );
    expect('primaryColor' in vars).toBe(false);
  });
});

describe('readCssTokens', () => {
  it('returns a getter that yields empty string for an unset custom property', () => {
    const get = readCssTokens();
    expect(typeof get).toBe('function');
    expect(get('--coar-this-token-does-not-exist')).toBe('');
  });
});
