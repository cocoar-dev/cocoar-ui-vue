import type { JsonObject, JsonSchema } from '@cocoar/vue-object-editor';

/** The product of the demos: a plain JSON Schema with a few x-coar-* hints. */
export const productSchema: JsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  required: ['name', 'launchDate'],
  'x-coar-order': ['name', 'description', 'stock', 'active', 'launchDate', 'category', 'color', 'tags', 'supportEmail', 'dimensions'],
  properties: {
    name: { type: 'string', title: 'Product name', 'x-coar-type': 'text' },
    description: { type: 'string', title: 'Description', 'x-coar-type': 'multiline' },
    stock: { type: 'integer', title: 'Stock', minimum: 0, 'x-coar-unit': 'pcs', 'x-coar-type': 'number' },
    active: { type: 'boolean', title: 'Visible in the shop', 'x-coar-type': 'boolean' },
    launchDate: { type: 'string', format: 'date', title: 'Launch date', 'x-coar-type': 'date' },
    category: {
      title: 'Category',
      'x-coar-type': 'choice',
      oneOf: [
        { const: 'lighting', title: 'Lighting' },
        { const: 'furniture', title: 'Furniture' },
        { const: 'accessories', title: 'Accessories' },
      ],
    },
    color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', title: 'Main colour', 'x-coar-type': 'color' },
    tags: {
      type: 'array',
      uniqueItems: true,
      items: { type: 'string' },
      title: 'Tags',
      'x-coar-type': 'tags',
      'x-coar-suggestions': ['minimal', 'led', 'dimmable', 'new'],
    },
    supportEmail: { type: 'string', format: 'email', title: 'Support address', 'x-coar-type': 'email' },
    dimensions: {
      type: 'object',
      title: 'Dimensions',
      'x-coar-type': 'object',
      properties: {
        width: { type: 'number', title: 'Width', minimum: 0, 'x-coar-unit': 'cm', 'x-coar-decimals': 1 },
        height: { type: 'number', title: 'Height', minimum: 0, 'x-coar-unit': 'cm', 'x-coar-decimals': 1 },
      },
    },
  },
};

export function createProduct(): JsonObject {
  return {
    name: 'Cocoar Desk Lamp',
    description: 'Slim LED desk lamp in powder-coated aluminium.\nDimmable, with warm and cool light.',
    stock: 42,
    active: true,
    launchDate: '2026-12-01',
    category: 'lighting',
    color: '#E8B04B',
    tags: ['minimal', 'led'],
    supportEmail: 'support@cocoar',
    dimensions: { width: 18, height: 45 },
  };
}
