#!/usr/bin/env node
// The steps of a cocoar-ui-vue release that are the same each time (modelled on CodeAlta's release.py).
//
//   node .alta/skills/cocoar-release/scripts/release.mjs <command> [options]
//
//   preflight                    gh account, branch, clean tree, up to date, last release
//   changes [--since vX.Y.Z]     commits since the last release by Conventional Commit type, pull requests
//   ci [REF]                     waits for the ci.yml run of the commit of REF (default origin/develop)
//   beta [--ref develop]         starts ci.yml by hand (a prerelease), waits, says which beta it published
//   tag X.Y.Z [--commit SHA] [--accept-untested]
//                                checks the CI run is green and the last beta is this commit, then tags and pushes
//   release-run X.Y.Z            waits for the ci.yml run of the tag and says how each job ended
//   npm X.Y.Z [--dist-tag latest] [--minutes N]
//                                waits until every package lists the version (and the dist-tag points at it)
//   docs X.Y.Z                   the docs of the version answer on docs.cocoar.dev
//   notes X.Y.Z --summary FILE   puts the summary above the generated notes, folded in "All changes"
//   links FILE                   every http(s) link of a Markdown file answers
//
// Only for the maintainer, only when a release was asked for: tag, notes and beta are outward-facing.
// Node only, no dependencies; needs git and gh on PATH. `ci`, `beta`, `release-run` and `npm` wait for
// minutes: start them with `alta job start`.

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const MAINTAINERS = ['windischb'];
const LIVE_REPOSITORY = 'cocoar-dev/cocoar-ui-vue';
const PROBE_PACKAGE = '@cocoar/vue-ui';
// One workflow, as in CodeAlta: a push builds and tests, a dispatch publishes a beta, a tag releases.
const CI_WORKFLOW = 'ci.yml';
const BETA_WORKFLOW = 'ci.yml';
const RELEASE_WORKFLOW = 'ci.yml';
const DOCS_URL = 'https://docs.cocoar.dev/cocoar-ui-vue';

const KINDS = [
  ['Breaking changes', /^\w+(\([^)]*\))?!:/],
  ['Features', /^feat(\([^)]*\))?:/],
  ['Fixes', /^fix(\([^)]*\))?:/],
  ['Performance and refactoring', /^(perf|refactor)(\([^)]*\))?:/],
  ['Documentation', /^docs(\([^)]*\))?:/],
  ['Tests', /^test(\([^)]*\))?:/],
  ['Dependencies', /^(chore|build)\(deps\):/],
  ['CI, build and maintenance', /^(ci|build|chore|revert|style)(\([^)]*\))?:/],
  ['Merges', /^Merge /],
];

// --- helpers ---------------------------------------------------------------------------------------------

function run(cmd, args, { check = true, trim = true } = {}) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8' });
  if (check && r.status !== 0) die(`${cmd} ${args.slice(0, 3).join(' ')}… failed (${r.status}): ${(r.stderr || '').trim()}`);
  return trim ? (r.stdout || '').trim() : r.stdout || '';
}
const git = (...args) => run('git', args);
const gh = (...args) => run('gh', args);
const ghJson = (...args) => JSON.parse(gh(...args) || 'null');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function die(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}
function ok(flag, text) {
  console.log(`${flag ? '  ok   ' : '  FAIL '}${text}`);
  return flag;
}
function repository() {
  const url = git('remote', 'get-url', 'origin');
  const m = /github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/.exec(url);
  if (!m) die(`origin is not a GitHub repository: ${url}`);
  return `${m[1]}/${m[2]}`;
}
const REPO = repository();
const LIVE = REPO === LIVE_REPOSITORY;

function fetchOrigin() {
  git('fetch', '-q', '--tags', 'origin');
}
function lastRelease() {
  const releases = ghJson('release', 'list', '--repo', REPO, '--limit', '30', '--json', 'tagName,isLatest,isDraft,isPrerelease') || [];
  const latest = releases.find((r) => r.isLatest) || releases.find((r) => !r.isDraft && !r.isPrerelease);
  if (latest) return latest.tagName;
  // No GitHub release yet (a fresh sandbox): the highest vX.Y.Z tag.
  const tags = git('tag', '--list', 'v*.*.*', '--sort=-v:refname').split('\n').filter((t) => /^v\d+\.\d+\.\d+$/.test(t));
  if (!tags.length) die('no release found');
  return tags[0];
}
function npmView(spec, field) {
  const r = spawnSync('npm', ['view', spec, field, '--json'], { encoding: 'utf8' });
  if (r.status !== 0 || !r.stdout.trim()) return undefined;
  try {
    return JSON.parse(r.stdout);
  } catch {
    return r.stdout.trim();
  }
}
function packages() {
  return fs
    .readdirSync(path.join(ROOT, 'packages'))
    .map((dir) => path.join(ROOT, 'packages', dir, 'package.json'))
    .filter((file) => fs.existsSync(file))
    .map((file) => JSON.parse(fs.readFileSync(file, 'utf8')))
    .filter((json) => json.private !== true)
    .map((json) => json.name);
}

