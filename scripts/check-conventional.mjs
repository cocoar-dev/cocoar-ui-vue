// Checks Conventional Commit titles.
//
//   node scripts/check-conventional.mjs --title "<pull request title>"
//   node scripts/check-conventional.mjs --commits <base>..<head>     every commit of a range, merges excepted
//   add --warn to report problems as GitHub warnings and exit 0: a title that does not fit is not an error, its
//   pull request lands under "Misc" in the release notes (scripts/release/changelog.toml)
//
// Used by the agent skills: before a pull request is opened, and by pr.mjs before a merge (scripts/commit-types.mjs).

import { execFileSync } from 'node:child_process';
import { checkTitle } from './commit-types.mjs';

const argv = process.argv.slice(2);
const option = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

const problems = [];
const title = option('--title') ?? process.env.PR_TITLE;
if (title !== undefined) {
  const problem = checkTitle(title);
  if (problem) problems.push(`pull request title: ${problem}`);
  else console.log(`ok  title: ${title}`);
}

const range = option('--commits');
if (range) {
  const log = execFileSync('git', ['log', '--no-merges', '--format=%h %s', range], { encoding: 'utf8' }).trim();
  for (const line of log ? log.split('\n') : []) {
    const [sha, ...rest] = line.split(' ');
    const subject = rest.join(' ');
    // fixup!/squash! commits disappear before the merge.
    if (/^(fixup|squash|amend)! /.test(subject)) continue;
    const problem = checkTitle(subject);
    if (problem) problems.push(`commit ${sha}: ${problem}`);
    else console.log(`ok  ${sha} ${subject}`);
  }
}

if (title === undefined && !range) {
  console.error('usage: check-conventional.mjs --title "<title>" | --commits <base>..<head>');
  process.exit(2);
}
if (argv.includes('--warn')) {
  for (const problem of problems) {
    console.log(`::warning title=Not a Conventional Commit::${problem} — it would land under "Misc" in the release notes; the maintainer corrects it before the squash merge (see AGENTS.md)`);
  }
  process.exit(0);
}
for (const problem of problems) console.error(`FAIL ${problem}`);
process.exit(problems.length ? 1 : 0);
