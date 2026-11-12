#!/usr/bin/env node
// Merging a pull request of cocoar-ui-vue the way AGENTS.md wants it (skill cocoar-pr).
//
//   node .alta/skills/cocoar-pr/scripts/pr.mjs view N
//   node .alta/skills/cocoar-pr/scripts/pr.mjs merge N [--title "<type>(<scope>): <subject>" | --keep-title]
//        [--accept-default-visual-change] [--accept-visual-harness-change]
//
// merge: judges the title (scripts/commit-types.mjs) and corrects the pull request title when --title differs (the
// release notes read the pull request title), waits for the checks, then decides for the head commit the checks
// belong to: the jobs "Build, test & pack" and "Visual" of the ci.yml run of that commit succeeded, nothing else is
// red, and the file gates below pass. It squash-merges exactly that commit (--match-head-commit) with
// "<title> (#N)" as the commit subject; when the head moved meanwhile, it waits and decides again. The branch is
// deleted unless it belongs to a fork. Only when the maintainer asked for the merge.
//
// File gates (the files of the pull request with their status, from the GitHub API):
// - It refuses a pull request that modifies, removes or renames an existing visual baseline of the default
//   presentation (apps/playground/visual/__screenshots__/*--default-*.png): web apps without .coar-mobile would look
//   different. Only the maintainer's explicit OK lets it through: --accept-default-visual-change. New baselines and
//   changed --mobile- baselines pass.
// - It refuses a pull request that modifies, removes or renames a file the comparison itself depends on
//   (VISUAL_HARNESS: the Playwright config, spec and warm-up, visual.mjs, the story view and manifest, the CI
//   workflow, this script) or an existing story: a pull request could weaken the comparison, or let a story undo a
//   component change, and "Visual" would pass. Only the maintainer's explicit OK: --accept-visual-harness-change.
//   New stories with their stories.json entry and new baselines pass.
// - It refuses when the file list is incomplete (the API lists at most 3000 files).
//
// The gate is this file as it is in the maintainer's checkout of develop, not the pull request's copy: run it from
// an up-to-date develop. A pull request that changes this script is refused by the harness gate above.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checkTitle } from '../../../../scripts/commit-types.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

// Jobs of the ci.yml run of the head commit that must have succeeded, not only been skipped: a skipped build is no
// build. Checked in that run, not by display name among all checks, where any workflow could add a namesake. The
// title is not a CI check: this script judges it (checkTitle) and corrects it before the merge.
export const CI_WORKFLOW = 'ci.yml';
export const MUST_PASS = ['Build, test & pack', 'Visual'];

export const DEFAULT_BASELINE = /^apps\/playground\/visual\/__screenshots__\/[^/]+--default-[^/]+\.png$/;

// The files the visual comparison depends on. The list of stories is data (stories.json) and not guarded: adding a
// story only adds an entry and baselines, and removing one orphans or removes baselines, which the spec and the
// baseline gate catch. An existing story is guarded (VISUAL_STORY): it could bring CSS that undoes a component change
// and keep its images the same.
export const VISUAL_HARNESS = [
  'apps/playground/playwright.visual.config.ts',
  'apps/playground/visual/visual.spec.ts',
  'apps/playground/visual/warm-up.ts',
  'apps/playground/scripts/visual.mjs',
  'apps/playground/src/visual/VisualStoryView.vue',
  'apps/playground/src/visual/manifest.ts',
  'apps/playground/src/visual/story.css',
  '.github/workflows/ci.yml',
  '.alta/skills/cocoar-pr/scripts/pr.mjs',
];
export const VISUAL_STORY = /^apps\/playground\/src\/visual\/stories\/[^/]+\.vue$/;
const isHarness = (name) => VISUAL_HARNESS.includes(name) || VISUAL_STORY.test(name ?? '');

const CHANGING = ['modified', 'changed', 'removed'];

/**
 * The existing default-presentation baselines a pull request changes, from its files as the GitHub API lists them
 * ({ filename, status, previous_filename }). Added or copied files are new baselines and pass; a rename counts when
 * the old name was a default baseline, because that baseline disappears.
 */
export function changedDefaultBaselines(files) {
  const changed = [];
  for (const f of files) {
    if (CHANGING.includes(f.status) && DEFAULT_BASELINE.test(f.filename)) changed.push(f.filename);
    else if (f.status === 'renamed' && DEFAULT_BASELINE.test(f.previous_filename ?? '')) changed.push(`${f.previous_filename} → ${f.filename}`);
  }
  return changed;
}

