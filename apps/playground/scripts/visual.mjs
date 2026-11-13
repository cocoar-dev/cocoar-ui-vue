#!/usr/bin/env node
// Visual baselines of the playground (apps/playground/visual/README.md).
//
//   node apps/playground/scripts/visual.mjs [--update] [story…]   compare (or update) in Docker
//   node apps/playground/scripts/visual.mjs --inside [--update] [story…]
//                                    the same, already inside the Playwright image (CI uses this)
//   node apps/playground/scripts/visual.mjs --print-image          the image, from the lockfile
//
// Images are made only in the Playwright Docker image whose version is the one of
// @playwright/test in pnpm-lock.yaml, as linux/amd64 like the CI runners: fonts
// rasterise differently on every OS, and a zero-tolerance comparison needs one.
//
// Outside, the repository (tracked and untracked-not-ignored files, without
// node_modules and build output) is copied into a fresh container, installed
// there with a pnpm store kept in the Docker volume `cocoar-visual-cache`, and
// compared. The report lands in apps/playground/visual-results/ (ignored); with
// --update, new and changed baselines are copied back into visual/__screenshots__.
//
// No dependencies: Node, git, tar and docker.

import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const PLAYGROUND = path.join(ROOT, 'apps', 'playground');
const STORIES = path.join(PLAYGROUND, 'src', 'visual', 'stories');
const BASELINES = path.join(PLAYGROUND, 'visual', '__screenshots__');
const RESULTS = path.join(PLAYGROUND, 'visual-results');
const CACHE_VOLUME = 'cocoar-visual-cache';
// CI runs on amd64. Override only to diagnose (e.g. compare linux/arm64 output): never for baselines.
const PLATFORM = process.env.VISUAL_DOCKER_PLATFORM || 'linux/amd64';

