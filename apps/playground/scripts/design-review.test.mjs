// Run: node --test apps/playground/scripts/design-review.test.mjs
// Every test works on a temporary fixture tree and passes its root explicitly.

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, beforeEach, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { check, complete, emptyInventory, scan, updateInventory } from './design-review-lib.mjs';

const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), 'design-review.mjs');
const tmpRoots = [];
after(() => tmpRoots.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

function write(root, rel, content) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'design-review-'));
  tmpRoots.push(root);
  write(
    root,
    'packages/alpha/package.json',
    JSON.stringify({
      name: '@x/alpha',
      exports: {
        '.': { source: './src/index.ts', import: './dist/index.js' },
        './styles': './dist/alpha.css',
      },
    }),
  );
  write(
    root,
    'packages/alpha/src/index.ts',
    "export { default as AlphaButton } from './AlphaButton.vue';\nexport { helper } from './helper';\n",
  );
  write(
    root,
    'packages/alpha/src/AlphaButton.vue',
    '<template><button /></template>\n<style>.a { color: red }</style>\n',
  );
  write(root, 'packages/alpha/src/Hidden.vue', '<template><i /></template>\n');
  write(root, 'packages/alpha/src/helper.ts', 'export const helper = (n: number) => n + 1;\n');
  write(
    root,
    'packages/alpha/src/theme.ts',
    "export const css = 'color: var(--coar-text-neutral-primary)';\n",
  );
  write(root, 'packages/alpha/src/alpha.css', '.alpha { color: red; }\n');
  write(root, 'packages/alpha/src/helper.test.ts', "import '@cocoar/vue-ui';\n");
  write(root, 'packages/alpha/src/__tests__/Skip.vue', '<template><b /></template>\n');
  write(root, 'packages/alpha/dist/index.js', "const el = document.createElement('div');\n");
  write(root, 'packages/alpha/node_modules/dep/index.js', "document.createElement('x');\n");
  write(
    root,
    'packages/beta/package.json',
    JSON.stringify({ name: '@x/beta', bin: { beta: './bin/beta.mjs' } }),
  );
  write(root, 'packages/beta/bin/beta.mjs', 'console.log(\'<svg viewBox="0 0 1 1"></svg>\');\n');
  write(root, 'packages/beta/lib/map.ts', "import L from 'leaflet';\nexport const map = L;\n");
  return root;
}

const sync = (root) => updateInventory(emptyInventory(), scan(root));
// Structural assertions below are independent of revision invalidation, which
// has its own regression test.
const codes = (errors) => errors.map((e) => e.code).filter((code) => code !== 'source-revision-stale');
const entry = (inv, id) => inv.surfaces.find((e) => e.id === id);

describe('scan', () => {
  test('font-loading entries are visual sources, not invisible logic helpers', () => {
    const root = fixture();
    write(root, 'packages/alpha/src/fonts.ts', "import '@fontsource/inter/400.css';\n");
    const fonts = scan(root).surfaces.find((surface) => surface.source === 'packages/alpha/src/fonts.ts');
    assert.equal(fonts.kind, 'ts-visual');
    assert.deepEqual(fonts.signals, ['font-import']);
  });

  test('finds recursive sources, outside-src files, signals and skips build/test output', () => {
    const root = fixture();
    const s = scan(root);
    assert.deepEqual(
      s.packages.map((p) => p.dir),
      ['packages/alpha', 'packages/beta'],
    );
    assert.deepEqual(
      s.surfaces.map((e) => e.id),
      [
        'packages/alpha/src/AlphaButton.vue',
        'packages/alpha/src/Hidden.vue',
        'packages/alpha/src/alpha.css',
        'packages/alpha/src/theme.ts',
        'packages/beta/bin/beta.mjs',
        'third-party:leaflet',
      ],
    );
    assert.deepEqual(
      s.nonvisual.map((n) => n.source),
      ['packages/alpha/src/helper.ts', 'packages/alpha/src/index.ts', 'packages/beta/lib/map.ts'],
    );
    const third = s.surfaces.find((e) => e.id === 'third-party:leaflet');
    assert.deepEqual(third.owners, ['packages/beta/lib/map.ts']);
  });

  test('derives public exposure from the export graph and public exports from manifests', () => {
    const s = scan(fixture());
    const exposure = Object.fromEntries(s.surfaces.map((e) => [e.id, e.exposure]));
    assert.equal(exposure['packages/alpha/src/AlphaButton.vue'], 'public');
    assert.equal(exposure['packages/alpha/src/Hidden.vue'], 'internal');
    assert.equal(exposure['packages/alpha/src/alpha.css'], 'public'); // package has a dist css export
    assert.equal(exposure['packages/beta/bin/beta.mjs'], 'public');
    const styles = s.publicExports.find((e) => e.subpath === './styles');
    assert.deepEqual(styles.owners, [
      'packages/alpha/src/AlphaButton.vue',
      'packages/alpha/src/alpha.css',
    ]);
    assert.ok(s.publicExports.some((e) => e.subpath === 'bin:beta'));
  });
});

