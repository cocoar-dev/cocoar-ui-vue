// Which device classes a component page supports — the rules of the `devices` frontmatter line.
//
//   ---
//   description: "CoarButton — …"
//   devices: { desktop: ready, tablet: ready, phone: partial }
//   devicesNote: "Mobile sizes under .coar-mobile; the mobile presentation is still Preview."
//   ---
//
// One line, a YAML flow mapping with the three classes in this order, so VitePress reads it as
// YAML and this module reads it with a regular expression (no YAML dependency). The note is one
// double-quoted sentence; it is required when a class is `partial` or `no`, because then the
// reader needs to know the limit.
//
// The written rule is the one-line form above. Because a valid YAML frontmatter can hide those
// lines from VitePress (inside a multi-line string, say) or break VitePress with a quoted duplicate
// key, checkDevicePages() also compares them with the frontmatter as VitePress parses it
// (gray-matter, which sync-skill.mjs runs and passes in; this module has no dependency).
//
// This is the single place of the rules. sync-skill.mjs checks every page with it (CI runs it as
// "Agent Skill matches the docs") and writes the same information into the Agent Skill; the site
// imports the labels for the badges under the title (.vitepress/theme/DeviceBadges.vue) and the
// table in the mobile guide (.vitepress/theme/DeviceMatrix.vue). What the values mean is
// explained in apps/docs/guide/mobile.md#device-support. Side-effect free.

/** The device classes, in the order every `devices` line lists them. */
export const DEVICE_CLASSES = ['desktop', 'tablet', 'phone'];

/** The allowed values. */
export const DEVICE_STATES = ['ready', 'partial', 'planned', 'no'];

/** How a class is named on the site and in the skill. */
export const DEVICE_CLASS_LABELS = { desktop: 'Desktop', tablet: 'Tablet', phone: 'Phone' };

/** How a value is shown on the site and in the skill. */
export const DEVICE_STATE_LABELS = {
  ready: 'ready',
  partial: 'partial',
  planned: 'planned',
  no: 'not supported',
};

/** The VitePress `Badge` type of each value. The state is always in the text as well. */
export const DEVICE_BADGE_TYPES = {
  ready: 'tip',
  partial: 'warning',
  planned: 'info',
  no: 'danger',
};

/** The longest allowed `devicesNote`, in characters (Unicode code points). */
export const NOTE_MAX_LENGTH = 140;

/** The values that need a note. */
const NEEDS_NOTE = new Set(['partial', 'no']);

/**
 * Pages under components/ that make no device statement, with the reason. Every other page under
 * components/ (demos aside) must have a `devices` line, and none of these may have one.
 */
export const NO_DEVICES = new Map([
  [
    'components/fragment-parser.md',
    'no visual component: URL fragment parsing and modal-routing composables',
  ],
  [
    'components/calendar/performance.md',
    'no visual component: performance measurements of the calendar',
  ],
  [
    'components/page-builder/authoring-contract.md',
    'no visual component: inventory of renderer capabilities',
  ],
  ['components/page-builder/custom-elements.md', 'no visual component: registering element types'],
  ['components/page-builder/idp-integration.md', 'no visual component: integration architecture'],
  [
    'components/file-explorer/asset-store.md',
    'no visual component: the AssetStore backend contract',
  ],
  [
    'components/file-explorer/in-memory-store.md',
    'no visual component: a reference AssetStore implementation',
  ],
  ['components/file-explorer/use-file-explorer.md', 'no visual component: the headless composable'],
  [
    'components/file-explorer/index.md',
    'no visual component: a headless engine, the application renders the view',
  ],
  ['components/transitions.md', 'no visual component: transition wrappers around your content'],
  ['components/virtual-list.md', 'no visual component: the useVirtualList composable'],
  [
    'components/markdown-embeds.md',
    'no visual component of its own: registering embeds for the viewer and the editor',
  ],
  [
    'components/page-builder/index.md',
    'overview of two components with different statements: see coar-page-builder.md and coar-page-renderer.md',
  ],
]);

const DATA_GRID = 'components/data-grid.md';

/**
 * Pages that describe a part of another page's component and therefore carry exactly its
 * statement (`devices` and `devicesNote`), page → that page. They show the badges like any page,
 * but are left out of the overview table on the site and in the skill: a row per column type of
 * the grid would repeat the grid's row seven times.
 */
export const SAME_DEVICES_AS = new Map([
  ['components/data-grid/editing.md', DATA_GRID],
  ['components/data-grid/text.md', DATA_GRID],
  ['components/data-grid/number.md', DATA_GRID],
  ['components/data-grid/select.md', DATA_GRID],
  ['components/data-grid/multi-select.md', DATA_GRID],
  ['components/data-grid/date-columns.md', DATA_GRID],
  ['components/data-grid/checkbox.md', DATA_GRID],
  ['components/document-viewer/toolbar.md', 'components/document-viewer/coar-document-viewer.md'],
]);

