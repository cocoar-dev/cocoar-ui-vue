import { describe, expect, it } from 'vitest';
import {
  parseEmbedDirective,
  serializeEmbedDirective,
  toEmbedProps,
} from './embed-directive';

describe('parseEmbedDirective', () => {
  it('parses a key with no attributes', () => {
    expect(parseEmbedDirective(':::map')).toEqual({ key: 'map', props: {} });
  });

  it('parses a single key=value attribute', () => {
    expect(parseEmbedDirective(':::map{id=2f1c0b9e-7a4d-4c1e-9b2a-1234567890ab}')).toEqual({
      key: 'map',
      props: { id: '2f1c0b9e-7a4d-4c1e-9b2a-1234567890ab' },
    });
  });

  it('parses multiple attributes', () => {
    expect(parseEmbedDirective(':::chart{id=42 type=bar}')).toEqual({
      key: 'chart',
      props: { id: '42', type: 'bar' },
    });
  });

  it('parses quoted values with spaces', () => {
    expect(parseEmbedDirective(':::map{id=1 title="Hello world"}')).toEqual({
      key: 'map',
      props: { id: '1', title: 'Hello world' },
    });
  });

  it('handles escaped quotes inside a quoted value', () => {
    expect(parseEmbedDirective(':::x{label="a \\"q\\" b"}')).toEqual({
      key: 'x',
      props: { label: 'a "q" b' },
    });
  });

  it('treats a valueless attribute as an empty string', () => {
    expect(parseEmbedDirective(':::x{interactive}')).toEqual({
      key: 'x',
      props: { interactive: '' },
    });
  });

  it('keeps untrusted values intact without interpreting them', () => {
    const parsed = parseEmbedDirective(':::map{label="</script><img onerror=alert(1)>"}');
    expect(parsed?.props['label']).toBe('</script><img onerror=alert(1)>');
  });

  it('returns null for non-directive lines', () => {
    expect(parseEmbedDirective('not a directive')).toBeNull();
    expect(parseEmbedDirective(':: map')).toBeNull();
    expect(parseEmbedDirective(':::1bad{id=x}')).toBeNull();
    expect(parseEmbedDirective(':::map{id=x} trailing')).toBeNull();
  });
});

describe('serializeEmbedDirective', () => {
  it('serializes a key with no props', () => {
    expect(serializeEmbedDirective({ key: 'map', props: {} })).toBe(':::map');
  });

  it('emits bareword values unquoted', () => {
    expect(serializeEmbedDirective({ key: 'map', props: { id: 'abc-123' } })).toBe(
      ':::map{id=abc-123}',
    );
  });

  it('quotes values that contain spaces or specials', () => {
    expect(serializeEmbedDirective({ key: 'map', props: { title: 'Hello world' } })).toBe(
      ':::map{title="Hello world"}',
    );
  });

  it('leaves a hex color unquoted (bareword)', () => {
    expect(serializeEmbedDirective({ key: 'demo', props: { accent: '#6366f1' } })).toBe(
      ':::demo{accent=#6366f1}',
    );
  });

  it('escapes quotes and backslashes when quoting', () => {
    expect(serializeEmbedDirective({ key: 'x', props: { label: 'a "q" \\ b' } })).toBe(
      ':::x{label="a \\"q\\" \\\\ b"}',
    );
  });

  it('emits a valueless attribute bare', () => {
    expect(serializeEmbedDirective({ key: 'x', props: { interactive: '' } })).toBe(
      ':::x{interactive}',
    );
  });
});

describe('parse/serialize symmetry', () => {
  for (const input of [
    ':::map',
    ':::map{id=2f1c0b9e-7a4d-4c1e-9b2a-1234567890ab}',
    ':::chart{id=42 type=bar}',
    ':::map{id=1 title="Hello world"}',
    ':::demo{title=Revenue accent=#6366f1 metric="1,284" trend=+12.4%}',
    ':::x{interactive}',
  ]) {
    it(`round-trips ${input}`, () => {
      const parsed = parseEmbedDirective(input);
      expect(parsed).not.toBeNull();
      expect(serializeEmbedDirective(parsed!)).toBe(input);
    });
  }
});

describe('toEmbedProps', () => {
  it('keeps only string entries', () => {
    expect(toEmbedProps({ a: 'x', b: 3, c: null, d: 'y' })).toEqual({ a: 'x', d: 'y' });
  });

  it('returns an empty object for non-objects', () => {
    expect(toEmbedProps(undefined)).toEqual({});
    expect(toEmbedProps('nope')).toEqual({});
  });
});
