// Generates the Agent Skill in skills/cocoar-vue-ui/ from the VitePress documentation.
//
// The documentation is the only source. Every page under apps/docs/guide, apps/docs/foundations
// and apps/docs/components becomes a reference file of the skill, with each `<preview>` demo
// inlined as a ```vue block so an assistant sees working code next to the prose. The page's
// frontmatter description — the same line that feeds llms.txt on the docs site — becomes its
// entry in the skill's index. A component page's `devices` line (rules in ./devices.mjs) becomes
// a "Devices" line under its title, and this run fails when a page lacks it or breaks its
// rules. The only hand-written part is apps/docs/skill/SKILL.header.md:
// name, trigger description, package table, the gotchas.
//
//   node apps/docs/scripts/sync-skill.mjs          regenerate skills/cocoar-vue-ui/
//   node apps/docs/scripts/sync-skill.mjs --check  exit 1 if skills/cocoar-vue-ui/ is out of date
//
// The skill lives at the repository root so `npx skills add cocoar-dev/cocoar-ui-vue` and
// `agentskills-cli add cocoar-dev/cocoar-ui-vue` find it, and packages/ui copies it into its
// tarball at pack time (packages/ui/scripts/copy-skill.mjs) so the version a project has
// installed carries the matching docs.
//
// Agent Skills are progressive: an agent loads only the skill's name and description at startup,
// SKILL.md when a task matches, and a reference file when the index says it is relevant. That is
// why the index carries the descriptions and why the pages stay separate files.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import matter from 'gray-matter';

import { SECTIONS, EXCLUDED } from './sections.mjs';
import {
  DEVICE_CLASSES,
  DEVICE_CLASS_LABELS,
  DEVICE_STATE_LABELS,
  SAME_DEVICES_AS,
  checkDevicePages,
  devicesText,
} from './devices.mjs';
import { headingTitle } from './titles.mjs';

const docsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = path.resolve(docsDir, '..', '..');
const skillName = 'cocoar-vue-ui';
const skillDir = path.join(repoDir, 'skills', skillName);
const headerFile = path.join(docsDir, 'skill', 'SKILL.header.md');
const docsBaseUrl = 'https://docs.cocoar.dev/cocoar-ui-vue';
const check = process.argv.includes('--check');

// --- Collect the pages ---

const listed = new Set(SECTIONS.flatMap((s) => s.pages));
const onDisk = ['guide', 'foundations', 'components']
  .flatMap((dir) => walk(path.join(docsDir, dir)))
  .concat([path.join(docsDir, 'index.md')])
  .map((f) => path.relative(docsDir, f).split(path.sep).join('/'))
  .filter((f) => f.endsWith('.md') && !f.includes('/demos/'));

const unaccounted = onDisk.filter((f) => !listed.has(f) && !EXCLUDED.has(f));
const missing = [...listed].filter((f) => !onDisk.includes(f));
if (unaccounted.length || missing.length) {
  if (unaccounted.length) {
    console.error(`sync-skill: pages not in SECTIONS or EXCLUDED: ${unaccounted.join(', ')}`);
  }
  if (missing.length) {
    console.error(`sync-skill: pages in SECTIONS that do not exist: ${missing.join(', ')}`);
  }
  process.exit(1);
}

const pages = new Map();
for (const rel of listed) {
  // Line endings are normalized on the way in: the pages are edited on Windows and Linux alike,
  // and the generated files must not differ by that.
  const raw = normalizeNewlines(fs.readFileSync(path.join(docsDir, rel), 'utf8'));
  const { description, frontmatter, body } = splitFrontmatter(raw, rel);
  pages.set(rel, { rel, description, frontmatter, body });
}

// --- Check the device statements (rules and tests in ./devices.mjs) ---
//
// Every page under components/ says which device classes it supports, or is listed in NO_DEVICES
// with a reason; no other page carries the line. The frontmatter is also parsed the way VitePress
// parses it (gray-matter), so a statement VitePress would not see fails here too. All problems
// are collected so one run shows them all.

