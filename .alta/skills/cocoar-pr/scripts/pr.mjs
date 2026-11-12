#!/usr/bin/env node
// Merging a pull request of cocoar-ui-vue the way AGENTS.md wants it (skill cocoar-pr).
//
//   node .alta/skills/cocoar-pr/scripts/pr.mjs view N
//   node .alta/skills/cocoar-pr/scripts/pr.mjs merge N [--title "<type>(<scope>): <subject>" | --keep-title]
//
// merge: judges the title (scripts/commit-types.mjs) and corrects the pull request title when --title differs (the
// release notes read the pull request title), waits for the checks, refuses unless the build passed and nothing is
// red, then squash-merges with "<title> (#N)" as the commit subject. The branch is
// deleted unless it belongs to a fork. Only when the maintainer asked for the merge.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkTitle } from '../../../../scripts/commit-types.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
// Checks that must have passed, not only been skipped: a skipped build is no build. The title is not a CI check:
// this script judges it (checkTitle) and corrects it before the merge.
const MUST_PASS = ['Build, test & pack'];

function gh(args, { check = true } = {}) {
  const r = spawnSync('gh', args, { cwd: ROOT, encoding: 'utf8' });
  if (check && r.status !== 0) die(`gh ${args.slice(0, 3).join(' ')}… failed: ${(r.stderr || '').trim()}`);
  return (r.stdout || '').trim();
}
const ghJson = (args) => JSON.parse(gh(args) || 'null');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function die(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function view(number) {
  return ghJson(['pr', 'view', String(number), '--json', 'number,title,author,isCrossRepository,headRefName,headRefOid,state,mergeable,url,files']);
}

/** Waits until no check of the pull request is pending. */
async function waitForChecks(number, { minutes = 40 } = {}) {
  const started = Date.now();
  const deadline = started + minutes * 60_000;
  for (;;) {
    const r = spawnSync('gh', ['pr', 'checks', String(number), '--json', 'name,bucket,startedAt,link'], { cwd: ROOT, encoding: 'utf8' });
    const checks = JSON.parse(r.stdout || '[]');
    const pending = checks.filter((c) => c.bucket === 'pending');
    if (checks.length && !pending.length) return checks;
    // GitHub starts no checks for a pull request that conflicts with its base, or when Actions are off.
    if (!checks.length && Date.now() - started > 3 * 60_000) die(`no checks started for #${number} after 3 minutes: conflicts with the base, or no workflow run`);
    if (Date.now() > deadline) die(`checks of #${number} still pending after ${minutes} minutes`);
    await sleep(10_000);
  }
}

async function merge(number, newTitle, keepTitle) {
  const pr = view(number);
  if (pr.state !== 'OPEN') die(`#${number} is ${pr.state}`);
  console.log(`#${number} ${pr.title}\n  by @${pr.author.login}${pr.isCrossRepository ? ' (fork)' : ''}, ${pr.files.length} file(s), ${pr.url}`);

  // Conflicts first: GitHub computes them lazily (UNKNOWN), and starts no checks while they exist.
  let state = pr.mergeable;
  for (let i = 0; state === 'UNKNOWN' && i < 12; i += 1) {
    await sleep(5_000);
    state = view(number).mergeable;
  }
  if (state === 'CONFLICTING') {
    die(`#${number} conflicts with ${pr.isCrossRepository ? 'the base: ask the contributor to update the branch' : 'the base: update the branch (merge or rebase origin/develop) and push'}; no checks run until then`);
  }

  let title = pr.title;
  if (newTitle && newTitle !== pr.title) {
    const problem = checkTitle(newTitle);
    if (problem) die(problem);
    gh(['pr', 'edit', String(number), '--title', newTitle]);
    console.log(`  title corrected:\n    was: ${pr.title}\n    now: ${newTitle}`);
    title = newTitle;
  } else {
    const problem = checkTitle(title);
    if (problem && !keepTitle) {
      die(`${problem}\n  It would land under "Misc" in the release notes. Correct it with --title "<type>(<scope>): <subject>", or keep it on purpose with --keep-title.`);
    }
    if (problem) console.log(`  title kept as it is (--keep-title): it lands under "Misc" in the release notes`);
  }

  console.log('  waiting for the checks…');
  const checks = await waitForChecks(number);
  for (const c of checks) console.log(`    ${c.bucket === 'pass' ? 'ok  ' : c.bucket === 'skipping' ? '-   ' : 'FAIL'} ${c.name}: ${c.bucket}`);
  const red = checks.filter((c) => !['pass', 'skipping'].includes(c.bucket));
  if (red.length) die(`not merged: ${red.map((c) => c.name).join(', ')} not green`);
  const missing = MUST_PASS.filter((name) => !checks.some((c) => c.name === name && c.bucket === 'pass'));
  if (missing.length) die(`not merged: ${missing.join(', ')} did not pass (skipped or missing)`);

  const subject = `${title} (#${number})`;
  gh(['pr', 'merge', String(number), '--squash', '--subject', subject, ...(pr.isCrossRepository ? [] : ['--delete-branch'])]);
  const merged = ghJson(['pr', 'view', String(number), '--json', 'mergeCommit,baseRefName']);
  console.log(`  squash-merged into ${merged.baseRefName}: ${merged.mergeCommit.oid.slice(0, 8)} ${subject}`);
  if (pr.author.login !== gh(['api', 'user', '-q', '.login'])) console.log(`  thank @${pr.author.login} in the next release`);
}

function parse(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--title') args.title = argv[++i];
    else if (argv[i] === '--keep-title') args.keepTitle = true;
    else args._.push(argv[i]);
  }
  return args;
}

const [command, ...rest] = process.argv.slice(2);
const args = parse(rest);
if (command === 'view' && args._[0]) {
  const pr = view(args._[0]);
  console.log(JSON.stringify({ ...pr, files: pr.files.map((f) => f.path), titleProblem: checkTitle(pr.title) }, null, 2));
} else if (command === 'merge' && args._[0]) {
  await merge(Number(args._[0]), args.title, args.keepTitle === true);
} else {
  console.log('usage: pr.mjs view N | pr.mjs merge N [--title "<type>(<scope>): <subject>" | --keep-title]');
  process.exit(command ? 1 : 0);
}
