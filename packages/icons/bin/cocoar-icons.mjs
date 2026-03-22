#!/usr/bin/env node

/**
 * @cocoar/icons-cli
 *
 * Tools for preparing SVG icons for use with @cocoar/vue-ui.
 * Works with any directory of SVG files (Lucide, custom icons, etc.).
 *
 * Commands:
 *   normalize  Validate, normalize SVGs and generate a manifest
 *   bundle     Generate a TypeScript icon map from SVGs
 */

import { normalize } from '../lib/normalize.mjs';
import { bundle } from '../lib/bundle.mjs';

const USAGE = `
Usage: cocoar-icons <command> [options]

Commands:
  normalize  --from <dir> --output <dir>                          Validate, normalize SVGs and generate manifest
  bundle     --from <dir> [--icons <name1,...>] --output <file>    Generate a TypeScript icon map

Examples:
  cocoar-icons normalize --from ./my-svgs --output ./public/icons
  cocoar-icons bundle --from ./my-svgs --output ./src/my-icons.ts
  cocoar-icons bundle --from ./node_modules/lucide-static/icons --icons "calendar,star" --output ./src/extra-icons.ts
`.trim();

const command = process.argv[2];

switch (command) {
  case 'normalize':
    normalize(process.argv.slice(3));
    break;
  case 'bundle':
    bundle(process.argv.slice(3));
    break;
  default:
    console.error(USAGE);
    process.exit(command ? 1 : 0);
}
