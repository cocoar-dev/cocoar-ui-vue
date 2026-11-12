// Shared helpers of the release scripts (Node only, no dependencies).
//
// The release flow (see .alta/skills/cocoar-release/SKILL.md):
//   .github/workflows/ci.yml, one workflow as in CodeAlta:
//   develop ── run by hand ──> beta X.Y.Z-beta.N (npm dist-tag `beta`)
//   tag vX.Y.Z ──────────────> build, test, publish (`latest`), docs, GitHub release last
//   versions from git tags only: version.mjs
//
// Safety: packages reach a registry only from the real repository. Anywhere else (a fork, the release
// sandbox, a local run) every publish is a `--dry-run`, whatever the workflow asks for.

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const LIVE_REPOSITORY = 'cocoar-dev/cocoar-ui-vue';

/** True only in a workflow of the real repository that explicitly asks for a live publish. */
export function isLive({ dryRun = false } = {}) {
  return (
    !dryRun &&
    process.env.GITHUB_REPOSITORY === LIVE_REPOSITORY &&
    process.env.RELEASE_LIVE === 'true'
  );
}

export function liveReason() {
  if (process.env.GITHUB_REPOSITORY !== LIVE_REPOSITORY) {
    return `repository is ${process.env.GITHUB_REPOSITORY || '(local)'}, not ${LIVE_REPOSITORY}`;
  }
  if (process.env.RELEASE_LIVE !== 'true') return 'RELEASE_LIVE is not "true"';
  return 'dry run requested';
}

/** The publishable packages: packages/*\/package.json without `"private": true`. */
export function publishablePackages() {
  const dir = path.join(ROOT, 'packages');
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(dir, entry.name))
    .filter((pkgDir) => fs.existsSync(path.join(pkgDir, 'package.json')))
    .map((pkgDir) => ({ dir: pkgDir, file: path.join(pkgDir, 'package.json'), json: readJson(path.join(pkgDir, 'package.json')) }))
    .filter((pkg) => pkg.json.private !== true)
    .sort((a, b) => a.json.name.localeCompare(b.json.name));
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function run(command, args, options = {}) {
  return execFileSync(command, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim();
}

/** Runs a command and returns { status, stdout, stderr } without throwing. */
export function tryRun(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', ...options });
  return { status: result.status ?? 1, stdout: (result.stdout || '').trim(), stderr: (result.stderr || '').trim() };
}

export function headSha() {
  return process.env.GITHUB_SHA || run('git', ['rev-parse', 'HEAD']);
}

// --- Semantic versions (enough for X.Y.Z and X.Y.Z-label.N) -------------------------------------------

export function parseVersion(text) {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(text || '');
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] ? m[4].split('.') : [] };
}

export function compareVersions(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) throw new Error(`not a version: ${!x ? a : b}`);
  for (const key of ['major', 'minor', 'patch']) if (x[key] !== y[key]) return x[key] - y[key];
  if (!x.pre.length || !y.pre.length) return y.pre.length - x.pre.length; // a release is above its prereleases
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i += 1) {
    if (x.pre[i] === undefined) return -1;
    if (y.pre[i] === undefined) return 1;
    const nx = /^\d+$/.test(x.pre[i]);
    const ny = /^\d+$/.test(y.pre[i]);
    if (nx && ny && +x.pre[i] !== +y.pre[i]) return +x.pre[i] - +y.pre[i];
    if (nx !== ny) return nx ? -1 : 1;
    if (x.pre[i] !== y.pre[i]) return x.pre[i] < y.pre[i] ? -1 : 1;
  }
  return 0;
}

export function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

export function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      args._.push(arg);
      continue;
    }
    const [key, inline] = arg.slice(2).split('=', 2);
    const name = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (inline !== undefined) args[name] = inline;
    else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) args[name] = argv[++i];
    else args[name] = true;
  }
  return args;
}
