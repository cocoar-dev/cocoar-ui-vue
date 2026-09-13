#!/usr/bin/env node
// `npx @cocoar/vue-ui skill` — install the Agent Skill that ships in this package.
//
// The skill sits in skills/cocoar-vue-ui/ at the package root. The skills CLI (npx skills,
// https://github.com/vercel-labs/skills) installs skills from git repos and local folders but
// has no npm source, so the plain command would be `npx skills add ./node_modules/@cocoar/vue-ui`.
// This bin resolves that path for the caller and hands everything else — agent detection,
// install directories, lockfile, `npx skills update` — to the skills CLI. Extra arguments pass
// through (`-g`, `-a claude-code`, `--copy`, `-y`, …).

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillDir = path.join(packageDir, 'skills', 'cocoar-vue-ui');
const [command, ...rest] = process.argv.slice(2);

if (command !== 'skill' || rest.includes('--help') || rest.includes('-h')) {
  console.log(`Usage: npx @cocoar/vue-ui skill [skills-cli options]

Installs the Cocoar UI Vue Agent Skill for Claude Code, Cursor, Codex, Copilot and other
agents via the skills CLI (npx skills add). Options are passed through, for example:

  npx @cocoar/vue-ui skill                 interactive: pick agents
  npx @cocoar/vue-ui skill -y              accept defaults
  npx @cocoar/vue-ui skill -g              install user-wide instead of into the project
  npx @cocoar/vue-ui skill -a claude-code  target one agent

Skill source: ${skillDir}`);
  process.exit(command === 'skill' ? 0 : 1);
}

if (!existsSync(path.join(skillDir, 'SKILL.md'))) {
  console.error(`No skill found at ${skillDir} — this build of @cocoar/vue-ui does not ship one.`);
  process.exit(1);
}

// npx is a .cmd shim on Windows, which Node only runs through a shell; quote the path for it.
const windows = process.platform === 'win32';
const quote = (arg) => (windows && /[\s"]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg);
const result = spawnSync('npx', ['--yes', 'skills', 'add', packageDir, ...rest].map(quote), {
  stdio: 'inherit',
  shell: windows,
});

if (result.error) {
  console.error(`Could not run the skills CLI (${result.error.message}).`);
  console.error(`Install it by hand instead: npx skills add ${packageDir}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
