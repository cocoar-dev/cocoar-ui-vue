import {
  parseEmbedDirective,
  toEmbedProps,
  type MarkdownDocument,
  type MarkdownNode,
} from '@cocoar/vue-markdown-core';
import type {
  MarkdownFormField,
  MarkdownFormFieldLayout,
  MarkdownFormFieldRegistry,
  MarkdownFormMessages,
  MarkdownFormTemplateIssue,
} from './types';

export type MarkdownFormInlineSegment =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'field'; readonly field: MarkdownFormField };

const INLINE_PREFIX = ':field{';
const LAYOUTS = new Set<MarkdownFormFieldLayout>(['inline', 'row', 'stacked', 'block']);

function isEscaped(source: string, index: number): boolean {
  let slashes = 0;
  for (let cursor = index - 1; cursor >= 0 && source[cursor] === '\\'; cursor -= 1) slashes += 1;
  return slashes % 2 === 1;
}

function directiveEnd(source: string, start: number): number {
  let quote: '"' | "'" | null = null;
  let escaped = false;
  for (let cursor = start; cursor < source.length; cursor += 1) {
    const character = source[cursor];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '}') return cursor;
  }
  return -1;
}

function truthyAttribute(props: Readonly<Record<string, string>>, key: string): boolean {
  if (!(key in props)) return false;
  const value = props[key].trim().toLowerCase();
  return value === '' || !['false', '0', 'no', 'off'].includes(value);
}

export function createMarkdownFormField(
  props: Readonly<Record<string, string>>,
  source: 'inline' | 'block',
  occurrenceId: string,
  defaultType = 'text',
): MarkdownFormField {
  const requestedLayout = props['layout'];
  const fallbackLayout: MarkdownFormFieldLayout = source === 'block' ? 'block' : 'inline';
  const layout = LAYOUTS.has(requestedLayout as MarkdownFormFieldLayout)
    ? (requestedLayout as MarkdownFormFieldLayout)
    : fallbackLayout;
  return {
    occurrenceId,
    id: (props['id'] ?? '').trim(),
    type: (props['type'] || defaultType).trim(),
    source,
    layout,
    width: props['width'] || (layout === 'block' || layout === 'stacked' ? 'full' : 'medium'),
    required: truthyAttribute(props, 'required'),
    props,
  };
}

export function parseInlineMarkdownFormFields(
  source: string,
  nodeId = 'inline',
): MarkdownFormInlineSegment[] {
  const segments: MarkdownFormInlineSegment[] = [];
  let cursor = 0;
  let searchCursor = 0;
  let occurrence = 0;

  while (searchCursor < source.length) {
    let start = source.indexOf(INLINE_PREFIX, searchCursor);
    while (start >= 0 && isEscaped(source, start)) {
      start = source.indexOf(INLINE_PREFIX, start + INLINE_PREFIX.length);
    }
    if (start < 0) break;

    const end = directiveEnd(source, start + INLINE_PREFIX.length);
    if (end < 0) break;
    const directive = parseEmbedDirective(
      `:::field{${source.slice(start + INLINE_PREFIX.length, end)}}`,
    );
    if (!directive) {
      searchCursor = end + 1;
      continue;
    }

    if (start > cursor) segments.push({ type: 'text', text: source.slice(cursor, start) });
    segments.push({
      type: 'field',
      field: createMarkdownFormField(directive.props, 'inline', `${nodeId}:${start}:${occurrence}`),
    });
    occurrence += 1;
    cursor = end + 1;
    searchCursor = cursor;
  }

  if (cursor < source.length) segments.push({ type: 'text', text: source.slice(cursor) });
  return segments.length > 0 ? segments : [{ type: 'text', text: source }];
}

export function fieldFromEmbedNode(node: MarkdownNode): MarkdownFormField | null {
  if (node.type !== 'embed') return null;
  const key = typeof node.attrs?.['key'] === 'string' ? node.attrs['key'] : '';
  if (key !== 'field' && key !== 'markdown-field') return null;
  const props = toEmbedProps(node.attrs?.['props']);
  return createMarkdownFormField(
    props,
    'block',
    node.id,
    key === 'markdown-field' ? 'markdown' : 'text',
  );
}

export function collectMarkdownFormFields(doc: MarkdownDocument): MarkdownFormField[] {
  const fields: MarkdownFormField[] = [];
  const visit = (node: MarkdownNode): void => {
    const blockField = fieldFromEmbedNode(node);
    if (blockField) fields.push(blockField);
    if (node.type === 'text' && node.text) {
      for (const segment of parseInlineMarkdownFormFields(node.text, node.id)) {
        if (segment.type === 'field') fields.push(segment.field);
      }
    }
    for (const child of node.children ?? []) visit(child);
  };
  for (const node of doc.nodes) visit(node);
  return fields;
}

export function analyzeMarkdownFormTemplate(
  doc: MarkdownDocument,
  registry: Readonly<MarkdownFormFieldRegistry>,
  messages: Readonly<MarkdownFormMessages>,
): { fields: readonly MarkdownFormField[]; issues: readonly MarkdownFormTemplateIssue[] } {
  const fields = collectMarkdownFormFields(doc);
  const issues: MarkdownFormTemplateIssue[] = [];
  const seen = new Set<string>();

  for (const field of fields) {
    if (!field.id) {
      issues.push({ code: 'missing-id', message: messages.missingId(field), field });
      continue;
    }
    if (seen.has(field.id)) {
      issues.push({ code: 'duplicate-id', message: messages.duplicateId(field), field });
    } else {
      seen.add(field.id);
    }
    const definition = registry[field.type];
    if (!definition) {
      issues.push({ code: 'unknown-type', message: messages.unknownType(field), field });
    } else if (definition.layouts && !definition.layouts.includes(field.layout)) {
      issues.push({
        code: 'unsupported-layout',
        message: messages.unsupportedLayout(field),
        field,
      });
    }
  }

  return { fields, issues };
}
