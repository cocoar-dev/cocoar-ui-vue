import type { MarkdownFormFieldWidths, MarkdownFormNamedWidth } from './types';

const NAMED_WIDTHS = new Set<MarkdownFormNamedWidth>(['small', 'medium', 'large']);
const FIXED_WIDTH = /^(\d+(?:\.\d+)?)(ch|rem)$/;

export function resolveMarkdownFormFieldWidth(
  source: string | undefined,
  widths: MarkdownFormFieldWidths,
): string {
  const candidate = source?.trim() || 'medium';
  if (NAMED_WIDTHS.has(candidate as MarkdownFormNamedWidth)) {
    return widths[candidate as MarkdownFormNamedWidth];
  }
  if (candidate === 'fill' || candidate === 'full') return '100%';

  const fixed = FIXED_WIDTH.exec(candidate);
  if (!fixed) return widths.medium;
  const amount = Number(fixed[1]);
  const maximum = fixed[2] === 'ch' ? 100 : 80;
  if (amount <= 0 || amount > maximum) return widths.medium;
  return candidate;
}

export function parseFiniteNumber(source: string | undefined): number | undefined {
  if (source === undefined || source.trim() === '') return undefined;
  const parsed = Number(source);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export interface MarkdownFormSelectOption {
  value: string;
  label: string;
}

function splitEscaped(source: string, separator: string): string[] {
  const result: string[] = [];
  let current = '';
  let escaped = false;
  for (const character of source) {
    if (escaped) {
      current += character;
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === separator) {
      result.push(current);
      current = '';
    } else {
      current += character;
    }
  }
  if (escaped) current += '\\';
  result.push(current);
  return result;
}

export function parseMarkdownFormSelectOptions(
  source: string | undefined,
): MarkdownFormSelectOption[] {
  if (!source) return [];
  return splitEscaped(source, '|')
    .map((entry) => {
      const [value, ...labelParts] = splitEscaped(entry, ':');
      const normalizedValue = value.trim();
      return {
        value: normalizedValue,
        label: labelParts.join(':').trim() || normalizedValue,
      };
    })
    .filter((option) => option.value.length > 0);
}