/** Whether a docs page (path relative to apps/docs) must carry a `devices` line. */
export function needsDevices(rel) {
  return rel.startsWith('components/') && !rel.includes('/demos/') && !NO_DEVICES.has(rel);
}

/**
 * Reads `devices` and `devicesNote` from the text of a page's frontmatter (without the `---`
 * lines). Returns `{ devices, note }` (`note` is `null` when there is none), or `null` when the
 * frontmatter has no `devices` line. Throws an `Error` naming the broken rule when the form is
 * wrong.
 */
export function readDevices(frontmatterText) {
  const lines = frontmatterText.replace(/\r\n?/g, '\n').split('\n');

  const deviceLines = [];
  const noteLines = [];
  for (const line of lines) {
    const key = line.match(/^(devices\w*)\s*:/);
    if (!key) continue;
    if (key[1] === 'devices') deviceLines.push(line);
    else if (key[1] === 'devicesNote') noteLines.push(line);
    else
      throw new Error(
        `unknown frontmatter key "${key[1]}" — only "devices" and "devicesNote" exist`,
      );
  }

  if (deviceLines.length > 1) throw new Error('"devices" appears more than once');
  if (noteLines.length > 1) throw new Error('"devicesNote" appears more than once');

  if (!deviceLines.length) {
    if (noteLines.length) throw new Error('"devicesNote" without a "devices" line');
    return null;
  }

  const devices = parseDevicesLine(deviceLines[0]);
  const note = noteLines.length ? parseNoteLine(noteLines[0]) : null;

  const limited = DEVICE_CLASSES.filter((c) => NEEDS_NOTE.has(devices[c]));
  if (limited.length && note === null) {
    throw new Error(
      `"devicesNote" is required when a class is partial or no (${limited.map((c) => `${c}: ${devices[c]}`).join(', ')})`,
    );
  }

  return { devices, note };
}

const FORM = '`devices: { desktop: <value>, tablet: <value>, phone: <value> }` on one line';

function parseDevicesLine(line) {
  const m = line.match(/^devices:\s*\{(.*)\}\s*$/);
  if (!m) throw new Error(`"devices" must be written as ${FORM}`);

  const entries = m[1].split(',').map((part) => part.trim());
  const devices = {};
  const keys = [];
  for (const entry of entries) {
    const kv = entry.match(/^(\w+)\s*:\s*(\S+)$/);
    if (!kv) throw new Error(`"devices" must be written as ${FORM}; cannot read "${entry}"`);
    const [, key, value] = kv;
    if (!DEVICE_CLASSES.includes(key)) {
      throw new Error(
        `unknown device class "${key}" in "devices" — allowed: ${DEVICE_CLASSES.join(', ')}`,
      );
    }
    if (key in devices) throw new Error(`device class "${key}" appears twice in "devices"`);
    if (!DEVICE_STATES.includes(value)) {
      throw new Error(
        `unknown value "${value}" for "${key}" in "devices" — allowed: ${DEVICE_STATES.join(', ')}`,
      );
    }
    devices[key] = value;
    keys.push(key);
  }

  const absent = DEVICE_CLASSES.filter((c) => !(c in devices));
  if (absent.length)
    throw new Error(`"devices" is missing ${absent.join(', ')} — all three classes are required`);
  if (keys.join() !== DEVICE_CLASSES.join()) {
    throw new Error(
      `"devices" lists the classes in the wrong order — write them as ${DEVICE_CLASSES.join(', ')}`,
    );
  }
  return devices;
}

function parseNoteLine(line) {
  const m = line.match(/^devicesNote:\s*"(.*)"\s*$/);
  if (!m)
    throw new Error('"devicesNote" must be one double-quoted line: devicesNote: "<one sentence>"');
  const note = m[1];
  if (note.includes('"'))
    throw new Error('"devicesNote" must not contain a double quote inside the text');
  if (note.includes('\\'))
    throw new Error('"devicesNote" must not contain a backslash (YAML would read it as an escape)');
  if (!note.trim()) throw new Error('"devicesNote" is empty');
  const length = [...note].length;
  if (length > NOTE_MAX_LENGTH) {
    throw new Error(
      `"devicesNote" is ${length} characters long — at most ${NOTE_MAX_LENGTH} are allowed`,
    );
  }
  return note;
}

function sameDevices(a, b) {
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(b))
    return a === b;
  const keys = Object.keys(b);
  return keys.length === DEVICE_CLASSES.length && DEVICE_CLASSES.every((c) => a[c] === b[c]);
}

/**
 * Compares what readDevices() found in the lines with the frontmatter as VitePress parses it
 * (`parsed`, the object gray-matter returns as `data`). Returns the problems as strings.
 */
