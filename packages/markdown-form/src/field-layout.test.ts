import { DEFAULT_MARKDOWN_FORM_CONTEXT } from './context';
import { parseMarkdownFormSelectOptions, resolveMarkdownFormFieldWidth } from './field-layout';

describe('Markdown form field layout', () => {
  it('resolves named, fill and bounded fixed widths', () => {
    const widths = DEFAULT_MARKDOWN_FORM_CONTEXT.widths;
    expect(resolveMarkdownFormFieldWidth('large', widths)).toBe('32ch');
    expect(resolveMarkdownFormFieldWidth('fill', widths)).toBe('100%');
    expect(resolveMarkdownFormFieldWidth('14.5rem', widths)).toBe('14.5rem');
    expect(resolveMarkdownFormFieldWidth('101ch', widths)).toBe(widths.medium);
    expect(resolveMarkdownFormFieldWidth('calc(100%)', widths)).toBe(widths.medium);
  });

  it('parses select values and labels with escaped separators', () => {
    expect(parseMarkdownFormSelectOptions('po:Product Owner|dev:Developer|a\\|b:A\\:B')).toEqual([
      { value: 'po', label: 'Product Owner' },
      { value: 'dev', label: 'Developer' },
      { value: 'a|b', label: 'A:B' },
    ]);
  });
});
