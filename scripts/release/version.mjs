// The version of a build, from git tags only (like MinVer in CodeAlta): no configuration file.
//
//   node scripts/release/version.mjs [--channel beta|alpha|ci]
//
// - On a tag vX.Y.Z: X.Y.Z (a release).
// - Otherwise: <next>-<channel>.<N>, where
//     base  = the last tag vX.Y.Z reachable from HEAD
//     N     = the number of commits since that tag
//     next  = X.(Y+1).0        on develop and its branches
//             (X+1).0.0        when a commit since the tag is breaking (`type!:` or `BREAKING CHANGE:`)
//             X.Y.(Z+1)        on release/* and support/* (and pull requests into them)
//
// Prints the version; with GITHUB_OUTPUT set, also writes `version=` and `channel=` to it.

import fs from 'node:fs';
import { fail, parseArgs, run } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const channel = args.channel || 'ci';

let version;
if (process.env.GITHUB_REF_TYPE === 'tag') {
  // A release build: the tag is the version.
  if (!/^v\d+\.\d+\.\d+$/.test(process.env.GITHUB_REF_NAME || '')) fail(`a release tag is vX.Y.Z, got ${process.env.GITHUB_REF_NAME}`);
  version = process.env.GITHUB_REF_NAME.slice(1);
} else {
  const tags = run('git', ['tag', '--merged', 'HEAD', '--list', 'v*.*.*', '--sort=-v:refname']).split('\n').filter((t) => /^v\d+\.\d+\.\d+$/.test(t));
  if (!tags.length) fail('no tag vX.Y.Z before HEAD (fetch with tags: fetch-depth 0)');
  const base = tags[0];
  const [major, minor, patch] = base.slice(1).split('.').map(Number);
  const count = Number(run('git', ['rev-list', '--count', `${base}..HEAD`]));
  const messages = run('git', ['log', '--format=%s%n%b', `${base}..HEAD`]);
  const breaking = /^\w+(\([^)]*\))?!:|^BREAKING CHANGE:/m.test(messages);
  // The branch the build is for: the target of a pull request, otherwise the branch itself.
  const branch = process.env.GITHUB_BASE_REF || process.env.GITHUB_REF_NAME || run('git', ['branch', '--show-current']);
  const maintenance = /^(release|support)\//.test(branch);
  const next = breaking && !maintenance ? `${major + 1}.0.0` : maintenance ? `${major}.${minor}.${patch + 1}` : `${major}.${minor + 1}.0`;
  version = `${next}-${channel}.${count}`;
}

console.log(version);
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\nchannel=${channel}\n`);
