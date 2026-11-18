// Writes styles/tokens/compact.css from the Compact value object, so the
// `.coar-compact` entry and the Theme Editor preset cannot drift apart.
//   node --experimental-strip-types packages/ui/scripts/write-compact-css.mjs [--check]
import { readFileSync, writeFileSync } from 'node:fs';
import { register } from 'node:module';
import { fileURLToPath } from 'node:url';

// The sources import each other without a file extension, as the bundler expects.
register(`data:text/javascript,${encodeURIComponent(`
  export async function resolve(specifier, context, next) {
    try { return await next(specifier, context); }
    catch (error) {
      if (!specifier.startsWith('.')) throw error;
      return next(specifier + '.ts', context);
    }
  }`)}`);
const { COMPACT_THEME } = await import('../src/theme/compact-theme.ts');
const { serializeRoleTheme } = await import('../src/theme/role-theme.ts');

const file = fileURLToPath(new URL('../styles/tokens/compact.css', import.meta.url));
const css = `/**
 * Compatibility entry of the Compact presentation (Preview): \`.coar-compact\` on
 * \`html\` or a container applies the values of the Compact theme preset. New code
 * loads the preset in the Theme Editor and ships its exported theme instead.
 *
 * Generated from src/theme/compact-theme.ts by scripts/write-compact-css.mjs; do
 * not edit. What follows from these values is derived in derived.css.
 */
${serializeRoleTheme('.coar-compact', COMPACT_THEME)}`;

if (process.argv.includes('--check')) {
  if (readFileSync(file, 'utf8') !== css) {
    console.error('styles/tokens/compact.css is not the serialized Compact theme; run this script without --check.');
    process.exit(1);
  }
} else {
  writeFileSync(file, css);
}
