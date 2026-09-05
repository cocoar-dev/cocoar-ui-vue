// Generates the Agent Skill in skills/cocoar-vue-ui/ from the VitePress documentation.
//
// The documentation is the only source. Every page under apps/docs/guide, apps/docs/foundations
// and apps/docs/components becomes a reference file of the skill, with each `<preview>` demo
// inlined as a ```vue block so an assistant sees working code next to the prose. The page's
// frontmatter description — the same line that feeds llms.txt on the docs site — becomes its
// entry in the skill's index. The only hand-written part is apps/docs/skill/SKILL.header.md:
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

const docsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = path.resolve(docsDir, '..', '..');
const skillName = 'cocoar-vue-ui';
const skillDir = path.join(repoDir, 'skills', skillName);
const headerFile = path.join(docsDir, 'skill', 'SKILL.header.md');
const docsBaseUrl = 'https://docs.cocoar.dev/cocoar-ui-vue';
const check = process.argv.includes('--check');

// Mirrors the site's sidebar (apps/docs/.vitepress/config.ts). Listing pages explicitly is
// deliberate: a docs page that is neither here nor in EXCLUDED fails the run, so a new page
// cannot silently stay out of the skill.
const SECTIONS = [
  {
    title: 'Guide',
    pages: [
      'guide/getting-started.md',
      'guide/error-handling.md',
      'guide/theming.md',
      'guide/migration.md',
      'guide/migration-page-builder-3.md',
    ],
  },
  {
    title: 'Foundations',
    pages: [
      'foundations/design-principles.md',
      'foundations/colors.md',
      'foundations/typography.md',
      'foundations/spacing.md',
      'foundations/icons.md',
      'foundations/motion.md',
      'foundations/theming.md',
    ],
  },
  {
    title: 'Localization (@cocoar/vue-localization)',
    pages: [
      'foundations/localization/setup.md',
      'foundations/localization/formatting.md',
      'foundations/localization/translations.md',
      'foundations/localization/timezones.md',
    ],
  },
  {
    title: 'Form controls',
    pages: [
      'components/button.md',
      'components/form-field.md',
      'components/text-input.md',
      'components/number-input.md',
      'components/password-input.md',
      'components/otp-input.md',
      'components/select.md',
      'components/listbox.md',
      'components/dual-listbox.md',
      'components/checkbox.md',
      'components/checkbox-group.md',
      'components/radio-group.md',
      'components/switch.md',
      'components/segmented-control.md',
      'components/date-picker.md',
      'components/date-time-picker.md',
      'components/zoned-date-time-picker.md',
      'components/date-or-time-picker.md',
      'components/date-views.md',
    ],
  },
  {
    title: 'Display',
    pages: [
      'components/avatar.md',
      'components/badge.md',
      'components/card.md',
      'components/code-block.md',
      'components/data-list.md',
      'components/divider.md',
      'components/link.md',
      'components/note.md',
      'components/notice.md',
      'components/progress-bar.md',
      'components/spinner.md',
      'components/table.md',
      'components/tag.md',
    ],
  },
  {
    title: 'Navigation',
    pages: [
      'components/menu.md',
      'components/context-menu.md',
      'components/sidebar.md',
      'components/navbar.md',
      'components/tabs.md',
      'components/tree.md',
      'components/breadcrumb.md',
      'components/pagination.md',
    ],
  },
  {
    title: 'Layout',
    pages: ['components/panel-layout.md', 'components/wizard.md'],
  },
  {
    title: 'Overlay',
    pages: [
      'components/dialog.md',
      'components/popover.md',
      'components/popconfirm.md',
      'components/toast.md',
      'components/tooltip.md',
    ],
  },
  {
    title: 'Utilities',
    pages: [
      'components/transitions.md',
      'components/virtual-list.md',
      'components/drag-drop.md',
      'components/fragment-parser.md',
    ],
  },
  {
    title: 'Content (@cocoar/vue-markdown, -editor, -form, -mermaid, @cocoar/vue-script-editor)',
    pages: [
      'components/markdown.md',
      'components/markdown-editor.md',
      'components/markdown-form.md',
      'components/markdown-embeds.md',
      'components/markdown-diagrams.md',
      'components/mermaid.md',
      'components/script-editor.md',
    ],
  },
  {
    title: 'Data Grid (@cocoar/vue-data-grid)',
    pages: [
      'components/data-grid.md',
      'components/data-grid/editing.md',
      'components/data-grid/text.md',
      'components/data-grid/number.md',
      'components/data-grid/select.md',
      'components/data-grid/multi-select.md',
      'components/data-grid/date-columns.md',
      'components/data-grid/checkbox.md',
    ],
  },
  {
    title: 'Page Builder (@cocoar/vue-page-builder)',
    pages: [
      'components/page-builder/index.md',
      'components/page-builder/coar-page-builder.md',
      'components/page-builder/coar-page-renderer.md',
      'components/page-builder/authoring-contract.md',
      'components/page-builder/custom-elements.md',
      'components/page-builder/idp-integration.md',
    ],
  },
  {
    title: 'Document Viewer (@cocoar/vue-document-viewer)',
    pages: [
      'components/document-viewer/index.md',
      'components/document-viewer/coar-document-viewer.md',
      'components/document-viewer/toolbar.md',
      'components/document-viewer/annotations.md',
    ],
  },
  {
    title: 'Map (@cocoar/vue-map)',
    pages: ['components/map/index.md', 'components/map/editor.md'],
  },
  {
    title: 'File Explorer (@cocoar/vue-file-explorer-core)',
    pages: [
      'components/file-explorer/index.md',
      'components/file-explorer/use-file-explorer.md',
      'components/file-explorer/asset-store.md',
      'components/file-explorer/in-memory-store.md',
    ],
  },
  {
    title: 'Calendar (@cocoar/vue-calendar)',
    pages: [
      'components/calendar/index.md',
      'components/calendar/coar-calendar.md',
      'components/calendar/year-view.md',
      'components/calendar/month-view.md',
      'components/calendar/day-view.md',
      'components/calendar/week-view.md',
      'components/calendar/work-week-view.md',
      'components/calendar/agenda-view.md',
      'components/calendar/timeline-view.md',
      'components/calendar/performance.md',
    ],
  },
];

// Pages that exist for the site, not for an agent working with the library: the landing page,
// the changelog (an include of CHANGELOG.md, which ships with the package anyway) and the
// kitchen sink (a visual comparison page with no prose).
const EXCLUDED = new Set(['index.md', 'guide/changelog.md', 'foundations/kitchen-sink.md']);

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
  const { description, body } = splitFrontmatter(raw, rel);
  pages.set(rel, { rel, description, body });
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
  const body = transformBody(page, target).trim();
  const title = (body.match(/^# (.+)$/m) || [])[1];
  if (!title) fail(`${page.rel}: no H1 title`);
  return { title: title.trim(), content: banner + body + '\n' };
}

// One fence-aware pass over the page. Inside a code fence every line passes through untouched;
// outside, VitePress-only syntax is turned into plain markdown:
//   - the page-level <script setup> goes, but its demo imports are remembered
//   - a page-level <style> block goes
//   - <preview path="…" /> and an imported <DemoComponent /> become the demo's source
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
  return { description, body: raw.slice(m[0].length).replace(/^\n+/, '') };
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