/** The runs of a workflow for a commit, newest first; `ref` tells a branch run from the run of a tag. */
function runsOf(workflow, sha, event, ref) {
  const runs = ghJson('run', 'list', '--repo', REPO, '--workflow', workflow, '--commit', sha, '--limit', '20',
    '--json', 'databaseId,status,conclusion,event,headBranch,url,createdAt') || [];
  return runs.filter((r) => (!event || r.event === event) && (!ref || ref(r.headBranch)));
}
const onBranch = (name) => !/^v\d+\.\d+\.\d+$/.test(name);
async function waitForRun(workflow, sha, event, { tries = 18, after, ref } = {}) {
  for (let i = 0; i < tries; i += 1) {
    const runs = runsOf(workflow, sha, event, ref).filter((r) => !after || r.createdAt > after);
    if (runs.length) return runs[0];
    await sleep(10_000);
  }
  return null;
}
function watch(runId) {
  spawnSync('gh', ['run', 'watch', String(runId), '--repo', REPO, '--exit-status', '--interval', '30'], { cwd: ROOT, stdio: 'ignore' });
  return ghJson('run', 'view', String(runId), '--repo', REPO, '--json', 'status,conclusion,url,jobs');
}

// --- commands --------------------------------------------------------------------------------------------

function preflight() {
  let good = true;
  const login = run('gh', ['api', 'user', '-q', '.login'], { check: false });
  good &= ok(MAINTAINERS.includes(login), `gh account is ${login || '(none)'}${MAINTAINERS.includes(login) ? '' : `: this skill is for ${MAINTAINERS.join(', ')}`}`);
  console.log(`  repository ${REPO}${LIVE ? '' : ' (not the real repository: every publish is a dry run)'}`);
  const branch = git('branch', '--show-current');
  good &= ok(/^(develop|release\/.+|support\/.+)$/.test(branch), `branch ${branch}`);
  // "XY path": the status columns may start with a space, so the output is not trimmed.
  const dirty = run('git', ['status', '--porcelain'], { trim: false }).split('\n').filter(Boolean).filter((l) => !l.slice(3).startsWith('.alta/') && !l.slice(3).startsWith('tmp/'));
  good &= ok(!dirty.length, `nothing uncommitted outside .alta/ and tmp/${dirty.length ? `: ${dirty.slice(0, 8).map((l) => l.slice(3)).join(', ')}` : ''}`);
  fetchOrigin();
  const upstream = run('git', ['rev-parse', '--verify', '-q', `origin/${branch}`], { check: false });
  if (upstream) {
    const [ahead, behind] = git('rev-list', '--left-right', '--count', `${branch}...origin/${branch}`).split(/\s+/);
    good &= ok(behind === '0' && ahead === '0', `${branch} is ${ahead} ahead and ${behind} behind origin/${branch}`);
  } else {
    good &= ok(false, `origin/${branch} does not exist`);
  }
  const base = upstream ? `origin/${branch}` : 'origin/develop';
  const tag = lastRelease();
  console.log(`  last release ${tag}; ${git('rev-list', '--count', `${tag}..${base}`)} commits since; ${base} at ${git('rev-parse', '--short', base)}`);
  const latest = npmView(PROBE_PACKAGE, 'dist-tags.latest');
  const beta = lastBeta();
  console.log(`  npm ${PROBE_PACKAGE}: latest ${latest ?? '-'}; last beta ${beta.version ?? '-'} (${beta.source})`);
  return good ? 0 : 1;
}

