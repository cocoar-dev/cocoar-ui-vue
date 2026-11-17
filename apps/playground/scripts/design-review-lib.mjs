// Design-review inventory: scan the packages, reconcile them with the committed
// inventory and validate the review records. No dependencies, no globals: every
// function takes the repository root it should look at, so tests can run on
// temporary fixture trees. Format and workflow: apps/playground/src/design-review/README.md

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const SCHEMA_VERSION = 1;

export const DECISIONS = ['pending', 'implemented', 'reviewed-unchanged'];
export const CHECK_KEYS = ['desktop', 'mobile', 'light', 'dark'];
export const CHECK_VALUES = ['pending', 'pass', 'fail', 'not-applicable'];
export const STATE_STATUSES = ['pending', 'reviewed', 'not-applicable'];
/** Evidence types whose `ref` is a repository path that has to exist. */
export const FILE_EVIDENCE = ['story', 'test', 'audit', 'screenshot'];
export const EVIDENCE_TYPES = [...FILE_EVIDENCE, 'note', 'commit', 'pr'];
export const DEFAULT_NONVISUAL_REASON =
  'No visual signals found by the scan (no style injection, SVG, DOM creation or render function).';

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.turbo',
  '.vite',
  '.cache',
  '.git',
  '__tests__',
  '__mocks__',
  '__snapshots__',
  'test',
  'tests',
  'e2e',
]);
const SCAN_EXT = new Set([
  '.vue',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.svg',
]);
const SKIP_FILE =
  /(\.(test|spec|stories)\.[^./]+$)|(\.d\.ts$)|((^|\/)(vite|vitest|eslint|tsup|rollup)\.(config|setup)\.[^/]+$)/;
const STYLE_EXT = new Set(['.css', '.scss', '.sass', '.less']);
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

