import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020';
import {
  addProperty,
  changePropertyType,
  moveProperty,
  propertyOptions,
  removeProperty,
  renameProperty,
  setOptions,
  setRequired,
  uniqueKey,
  updateProperty,
} from './schema-ops';
import { checkSchema } from './schema-check';
import { orderedKeys } from './resolve';
import { createObjectSchema, type JsonSchema } from './schema';
import { validateValue } from './validate';
import { defineObjectEditorTypes } from '../types/builtins';
import type { CoarValueType } from '../types/types';

const money: CoarValueType = {
  id: 'money',
  label: 'Money',
  icon: 'hash',
  schema: { type: 'object', required: ['currency'], properties: { amount: { type: 'number' }, currency: { enum: ['EUR'] } } },
};
const types = defineObjectEditorTypes([money]);
const type = (id: string) => types.get(id)!;

function build(): JsonSchema {
  let schema = createObjectSchema();
  schema = addProperty(schema, [], 'name', type('text'));
  schema = addProperty(schema, [], 'price', type('money'));
  schema = addProperty(schema, [], 'dimensions', type('object'));
  schema = addProperty(schema, ['dimensions'], 'width', type('number'));
  schema = addProperty(schema, [], 'category', type('choice'));
  schema = addProperty(schema, [], 'tags', type('choices'));
  return schema;
}

describe('schema operations', () => {
  it('adds built-in types inline and app types as a reference into $defs', () => {
    const schema = build();
    expect(schema.properties!.name).toEqual({ type: 'string', 'x-coar-type': 'text' });
    expect(schema.properties!.price).toEqual({ $ref: '#/$defs/money', 'x-coar-type': 'money' });
    expect(schema.$defs!.money).toEqual(money.schema);
    expect(orderedKeys(schema)).toEqual(['name', 'price', 'dimensions', 'category', 'tags']);
    expect(Object.keys(schema.properties!.dimensions.properties!)).toEqual(['width']);
  });

  it('never changes the schema it gets', () => {
    const before = build();
    const copy = structuredClone(before);
    removeProperty(before, ['price']);
    renameProperty(before, ['name'], 'title');
    setRequired(before, ['name'], true);
    expect(before).toEqual(copy);
  });

  it('renames in place, keeping position and required', () => {
    let schema = setRequired(build(), ['price'], true);
    schema = renameProperty(schema, ['price'], 'cost');
    expect(orderedKeys(schema)).toEqual(['name', 'cost', 'dimensions', 'category', 'tags']);
    expect(schema.required).toEqual(['cost']);
    expect(() => renameProperty(schema, ['cost'], 'name')).toThrow();
  });

  it('removes a property with its order, required entry and the definition only it used', () => {
    let schema = setRequired(build(), ['price'], true);
    schema = { ...schema, $defs: { ...schema.$defs, handWritten: { type: 'string' } } };
    schema = removeProperty(schema, ['price']);
    expect(schema.properties!.price).toBeUndefined();
    expect(schema.required).toBeUndefined();
    expect(schema['x-coar-order']).not.toContain('price');
    expect(Object.keys(schema.$defs!)).toEqual(['handWritten']);
  });

  it('moves properties and keeps the order of required keys', () => {
    let schema = moveProperty(build(), ['price'], -1);
    expect(orderedKeys(schema).slice(0, 2)).toEqual(['price', 'name']);
    schema = setRequired(setRequired(schema, ['name'], true), ['price'], true);
    expect(schema.required).toEqual(['price', 'name']);
    expect(moveProperty(schema, ['price'], -1)).toEqual(schema);
  });

  it('changes the type and keeps title and description', () => {
    let schema = updateProperty(build(), ['name'], { title: 'Name', description: 'Shown as heading' });
    schema = changePropertyType(schema, ['name'], type('number'));
    expect(schema.properties!.name).toEqual({ type: 'number', 'x-coar-type': 'number', title: 'Name', description: 'Shown as heading' });
    expect(updateProperty(schema, ['name'], { description: undefined }).properties!.name.description).toBeUndefined();
  });

  it('writes options of a choice as oneOf and of a multiple choice as items.anyOf', () => {
    const options = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }];
    let schema = setOptions(build(), ['category'], options);
    schema = setOptions(schema, ['tags'], options);
    expect(schema.properties!.category.oneOf).toEqual([{ const: 'a', title: 'A' }, { const: 'b', title: 'B' }]);
    expect(schema.properties!.tags.items).toEqual({ anyOf: [{ const: 'a', title: 'A' }, { const: 'b', title: 'B' }] });
    expect(propertyOptions(schema.properties!.tags)).toEqual(options);
  });

  it('finds a free key', () => {
    expect(uniqueKey(build(), 'name')).toBe('name2');
    expect(uniqueKey(build())).toBe('property');
  });
});

describe('checkSchema', () => {
  it('finds bad keys, ranges and option lists, also in groups', () => {
    let schema = build();
    schema = updateProperty(schema, ['dimensions', 'width'], { minimum: 10, maximum: 1 });
    schema = setOptions(schema, ['category'], [{ value: 'a', label: 'A' }, { value: 'a', label: 'B' }]);
    schema = setOptions(schema, ['tags'], []);
    schema = addProperty(schema, [], '1st key', type('text'));
    expect(checkSchema(schema)).toEqual([
      { path: ['dimensions', 'width'], field: 'range', code: 'rangeOrder' },
      { path: ['category'], field: 'options', code: 'duplicateOption' },
      { path: ['tags'], field: 'options', code: 'noOptions' },
      { path: ['1st key'], field: 'key', code: 'invalidKey' },
    ]);
    expect(checkSchema(build())).toEqual([]);
  });
});

describe('round trip', () => {
  it('writes standard JSON Schema that a second validator accepts and applies alike', () => {
    let schema = setRequired(build(), ['name'], true);
    schema = updateProperty(schema, ['dimensions', 'width'], { minimum: 0 });
    schema = setOptions(schema, ['category'], [{ value: 'a', label: 'A' }]);
    schema = setOptions(schema, ['tags'], [{ value: 'x', label: 'X' }]);
    const ajv = new Ajv2020({ strict: false });
    const validate = ajv.compile(schema);
    const good = { name: 'Lamp', price: { amount: 1, currency: 'EUR' }, dimensions: { width: 3 }, category: 'a', tags: ['x'], extra: [{ kept: true }] };
    const bad = { price: { amount: 1 }, dimensions: { width: -1 }, category: 'z', tags: ['y'] };
    expect(validate(good)).toBe(true);
    expect(validateValue(schema, good)).toEqual([]);
    expect(validate(bad)).toBe(false);
    expect(validateValue(schema, bad).map((issue) => issue.pointer).sort()).toEqual(
      ['/category', '/dimensions/width', '/name', '/price/currency', '/tags/0'],
    );
  });
});