describe('check (completeness)', () => {
  let root;
  let inv;
  beforeEach(() => {
    root = fixture();
    inv = sync(root);
  });

  test('a fresh inventory with everything pending passes', () => {
    assert.deepEqual(check(root, inv), []);
  });

  test('detects an added source and a removed source', () => {
    write(root, 'packages/alpha/src/Added.vue', '<template><p /></template>\n');
    assert.deepEqual(codes(check(root, inv)), ['entry-missing']);
    fs.rmSync(path.join(root, 'packages/alpha/src/Added.vue'));
    fs.rmSync(path.join(root, 'packages/alpha/src/Hidden.vue'));
    assert.deepEqual(codes(check(root, inv)), ['entry-orphan']);
  });

  test('detects added and removed nonvisual sources, and a logic file gaining visual signals', () => {
    write(root, 'packages/alpha/src/more.ts', 'export const more = 1;\n');
    assert.deepEqual(codes(check(root, inv)), ['nonvisual-missing']);
    fs.rmSync(path.join(root, 'packages/alpha/src/more.ts'));
    fs.rmSync(path.join(root, 'packages/alpha/src/helper.ts'));
    assert.ok(codes(check(root, inv)).includes('nonvisual-orphan'));

    write(
      root,
      'packages/alpha/src/helper.ts',
      "export const el = () => document.createElement('div');\n",
    );
    const found = codes(check(root, inv));
    assert.ok(found.includes('entry-missing') && found.includes('nonvisual-visual'));
  });

  test('detects added package, removed package and changed public exports', () => {
    write(root, 'packages/gamma/package.json', JSON.stringify({ name: '@x/gamma' }));
    assert.deepEqual(codes(check(root, inv)), ['package-missing']);
    fs.rmSync(path.join(root, 'packages/gamma'), { recursive: true });
    fs.rmSync(path.join(root, 'packages/beta'), { recursive: true });
    const found = codes(check(root, inv));
    assert.ok(
      found.includes('package-orphan') &&
        found.includes('export-orphan') &&
        found.includes('entry-orphan'),
    );

    write(
      root,
      'packages/alpha/package.json',
      JSON.stringify({
        name: '@x/alpha',
        exports: { '.': { source: './src/index.ts' }, './extra': { source: './src/theme.ts' } },
      }),
    );
    assert.ok(codes(check(root, inv)).includes('export-missing'));
  });

  test('detects a changed third-party owner set', () => {
    write(root, 'packages/beta/lib/other.ts', "import 'leaflet/dist/leaflet.css';\n");
    const found = codes(check(root, inv));
    assert.ok(found.includes('entry-stale') && found.includes('nonvisual-missing'));
  });

  test('rejects blank or malformed evidence and unknown states', () => {
    const e = entry(inv, 'packages/alpha/src/Hidden.vue');
    e.evidence = [
      { type: 'note', ref: '  ' },
      'free text',
      { type: 'bogus', ref: 'x' },
      { type: 'story', ref: 'missing.vue' },
    ];
    assert.deepEqual(codes(check(root, inv)), [
      'evidence-invalid',
      'evidence-invalid',
      'evidence-invalid',
      'evidence-missing-file',
    ]);

    e.evidence = [];
    e.states = [
      { name: '', status: 'pending' },
      { name: 'open', status: 'maybe' },
      { name: 'x', status: 'not-applicable', reason: ' ' },
    ];
    assert.equal(check(root, inv).filter((x) => x.code === 'record-invalid').length, 3);
  });

  test('rejects invalid decisions, checks and unproven claims', () => {
    const e = entry(inv, 'packages/alpha/src/Hidden.vue');
    e.decision = 'done';
    e.checks.mobile = 'ok';
    e.checks.dark = 'not-applicable';
    assert.deepEqual(codes(check(root, inv)), [
      'record-invalid',
      'record-invalid',
      'record-invalid',
    ]);

    e.decision = 'reviewed-unchanged';
    e.checks = { desktop: 'pending', mobile: 'pending', light: 'pending', dark: 'pending' };
    assert.deepEqual(codes(check(root, inv)), ['decision-unproven', 'decision-unproven']);
  });

  test('accepts existing file evidence and explicit nonvisual classification of a visual file', () => {
    write(root, 'tmp/audit.md', '# audit\n');
    const e = entry(inv, 'packages/alpha/src/Hidden.vue');
    e.decision = 'reviewed-unchanged';
    e.notes = 'Static icon holder; no tokens of its own.';
    e.evidence = [{ type: 'audit', ref: 'tmp/audit.md#hidden' }];
    assert.deepEqual(check(root, inv), []);

    const theme = 'packages/alpha/src/theme.ts';
    inv.surfaces = inv.surfaces.filter((x) => x.id !== theme);
    inv.nonvisual.push({
      package: 'packages/alpha',
      reason: 'String constant only, consumed by a reviewed component.',
      explicit: true,
      sources: [theme],
    });
    assert.deepEqual(check(root, inv), []);
    inv.nonvisual.at(-1).explicit = false;
    assert.deepEqual(codes(check(root, inv)).sort(), ['entry-missing', 'nonvisual-visual']);
  });

  test('rejects wrong schema version and duplicates', () => {
    assert.deepEqual(codes(check(root, { ...inv, schemaVersion: 99 })), ['schema']);
    inv.surfaces.push({ ...inv.surfaces[0] });
    assert.ok(codes(check(root, inv)).includes('entry-duplicate'));
  });
});

