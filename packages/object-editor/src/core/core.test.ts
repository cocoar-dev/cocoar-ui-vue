import { describe, expect, it } from 'vitest';
import { formatPointer, getAt, parsePointer, setAt } from './pointer';
import { allowsNull, detectTypeId, nonNullSchema, orderedKeys, resolveSchema } from './resolve';
import { optionsOf } from './options';
import { validateValue } from './validate';
import { issueMessage } from './messages';
import type { JsonSchema } from './schema';

const known = new Set(['text', 'multiline', 'number', 'boolean', 'date', 'email', 'color', 'choice', 'choices', 'tags', 'object', 'list', 'json', 'money']);

const product: JsonSchema = {
  type: 'object',
  required: ['name', 'price'],
  'x-coar-order': ['price', 'name'],
  properties: {
    name: { type: 'string', title: 'Name' },
    price: { $ref: '#/$defs/money', title: 'Price' },
    stock: { type: 'integer', minimum: 0 },
    launch: { type: 'string', format: 'date' },
    category: { oneOf: [{ const: 'a', title: 'A' }, { const: 'b', title: 'B' }] },
    tags: { type: 'array', items: { type: 'string' } },
    dimensions: { type: 'object', properties: { width: { type: 'number', maximum: 100 } } },
    contacts: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' } } } },
  },
  $defs: {
    money: {
      type: 'object',
      required: ['currency'],
      properties: { amount: { type: 'number' }, currency: { enum: ['EUR', 'USD'] } },
    },
  },
};

describe('pointer', () => {
  it('parses and formats escaped tokens', () => {
    expect(parsePointer('/a~1b/c~0d')).toEqual(['a/b', 'c~d']);
    expect(formatPointer(['a/b', 'c~d'])).toBe('/a~1b/c~0d');
    expect(parsePointer('')).toEqual([]);
  });

  it('sets without changing the original and creates missing objects', () => {
    const before = { a: { b: 1 }, keep: [1, 2] };
    const after = setAt(before, ['a', 'c', 'd'], 'x');
    expect(after).toEqual({ a: { b: 1, c: { d: 'x' } }, keep: [1, 2] });
    expect(before).toEqual({ a: { b: 1 }, keep: [1, 2] });
    expect((after as { keep: unknown }).keep).toBe(before.keep);
  });

  it('removes a key with undefined and reads through arrays', () => {
    expect(setAt({ a: 1, b: 2 }, ['a'], undefined)).toEqual({ b: 2 });
    expect(getAt({ list: [{ name: 'x' }] }, ['list', '0', 'name'])).toBe('x');
    expect(getAt({ a: 1 }, ['a', 'b'])).toBeUndefined();
  });
});