const deviceCheck = checkDevicePages(
  onDisk.map((rel) => {
    const raw = fs.readFileSync(path.join(docsDir, rel), 'utf8');
    const frontmatter = pages.has(rel)
      ? pages.get(rel).frontmatter
      : (normalizeNewlines(raw).match(/^---\n([\s\S]*?)\n---\n/) || [])[1] || '';
    try {
      // Options are passed so gray-matter does not serve a cached result between runs of a test.
      return { rel, frontmatter, parsed: matter(raw, {}).data };
    } catch (error) {
      const where = error.mark ? ` (line ${error.mark.line + 1})` : '';
      return { rel, frontmatter, parseError: `${error.reason || error.message}${where}` };
    }
  }),
);
if (deviceCheck.problems.length) {
  console.error(
    `sync-skill: ${deviceCheck.problems.length} problem(s) with the "devices" frontmatter:`,
  );
  for (const problem of deviceCheck.problems) console.error(`  ${problem}`);
  process.exit(1);
}
for (const page of pages.values()) {
  const statement = deviceCheck.statements.get(page.rel);
  page.devices = statement ? statement.devices : null;
  page.devicesNote = statement ? statement.note : null;
}

// --- Generate ---

const output = new Map(); // skill-relative path -> content
const warnings = [];

for (const page of pages.values()) {
  const target = `references/${page.rel}`;
  const { title, content } = renderReference(page, target);
  page.title = title;
  output.set(target, content);
}

output.set('SKILL.md', renderSkill());

for (const w of warnings) console.warn(`sync-skill: warning: ${w}`);

// --- Write or check ---

