/**
 * Public surface for the text-color slice of the markdown editor.
 *
 * Consumers register the bundle once via `.use(textColor)` and pick up the
 * mark, the DOM parsing rule, and the markdown round-trip in one call.
 *
 * `COAR_TEXT_COLOR_PALETTE` is the canonical 8-swatch palette wired into the
 * built-in toolbar — exported so consumers can reuse the same set when they
 * embed the editor and want their own picker UI to match.
 */
export { textColor, textColorMark, textColorRemark } from './textColorMark';

/**
 * Default 8 swatches used by the built-in color picker. Hex values were
 * chosen for adequate contrast on both the light and dark Cocoar themes —
 * pure CSS-token colors (e.g. `var(--coar-text-semantic-error)`) would
 * round-trip through `sanitizeColor` as rejected (it intentionally bans
 * `var()` to keep the whitelist tight), so we use resolved hex instead.
 */
export const COAR_TEXT_COLOR_PALETTE: readonly { readonly name: string; readonly value: string }[] = [
  { name: 'Default', value: '' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Yellow', value: '#ca8a04' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Pink', value: '#db2777' },
  { name: 'Gray', value: '#6b7280' },
];