describe('resolve', () => {
  it('follows $defs and keeps the keywords beside the reference', () => {
    const price = resolveSchema(product, product.properties!.price);
    expect(price.title).toBe('Price');
    expect(price.required).toEqual(['currency']);
  });

  it('orders keys by x-coar-order, then by properties', () => {
    expect(orderedKeys(product).slice(0, 3)).toEqual(['price', 'name', 'stock']);
  });

  it('recognizes types of a schema without x-coar-type', () => {
    const type = (key: string) => detectTypeId(product, product.properties![key], known);
    expect(type('name')).toBe('text');
    expect(type('price')).toBe('money');
    expect(type('stock')).toBe('number');
    expect(type('launch')).toBe('date');
    expect(type('category')).toBe('choice');
    expect(type('tags')).toBe('tags');
    expect(type('dimensions')).toBe('object');
    expect(type('contacts')).toBe('list');
    expect(detectTypeId(product, { type: 'string', 'x-coar-type': 'multiline' }, known)).toBe('multiline');
    expect(detectTypeId(product, { type: 'string', 'x-coar-type': 'unknown' }, known)).toBe('text');
    expect(detectTypeId(product, { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' }, known)).toBe('color');
  });

  it('sees through null: type arrays, anyOf with null, nullable choices and enums', () => {
    const root: JsonSchema = { $defs: { flag: { type: 'boolean' } } };
    const type = (schema: JsonSchema) => detectTypeId(root, schema, known);
    expect(type({ type: ['boolean', 'null'] })).toBe('boolean');
    expect(type({ anyOf: [{ type: 'string', format: 'date' }, { type: 'null' }] })).toBe('date');
    expect(type({ anyOf: [{ $ref: '#/$defs/flag' }, { type: 'null' }] })).toBe('boolean');
    expect(type({ oneOf: [{ const: 'a' }, { const: 'b' }, { const: null }] })).toBe('choice');
    expect(type({ enum: ['a', null] })).toBe('choice');
    expect(allowsNull({ type: ['integer', 'null'] })).toBe(true);
    expect(allowsNull({ anyOf: [{ type: 'string' }, { type: 'null' }] })).toBe(true);
    expect(allowsNull({ enum: ['a', null] })).toBe(true);
    expect(allowsNull({ type: 'string' })).toBe(false);
    expect(nonNullSchema(root, { type: ['integer', 'null'], minimum: 0 })).toEqual({ type: 'integer', minimum: 0 });
    expect(nonNullSchema(root, { title: 'T', anyOf: [{ type: 'string' }, { type: 'null' }] })).toEqual({ title: 'T', type: 'string' });
    expect(nonNullSchema(root, { enum: ['a', null] })).toEqual({ enum: ['a'] });
  });

  it('reads options with titles, and from enum', () => {
    expect(optionsOf(product.properties!.category)).toEqual([
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ]);
    expect(optionsOf({ enum: ['EUR'] })).toEqual([{ value: 'EUR', label: 'EUR' }]);
  });
});

describe('validateValue', () => {
  const t = (_key: string, _params?: Record<string, unknown>, fallback?: string) => fallback ?? '';

  it('reports each problem at the pointer of its value', () => {
    const issues = validateValue(product, {
      price: { amount: 'x' } as never,
      stock: -1,
      launch: '2026-13-40',
      category: 'z',
      dimensions: { width: 120 },
    });
    expect(issues).toEqual(
      expect.arrayContaining([
        { pointer: '/name', keyword: 'required' },
        { pointer: '/price/currency', keyword: 'required' },
        { pointer: '/price/amount', keyword: 'type' },
        { pointer: '/stock', keyword: 'minimum' },
        { pointer: '/launch', keyword: 'format' },
        { pointer: '/category', keyword: 'oneOf' },
        { pointer: '/dimensions/width', keyword: 'maximum' },
      ]),
    );
    expect(issues.some((issue) => ['properties', '$ref', 'const'].includes(issue.keyword))).toBe(false);
  });

  it('accepts a valid value, unknown properties and lists of objects', () => {
    expect(
      validateValue(product, {
        name: 'Lamp',
        price: { amount: 1, currency: 'EUR' },
        extra: { kept: true },
        contacts: [{ name: 'Anna' }],
      }),
    ).toEqual([]);
  });

  it('reports a missing required value of an empty object, in display order', () => {
    expect(validateValue(product, undefined)).toEqual([
      { pointer: '/price', keyword: 'required' },
      { pointer: '/name', keyword: 'required' },
    ]);
  });

  it('counts a required key as there by its key, or by a filled value with presence filled (#86)', () => {
    const schema: JsonSchema = {
      type: 'object',
      required: ['flag', 'name', 'tags', 'group'],
      properties: {
        flag: { type: ['boolean', 'null'] },
        name: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        group: { type: 'object' },
      },
    };
    const sparse = { flag: null, name: '', tags: [], group: {} };
    expect(validateValue(schema, sparse)).toEqual([]);
    expect(validateValue(schema, {}).map((issue) => issue.pointer)).toEqual(['/flag', '/name', '/tags', '/group']);
    expect(validateValue(schema, sparse, { presence: 'filled' }).map((issue) => issue.pointer)).toEqual([
      '/flag',
      '/name',
      '/tags',
      '/group',
    ]);
    expect(validateValue(schema, { flag: false, name: 'x', tags: ['a'], group: { a: 1 } }, { presence: 'filled' })).toEqual([]);
  });

  it('reports required keys that have no schema in properties (#92)', () => {
    expect(validateValue({ type: 'object', required: ['flag'] }, {})).toEqual([{ pointer: '/flag', keyword: 'required' }]);
    const nested: JsonSchema = {
      type: 'object',
      properties: { settings: { type: 'object', required: ['mode'] } },
    };
    expect(validateValue(nested, { settings: {} })).toEqual([{ pointer: '/settings/mode', keyword: 'required' }]);
    expect(validateValue(nested, { settings: { mode: 'x' } })).toEqual([]);
  });

  it('writes messages with the limits of the schema', () => {
    expect(issueMessage({ pointer: '/stock', keyword: 'minimum' }, { minimum: 0 }, t)).toBe('At least 0.');
    expect(issueMessage({ pointer: '/x', keyword: 'format' }, { format: 'email' }, t)).toBe(
      'Not a valid email address.',
    );
    expect(issueMessage({ pointer: '/x', keyword: 'custom', message: 'Pick a currency.' }, {}, t)).toBe(
      'Pick a currency.',
    );
  });
});
