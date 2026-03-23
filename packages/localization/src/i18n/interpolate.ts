/**
 * Interpolate parameters into a translation string.
 * Replaces {param} placeholders with values from the params object.
 * Missing params are replaced with empty string.
 *
 * @example
 * interpolate('Hello, {name}!', { name: 'Alice' }) → 'Hello, Alice!'
 * interpolate('{count} items', { count: 42 }) → '42 items'
 * interpolate('Hello, {name}!', {}) → 'Hello, !'
 */
export function interpolate(
  template: string,
  params?: Record<string, unknown>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = params[key];
    if (value == null) return '';
    return String(value);
  });
}

/**
 * Check if a returned translation value is actually missing.
 * Missing means: null, undefined, empty, whitespace-only, or equals the key itself.
 */
export function isMissingTranslation(key: string, value: string | null | undefined): boolean {
  if (value == null) return true;
  if (value.trim() === '') return true;
  return key === value;
}