export function compareWithParsed(read, parsed) {
  const problems = [];
  const data = parsed && typeof parsed === 'object' ? parsed : {};
  for (const key of Object.keys(data)) {
    if (/^devices/i.test(key) && key !== 'devices' && key !== 'devicesNote') {
      problems.push(`unknown frontmatter key "${key}" — only "devices" and "devicesNote" exist`);
    }
  }
  const parsedDevices = data.devices ?? null;
  const parsedNote = data.devicesNote ?? null;
  if (!sameDevices(read ? read.devices : null, parsedDevices)) {
    problems.push(
      `VitePress reads "devices" as ${JSON.stringify(parsedDevices)}, the line says ${JSON.stringify(read ? read.devices : null)} — write ${FORM} as a plain top-level key`,
    );
  }
  if ((read ? read.note : null) !== parsedNote) {
    problems.push(
      `VitePress reads "devicesNote" as ${JSON.stringify(parsedNote)}, the line says ${JSON.stringify(read ? read.note : null)} — write it as a plain top-level key`,
    );
  }
  return problems;
}

/**
 * The page-level rules. `pages`: every docs page, `{ rel, frontmatter, parsed, parseError }` with
 * `rel` relative to apps/docs, `frontmatter` the text between the `---` lines, `parsed` the
 * frontmatter as VitePress parses it and `parseError` the message when that parse failed.
 * Returns `{ problems, statements }`: all problems as `<rel>: <rule>` strings, and a Map
 * rel → `{ devices, note }` of the pages that make a statement.
 */
export function checkDevicePages(pages) {
  const problems = [];
  const statements = new Map();
  const rels = new Set(pages.map((p) => p.rel));

  for (const { rel, frontmatter = '', parsed, parseError } of pages) {
    if (parseError) {
      problems.push(`${rel}: the frontmatter is not valid YAML for VitePress: ${parseError}`);
      continue;
    }
    let read;
    try {
      read = readDevices(frontmatter);
    } catch (error) {
      problems.push(`${rel}: ${error.message}`);
      continue;
    }
    const mismatches = compareWithParsed(read, parsed);
    if (mismatches.length) {
      for (const m of mismatches) problems.push(`${rel}: ${m}`);
      continue;
    }
    if (needsDevices(rel) && !read) {
      problems.push(
        `${rel}: no "devices" line — every page under components/ needs ` +
          `${FORM} after its description, ` +
          'or an entry with a reason in NO_DEVICES (apps/docs/scripts/devices.mjs)',
      );
    } else if (!needsDevices(rel) && read) {
      problems.push(
        NO_DEVICES.has(rel)
          ? `${rel}: has a "devices" line but is listed in NO_DEVICES (${NO_DEVICES.get(rel)}) — remove one of them`
          : `${rel}: has a "devices" line but is not a component page — only pages under components/ carry one`,
      );
    } else if (read) {
      statements.set(rel, read);
    }
  }

  for (const rel of NO_DEVICES.keys()) {
    if (!rels.has(rel)) problems.push(`${rel}: listed in NO_DEVICES but the page does not exist`);
  }

  for (const [rel, parent] of SAME_DEVICES_AS) {
    if (!rels.has(rel)) {
      problems.push(`${rel}: listed in SAME_DEVICES_AS but the page does not exist`);
    } else if (NO_DEVICES.has(rel)) {
      problems.push(`${rel}: listed in both NO_DEVICES and SAME_DEVICES_AS — remove one of them`);
    } else if (!rels.has(parent)) {
      problems.push(`${rel}: SAME_DEVICES_AS names ${parent}, which does not exist`);
    } else if (!statements.has(parent)) {
      problems.push(`${rel}: SAME_DEVICES_AS names ${parent}, which makes no device statement`);
    } else if (statements.has(rel)) {
      const own = statements.get(rel);
      const theirs = statements.get(parent);
      if (!sameDevices(own.devices, theirs.devices) || own.note !== theirs.note) {
        problems.push(
          `${rel}: must carry the same "devices" and "devicesNote" as ${parent} (SAME_DEVICES_AS) — ` +
            `it says "${devicesText(own.devices)}${own.note ? ` — ${own.note}` : ''}", ` +
            `${parent} says "${devicesText(theirs.devices)}${theirs.note ? ` — ${theirs.note}` : ''}"`,
        );
      }
    }
  }

  return { problems, statements };
}

/** `{ desktop: 'ready', tablet: 'ready', phone: 'partial' }` → `desktop ready · tablet ready · phone partial`. */
export function devicesText(devices) {
  return DEVICE_CLASSES.map((c) => `${c} ${DEVICE_STATE_LABELS[devices[c]]}`).join(' · ');
}