function die(message) {
  console.error(`visual: ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const r = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (r.error) die(`${command}: ${r.error.message}`);
  return r.status ?? 1;
}

/** The single @playwright/test version of the lockfile; the image must match it exactly. */
function playwrightVersion() {
  const lock = fs.readFileSync(path.join(ROOT, 'pnpm-lock.yaml'), 'utf8');
  const versions = new Set(
    [...lock.matchAll(/^ {2}'@playwright\/test@([^'(]+)':/gm)].map((m) => m[1]),
  );
  if (versions.size !== 1)
    die(
      `expected one @playwright/test version in pnpm-lock.yaml, found: ${[...versions].join(', ') || 'none'}`,
    );
  return [...versions][0];
}

const image = () => `mcr.microsoft.com/playwright:v${playwrightVersion()}-noble`;

function parse(argv) {
  const args = { update: false, inside: false, printImage: false, stories: [] };
  for (const a of argv) {
    if (a === '--update') args.update = true;
    else if (a === '--inside') args.inside = true;
    else if (a === '--print-image') args.printImage = true;
    else if (a === '-h' || a === '--help') args.help = true;
    else if (a.startsWith('-')) die(`unknown option ${a}`);
    else args.stories.push(a);
  }
  const known = fs
    .readdirSync(STORIES)
    .filter((f) => f.endsWith('.vue'))
    .map((f) => f.slice(0, -4));
  const unknown = args.stories.filter((s) => !known.includes(s));
  if (unknown.length) die(`unknown story ${unknown.join(', ')}; known: ${known.join(', ')}`);
  return args;
}

/** Arguments for `playwright test`, the same inside Docker locally and in CI. */
function playwrightArgs({ update, stories }) {
  const args = ['test', '-c', 'playwright.visual.config.ts'];
  if (update) args.push('--update-snapshots=changed');
  // The manifest checks always run; they are cheap and guard every selection.
  if (stories.length) args.push('--grep', `story:(${stories.join('|')}) |manifest:`);
  return args;
}

/** Runs in the Playwright image: install, then compare. */
function inside(args) {
  if (process.platform !== 'linux')
    die('--inside runs only in the Playwright Docker image; run without it');
  const env = { ...process.env, COREPACK_ENABLE_DOWNLOAD_PROMPT: '0' };
  if (spawnSync('pnpm', ['--version'], { stdio: 'ignore', env }).status !== 0) {
    // pnpm as pinned by packageManager in package.json.
    if (run('corepack', ['enable'], { env }) !== 0) die('corepack enable failed');
  }
  const install = ['install', '--frozen-lockfile'];
  if (process.env.VISUAL_PNPM_STORE) install.push('--store-dir', process.env.VISUAL_PNPM_STORE);
  if (run('pnpm', install, { cwd: ROOT, env }) !== 0) die('pnpm install failed');
  fs.rmSync(RESULTS, { recursive: true, force: true });
  const status = run('pnpm', ['exec', 'playwright', ...playwrightArgs(args)], {
    cwd: PLAYGROUND,
    env,
  });
  process.exit(status);
}

/** The files to copy into the container: what git would see, without anything ignored. */
function repositoryFiles() {
  const r = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 << 20,
  });
  if (r.status !== 0) die(`git ls-files failed: ${r.stderr}`);
  // Files deleted in the working tree are still in the index.
  return r.stdout
    .split('\0')
    .filter((f) => f && fs.statSync(path.join(ROOT, f), { throwIfNoEntry: false })?.isFile());
}

/** Resolves when a child process has ended, with whether it succeeded; a spawn error is a failure too. */
function ended(child, name) {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (result) => {
      if (!settled) resolve(result);
      settled = true;
    };
    child.on('error', (error) => settle({ ok: false, why: `${name}: ${error.message}` }));
    // 'exit', not 'close': tar's stdout is read by docker, so in this process it never closes.
    child.on('exit', (code, signal) =>
      settle({
        ok: code === 0,
        why: `${name}: ${signal ? `killed by ${signal}` : `exit ${code}`}`,
      }),
    );
  });
}

async function outside(args) {
  if (spawnSync('docker', ['version'], { stdio: 'ignore' }).status !== 0)
    die('docker is not running');
  const started = Date.now();
  fs.rmSync(RESULTS, { recursive: true, force: true });
  fs.mkdirSync(RESULTS, { recursive: true });

  const list = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cocoar-visual-')), 'files');
  fs.writeFileSync(list, repositoryFiles().join('\0'));

  const forwarded = [...(args.update ? ['--update'] : []), ...args.stories].join(' ');
  const script = [
    'mkdir -p /repo && tar -xf - -C /repo || exit 1',
    `node apps/playground/scripts/visual.mjs --inside ${forwarded}`,
    'code=$?',
    'cp -r apps/playground/visual-results/. /out/ 2>/dev/null',
    ...(args.update
      ? [
          'mkdir -p /out/__screenshots__ && cp apps/playground/visual/__screenshots__/*.png /out/__screenshots__/ 2>/dev/null',
        ]
      : []),
    // Files written into the bind mount belong to root on Linux hosts.
    '[ -n "$HOST_UID" ] && chown -R "$HOST_UID:$HOST_GID" /out',
    'exit $code',
  ].join('\n');
  const container = `cocoar-visual-${process.pid}-${Date.now()}`;
  const dockerArgs = [
    'run',
    '--rm',
    '--name',
    container,
    '-i',
    '--platform',
    PLATFORM,
    '--ipc=host',
    '-v',
    `${CACHE_VOLUME}:/cache`,
    '-v',
    `${RESULTS}:/out`,
    '-e',
    'VISUAL_PNPM_STORE=/cache/pnpm-store',
    '-e',
    'COREPACK_HOME=/cache/corepack',
    ...(process.getuid
      ? ['-e', `HOST_UID=${process.getuid()}`, '-e', `HOST_GID=${process.getgid()}`]
      : []),
    '-w',
    '/repo',
    image(),
    'bash',
    '-c',
    script,
  ];
  console.log(
    `visual: ${image()} (${PLATFORM})${args.update ? ', updating baselines' : ''}${args.stories.length ? `, stories: ${args.stories.join(', ')}` : ''}`,
  );

  // COPYFILE_DISABLE keeps macOS tar from adding ._ metadata files.
  const tar = spawn('tar', ['--no-xattrs', '-cf', '-', '--null', '-T', list], {
    cwd: ROOT,
    env: { ...process.env, COPYFILE_DISABLE: '1' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const tarEnded = ended(tar, 'tar');
  try {
    await once(tar, 'spawn');
  } catch (error) {
    die(`tar: ${error.message}`);
  }
  const docker = spawn('docker', dockerArgs, { stdio: [tar.stdout, 'inherit', 'inherit'] });
  const dockerEnded = ended(docker, 'docker');
  // An incomplete copy must not be compared: a file tar could not read would simply be missing. Stop the
  // container itself: bash as its PID 1 ignores the SIGTERM a kill of the docker client forwards.
  tarEnded.then((t) => t.ok || spawnSync('docker', ['rm', '-f', container], { stdio: 'ignore' }));
  const [transfer, run] = await Promise.all([tarEnded, dockerEnded]);
  fs.rmSync(path.dirname(list), { recursive: true, force: true });

  const seconds = Math.round((Date.now() - started) / 1000);
  if (!transfer.ok) {
    fs.rmSync(path.join(RESULTS, '__screenshots__'), { recursive: true, force: true });
    console.log(
      `visual: FAILED after ${seconds}s: the copy into the container failed (${transfer.why}); nothing was copied back`,
    );
    process.exit(1);
  }
  if (args.update) copyBack();
  if (run.ok) {
    console.log(`visual: passed in ${seconds}s`);
    process.exit(0);
  }
  console.log(`visual: FAILED (${run.why}) after ${seconds}s`);
  console.log(
    '  report (expected / actual / diff): apps/playground/visual-results/report/index.html',
  );
  console.log(
    '  open it:  pnpm --filter @cocoar/playground exec playwright show-report visual-results/report',
  );
  process.exit(1);
}

/** Copies new and changed baselines from the container's output into the repository. */
function copyBack() {
  const from = path.join(RESULTS, '__screenshots__');
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(BASELINES, { recursive: true });
  for (const file of fs.readdirSync(from).sort()) {
    const source = path.join(from, file);
    const target = path.join(BASELINES, file);
    const before = fs.existsSync(target) ? fs.readFileSync(target) : null;
    const after = fs.readFileSync(source);
    if (before && before.equals(after)) continue;
    fs.copyFileSync(source, target);
    console.log(
      `  ${before ? 'updated' : 'new    '} apps/playground/visual/__screenshots__/${file}`,
    );
  }
  fs.rmSync(from, { recursive: true, force: true });
}

const args = parse(process.argv.slice(2));
if (args.help) {
  console.log(
    'usage: node apps/playground/scripts/visual.mjs [--update] [story…] | --inside [--update] [story…] | --print-image',
  );
} else if (args.printImage) {
  console.log(image());
} else if (args.inside) {
  inside(args);
} else {
  await outside(args);
}
