import { parse } from '@cocoar/vue-markdown-core';
import { DEFAULT_MARKDOWN_FORM_CONTEXT } from './context';
import { BUILTIN_MARKDOWN_FORM_FIELDS } from './registry';
import {
  analyzeMarkdownFormTemplate,
  collectMarkdownFormFields,
  parseInlineMarkdownFormFields,
} from './template-parser';

describe('Markdown form template parser', () => {
  it('finds multiple inline fields without losing surrounding text', () => {
    const segments = parseInlineMarkdownFormFields(
      'A :field{id=first type=text} B :field{id=second type=number} C',
      'node',
    );

    expect(
      segments.map((segment) => (segment.type === 'text' ? segment.text : segment.field.id)),
    ).toEqual(['A ', 'first', ' B ', 'second', ' C']);
  });

  it('allows a closing brace inside quoted attributes', () => {
    const segments = parseInlineMarkdownFormFields(
      ':field{id=note placeholder="Reason } details"}',
    );

    expect(segments).toHaveLength(1);
    expect(segments[0]?.type).toBe('field');
    if (segments[0]?.type === 'field') {
      expect(segments[0].field.props['placeholder']).toBe('Reason } details');
    }
  });

  it('leaves escaped and incomplete directives as text', () => {
    expect(parseInlineMarkdownFormFields('\\:field{id=literal}')).toEqual([
      { type: 'text', text: '\\:field{id=literal}' },
    ]);
    expect(parseInlineMarkdownFormFields(':field{id=incomplete')).toEqual([
      { type: 'text', text: ':field{id=incomplete' },
    ]);
  });

  it('collects canonical inline and block fields from the Markdown document', () => {
    const doc = parse(
      [
        '**Name:** :field{id=name type=text required}',
        '',
        ':::field{id=notes type=markdown required}',
      ].join('\n'),
    );

    const fields = collectMarkdownFormFields(doc);
    expect(
      fields.map((field) => ({
        id: field.id,
        type: field.type,
        source: field.source,
        layout: field.layout,
        required: field.required,
      })),
    ).toEqual([
      { id: 'name', type: 'text', source: 'inline', layout: 'inline', required: true },
      { id: 'notes', type: 'markdown', source: 'block', layout: 'block', required: true },
    ]);
  });

  it('keeps the markdown-field POC alias readable', () => {
    const fields = collectMarkdownFormFields(parse(':::markdown-field{id=notes}'));
    expect(fields).toHaveLength(1);
    expect(fields[0]?.type).toBe('markdown');
  });

  it('reports missing, duplicate, unknown and unsupported fields', () => {
    const doc = parse(
      [
        ':field{type=text}',
        '',
        ':field{id=same type=text}',
        '',
        ':field{id=same type=missing}',
        '',
        ':field{id=inlineMarkdown type=markdown}',
      ].join('\n'),
    );

    const result = analyzeMarkdownFormTemplate(
      doc,
      BUILTIN_MARKDOWN_FORM_FIELDS,
      DEFAULT_MARKDOWN_FORM_CONTEXT.messages,
    );

    expect(result.issues.map((issue) => issue.code)).toEqual([
      'missing-id',
      'duplicate-id',
      'unknown-type',
      'unsupported-layout',
    ]);
  });
});