describe('complete (strict gate)', () => {
  test('fails on pending work, passes only when everything is decided and proven', () => {
    const root = fixture();
    write(root, 'tmp/audit.md', '# audit\n');
    const inv = sync(root);
    assert.deepEqual(check(root, inv), []);
    const first = complete(root, inv);
    assert.deepEqual(first.errors, []);
    assert.ok(first.remaining.length >= inv.surfaces.length * 6);

    for (const e of inv.surfaces) {
      e.decision = 'implemented';
      e.tokenRoles = ['ui-text'];
      e.scenario = 'compact-fixture';
      e.checks = { desktop: 'pass', mobile: 'pass', light: 'pass', dark: 'not-applicable' };
      e.reasons = { dark: 'Uses no colors.' };
      e.states = [{ name: 'default', status: 'reviewed' }];
      e.evidence = [{ type: 'audit', ref: 'tmp/audit.md' }];
    }
    const done = complete(root, inv);
    assert.deepEqual(done, { errors: [], remaining: [] });

    entry(inv, 'packages/alpha/src/Hidden.vue').states.push({ name: 'open', status: 'pending' });
    entry(inv, 'packages/alpha/src/alpha.css').checks.mobile = 'fail';
    assert.equal(complete(root, inv).remaining.length, 2);
  });

  test('does not report open items while the completeness check itself fails', () => {
    const root = fixture();
    const inv = sync(root);
    write(root, 'packages/alpha/src/Added.vue', '<template><p /></template>\n');
    const result = complete(root, inv);
    assert.deepEqual(codes(result.errors), ['entry-missing']);
    assert.deepEqual(result.remaining, []);
  });
});