/** The existing files of the comparison (VISUAL_HARNESS, existing stories) a pull request modifies, removes or renames. */
export function changedHarnessFiles(files) {
  const changed = [];
  for (const f of files) {
    if (CHANGING.includes(f.status) && isHarness(f.filename)) changed.push(f.filename);
    else if (f.status === 'renamed' && (isHarness(f.previous_filename) || isHarness(f.filename))) {
      changed.push(`${f.previous_filename} → ${f.filename}`);
    }
  }
  return changed;
}

/**
 * Why the files of a pull request forbid the merge; empty when they allow it. `changedFiles` is the pull request's
 * `changed_files`: the files API stops at 3000 entries, and a cut list must not pass for a complete one.
 */
export function fileGateProblems(files, changedFiles, { acceptDefault = false, acceptHarness = false } = {}) {
  if (files.length !== changedFiles) {
    return [`the file list is incomplete: the API listed ${files.length} of ${changedFiles} changed files, so the gates cannot judge it`];
  }
  const problems = [];
  const defaults = changedDefaultBaselines(files);
  if (defaults.length && !acceptDefault) {
    problems.push(`changes default-presentation baselines:\n${list(defaults)}\n  Web apps would look different. Merge only when the maintainer says so: --accept-default-visual-change`);
  }
  const harness = changedHarnessFiles(files);
  if (harness.length && !acceptHarness) {
    problems.push(`changes the visual comparison itself:\n${list(harness)}\n  A weakened comparison would pass changed components unseen. Merge only when the maintainer has reviewed these files and says so: --accept-visual-harness-change`);
  }
  return problems;
}

/**
 * Whether the required jobs passed for `sha`, judged only in the latest `pull_request` run of ci.yml for that commit
 * (`runs` from `gh run list --workflow ci.yml --commit <sha>`, `jobs` from `gh run view <id> --json jobs`, the
 * latest attempt), and that no check of the pull request is red (`checks` from `gh pr checks`). A check named like a
 * required job in another workflow counts for nothing.
 */
export function ciProblems({ sha, runs, jobs, checks, required = MUST_PASS }) {
  const problems = [];
  const red = checks.filter((c) => !['pass', 'skipping'].includes(c.bucket));
  if (red.length) problems.push(`${red.map((c) => c.name).join(', ')} not green`);
  const run = latestRun(runs, sha);
  if (!run) return [...problems, `no pull_request run of ${CI_WORKFLOW} for ${sha.slice(0, 8)}`];
  if (run.status !== 'completed') problems.push(`the ${CI_WORKFLOW} run ${run.databaseId} is ${run.status}`);
  for (const name of required) {
    const found = jobs.filter((j) => j.name === name);
    if (!found.length) problems.push(`job "${name}" is missing in the ${CI_WORKFLOW} run ${run.databaseId}`);
    else if (found.some((j) => j.conclusion !== 'success')) problems.push(`job "${name}" did not succeed in the ${CI_WORKFLOW} run ${run.databaseId}: ${found.map((j) => j.conclusion || j.status).join(', ')}`);
  }
  return problems;
}

/** The newest pull_request run of `sha` among `runs`. */
export function latestRun(runs, sha) {
  return runs
    .filter((r) => r.event === 'pull_request' && r.headSha === sha)
    .sort((a, b) => b.databaseId - a.databaseId)[0];
}

const list = (items) => items.map((f) => `  ${f}`).join('\n');

