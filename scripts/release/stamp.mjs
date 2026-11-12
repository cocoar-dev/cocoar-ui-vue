// Writes the release version into every publishable package.json, before packing.
//
//   node scripts/release/stamp.mjs <version> [--channel alpha|beta|stable] [--sha <commit>]
//
// - `version` and `gitHead` (the commit; npm keeps it, and publish.mjs uses it to recognise a
//   version that is already out)
// - the `source` condition of `exports` is removed (it points at src/ for the workspace only)
// - `workspace:` ranges of @cocoar/* in dependencies, optionalDependencies and peerDependencies
//   become the exact version
// - channel alpha: the package is renamed @cocoar-dev/* (GitHub Packages) and its @cocoar/*
//   dependencies become npm aliases of the renamed packages
//
// The build runs before this step, so dist/ never contains the version.

import { fail, headSha, parseArgs, parseVersion, publishablePackages, writeJson } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const version = args._[0];
const channel = args.channel || 'stable';
if (!parseVersion(version)) fail('usage: stamp.mjs <X.Y.Z[-label.N]> [--channel alpha|beta|stable] [--sha <commit>]');
if (!['alpha', 'beta', 'stable'].includes(channel)) fail(`unknown channel ${channel}`);
const sha = args.sha || headSha();
const alias = (name) => name.replace(/^@cocoar\//, '@cocoar-dev/');

for (const pkg of publishablePackages()) {
  const json = pkg.json;
  const before = json.name;
  json.version = version;
  json.gitHead = sha;
  if (channel === 'alpha') json.name = alias(json.name);
  if (json.exports) {
    for (const value of Object.values(json.exports)) {
      if (value && typeof value === 'object') delete value.source;
    }
  }
  for (const field of ['dependencies', 'optionalDependencies']) {
    for (const [dep, range] of Object.entries(json[field] || {})) {
      if (!dep.startsWith('@cocoar/') || !String(range).startsWith('workspace:')) continue;
      json[field][dep] = channel === 'alpha' ? `npm:${alias(dep)}@${version}` : version;
    }
  }
  for (const [dep, range] of Object.entries(json.peerDependencies || {})) {
    if (dep.startsWith('@cocoar/') && String(range).startsWith('workspace:')) json.peerDependencies[dep] = version;
  }
  writeJson(pkg.file, json);
  console.log(`${before} → ${json.name}@${version}`);
}