describe('update', () => {
  test('a value-only source edit invalidates previous checks instead of silently keeping proof', () => {
    const root = fixture();
    let inv = sync(root);
    const e = entry(inv, 'packages/alpha/src/AlphaButton.vue');
    e.checks = { desktop: 'pass', mobile: 'pass', light: 'pass', dark: 'pass' };
    e.states = [{ name: 'normal', status: 'reviewed' }];
    write(root, 'packages/alpha/src/AlphaButton.vue', '<template><button /></template>\n<style>.a { color: blue }</style>\n');
    assert.ok(check(root, inv).some((problem) => problem.code === 'source-revision-stale'));
    inv = updateInventory(inv, scan(root));
    assert.equal(entry(inv, e.id).checks.desktop, 'pending');
    assert.equal(entry(inv, e.id).states[0].status, 'pending');
    assert.deepEqual(check(root, inv), []);
  });

  test('keeps review data, adds new sources as pending, keeps removed ones until pruned', () => {
    const root = fixture();
    let inv = sync(root);
    const e = entry(inv, 'packages/alpha/src/Hidden.vue');
    e.tokenRoles = ['ui-text'];
    e.notes = 'kept';
    write(root, 'packages/alpha/src/New.vue', '<template><p /></template>\n');
    write(
      root,
      'packages/alpha/src/helper.ts',
      "export const el = () => document.createElement('div');\n",
    );
    fs.rmSync(path.join(root, 'packages/alpha/src/alpha.css'));
    inv = updateInventory(inv, scan(root));
    assert.equal(entry(inv, 'packages/alpha/src/Hidden.vue').notes, 'kept');
    assert.equal(entry(inv, 'packages/alpha/src/New.vue').decision, 'pending');
    assert.equal(entry(inv, 'packages/alpha/src/helper.ts').kind, 'ts-visual');
    assert.ok(!inv.nonvisual.some((g) => g.sources.includes('packages/alpha/src/helper.ts')));
    assert.deepEqual(codes(check(root, inv)), ['entry-orphan']);
    inv = updateInventory(inv, scan(root), { prune: true });
    assert.deepEqual(check(root, inv), []);
  });
});

describe('cli', () => {
  test('--update, --check and --complete use the given root only', () => {
    const root = fixture();
    const inventory = path.join(root, 'inventory.json');
    const run = (...args) =>
      spawnSync('node', [cli, '--root', root, '--inventory', inventory, ...args], {
        encoding: 'utf8',
      });
    assert.equal(run('--check').status, 1); // no inventory yet
    assert.equal(run('--update').status, 0);
    const checked = run('--check');
    assert.equal(checked.status, 0, checked.stderr);
    assert.match(checked.stdout, /2 packages, 6 surfaces/);
    const gate = run('--complete');
    assert.equal(gate.status, 1);
    assert.match(gate.stderr, /decision is pending/);
    write(root, 'packages/alpha/src/Added.vue', '<template><p /></template>\n');
    const drift = run('--check');
    assert.equal(drift.status, 1);
    assert.match(drift.stderr, /entry-missing/);
    assert.equal(run('--bogus').status, 2);
  });

  test('the committed inventory of this repository passes the completeness check', () => {
    const out = execFileSync('node', [cli, '--check'], { encoding: 'utf8' });
    assert.match(out, /Completeness check passed/);
  });
});
