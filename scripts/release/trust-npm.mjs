// Connects every published package to npm trusted publishing (OIDC), so a release needs no token.
//
//   node scripts/release/trust-npm.mjs [--dry-run]
//
// Run it once by hand, logged in to npm as an owner of @cocoar, with 2FA (`npx npm@11.21.3 login`). npm asks
// for the second factor at the first package and skips it for about five minutes. A package that already
// trusts this workflow is skipped, so the script can simply run again.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, fail, parseArgs } from './lib.mjs';

const NPM = 'npm@11.21.3';
const REPOSITORY = 'cocoar-dev/cocoar-ui-vue';
const WORKFLOW = 'ci.yml';

const args = parseArgs(process.argv.slice(2));
const dryRun = args.dryRun === true;

const packages = fs
  .readdirSync(path.join(ROOT, 'packages'))
  .map((dir) => path.join(ROOT, 'packages', dir, 'package.json'))
  .filter((file) => fs.existsSync(file))
  .map((file) => JSON.parse(fs.readFileSync(file, 'utf8')))
  .filter((pkg) => !pkg.private)
  .map((pkg) => pkg.name)
  .sort();

const npm = (npmArgs, stdio) =>
  spawnSync('npx', ['--yes', NPM, ...npmArgs], { cwd: ROOT, encoding: 'utf8', stdio });

function isTrusted(name) {
  const result = npm(['trust', 'list', name, '--json'], ['ignore', 'pipe', 'pipe']);
  return result.status === 0 && result.stdout.includes(REPOSITORY) && result.stdout.includes(WORKFLOW);
}

let added = 0;
for (const [index, name] of packages.entries()) {
  if (!dryRun && isTrusted(name)) {
    console.log(`= ${name} already trusts ${REPOSITORY} ${WORKFLOW}`);
    continue;
  }
  console.log(`+ ${name}`);
  const result = npm(
    [
      'trust', 'github', name,
      '--file', WORKFLOW,
      '--repository', REPOSITORY,
      '--allow-publish',
      '--yes',
      ...(dryRun ? ['--dry-run'] : []),
    ],
    'inherit',
  );
  if (result.status !== 0) fail(`npm trust failed for ${name}: run the script again when the cause is fixed`);
  added += 1;
  // npm asks for a pause between calls of a bulk configuration.
  if (!dryRun && index < packages.length - 1) await new Promise((resolve) => setTimeout(resolve, 2000));
}
console.log(`${added} of ${packages.length} packages ${dryRun ? 'would be connected (dry run)' : 'connected'}`);