function changes(args) {
  fetchOrigin();
  const since = args.since || lastRelease();
  const head = args.head || 'origin/develop';
  const lines = git('log', '--format=%h %s', `${since}..${head}`).split('\n').filter(Boolean);
  const groups = new Map(KINDS.map(([name]) => [name, []]));
  const other = [];
  for (const line of lines) {
    const subject = line.slice(line.indexOf(' ') + 1);
    const kind = KINDS.find(([, re]) => re.test(subject));
    (kind ? groups.get(kind[0]) : other).push(line);
  }
  console.log(`# Changes ${since}..${head} (${lines.length} commits)\n`);
  for (const [name, items] of [...groups, ['Without a Conventional Commit prefix', other]]) {
    if (!items.length) continue;
    console.log(`## ${name} (${items.length})`);
    for (const item of items) console.log(`- ${item}`);
    console.log('');
  }
  const date = git('log', '-1', '--format=%cI', since);
  const prs = ghJson('pr', 'list', '--repo', REPO, '--state', 'merged', '--search', `merged:>=${date.slice(0, 10)}`, '--limit', '100', '--json', 'number,title,author,mergedAt') || [];
  const merged = prs.filter((p) => p.mergedAt > date);
  if (merged.length) {
    console.log(`## Pull requests merged since ${since}\n`);
    for (const p of merged) console.log(`- #${p.number} @${p.author.login} ${p.title}`);
    const others = [...new Set(merged.map((p) => p.author.login))].filter((l) => !MAINTAINERS.includes(l));
    if (others.length) console.log(`\nContributors to thank: ${others.map((l) => `@${l}`).join(', ')}`);
  }
  return 0;
}

async function ci(args) {
  fetchOrigin();
  const ref = args._[0] || 'origin/develop';
  const sha = git('rev-parse', `${ref}^{commit}`);
  const found = await waitForRun(CI_WORKFLOW, sha, 'push', { ref: onBranch });
  if (!found) {
    console.log(`No ${CI_WORKFLOW} run for ${sha.slice(0, 8)}.`);
    return 1;
  }
  console.log(`CI run ${found.databaseId} for ${ref} (${sha.slice(0, 8)}): ${found.url}`);
  const done = found.status === 'completed' ? found : watch(found.databaseId);
  console.log(`ended: ${done.conclusion}`);
  return done.conclusion === 'success' ? 0 : 1;
}

async function beta(args) {
  fetchOrigin();
  const ref = args.ref || 'develop';
  const sha = git('rev-parse', `origin/${ref}^{commit}`);
  const before = new Date().toISOString();
  gh('workflow', 'run', BETA_WORKFLOW, '--repo', REPO, '--ref', ref);
  console.log(`Started ${BETA_WORKFLOW} on ${ref} (${sha.slice(0, 8)})`);
  const found = await waitForRun(BETA_WORKFLOW, sha, 'workflow_dispatch', { after: before, ref: (branch) => branch === ref });
  if (!found) die('the prerelease run did not start');
  console.log(`run ${found.databaseId}: ${found.url}`);
  const done = watch(found.databaseId);
  console.log(`ended: ${done.conclusion}`);
  if (done.conclusion !== 'success') return 1;
  const log = run('gh', ['run', 'view', String(found.databaseId), '--repo', REPO, '--log'], { check: false });
  const version = /→ @cocoar[-\w]*\/vue-ui@(\S+)/.exec(log)?.[1];
  const mode = /(LIVE publish[^\n]*|DRY RUN[^\n]*)/.exec(log)?.[1];
  console.log(`beta ${version ?? '(version not found in the log)'} — ${mode ?? ''}`.trim());
  if (LIVE && version) {
    const head = npmView(`${PROBE_PACKAGE}@${version}`, 'gitHead');
    ok(head === sha, `${PROBE_PACKAGE}@${version} on npm is ${head?.slice(0, 8) ?? 'missing'}`);
  }
  return 0;
}

/** The last beta: from npm in the real repository; elsewhere from the last successful beta run (a dry run). */
function lastBeta() {
  if (LIVE) {
    const version = npmView(PROBE_PACKAGE, 'dist-tags.beta');
    return { version, sha: version ? npmView(`${PROBE_PACKAGE}@${version}`, 'gitHead') : undefined, source: 'npm' };
  }
  const runs = ghJson('run', 'list', '--repo', REPO, '--workflow', BETA_WORKFLOW, '--event', 'workflow_dispatch', '--branch', 'develop',
    '--status', 'success', '--limit', '1', '--json', 'databaseId,headSha') || [];
  if (!runs.length) return { source: 'no beta run' };
  const log = run('gh', ['run', 'view', String(runs[0].databaseId), '--repo', REPO, '--log'], { check: false });
  const version = /→ @cocoar[-\w]*\/vue-ui@(\S+)/.exec(log)?.[1];
  return { version, sha: runs[0].headSha, source: `beta run ${runs[0].databaseId}, a dry run in ${REPO}` };
}

