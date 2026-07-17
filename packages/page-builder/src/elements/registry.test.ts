import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent } from 'vue';
import {
  definePageElement,
  mergeElementRegistries,
  ELEMENT_KEY_PATTERN,
  PAGE_ELEMENTS_KEY,
  type PageElementRegistry,
} from './registry';

const Dummy = () => defineComponent({ name: 'DummyElement', template: '<div />' });

describe('definePageElement', () => {
  it('returns the definition unchanged (identity helper)', () => {
    const def = { renderer: Dummy() };
    expect(definePageElement(def)).toBe(def);
  });

  it('marks all component fields raw', () => {
    const renderer = Dummy();
    const preview = Dummy();
    const inspector = Dummy();
    const defaultValueInput = Dummy();
    definePageElement({
      renderer,
      builder: {
        label: { key: 'x', fallback: 'X' },
        defaults: () => ({}),
        preview,
        inspector,
        defaultValueInput,
      },
    });
    for (const c of [renderer, preview, inspector, defaultValueInput]) {
      expect((c as { __v_skip?: boolean }).__v_skip).toBe(true);
    }
  });

  it('preserves the props generic for hooks (compile-time contract)', () => {
    interface RatingProps extends Record<string, unknown> {
      max: number;
    }
    const def = definePageElement<RatingProps>({
      renderer: Dummy(),
      value: {
        // `props.max` must typecheck as number — this test fails to COMPILE
        // if the generic erodes.
        defaultValue: (props) => Math.min(5, props.max),
      },
    });
    const registry: PageElementRegistry = { 'acme-rating': def };
    expect(registry['acme-rating']).toBe(def);
  });
});

describe('mergeElementRegistries', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('merges additively and returns a new object', () => {
    const base: PageElementRegistry = { heading: { renderer: Dummy() } };
    const overlay: PageElementRegistry = { 'acme-rating': { renderer: Dummy() } };
    const merged = mergeElementRegistries(base, overlay);
    expect(Object.keys(merged).sort()).toEqual(['acme-rating', 'heading']);
    expect(merged).not.toBe(base);
    expect(Object.keys(base)).toEqual(['heading']);
  });

  it('returns a copy of the base when there is no overlay', () => {
    const base: PageElementRegistry = { heading: { renderer: Dummy() } };
    const merged = mergeElementRegistries(base);
    expect(merged).not.toBe(base);
    expect(merged.heading).toBe(base.heading);
  });

  it('warns in DEV when an overlay key shadows a base key (overlay wins)', () => {
    const base: PageElementRegistry = { heading: { renderer: Dummy() } };
    const override = { renderer: Dummy() };
    const merged = mergeElementRegistries(base, { heading: override });
    expect(merged.heading).toBe(override);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('shadows'));
  });

  it('warns in DEV on keys outside the portable grammar', () => {
    mergeElementRegistries({}, { 'Acme:Rating': { renderer: Dummy() } });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('kebab-case'));
  });
});

describe('key grammar + injection key', () => {
  it('accepts kebab keys and rejects colons/uppercase/leading digits', () => {
    expect(ELEMENT_KEY_PATTERN.test('acme-rating')).toBe(true);
    expect(ELEMENT_KEY_PATTERN.test('rating2')).toBe(true);
    expect(ELEMENT_KEY_PATTERN.test('acme:rating')).toBe(false);
    expect(ELEMENT_KEY_PATTERN.test('Rating')).toBe(false);
    expect(ELEMENT_KEY_PATTERN.test('2rating')).toBe(false);
  });

  it('uses a Symbol.for channel (shared across module instances)', () => {
    expect(PAGE_ELEMENTS_KEY).toBe(Symbol.for('coar:page-elements'));
  });
});
