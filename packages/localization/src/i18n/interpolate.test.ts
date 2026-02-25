import { describe, it, expect } from 'vitest';
import { interpolate, isMissingTranslation } from './interpolate';

describe('interpolate', () => {
  it('replaces single parameter', () => {
    expect(interpolate('Hello, {name}!', { name: 'Alice' })).toBe('Hello, Alice!');
  });

  it('replaces multiple parameters', () => {
    expect(interpolate('{count} {item}(s)', { count: 3, item: 'apple' })).toBe('3 apple(s)');
  });

  it('returns template unchanged when no params', () => {
    expect(interpolate('Hello, {name}!')).toBe('Hello, {name}!');
  });

  it('replaces missing params with empty string', () => {
    expect(interpolate('{a} and {b}', { a: 'X' })).toBe('X and ');
  });

  it('replaces all unknown params with empty string', () => {
    expect(interpolate('{x}', {})).toBe('');
  });

  it('replaces null/undefined values with empty string', () => {
    expect(interpolate('{a}', { a: null })).toBe('');
    expect(interpolate('{a}', { a: undefined })).toBe('');
  });

  it('converts non-string values', () => {
    expect(interpolate('{n}', { n: 42 })).toBe('42');
    expect(interpolate('{b}', { b: true })).toBe('true');
  });
});

describe('isMissingTranslation', () => {
  it('detects missing when result equals key', () => {
    expect(isMissingTranslation('app.title', 'app.title')).toBe(true);
  });

  it('detects missing for null/undefined', () => {
    expect(isMissingTranslation('app.title', null)).toBe(true);
    expect(isMissingTranslation('app.title', undefined)).toBe(true);
  });

  it('detects missing for empty/whitespace', () => {
    expect(isMissingTranslation('app.title', '')).toBe(true);
    expect(isMissingTranslation('app.title', '   ')).toBe(true);
  });

  it('detects present translation', () => {
    expect(isMissingTranslation('app.title', 'My App')).toBe(false);
  });
});