function green(sha) {
  const runs = runsOf(CI_WORKFLOW, sha, 'push', onBranch);
  return runs.length && runs[0].status === 'completed' && runs[0].conclusion === 'success' ? runs[0] : null;
}

function tag(args) {
  const version = args._[0];
  if (!/^\d+\.\d+\.\d+$/.test(version || '')) die('a release is X.Y.Z (the tag gets the v)');
  const name = `v${version}`;
  fetchOrigin();
  if (git('tag', '--list', name)) die(`the tag ${name} exists already`);
  const sha = git('rev-parse', `${args.commit || 'origin/develop'}^{commit}`);
  const reachable = git('branch', '-r', '--contains', sha, '--format=%(refname:short)').split('\n').some((b) => /^origin\/(develop|release\/.+|support\/.+)$/.test(b));
  if (!reachable) die(`${sha.slice(0, 8)} is not on origin/develop, release/* or support/*`);
  const ciRun = green(sha);
  if (!ciRun) {
    console.log(`No green ${CI_WORKFLOW} run on ${sha.slice(0, 8)}: never tag on a red or unfinished run (release.mjs ci).`);
    return 1;
  }
  console.log(`CI is green on ${sha.slice(0, 8)}: ${ciRun.url}`);
  // The beta the internal apps tested, against the commit to release.
  const { version: betaVersion, sha: betaHead, source } = lastBeta();
  if (betaVersion) console.log(`Last beta: ${betaVersion} from ${betaHead?.slice(0, 8) ?? '?'} (${source})`);
  if (betaHead === sha) {
    console.log(`The last beta ${betaVersion} is this commit.`);
  } else {
    const between = betaHead && spawnSync('git', ['merge-base', '--is-ancestor', betaHead, sha], { cwd: ROOT }).status === 0
      ? run('git', ['log', '--format=  %h %s', `${betaHead}..${sha}`], { trim: false }).trimEnd()
      : '';
    console.log(`The last beta ${betaVersion ?? '(none)'} is ${betaHead ? betaHead.slice(0, 8) : 'unknown'}, not ${sha.slice(0, 8)}.`);
    if (between) console.log(`Commits that no beta carried:\n${between}`);
    if (!args.acceptUntested) {
      console.log('Start a beta first (release.mjs beta) and let the apps test it, or pass --accept-untested when the maintainer says so.');
      return 1;
    }
    console.log('--accept-untested: tagging anyway, as the maintainer decided.');
  }
  git('tag', '-a', name, '-m', name, sha);
  git('push', 'origin', name);
  console.log(`Pushed ${name} at ${sha.slice(0, 8)}: the ci.yml run of the tag publishes the release (release.mjs release-run ${version}).`);
  return 0;
}

async function releaseRun(args) {
  const version = args._[0];
  const name = `v${version}`;
  fetchOrigin();
  const sha = git('rev-parse', `${name}^{commit}`);
  const found = await waitForRun(RELEASE_WORKFLOW, sha, 'push', { ref: (branch) => branch === name });
  if (!found) die(`no ${RELEASE_WORKFLOW} run for ${name}`);
  console.log(`release run ${found.databaseId}: ${found.url}`);
  const done = found.status === 'completed' ? ghJson('run', 'view', String(found.databaseId), '--repo', REPO, '--json', 'status,conclusion,url,jobs') : watch(found.databaseId);
  const mark = (c) => (c === 'success' ? 'ok  ' : c === 'skipped' ? '-   ' : 'FAIL');
  for (const job of done.jobs || []) console.log(`  ${mark(job.conclusion)} ${job.name}: ${job.conclusion}`);
  console.log(`ended: ${done.conclusion}`);
  if (done.conclusion === 'success') console.log(`https://github.com/${REPO}/releases/tag/${name}`);
  return done.conclusion === 'success' ? 0 : 1;
}

