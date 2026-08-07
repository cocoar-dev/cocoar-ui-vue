import { describe, expect, it } from 'vitest';
import { buildVisualDocument } from './visualDocument';

const safeMarkup = `
  <div class="card" style="--delay: 1.2s">
    <svg viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="15.5" fill="none" stroke-width="4.5"></circle>
    </svg>
    <ul><li><span>Milch</span></li></ul>
  </div>`;

describe('buildVisualDocument', () => {
  it('builds one scriptless CSP document with SVG, animations, theme and host fonts', () => {
    const result = buildVisualDocument(safeMarkup, `
      .card { transform: rotate(-1.2deg); animation: rise .4s both; }
      @keyframes rise { from { opacity: 0 } to { opacity: 1 } }
      @media (prefers-reduced-motion: reduce) { .card { animation: none } }
    `, {
      themeVariables: { '--coar-accent': '#10b981' },
      fonts: [{
        id: 'instrument-sans',
        family: 'Instrument Sans Variable',
        source: 'data:font/woff2;base64,AAAA',
        format: 'woff2',
        weight: '100 900',
      }],
    });

    expect(result.ok).toBe(true);
    expect(result.srcdoc).toContain("script-src 'none'");
    expect(result.srcdoc).toContain("connect-src 'none'");
    expect(result.srcdoc).toContain('font-src data: blob:');
    expect(result.srcdoc).toContain('--coar-accent:#10b981');
    expect(result.srcdoc).toContain('Instrument Sans Variable');
    expect(result.srcdoc).toContain('@keyframes rise');
    expect(result.srcdoc).toContain('prefers-reduced-motion');
  });

  it.each([
    ['script elements', '<script>alert(1)</script>', ''],
    ['form controls', '<input name="password">', ''],
    ['event handlers', '<div onclick="alert(1)">x</div>', ''],
    ['external CSS', '<div>x</div>', '.x { background: url(https://evil.test/pixel) }'],
    ['style breakout', '<div>x</div>', '</style><script>alert(1)</script>'],
  ])('rejects %s instead of partially rendering it', (_name, html, css) => {
    const result = buildVisualDocument(html, css);
    expect(result.ok).toBe(false);
    expect(result.srcdoc).toBe('');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('enforces hard source limits even when a host asks for more', () => {
    const result = buildVisualDocument('x'.repeat(100_001), '', { maxHtmlLength: 1_000_000 });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('100000');
  });
});
