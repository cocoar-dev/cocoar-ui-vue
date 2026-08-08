import type { CoarScriptEditorExtraLib } from '@cocoar/vue-script-editor';
import type { PageConfig, PageFieldSpec } from '../schema';

interface ContextTypeNode {
  type?: string;
  children: Map<string, ContextTypeNode>;
}

function fieldType(field: PageFieldSpec): string {
  switch (field.valueType) {
    case 'string': return 'string';
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'string[]': return 'readonly string[]';
    case 'date':
    case 'datetime': return 'string';
    default: return 'unknown';
  }
}

function contextFieldType(field: NonNullable<PageConfig['contextFields']>[number]): string {
  if (field.type === 'string[]') return 'readonly string[]';
  if (field.type === 'array') {
    const item = field.itemFields?.length
      ? `Readonly<{ ${field.itemFields.map((entry) => `readonly ${JSON.stringify(entry.path)}: ${entry.type === 'string[]' ? 'readonly string[]' : entry.type === 'object' ? 'Readonly<Record<string, unknown>>' : entry.type};`).join(' ')} }>`
      : 'unknown';
    return `readonly ${item}[]`;
  }
  if (field.type === 'object') return 'Readonly<Record<string, unknown>>';
  return field.type;
}

function contextLines(config?: PageConfig): string {
  const fields = config?.contextFields ?? [];
  if (fields.length === 0) return '  readonly [name: string]: unknown;';
  const root: ContextTypeNode = { children: new Map() };
  for (const field of fields) {
    const parts = field.path.split('.').filter(Boolean);
    let current = root;
    for (const part of parts) {
      let child = current.children.get(part);
      if (!child) {
        child = { children: new Map() };
        current.children.set(part, child);
      }
      current = child;
    }
    current.type = contextFieldType(field);
  }
  const render = (node: ContextTypeNode, depth: number): string => [...node.children.entries()]
    .map(([key, child]) => {
      const indentation = '  '.repeat(depth);
      const type = child.children.size > 0
        ? `Readonly<{\n${render(child, depth + 1)}\n${indentation}}>`
        : child.type ?? 'unknown';
      return `${indentation}readonly ${JSON.stringify(key)}: ${type};`;
    })
    .join('\n');
  return render(root, 1);
}

export function runtimeTypeLibrary(config?: PageConfig): CoarScriptEditorExtraLib[] {
  const fields = config?.fields ?? [];
  const fieldLines = fields.length
    ? fields.map((field) => `  readonly ${JSON.stringify(field.name)}: ${fieldType(field)};`).join('\n')
    : '  readonly [name: string]: unknown;';
  const typedContextLines = contextLines(config);

  return [{
    filePath: 'file:///page-builder/page-runtime.d.ts',
    content: `
interface PageFields {
${fieldLines}
}
interface PageForm {
  readonly valid: boolean;
  readonly dirty: boolean;
  readonly validating: boolean;
  readonly submitting: boolean;
}
interface PageContext {
${typedContextLines}
}
interface PageResourceState<T = unknown> {
  readonly status: 'idle' | 'pending' | 'success' | 'error';
  readonly value?: T;
  readonly error?: string;
}
interface PageResources {
  readonly [id: string]: PageResourceState;
}
interface PageViewport {
  readonly width: number;
  readonly breakpoint: 'compact' | 'phone' | 'tablet' | 'desktop';
}
`,
  }];
}

export const EXPRESSION_PREAMBLE = `
const fields = /** @type {Readonly<PageFields>} */ ({});
const form = /** @type {Readonly<PageForm>} */ ({});
const context = /** @type {Readonly<PageContext>} */ ({});
const resources = /** @type {Readonly<PageResources>} */ ({});
const viewport = /** @type {Readonly<PageViewport>} */ ({});
`;

export function expectedExpressionType(target: string): string {
  if (target === 'disabled' || target === 'style.hidden' || target.endsWith('.disabled')) return 'boolean';
  if (target.startsWith('style.') || /label|text|title|placeholder|alt/i.test(target)) return 'string';
  return 'JSON value';
}

export function expressionLiteral(value: unknown): string {
  if (value === undefined) return 'undefined';
  return JSON.stringify(value) ?? 'undefined';
}
