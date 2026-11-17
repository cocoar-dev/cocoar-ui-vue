#!/usr/bin/env node
// Design-review inventory CLI. See apps/playground/src/design-review/README.md.
//
//   node apps/playground/scripts/design-review.mjs               summary (default)
//   node apps/playground/scripts/design-review.mjs --check       completeness check, exit 1 on drift or bad records
//   node apps/playground/scripts/design-review.mjs --complete    strict final gate: check + nothing pending
//   node apps/playground/scripts/design-review.mjs --update      add/refresh entries from the sources (--prune drops removed ones)
//
// Options: --root <dir> (default: the repository this script lives in), --inventory <file>.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  check,
  complete,
  emptyInventory,
  loadInventory,
  scan,
  serialize,
  summarize,
  updateInventory,
} from './design-review-lib.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const opts = {
    mode: 'summary',
    root: path.resolve(scriptDir, '../../..'),
    inventory: null,
    prune: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--check') opts.mode = 'check';
    else if (arg === '--complete') opts.mode = 'complete';
    else if (arg === '--update') opts.mode = 'update';
    else if (arg === '--summary') opts.mode = 'summary';
    else if (arg === '--prune') opts.prune = true;
    else if (arg === '--root') opts.root = path.resolve(argv[++i] ?? '');
    else if (arg === '--inventory') opts.inventory = path.resolve(argv[++i] ?? '');
    else throw new Error(`Unknown argument: ${arg}`);
  }
  opts.inventory ??= path.join(opts.root, 'apps/playground/src/design-review/inventory.json');
  return opts;
}

function printSummary(inventory) {
  const { rows, kinds, total, openChecks } = summarize(inventory);
  const cols = [
    'package',
    'surfaces',
    'pending',
    'implemented',
    'reviewed-unchanged',
    'public',
    'nonvisual',
  ];
  const widths = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c]).length)));
  const line = (r) =>
    cols
      .map((c, i) => (i === 0 ? String(r[c]).padEnd(widths[i]) : String(r[c]).padStart(widths[i])))
      .join('  ');
  console.log(line(Object.fromEntries(cols.map((c) => [c, c]))));
  for (const r of rows) console.log(line(r));
  console.log(
    `\n${inventory.packages.length} packages, ${total} surfaces (${Object.entries(kinds)
      .map(([k, n]) => `${k}: ${n}`)
      .join(', ')}), ${openChecks} pending checks.`,
  );
}

function report(items, label) {
  for (const { code, id, message } of items) console.error(`${label} [${code}] ${id}: ${message}`);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.mode === 'update') {
    const previous = fs.existsSync(opts.inventory)
      ? loadInventory(opts.inventory)
      : emptyInventory();
    const next = updateInventory(previous, scan(opts.root), { prune: opts.prune });
    fs.mkdirSync(path.dirname(opts.inventory), { recursive: true });
    fs.writeFileSync(opts.inventory, serialize(next));
    console.log(`Wrote ${path.relative(process.cwd(), opts.inventory) || opts.inventory}`);
    printSummary(next);
    return 0;
  }
  if (!fs.existsSync(opts.inventory)) {
    console.error(`No inventory at ${opts.inventory}. Run with --update to create it.`);
    return 1;
  }
  const inventory = loadInventory(opts.inventory);
  if (opts.mode === 'summary') {
    printSummary(inventory);
    return 0;
  }
  if (opts.mode === 'check') {
    const errors = check(opts.root, inventory);
    report(errors, 'error');
    if (errors.length) {
      console.error(`\n${errors.length} problem(s). Completeness check failed.`);
      return 1;
    }
    printSummary(inventory);
    console.log(
      '\nCompleteness check passed (pending work is allowed; use --complete for the final gate).',
    );
    return 0;
  }
  const { errors, remaining } = complete(opts.root, inventory);
  report(errors, 'error');
  report(remaining, 'open');
  if (errors.length || remaining.length) {
    console.error(
      `\n${errors.length} problem(s), ${remaining.length} open item(s). Final gate failed.`,
    );
    return 1;
  }
  console.log('Final gate passed: every surface is decided, checked and proven.');
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
