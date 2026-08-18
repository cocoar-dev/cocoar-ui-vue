import { DEFAULT_MARKDOWN_FORM_CONTEXT } from './context';
import { createMarkdownFormField } from './template-parser';
import { BUILTIN_MARKDOWN_FORM_FIELDS, mergeMarkdownFormFields } from './registry';

describe('Markdown form field registry', () => {
  it('ships the release field set', () => {
    expect(Object.keys(BUILTIN_MARKDOWN_FORM_FIELDS)).toEqual([
      'text',
      'number',
      'date',
      'datetime',
      'boolean',
      'select',
      'markdown',
    ]);
  });

  it('lets consumers override a built-in or add a custom type', () => {
    const customText = { ...BUILTIN_MARKDOWN_FORM_FIELDS.text, valueType: 'custom-text' };
    const registry = mergeMarkdownFormFields({
      text: customText,
      rating: { control: {}, valueType: 'number' },
    });

    expect(registry.text).toBe(customText);
    expect(registry.rating?.valueType).toBe('number');
    expect(registry.markdown).toBe(BUILTIN_MARKDOWN_FORM_FIELDS.markdown);
  });

  it('formats typed readonly values', () => {
    const numberField = createMarkdownFormField(
      { id: 'duration', type: 'number', decimals: '0', suffix: 'Min.' },
      'inline',
      'number',
    );
    const booleanField = createMarkdownFormField(
      { id: 'approved', type: 'boolean', trueLabel: 'Freigegeben' },
      'inline',
      'boolean',
    );

    expect(
      BUILTIN_MARKDOWN_FORM_FIELDS.number?.formatReadonly?.(45, numberField, {
        ...DEFAULT_MARKDOWN_FORM_CONTEXT,
        locale: 'de-AT',
      }),
    ).toBe('45 Min.');
    expect(
      BUILTIN_MARKDOWN_FORM_FIELDS.boolean?.formatReadonly?.(
        true,
        booleanField,
        DEFAULT_MARKDOWN_FORM_CONTEXT,
      ),
    ).toBe('Freigegeben');
  });
});