if (check) {
  const problems = [];
  for (const [rel, content] of output) {
    const file = path.join(skillDir, rel);
    if (!fs.existsSync(file)) problems.push(`missing: ${rel}`);
    else if (normalizeNewlines(fs.readFileSync(file, 'utf8')) !== content) {
      problems.push(`outdated: ${rel}`);
    }
  }
  for (const existing of walk(skillDir)) {
    const rel = path.relative(skillDir, existing).split(path.sep).join('/');
    if (!output.has(rel)) problems.push(`stale: ${rel}`);
  }
  if (problems.length) {
    console.error(
      `sync-skill: skills/${skillName} is out of date with the docs. Run \`pnpm skill:sync\` and commit the result.`,
    );
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`sync-skill: skills/${skillName} is up to date (${output.size} files)`);
} else {
  fs.rmSync(skillDir, { recursive: true, force: true });
  for (const [rel, content] of output) {
    const file = path.join(skillDir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  console.log(`sync-skill: wrote ${output.size} files to skills/${skillName}`);
}

// --- Rendering ---

function renderSkill() {
  if (!fs.existsSync(headerFile)) fail(`${headerFile} not found`);
  const header = normalizeNewlines(fs.readFileSync(headerFile, 'utf8')).replace(/\s+$/, '');

  const lines = [
    header,
    '',
    '<!-- Everything below is generated by apps/docs/scripts/sync-skill.mjs from the docs frontmatter. Edit the docs, not this file. -->',
    '',
    '## Reference documentation',
    '',
    'Each file under `references/` is one page of the documentation with its live demos inlined',
    'as `vue` code blocks. Read the one whose description matches the task; they are independent',
    'of each other.',
    '',
  ];

  for (const section of SECTIONS) {
    lines.push(`### ${section.title}`, '');
    for (const rel of section.pages) {
      const page = pages.get(rel);
      lines.push(`- [${page.title}](references/${rel}) — ${page.description}`);
    }
    lines.push('');
  }

  lines.push(
    `The same content is online at ${docsBaseUrl}/ (index for LLMs: ${docsBaseUrl}/llms.txt).`,
    '',
  );
  return lines.join('\n');
}

function renderReference(page, target) {
  const banner = `<!-- Generated from apps/docs/${page.rel} by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->\n\n`;
  let body = transformBody(page, target).trim();
  const h1 = body.match(/^# (.+)$/m);
  if (!h1) fail(`${page.rel}: no H1 title`);
  if (page.devices) {
    // The same statement the site shows as badges under the title.
    const end = h1.index + h1[0].length;
    const note = page.devicesNote ? ` — ${page.devicesNote}` : '';
    body = `${body.slice(0, end)}\n\n**Devices:** ${devicesText(page.devices)}${note}${body.slice(end)}`;
  }
  return { title: h1[1].trim(), content: banner + body + '\n' };
}

// `<DeviceMatrix />` in a page (the mobile guide): the site renders it from a data loader
// (.vitepress/theme/devices.data.ts); here it becomes one table per section of SECTIONS.
function renderDeviceMatrix(target) {
  const out = [];
  for (const section of SECTIONS) {
    // Pages with the same statement as another page (SAME_DEVICES_AS) would only repeat its row.
    const rows = section.pages
      .filter((rel) => !SAME_DEVICES_AS.has(rel))
      .map((rel) => pages.get(rel))
      .filter((p) => p.devices);
    if (!rows.length) continue;
    out.push('', `**${section.title}**`, '');
    out.push(`| Page | ${DEVICE_CLASSES.map((c) => DEVICE_CLASS_LABELS[c]).join(' | ')} | Note |`);
    out.push(`|---|${DEVICE_CLASSES.map(() => '---|').join('')}---|`);
    for (const p of rows) {
      const title = headingTitle((p.body.match(/^# (.+)$/m) || [])[1] || p.rel);
      const link = rewriteLinks(`[${title}](/${p.rel})`, '', target);
      const states = DEVICE_CLASSES.map((c) => DEVICE_STATE_LABELS[p.devices[c]]).join(' | ');
      out.push(`| ${link} | ${states} | ${(p.devicesNote || '').replace(/\|/g, '\\|')} |`);
    }
  }
  out.push('');
  return out;
}

// One fence-aware pass over the page. Inside a code fence every line passes through untouched;
// outside, VitePress-only syntax is turned into plain markdown:
//   - the page-level <script setup> goes, but its demo imports are remembered
//   - a page-level <style> block goes
//   - <preview path="…" /> and an imported <DemoComponent /> become the demo's source
//   - <DeviceMatrix /> becomes the device tables of all component pages
//   - <Badge text="…" /> becomes "(…)"
//   - ::: containers become block quotes (code-group lines simply go)
//   - site-absolute and page-relative links point at the sibling reference file, or the docs URL
function transformBody(page, target) {
  const pageDir = path.posix.dirname(page.rel);
  const imports = new Map(); // component name -> docs-relative path of the demo
  const out = [];
  let fence = null;
  let skipUntil = null;
  let admonition = null;
  const lines = page.body.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (skipUntil) {
      if (skipUntil === 'script') {
        const m = line.match(/^\s*import\s+(\w+)\s+from\s+'([^']+\.vue)'/);
        if (m) imports.set(m[1], path.posix.join(pageDir, m[2]));
      }
      if (line.trim() === `</${skipUntil}>`) skipUntil = null;
      continue;
    }

    const fenceMark = line.match(/^(\s*)(`{3,}|~{3,})/);
    if (fenceMark) {
      if (!fence) fence = fenceMark[2];
      else if (line.trim().startsWith(fence[0].repeat(fence.length))) fence = null;
      out.push(line);
      continue;
    }
    if (fence) {
      out.push(line);
      continue;
    }

    if (/^<script\b/.test(line)) {
      skipUntil = 'script';
      continue;
    }
    if (/^<style\b/.test(line)) {
      skipUntil = 'style';
      continue;
    }

    const preview = line.match(/^\s*<preview\s+path="([^"]+)"\s*\/>\s*$/);
    if (preview) {
      out.push(...renderDemo(path.posix.join(pageDir, preview[1]), page.rel));
      continue;
    }

    if (/^\s*<DeviceMatrix\s*\/>\s*$/.test(line)) {
      out.push(...renderDeviceMatrix(target));
      continue;
    }

    const component = line.match(/^\s*<([A-Z]\w*)\s*\/>\s*$/);
    if (component && imports.has(component[1])) {
      out.push(...renderDemo(imports.get(component[1]), page.rel));
      continue;
    }

    const open = line.match(/^::: ?(code-group|info|tip|warning|danger|details)\s*(.*)$/);
    if (open) {
      const [, kind, title] = open;
      if (kind === 'code-group') {
        admonition = 'code-group';
      } else {
        admonition = kind;
        const label = kind.charAt(0).toUpperCase() + kind.slice(1);
        out.push(`> **${label}${title ? `: ${title.trim()}` : ''}**`, '>');
      }
      continue;
    }
    if (line.trim() === ':::' && admonition) {
      admonition = null;
      continue;
    }

    let text = line.replace(/\s*<Badge\s+[^>]*?text="([^"]+)"[^>]*\/>/g, ' ($1)');
    text = rewriteLinks(text, page.rel, target);

    const stray = text.match(/<([A-Z]\w*)[\s/>]/);
    if (stray && !/^\s*[-*]|`/.test(text.slice(0, text.indexOf(stray[0])))) {
      warnings.push(`${page.rel}: unresolved component <${stray[1]}> left in prose`);
    }

    if (admonition && admonition !== 'code-group') {
      out.push(text.trim() === '' ? '>' : `> ${text}`);
      continue;
    }
    out.push(text);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

function renderDemo(demoRel, fromPage) {
  const file = path.join(docsDir, demoRel);
  if (!fs.existsSync(file)) fail(`${fromPage}: demo not found: ${demoRel}`);
  const source = normalizeNewlines(fs.readFileSync(file, 'utf8')).replace(/\s+$/, '');
  // A demo may itself contain ``` (markdown samples in template strings); the fence must be longer
  // than any backtick run inside it.
  const longest = Math.max(2, ...[...source.matchAll(/`+/g)].map((m) => m[0].length));
  const fence = '`'.repeat(longest + 1);
  const label = demoRel.replace(/^(components|foundations|guide)\//, '');
  return ['', `**Demo — \`${label}\`**`, '', `${fence}vue`, source, fence, ''];
}

// `](/components/x)`, `](/components/x/)`, `](/guide/x#frag)`, `](./sibling)`, `](./#frag)`
// → a relative link to the sibling reference file when the page is in the skill, the docs URL
// for a site page that is not, untouched otherwise.
function rewriteLinks(text, pageRel, target) {
  const pageDir = path.posix.dirname(pageRel);
  return text.replace(
    /\]\(((?:\/|\.\.?\/)[^)\s#]*)(#[^)\s]*)?\)/g,
    (match, href, fragment = '') => {
      const sitePath = href.startsWith('/')
        ? href
        : '/' + path.posix.normalize(path.posix.join(pageDir, href)).replace(/^\.\/?/, '');
      const rel = resolvePage(sitePath);
      if (rel === pageRel) return `](${fragment || '#'})`;
      if (rel) {
        const from = path.posix.dirname(target);
        let relative = path.posix.relative(from, `references/${rel}`);
        if (!relative.startsWith('.')) relative = `./${relative}`;
        return `](${relative}${fragment})`;
      }
      if (href.startsWith('/')) {
        return `](${docsBaseUrl}${sitePath.replace(/\.md$/, '')}${fragment})`;
      }
      return match;
    },
  );
}

// `/components/data-grid` → components/data-grid.md, `/components/map/` → components/map/index.md.
function resolvePage(sitePath) {
  const base = sitePath.replace(/^\//, '').replace(/\.(md|html)$/, '');
  const candidates = base.endsWith('/') ? [`${base}index.md`] : [`${base}.md`, `${base}/index.md`];
  return candidates.find((c) => pages.has(c)) || null;
}

// --- Helpers ---

function splitFrontmatter(raw, rel) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) fail(`${rel}: no frontmatter — every docs page needs a description`);
  const desc = m[1].match(/^description:\s*(.+)$/m);
  if (!desc) fail(`${rel}: frontmatter has no description`);
  let description = desc[1].trim();
  if (
    (description.startsWith('"') && description.endsWith('"')) ||
    (description.startsWith("'") && description.endsWith("'"))
  ) {
    description = description.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return { description, frontmatter: m[1], body: raw.slice(m[0].length).replace(/^\n+/, '') };
}

function normalizeNewlines(text) {
  return text.replace(/\r\n/g, '\n');
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function fail(message) {
  console.error(`sync-skill: ${message}`);
  process.exit(1);
}
