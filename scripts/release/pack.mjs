// Packs every publishable package into one folder and writes manifest.json next to the tarballs.
//
//   node scripts/release/pack.mjs [--out artifacts]
//
// Runs after stamp.mjs. `pnpm pack` runs the prepack scripts (packages/ui copies the Agent Skill) and
// resolves workspace: ranges; publish.mjs then publishes exactly these tarballs, with no lifecycle
// scripts, so what was packed and checked is what reaches the registry.

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, fail, parseArgs, publishablePackages, run } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const out = path.resolve(ROOT, args.out || 'artifacts');
fs.mkdirSync(out, { recursive: true });

const manifest = [];
for (const pkg of publishablePackages()) {
  const { name, version, gitHead } = pkg.json;
  const file = `${name.replace(/^@/, '').replace('/', '-')}-${version}.tgz`;
  run('pnpm', ['pack', '--pack-destination', out], { cwd: pkg.dir });
  if (!fs.existsSync(path.join(out, file))) fail(`pnpm pack did not write ${file} for ${name}`);
  manifest.push({ name, version, gitHead, file });
  console.log(`packed ${name}@${version} → ${file}`);
}
fs.writeFileSync(path.join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${manifest.length} packages in ${path.relative(ROOT, out) || out}`);