async function npm(args) {
  const version = args._[0];
  const distTag = args.distTag || 'latest';
  if (!LIVE) {
    console.log(`${REPO} is not ${LIVE_REPOSITORY}: its runs publish nothing, there is nothing to wait for.`);
    return 0;
  }
  const names = packages();
  const deadline = Date.now() + (Number(args.minutes) || 30) * 60_000;
  const done = new Set();
  console.log(`Waiting for ${names.length} packages to list ${version} (${distTag})`);
  for (;;) {
    for (const name of names) {
      if (done.has(name)) continue;
      const tags = npmView(name, 'dist-tags');
      if (tags && (tags[distTag] === version || (distTag === 'latest' && Object.values(tags).includes(version)))) {
        done.add(name);
        console.log(`  ${new Date().toISOString().slice(11, 19)} ${name} ${version} (${Object.entries(tags).filter(([, v]) => v === version).map(([t]) => t).join(', ')})`);
      }
    }
    if (done.size === names.length) {
      console.log(`All ${names.length} packages list ${version}.`);
      return 0;
    }
    if (Date.now() > deadline) {
      console.log(`Missing: ${names.filter((n) => !done.has(n)).join(', ')}`);
      return 1;
    }
    await sleep(30_000);
  }
}

async function docs(args) {
  const [major, minor] = (args._[0] || '').split('.');
  const url = `${DOCS_URL}/v${major}.${minor}/`;
  if (!LIVE) {
    console.log(`${REPO} deploys no docs; the real ones would be ${url}`);
    return 0;
  }
  const response = await fetch(url, { method: 'GET' });
  console.log(`${response.status === 200 ? 'ok  ' : 'FAIL'} ${response.status} ${url}`);
  return response.status === 200 ? 0 : 1;
}

async function checkLinks(text) {
  const urls = [...new Set((text.match(/https?:\/\/[^\s)\]"'<>]+/g) || []).map((u) => u.replace(/[.,]$/, '')))].sort();
  let bad = 0;
  for (const url of urls) {
    let status;
    try {
      status = (await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': 'cocoar-release' } })).status;
    } catch (error) {
      status = error.cause?.code || error.message;
    }
    // A page of a private repository (the sandbox) answers 404 without a session: ask the API instead.
    const m = status === 404 && /^https:\/\/github\.com\/([^/]+\/[^/]+)\/blob\/([^/]+)\/(.+)$/.exec(url);
    if (m && run('gh', ['api', `repos/${m[1]}/contents/${m[3]}?ref=${m[2]}`, '-q', '.path'], { check: false })) status = 200;
    bad += status === 200 ? 0 : 1;
    console.log(`  ${status === 200 ? 'ok  ' : 'FAIL'} ${status} ${url}`);
  }
  console.log(bad ? `${bad} link(s) do not answer` : `all ${urls.length} links answer`);
  return bad;
}

async function links(args) {
  if (!args._[0]) die('links FILE');
  return (await checkLinks(fs.readFileSync(args._[0], 'utf8'))) ? 1 : 0;
}

async function notes(args) {
  const version = args._[0];
  const name = `v${version}`;
  if (!args.summary) die('notes X.Y.Z --summary FILE');
  const summary = fs.readFileSync(args.summary, 'utf8').trim();
  const body = gh('release', 'view', name, '--repo', REPO, '--json', 'body', '-q', '.body');
  if (body.includes('<summary>All changes</summary>')) die('the notes already have a summary; edit them by hand');
  const composed = `${summary}\n\n<details>\n<summary>All changes</summary>\n\n${body.trim()}\n\n</details>\n`;
  const out = path.join(ROOT, 'tmp', `release-${version}`, 'release.md');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, composed);
  gh('release', 'edit', name, '--repo', REPO, '--notes-file', out);
  console.log(`Notes of ${name} updated from ${path.relative(ROOT, out)}: https://github.com/${REPO}/releases/tag/${name}`);
  return (await checkLinks(composed)) ? 1 : 0;
}

// --- main ------------------------------------------------------------------------------------------------

function parse(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) {
      args._.push(argv[i]);
      continue;
    }
    const key = argv[i].slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) args[key] = argv[++i];
    else args[key] = true;
  }
  return args;
}

const commands = { preflight, changes, ci, beta, tag, 'release-run': releaseRun, npm, docs, notes, links };
const [command, ...rest] = process.argv.slice(2);
if (!commands[command]) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1).filter((line, i, all) => all.slice(0, i + 1).every((l) => l.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(command ? 1 : 0);
}
process.exitCode = await commands[command](parse(rest));
