import { describe, it, expect } from 'vitest';
import { defineComponent } from 'vue';
import {
  isFieldCompatible,
  compatibleFields,
  compatibleElementTypes,
  defaultElementForField,
} from './fieldContract';
import type { PageElementRegistry } from './registry';
import type { PageFieldSpec } from '../schema';

const Dummy = () => defineComponent({ name: 'DummyElement', template: '<div />' });

const FIELDS: PageFieldSpec[] = [
  { name: 'username', valueType: 'string', required: true },
  { name: 'rememberMe', valueType: 'boolean' },
  { name: 'age', valueType: 'number' },
];

describe('isFieldCompatible', () => {
  it('matches on exact value-type tokens', () => {
    const def = { renderer: Dummy(), value: { types: ['string'] } };
    expect(isFieldCompatible(def, FIELDS[0])).toBe(true);
    expect(isFieldCompatible(def, FIELDS[1])).toBe(false);
  });

  it('treats a value spec without declared types as unconstrained', () => {
    const def = { renderer: Dummy(), value: {} };
    expect(isFieldCompatible(def, FIELDS[1])).toBe(true);
  });

  it('never matches non-value elements', () => {
    expect(isFieldCompatible({ renderer: Dummy() }, FIELDS[0])).toBe(false);
  });
});

describe('compatibleFields', () => {
  it('filters the contract to what the element can edit', () => {
    const def = { renderer: Dummy(), value: { types: ['number'] } };
    expect(compatibleFields(def, FIELDS).map((f) => f.name)).toEqual(['age']);
  });

  it('is empty without a definition or contract', () => {
    expect(compatibleFields(undefined, FIELDS)).toEqual([]);
    expect(compatibleFields({ renderer: Dummy(), value: {} }, undefined)).toEqual([]);
  });
});

describe('compatibleElementTypes / defaultElementForField', () => {
  const registry: PageElementRegistry = {
    'text-input': { renderer: Dummy(), value: { types: ['string'] }, builder: { label: { key: 'x', fallback: 'Text' }, defaults: () => ({}) } },
    'password-input': { renderer: Dummy(), value: { types: ['string'] }, builder: { label: { key: 'x', fallback: 'PW' }, defaults: () => ({}) } },
    checkbox: { renderer: Dummy(), value: { types: ['boolean'] }, builder: { label: { key: 'x', fallback: 'CB' }, defaults: () => ({}) } },
    heading: { renderer: Dummy() }, // no value spec — never a representation
    'acme-widget': { renderer: Dummy(), value: {} }, // unconstrained, renderer-only half
  };

  it('lists value elements in registry order, honoring declared types', () => {
    expect(compatibleElementTypes(registry, 'string')).toEqual([
      'text-input', 'password-input', 'acme-widget',
    ]);
    expect(compatibleElementTypes(registry, 'boolean')).toEqual(['checkbox', 'acme-widget']);
  });

  it('resolves the default element: explicit defaultElement wins, else first compatible WITH a builder half', () => {
    expect(defaultElementForField(registry, { name: 'pw', valueType: 'string', defaultElement: 'password-input' }))
      .toBe('password-input');
    expect(defaultElementForField(registry, { name: 'u', valueType: 'string' })).toBe('text-input');
    // acme-widget is compatible but has no builder half — not placeable.
    expect(defaultElementForField(registry, { name: 'x', valueType: 'geo' })).toBe(undefined);
  });
});

describe('allowedElements governs the contract helpers', () => {
  const registry: PageElementRegistry = {
    'text-input': { renderer: Dummy(), value: { types: ['string'] }, builder: { label: { key: 'x', fallback: 'Text' }, defaults: () => ({}) } },
    'password-input': { renderer: Dummy(), value: { types: ['string'] }, builder: { label: { key: 'x', fallback: 'PW' }, defaults: () => ({}) } },
  };

  it('compatibleElementTypes drops disallowed elements', () => {
    expect(compatibleElementTypes(registry, 'string', { allowedElements: ['text-input'] }))
      .toEqual(['text-input']);
  });

  it('defaultElementForField ignores a disallowed defaultElement and falls back to the first ALLOWED one', () => {
    const field: PageFieldSpec = { name: 'pw', valueType: 'string', defaultElement: 'password-input' };
    expect(defaultElementForField(registry, field, { allowedElements: ['text-input'] }))
      .toBe('text-input');
    expect(defaultElementForField(registry, field, { allowedElements: [] })).toBe(undefined);
  });
});
