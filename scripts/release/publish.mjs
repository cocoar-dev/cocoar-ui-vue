// Publishes the tarballs of pack.mjs, idempotently, and moves the dist-tags.
//
//   node scripts/release/publish.mjs --tag <beta|latest|alpha> [--dir artifacts] [--registry <url>] [--dry-run]
//
// Live only in the real repository with RELEASE_LIVE=true (lib.mjs isLive); otherwise every npm write
// is a --dry-run and says why. Reads of the registry (npm view) always happen.
//
// For each package of manifest.json:
// - the version exists with the same gitHead  → skipped (a re-run after a partial failure)
// - the version exists with another gitHead   → error: two commits claim one version
// - otherwise                                  → npm publish <tarball> --tag <tag>
// `--tag latest` (a stable release): `latest` moves only to a higher version; a patch of an older line
// gets `release-X.Y` instead. Afterwards `beta` follows the stable version when it is older.

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, compareVersions, fail, isLive, liveReason, parseArgs, parseVersion, tryRun } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const tag = args.tag;
if (!['beta', 'latest', 'alpha'].includes(tag)) fail('usage: publish.mjs --tag <beta|latest|alpha> [--dir artifacts] [--registry url] [--dry-run]');
const dir = path.resolve(ROOT, args.dir || 'artifacts');
const registry = args.registry || 'https://registry.npmjs.org';
const live = isLive({ dryRun: args.dryRun === true });
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));

console.log(live ? `LIVE publish to ${registry} with tag ${tag}` : `DRY RUN (${liveReason()}): nothing is written to ${registry}`);

function view(spec, field) {
  const result = tryRun('npm', ['view', spec, field, '--json', '--registry', registry]);
  if (result.status !== 0 || !result.stdout) return undefined; // E404: not published
  try {
    return JSON.parse(result.stdout);
  } catch {
    return result.stdout;
  }
}

function npmWrite(npmArgs) {
  const full = [...npmArgs, '--registry', registry, ...(live ? [] : ['--dry-run'])];
  console.log(`  npm ${full.join(' ')}`);
  // Only `npm publish` honours --dry-run; `npm dist-tag` would write. Off the live path it is only shown.
  if (!live && npmArgs[0] !== 'publish') return;
  const result = tryRun('npm', full, { stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0) fail(`npm ${npmArgs[0]} failed: ${result.stderr.split('\n').slice(-5).join(' | ')}`);
}

let published = 0;
let skipped = 0;
for (const pkg of manifest) {
  const spec = `${pkg.name}@${pkg.version}`;
  const existingHead = view(spec, 'gitHead');
  const exists = existingHead !== undefined || view(spec, 'version') !== undefined;
  if (exists) {
    if (existingHead === pkg.gitHead) {
      console.log(`= ${spec} is already published from ${pkg.gitHead.slice(0, 8)}: skipped`);
      skipped += 1;
      continue;
    }
    fail(`${spec} is already published from ${existingHead || 'an unknown commit'}, not ${pkg.gitHead}: refusing to continue`);
  }

  let distTag = tag;
  if (tag === 'latest') {
    const latest = view(pkg.name, 'dist-tags.latest');
    if (latest && compareVersions(pkg.version, latest) <= 0) {
      const v = parseVersion(pkg.version);
      distTag = `release-${v.major}.${v.minor}`;
      console.log(`  ${pkg.name}: latest is ${latest}, so ${pkg.version} gets the tag ${distTag}`);
    }
  }
  console.log(`+ ${spec} (${distTag})`);
  npmWrite(['publish', path.join(dir, pkg.file), '--tag', distTag, '--access', 'public']);
  published += 1;
}

if (tag === 'latest') {
  for (const pkg of manifest) {
    const beta = view(pkg.name, 'dist-tags.beta');
    if (beta && compareVersions(beta, pkg.version) < 0) {
      console.log(`  ${pkg.name}: beta ${beta} is older than ${pkg.version}, it follows`);
      npmWrite(['dist-tag', 'add', `${pkg.name}@${pkg.version}`, 'beta']);
    }
  }
}

console.log(`${published} published${live ? '' : ' (dry run)'}, ${skipped} already there`);
