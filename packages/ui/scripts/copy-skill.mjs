// Runs at `prepack` (before pnpm pack / npm publish).
//
// Copies the repository's generated Agent Skill (skills/cocoar-vue-ui, produced from the docs by
// apps/docs/scripts/sync-skill.mjs) into this package so it ships in the tarball under
// skills/cocoar-vue-ui/ — the conventional place both agentskills-cli and `npx skills add
// ./node_modules/@cocoar/vue-ui` look. The copy is gitignored; the root folder is the source.
//
// Exits silently outside the repository (e.g. a `prepack` re-run on an unpacked tarball).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(pkgDir, '..', '..', 'skills');
const target = path.join(pkgDir, 'skills');

if (!fs.existsSync(path.join(source, 'cocoar-vue-ui', 'SKILL.md'))) {
  console.log('[vue-ui] prepack: skills/ not found next to packages/ — skipping skill copy');
  process.exit(0);
}

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });
console.log(`[vue-ui] prepack: copied ${source} → ${target}`);