function gh(args, { check = true } = {}) {
  const r = spawnSync('gh', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
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

/** The files of a pull request with their status (gh pr view has no status), and its changed_files count. */
function prFiles(number) {
  const out = gh(['api', `repos/{owner}/{repo}/pulls/${number}/files`, '--paginate', '--jq', '.[] | {filename, status, previous_filename}']);
  const files = out ? out.split('\n').map((line) => JSON.parse(line)) : [];
  const changedFiles = Number(gh(['api', `repos/{owner}/{repo}/pulls/${number}`, '--jq', '.changed_files']));
  return { files, changedFiles };
}

function prChecks(number) {
  const r = spawnSync('gh', ['pr', 'checks', String(number), '--json', 'name,bucket,workflow,link'], { cwd: ROOT, encoding: 'utf8' });
  return JSON.parse(r.stdout || '[]');
}

/** The ci.yml runs of a commit and the jobs of the newest pull_request run among them (its latest attempt). */
function ciRun(sha) {
  const runs = ghJson(['run', 'list', '--workflow', CI_WORKFLOW, '--commit', sha, '--json', 'databaseId,event,status,conclusion,headSha,attempt']) ?? [];
  const run = latestRun(runs, sha);
  const jobs = run ? ghJson(['run', 'view', String(run.databaseId), '--json', 'jobs']).jobs : [];
  return { runs, jobs };
}

/** Waits until no check of the pull request is pending. */
async function waitForChecks(number, { minutes = 40 } = {}) {
  const started = Date.now();
  const deadline = started + minutes * 60_000;
  for (;;) {
    const checks = prChecks(number);
    const pending = checks.filter((c) => c.bucket === 'pending');
    if (checks.length && !pending.length) return checks;
    // GitHub starts no checks for a pull request that conflicts with its base, or when Actions are off.
    if (!checks.length && Date.now() - started > 3 * 60_000) die(`no checks started for #${number} after 3 minutes: conflicts with the base, or no workflow run`);
    if (Date.now() > deadline) die(`checks of #${number} still pending after ${minutes} minutes`);
    await sleep(10_000);
  }
}

async function merge(number, { newTitle, keepTitle, acceptDefault, acceptHarness }) {
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

  // Early answer, so nobody waits 40 minutes for a refusal; the verdict that counts is the one below.
  const early = prFiles(number);
  const earlyProblems = fileGateProblems(early.files, early.changedFiles, { acceptDefault, acceptHarness });
  if (earlyProblems.length) die(`#${number} ${earlyProblems.join(`\nerror: #${number} `)}`);

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

  // Decide for one head commit and merge exactly that one. When a push moves the head while we look, start over.
  for (;;) {
    console.log('  waiting for the checks…');
    await waitForChecks(number);
    const head = view(number);
    if (head.state !== 'OPEN') die(`#${number} is ${head.state}`);
    const sha = head.headRefOid;
    const { files, changedFiles } = prFiles(number);
    const checks = prChecks(number);
    const { runs, jobs } = ciRun(sha);
    if (view(number).headRefOid !== sha) {
      console.log(`  the head moved past ${sha.slice(0, 8)} while deciding: waiting again`);
      continue;
    }

    console.log(`  head ${sha.slice(0, 8)}:`);
    for (const c of checks) console.log(`    ${c.bucket === 'pass' ? 'ok  ' : c.bucket === 'skipping' ? '-   ' : 'FAIL'} ${c.workflow ? `${c.workflow} / ` : ''}${c.name}: ${c.bucket}`);
    const fileProblems = fileGateProblems(files, changedFiles, { acceptDefault, acceptHarness });
    const problems = [...fileProblems, ...ciProblems({ sha, runs, jobs, checks })];
    if (problems.length) die(`#${number} not merged:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    const accepted = [
      ...(acceptDefault ? changedDefaultBaselines(files).map((f) => `${f} (--accept-default-visual-change)`) : []),
      ...(acceptHarness ? changedHarnessFiles(files).map((f) => `${f} (--accept-visual-harness-change)`) : []),
    ];
    if (accepted.length) console.log(`  accepted by the maintainer:\n${list(accepted)}`);

    const subject = `${title} (#${number})`;
    const r = spawnSync('gh', ['pr', 'merge', String(number), '--squash', '--match-head-commit', sha, '--subject', subject, ...(pr.isCrossRepository ? [] : ['--delete-branch'])], { cwd: ROOT, encoding: 'utf8' });
    if (r.status !== 0) {
      if (view(number).headRefOid !== sha) {
        console.log(`  the head moved past ${sha.slice(0, 8)} before the merge: waiting again`);
        continue;
      }
      die(`gh pr merge failed: ${(r.stderr || '').trim()}`);
    }
    const merged = ghJson(['pr', 'view', String(number), '--json', 'mergeCommit,baseRefName']);
    console.log(`  squash-merged ${sha.slice(0, 8)} into ${merged.baseRefName}: ${merged.mergeCommit.oid.slice(0, 8)} ${subject}`);
    if (pr.author.login !== gh(['api', 'user', '-q', '.login'])) console.log(`  thank @${pr.author.login} in the next release`);
    return;
  }
}

function parse(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--title') args.title = argv[++i];
    else if (argv[i] === '--keep-title') args.keepTitle = true;
    else if (argv[i] === '--accept-default-visual-change') args.acceptDefault = true;
    else if (argv[i] === '--accept-visual-harness-change') args.acceptHarness = true;
    else args._.push(argv[i]);
  }
  return args;
}

// Run only as a script: pr.test.mjs imports the decision functions.
async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parse(rest);
  if (command === 'view' && args._[0]) {
    const pr = view(args._[0]);
    console.log(JSON.stringify({ ...pr, files: pr.files.map((f) => f.path), titleProblem: checkTitle(pr.title) }, null, 2));
  } else if (command === 'merge' && args._[0]) {
    await merge(Number(args._[0]), {
      newTitle: args.title,
      keepTitle: args.keepTitle === true,
      acceptDefault: args.acceptDefault === true,
      acceptHarness: args.acceptHarness === true,
    });
  } else {
    console.log('usage: pr.mjs view N | pr.mjs merge N [--title "<type>(<scope>): <subject>" | --keep-title] [--accept-default-visual-change] [--accept-visual-harness-change]');
    process.exit(command ? 1 : 0);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