/** Visual signals in TS/JS sources. Any hit makes the file a surface that needs an entry. */
export const SIGNALS = {
  'font-import': /\b(?:import|from)\s*['"]@fontsource(?:-variable)?\//,
  'style-injection':
    /createElement\(\s*['"]style['"]|adoptedStyleSheets|new\s+CSSStyleSheet|\.insertRule\(/,
  'inline-style': /\.style\.[a-zA-Z]+\s*=|style\.cssText|style\.setProperty|setProperty\(\s*['"]--/,
  'css-tokens': /--coar-[a-z]/,
  svg: /<svg\b|createElementNS\(/,
  'editor-theme': /EditorView\.(?:base)?[Tt]heme|defineTheme\(|HighlightStyle/,
  'render-function': /\bh\(\s*['"A-Za-z]|\bdefineComponent\(/,
  'dom-creation': /\bcreateElement\(|\.innerHTML\s*=|\.insertAdjacentHTML\(/,
  'computed-style': /getComputedStyle\(/,
  'class-names': /\.classList\b|\.className\b/,
  'color-literal': /#[0-9a-fA-F]{6}\b|\brgba?\(|\bhsla?\(/,
  'size-literal': /\b\d+(?:\.\d+)?px\b|font-size|\bfontSize\b/,
};

/** Third-party UI libraries; each gets one entry that points at the files importing it. */
export const THIRD_PARTY = [
  { id: 'ag-grid', modules: ['ag-grid-community', 'ag-grid-vue3'] },
  { id: 'leaflet', modules: ['leaflet'] },
  { id: 'pdfjs', modules: ['pdfjs-dist'] },
  { id: 'monaco', modules: ['monaco-editor'] },
  { id: 'milkdown', modules: ['@milkdown'] },
  { id: 'overlayscrollbars', modules: ['overlayscrollbars'] },
  { id: 'mermaid', modules: ['mermaid'] },
  { id: 'prismjs', modules: ['prismjs'] },
];

const posix = (p) => p.split(path.sep).join('/');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const unique = (list) => [...new Set(list)].sort();
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const isBlank = (v) => typeof v !== 'string' || v.trim() === '';
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function walk(absDir, relDir, out) {
  let items;
  try {
    items = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    return;
  }
  items.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const item of items) {
    const rel = `${relDir}/${item.name}`;
    if (item.isDirectory()) {
      if (!SKIP_DIRS.has(item.name)) walk(path.join(absDir, item.name), rel, out);
    } else if (item.isFile() && SCAN_EXT.has(path.extname(item.name)) && !SKIP_FILE.test(rel)) {
      out.push(rel);
    }
  }
}

function resolveRelative(fromFile, spec, files) {
  if (!spec.startsWith('.')) return null;
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), spec));
  const candidates = [base];
  for (const ext of ['.ts', '.tsx', '.js', '.mjs', '.vue', '.css']) candidates.push(base + ext);
  for (const ext of ['.ts', '.js', '.mjs']) candidates.push(`${base}/index${ext}`);
  return candidates.find((c) => files.has(c)) ?? null;
}

/** Relative files a module re-exports (`export … from`, `export { imported }`). */
function reexports(file, text, files) {
  const code = stripComments(text);
  const out = new Set();
  for (const m of code.matchAll(
    /export\s+(?:type\s+)?(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s*from\s*['"]([^'"]+)['"]/g,
  )) {
    const target = resolveRelative(file, m[1], files);
    if (target) out.add(target);
  }
  const imported = new Map();
  for (const m of code.matchAll(/import\s+(?:type\s+)?([^'"]*?)\s*from\s*['"](\.[^'"]+)['"]/g)) {
    const target = resolveRelative(file, m[2], files);
    if (!target) continue;
    for (const raw of m[1].replace(/[{}]/g, ',').split(',')) {
      const name = raw
        .trim()
        .split(/\s+as\s+/)
        .pop();
      if (name) imported.set(name, target);
    }
  }
  for (const m of code.matchAll(/export\s*\{([^}]*)\}(?!\s*from)/g)) {
    for (const raw of m[1].split(',')) {
      const local = raw
        .trim()
        .split(/\s+as\s+/)[0]
        .replace(/^type\s+/, '');
      if (imported.has(local)) out.add(imported.get(local));
    }
  }
  return out;
}

function cssImports(file, text, files) {
  const out = new Set();
  for (const m of text.matchAll(/@import\s+(?:url\()?\s*['"]([^'"]+)['"]/g)) {
    const target = resolveRelative(file, m[1], files);
    if (target) out.add(target);
  }
  return out;
}

function moduleImports(text) {
  const specs = new Set();
  for (const m of stripComments(text).matchAll(
    /(?:\bfrom|\bimport\s*\(?|@import)\s*['"]([^'"]+)['"]/g,
  ))
    specs.add(m[1]);
  return specs;
}

function thirdPartyId(spec) {
  for (const lib of THIRD_PARTY) {
    for (const mod of lib.modules) if (spec === mod || spec.startsWith(`${mod}/`)) return lib.id;
  }
  return null;
}

function classify(file, text) {
  const ext = path.extname(file);
  if (ext === '.vue') return { kind: 'vue-component', signals: [] };
  if (STYLE_EXT.has(ext)) return { kind: 'stylesheet', signals: [] };
  if (ext === '.svg') return { kind: 'svg-asset', signals: [] };
  const code = stripComments(text);
  const signals = Object.keys(SIGNALS).filter((name) => SIGNALS[name].test(code));
  return signals.length ? { kind: 'ts-visual', signals } : { kind: 'nonvisual', signals: [] };
}

/** Everything the sources and package manifests say, with no review data. */
export function scan(root) {
  // Evidence is tied to the actual sources, not just their names/signals.
  // A shared-role change conservatively invalidates the whole check matrix.
  const revision = createHash('sha256');
  const lock = path.join(root, 'pnpm-lock.yaml');
  if (fs.existsSync(lock)) revision.update(fs.readFileSync(lock, 'utf8').replace(/\r\n/g, '\n'));
  const pkgRoot = path.join(root, 'packages');
  const dirs = fs.existsSync(pkgRoot)
    ? fs
        .readdirSync(pkgRoot, { withFileTypes: true })
        .filter((d) => d.isDirectory() && fs.existsSync(path.join(pkgRoot, d.name, 'package.json')))
        .map((d) => d.name)
        .sort()
    : [];

  const packages = [];
  const publicExports = [];
  const surfaces = [];
  const nonvisual = [];
  const thirdParty = new Map();

  for (const name of dirs) {
    const dir = `packages/${name}`;
    const manifest = readJson(path.join(pkgRoot, name, 'package.json'));
    revision.update(`${dir}/package.json\0${JSON.stringify(manifest)}\0`);
    packages.push({ dir, name: manifest.name ?? name });

    const list = [];
    walk(path.join(pkgRoot, name), dir, list);
    const files = new Set(list);
    const texts = new Map(list.map((f) => [f, fs.readFileSync(path.join(root, f), 'utf8')]));
    for (const [file, text] of texts) revision.update(`${file}\0${text.replace(/\r\n/g, '\n')}\0`);
    const rel = (p) => posix(path.posix.normalize(path.posix.join(dir, p)));

    // Public surface: export map, bin, and what the barrels re-export.
    const jsRoots = [];
    const cssRoots = [];
    let distCss = false;
    const exp = isObject(manifest.exports) ? manifest.exports : {};
    for (const subpath of Object.keys(exp).sort()) {
      const value = exp[subpath];
      const source = isObject(value) ? value.source : undefined;
      const target = isObject(value) ? (value.import ?? source ?? '') : String(value);
      const isCss = STYLE_EXT.has(path.extname(target));
      let owners = [];
      if (source && files.has(rel(source))) {
        owners = [rel(source)];
        jsRoots.push(rel(source));
      } else if (isCss && files.has(rel(target))) {
        owners = [rel(target)];
        cssRoots.push(rel(target));
      } else if (isCss) {
        // Built from the package's own stylesheets and <style> blocks.
        distCss = true;
        owners = list.filter(
          (f) =>
            STYLE_EXT.has(path.extname(f)) || (f.endsWith('.vue') && /<style\b/.test(texts.get(f))),
        );
      }
      publicExports.push({ package: dir, subpath, target, owners });
    }
    const bins =
      typeof manifest.bin === 'string' ? { [manifest.name]: manifest.bin } : (manifest.bin ?? {});
    for (const bin of Object.keys(bins).sort()) {
      const owner = rel(bins[bin]);
      publicExports.push({
        package: dir,
        subpath: `bin:${bin}`,
        target: bins[bin],
        owners: files.has(owner) ? [owner] : [],
      });
      if (files.has(owner)) jsRoots.push(owner);
    }

    const reached = new Set(jsRoots);
    for (const queue = [...jsRoots]; queue.length;) {
      const file = queue.pop();
      if (!CODE_EXT.has(path.extname(file))) continue;
      for (const next of reexports(file, texts.get(file), files)) {
        if (!reached.has(next)) {
          reached.add(next);
          queue.push(next);
        }
      }
    }
    const cssReached = new Set(cssRoots);
    for (const queue = [...cssRoots]; queue.length;) {
      const file = queue.pop();
      for (const next of cssImports(file, texts.get(file), files)) {
        if (!cssReached.has(next)) {
          cssReached.add(next);
          queue.push(next);
        }
      }
    }

    for (const file of list) {
      const text = texts.get(file);
      for (const spec of moduleImports(text)) {
        const id = thirdPartyId(spec);
        if (id) {
          if (!thirdParty.has(id)) thirdParty.set(id, new Set());
          thirdParty.get(id).add(file);
        }
      }
      const { kind, signals } = classify(file, text);
      if (kind === 'nonvisual') {
        nonvisual.push({ package: dir, source: file });
        continue;
      }
      const exposed = kind === 'stylesheet' ? distCss || cssReached.has(file) : reached.has(file);
      surfaces.push({
        id: file,
        kind,
        package: dir,
        source: file,
        exposure: exposed ? 'public' : 'internal',
        signals,
      });
    }
  }

  for (const lib of THIRD_PARTY) {
    const owners = [...(thirdParty.get(lib.id) ?? [])].sort();
    if (!owners.length) continue;
    surfaces.push({
      id: `third-party:${lib.id}`,
      kind: 'third-party',
      package: unique(owners.map((o) => o.split('/').slice(0, 2).join('/'))).join(','),
      source: null,
      exposure: 'internal',
      signals: [],
      owners,
    });
  }
  surfaces.sort(byId);
  nonvisual.sort((a, b) => (a.source < b.source ? -1 : 1));
  return { sourceRevision: revision.digest('hex'), packages, publicExports, surfaces, nonvisual };
}

const DERIVED = ['kind', 'package', 'source', 'exposure', 'signals', 'owners'];
const ENTRY_ORDER = [
  'id',
  ...DERIVED,
  'decision',
  'tokenRoles',
  'states',
  'scenario',
  'checks',
  'reasons',
  'notes',
  'evidence',
];

function ordered(entry) {
  const out = {};
  for (const key of ENTRY_ORDER) if (key in entry) out[key] = entry[key];
  for (const key of Object.keys(entry)) if (!(key in out)) out[key] = entry[key];
  return out;
}

export function newEntry(derived) {
  return ordered({
    ...derived,
    decision: 'pending',
    tokenRoles: [],
    states: [],
    scenario: '',
    checks: { desktop: 'pending', mobile: 'pending', light: 'pending', dark: 'pending' },
    reasons: {},
    notes: '',
    evidence: [],
  });
}

export function emptyInventory() {
  return {
    schemaVersion: SCHEMA_VERSION,
    sourceRevision: '',
    packages: [],
    publicExports: [],
    surfaces: [],
    nonvisual: [],
  };
}

export function loadInventory(file) {
  return readJson(file);
}

export function serialize(inventory) {
  return `${JSON.stringify(inventory, null, 2)}\n`;
}

/** Add new nonvisual files to automatic groups; keep explicit groups as they are. */
function mergeNonvisual(groups, found, prune) {
  const foundSet = new Set(found.map((f) => f.source));
  const next = groups.map((g) => ({
    ...g,
    sources: (g.sources ?? []).filter((s) => !prune || foundSet.has(s)),
  }));
  const seen = new Set(next.flatMap((g) => g.sources));
  for (const { package: pkg, source } of found) {
    if (seen.has(source)) continue;
    let group = next.find(
      (g) => g.package === pkg && g.explicit !== true && g.reason === DEFAULT_NONVISUAL_REASON,
    );
    if (!group) {
      group = { package: pkg, reason: DEFAULT_NONVISUAL_REASON, explicit: false, sources: [] };
      next.push(group);
    }
    group.sources.push(source);
  }
  return next
    .map((g) => ({ ...g, sources: unique(g.sources) }))
    .filter((g) => g.sources.length)
    .sort((a, b) =>
      a.package + a.explicit + a.reason < b.package + b.explicit + b.reason ? -1 : 1,
    );
}

/**
 * Bring an inventory up to date with the sources: refresh derived fields, add new
 * surfaces as pending, move files that gained visual signals out of automatic
 * nonvisual groups. Entries of removed sources stay (and are reported by check)
 * unless `prune`.
 */
export function updateInventory(previous, scanned, { prune = false } = {}) {
  const sourcesChanged = previous.sourceRevision !== scanned.sourceRevision;
  const old = new Map((previous.surfaces ?? []).map((e) => [e.id, e]));
  const explicit = new Set(
    (previous.nonvisual ?? []).filter((g) => g.explicit === true).flatMap((g) => g.sources ?? []),
  );
  const visible = scanned.surfaces.filter((s) => !explicit.has(s.id));
  const current = new Set(visible.map((s) => s.id));
  const surfaces = visible.map((derived) => {
    const entry = old.get(derived.id);
    if (!entry) return newEntry(derived);
    const merged = { ...entry, ...derived };
    if (sourcesChanged) {
      merged.checks = Object.fromEntries(CHECK_KEYS.map((key) => [key, 'pending']));
      merged.states = (entry.states ?? []).map((state) =>
        state.status === 'reviewed' ? { ...state, status: 'pending' } : state);
    }
    if (!('owners' in derived)) delete merged.owners;
    return ordered(merged);
  });
  if (!prune) for (const [id, entry] of old) if (!current.has(id)) surfaces.push(entry);
  surfaces.sort(byId);

  const needEntry = new Set(scanned.surfaces.map((s) => s.source).filter(Boolean));
  const groups = (previous.nonvisual ?? []).map((g) =>
    g.explicit === true ? g : { ...g, sources: (g.sources ?? []).filter((s) => !needEntry.has(s)) },
  );
  return {
    schemaVersion: SCHEMA_VERSION,
    sourceRevision: scanned.sourceRevision,
    packages: scanned.packages,
    publicExports: scanned.publicExports,
    surfaces,
    nonvisual: mergeNonvisual(groups, scanned.nonvisual, prune),
  };
}

/**
 * Completeness check: the inventory matches the sources and every record is well formed.
 * Pending work is fine here. Returns an array of { code, id, message }.
 */
export function check(root, inventory) {
  const errors = [];
  const err = (code, id, message) => errors.push({ code, id, message });
  if (!isObject(inventory))
    return [{ code: 'schema', id: '-', message: 'Inventory is not an object.' }];
  if (inventory.schemaVersion !== SCHEMA_VERSION) {
    err(
      'schema',
      '-',
      `schemaVersion must be ${SCHEMA_VERSION}, got ${JSON.stringify(inventory.schemaVersion)}.`,
    );
  }
  for (const key of ['packages', 'publicExports', 'surfaces', 'nonvisual']) {
    if (!Array.isArray(inventory[key])) err('schema', '-', `"${key}" must be an array.`);
  }
  if (errors.length) return errors;

  const scanned = scan(root);
  if (inventory.sourceRevision !== scanned.sourceRevision) {
    err('source-revision-stale', '-', 'Package sources or the lockfile changed; run --update and repeat the checks. Previous evidence is historical, not proof of the new sources.');
  }

  // Packages and public exports.
  const havePkg = new Map(inventory.packages.map((p) => [p.dir, p]));
  for (const p of scanned.packages) {
    const have = havePkg.get(p.dir);
    if (!have) err('package-missing', p.dir, `Package ${p.dir} is not in the inventory.`);
    else if (have.name !== p.name)
      err('package-stale', p.dir, `Package name is "${have.name}", manifest says "${p.name}".`);
  }
  const scannedPkg = new Set(scanned.packages.map((p) => p.dir));
  for (const dir of havePkg.keys())
    if (!scannedPkg.has(dir)) err('package-orphan', dir, `Package ${dir} no longer exists.`);
  const exportKey = (e) => `${e.package}:${e.subpath}`;
  const haveExp = new Map(inventory.publicExports.map((e) => [exportKey(e), e]));
  const wantExp = new Map(scanned.publicExports.map((e) => [exportKey(e), e]));
  for (const [k, e] of wantExp) {
    if (!haveExp.has(k)) err('export-missing', k, `Public export ${k} is not in the inventory.`);
    else if (!sameJson(haveExp.get(k), e))
      err(
        'export-stale',
        k,
        `Public export ${k} differs from package.json or the sources (target/owners).`,
      );
  }
  for (const k of haveExp.keys())
    if (!wantExp.has(k)) err('export-orphan', k, `Public export ${k} no longer exists.`);

  // Surfaces vs sources.
  const wanted = new Map(scanned.surfaces.map((s) => [s.id, s]));
  const seenIds = new Set();
  const entrySources = new Set();
  for (const entry of inventory.surfaces) {
    const id = entry?.id;
    if (isBlank(id)) {
      err('entry-invalid', String(id), 'Entry without an id.');
      continue;
    }
    if (seenIds.has(id)) err('entry-duplicate', id, 'Duplicate entry.');
    seenIds.add(id);
    if (entry.source) entrySources.add(entry.source);
    const want = wanted.get(id);
    if (!want) {
      err('entry-orphan', id, 'No such source or third-party surface any more.');
      continue;
    }
    for (const key of DERIVED) {
      if (!sameJson(entry[key] ?? null, want[key] ?? null)) {
        err(
          'entry-stale',
          id,
          `"${key}" is ${JSON.stringify(entry[key])}, the sources say ${JSON.stringify(want[key] ?? null)}. Run --update.`,
        );
      }
    }
    validateRecord(root, entry, err);
  }
  // Nonvisual sources.
  const nonvisualFound = new Set(scanned.nonvisual.map((n) => n.source));
  const seenNonvisual = new Set();
  const explicitCovered = new Set();
  inventory.nonvisual.forEach((group, i) => {
    const gid = `nonvisual[${i}]`;
    if (!isObject(group) || isBlank(group.package) || !Array.isArray(group.sources)) {
      err('nonvisual-invalid', gid, 'Group needs package, reason and sources.');
      return;
    }
    if (isBlank(group.reason)) err('nonvisual-invalid', gid, 'Group reason is blank.');
    for (const source of group.sources) {
      if (seenNonvisual.has(source))
        err('nonvisual-duplicate', source, 'Listed in more than one group.');
      seenNonvisual.add(source);
      if (entrySources.has(source))
        err('nonvisual-conflict', source, 'Has an entry and is also classified nonvisual.');
      if (!source.startsWith(`${group.package}/`))
        err('nonvisual-invalid', source, `Not inside ${group.package}.`);
      const want = wanted.get(source);
      if (want) {
        if (group.explicit === true && !isBlank(group.reason)) explicitCovered.add(source);
        else
          err(
            'nonvisual-visual',
            source,
            `Is a ${want.kind}; classify it nonvisual only in a group with "explicit": true and its own reason.`,
          );
      } else if (!nonvisualFound.has(source)) {
        err('nonvisual-orphan', source, 'No such source any more.');
      }
    }
  });
  for (const id of wanted.keys()) {
    if (!seenIds.has(id) && !explicitCovered.has(id))
      err('entry-missing', id, 'Surface has no inventory entry. Run --update.');
  }
  for (const source of nonvisualFound) {
    if (!seenNonvisual.has(source) && !entrySources.has(source))
      err(
        'nonvisual-missing',
        source,
        'Source is neither an entry nor classified nonvisual. Run --update.',
      );
  }
  return errors;
}

function validateRecord(root, entry, err) {
  const id = entry.id;
  if (!DECISIONS.includes(entry.decision))
    err('record-invalid', id, `decision must be one of ${DECISIONS.join(', ')}.`);
  if (!Array.isArray(entry.tokenRoles) || entry.tokenRoles.some(isBlank))
    err('record-invalid', id, 'tokenRoles must be an array of non-blank strings.');
  if (typeof entry.scenario !== 'string') err('record-invalid', id, 'scenario must be a string.');
  if (typeof entry.notes !== 'string') err('record-invalid', id, 'notes must be a string.');

  const reasons = isObject(entry.reasons) ? entry.reasons : {};
  if (!isObject(entry.reasons)) err('record-invalid', id, 'reasons must be an object.');
  if (!isObject(entry.checks)) err('record-invalid', id, 'checks must be an object.');
  else {
    for (const key of CHECK_KEYS) {
      const value = entry.checks[key];
      if (!CHECK_VALUES.includes(value))
        err('record-invalid', id, `checks.${key} must be one of ${CHECK_VALUES.join(', ')}.`);
      else if (value === 'not-applicable' && isBlank(reasons[key]))
        err(
          'record-invalid',
          id,
          `checks.${key} is not-applicable without a reason in reasons.${key}.`,
        );
    }
    for (const key of Object.keys(entry.checks))
      if (!CHECK_KEYS.includes(key)) err('record-invalid', id, `Unknown check "${key}".`);
  }

  if (!Array.isArray(entry.states)) err('record-invalid', id, 'states must be an array.');
  else {
    const names = new Set();
    entry.states.forEach((state, i) => {
      if (!isObject(state) || isBlank(state.name))
        return err('record-invalid', id, `states[${i}] needs a name.`);
      if (names.has(state.name))
        err('record-invalid', id, `State "${state.name}" is listed twice.`);
      names.add(state.name);
      if (!STATE_STATUSES.includes(state.status))
        err(
          'record-invalid',
          id,
          `State "${state.name}" has status ${JSON.stringify(state.status)}.`,
        );
      else if (state.status === 'not-applicable' && isBlank(state.reason))
        err('record-invalid', id, `State "${state.name}" is not-applicable without a reason.`);
    });
  }

  if (!Array.isArray(entry.evidence))
    return err('record-invalid', id, 'evidence must be an array.');
  entry.evidence.forEach((item, i) => {
    const at = `evidence[${i}]`;
    if (!isObject(item))
      return err('evidence-invalid', id, `${at} must be an object { type, ref, summary? }.`);
    if (!EVIDENCE_TYPES.includes(item.type))
      return err('evidence-invalid', id, `${at}.type must be one of ${EVIDENCE_TYPES.join(', ')}.`);
    if (isBlank(item.ref)) return err('evidence-invalid', id, `${at}.ref is blank.`);
    if ('summary' in item && typeof item.summary !== 'string')
      err('evidence-invalid', id, `${at}.summary must be a string.`);
    if (FILE_EVIDENCE.includes(item.type)) {
      const file = item.ref.split('#')[0];
      if (!fs.existsSync(path.join(root, file)))
        err('evidence-missing-file', id, `${at} points to ${file}, which does not exist.`);
    }
  });
  if (DECISIONS.includes(entry.decision) && entry.decision !== 'pending') {
    if (!entry.evidence.length)
      err('decision-unproven', id, `Decision ${entry.decision} needs evidence.`);
    if (entry.decision === 'reviewed-unchanged' && isBlank(entry.notes))
      err('decision-unproven', id, 'reviewed-unchanged needs a concrete reason in notes.');
  }
}

/** Strict gate: check passes and nothing is pending. Returns { errors, remaining }. */
export function complete(root, inventory) {
  const errors = check(root, inventory);
  const remaining = [];
  if (errors.length) return { errors, remaining };
  for (const entry of inventory.surfaces) {
    const open = (message) => remaining.push({ code: 'incomplete', id: entry.id, message });
    if (entry.decision === 'pending') open('decision is pending.');
    for (const key of CHECK_KEYS) {
      const value = entry.checks[key];
      if (value === 'pending' || value === 'fail') open(`checks.${key} is ${value}.`);
    }
    for (const state of entry.states)
      if (state.status === 'pending') open(`state "${state.name}" is pending.`);
    if (isBlank(entry.scenario)) open('scenario is blank.');
    if (!entry.tokenRoles.length) open('tokenRoles is empty.');
    if (!entry.states.length) open('states is empty; record applicable states or a non-applicability reason.');
  }
  return { errors, remaining };
}

/** Counts for a short, actionable report. */
export function summarize(inventory) {
  const rows = new Map();
  const row = (pkg) => {
    if (!rows.has(pkg)) {
      rows.set(pkg, {
        package: pkg,
        surfaces: 0,
        pending: 0,
        implemented: 0,
        'reviewed-unchanged': 0,
        public: 0,
        nonvisual: 0,
      });
    }
    return rows.get(pkg);
  };
  for (const p of inventory.packages) row(p.dir);
  for (const e of inventory.surfaces) {
    const r = row(e.kind === 'third-party' ? '(third-party)' : e.package);
    r.surfaces += 1;
    r[e.decision] = (r[e.decision] ?? 0) + 1;
    if (e.exposure === 'public') r.public += 1;
  }
  for (const g of inventory.nonvisual) row(g.package).nonvisual += g.sources.length;
  const kinds = {};
  for (const e of inventory.surfaces) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
  const openChecks = inventory.surfaces.reduce(
    (n, e) => n + CHECK_KEYS.filter((k) => e.checks?.[k] === 'pending').length,
    0,
  );
  return { rows: [...rows.values()], kinds, total: inventory.surfaces.length, openChecks };
}
