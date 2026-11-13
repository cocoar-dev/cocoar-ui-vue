import { test } from 'node:test';
import assert from 'node:assert/strict';

import matter from 'gray-matter';

import {
  NO_DEVICES,
  SAME_DEVICES_AS,
  checkDevicePages,
  compareWithParsed,
  devicesText,
  needsDevices,
  readDevices,
} from './devices.mjs';

const fm = (...lines) => ['description: "A page."', ...lines, 'outline: deep'].join('\n');
const throws = (text, pattern) => assert.throws(() => readDevices(text), pattern);

test('a page without devices returns null', () => {
  assert.equal(readDevices(fm()), null);
});

test('reads the one-line form', () => {
  assert.deepEqual(readDevices(fm('devices: { desktop: ready, tablet: ready, phone: planned }')), {
    devices: { desktop: 'ready', tablet: 'ready', phone: 'planned' },
    note: null,
  });
});

test('reads the note', () => {
  const result = readDevices(
    fm(
      'devices: { desktop: ready, tablet: partial, phone: no }',
      'devicesNote: "Right-click menus; not tuned for touch."',
    ),
  );
  assert.deepEqual(result.devices, { desktop: 'ready', tablet: 'partial', phone: 'no' });
  assert.equal(result.note, 'Right-click menus; not tuned for touch.');
});

test('a note is allowed without partial or no', () => {
  assert.equal(
    readDevices(
      fm('devices: { desktop: ready, tablet: ready, phone: ready }', 'devicesNote: "Fine."'),
    ).note,
    'Fine.',
  );
});

test('CRLF frontmatter is read the same', () => {
  const text = fm(
    'devices: { desktop: ready, tablet: ready, phone: partial }',
    'devicesNote: "Limit."',
  ).replace(/\n/g, '\r\n');
  assert.equal(readDevices(text).devices.phone, 'partial');
  assert.equal(readDevices(text).note, 'Limit.');
});

test('rejects the multi-line YAML form', () => {
  throws(
    fm('devices:', '  desktop: ready', '  tablet: ready', '  phone: ready'),
    /must be written as .* on one line/,
  );
});

test('rejects a devices line of another shape', () => {
  throws(fm('devices: [ready, ready, ready]'), /must be written as/);
  throws(
    fm('devices: { desktop ready, tablet: ready, phone: ready }'),
    /cannot read "desktop ready"/,
  );
});

test('rejects an unknown class', () => {
  throws(
    fm('devices: { desktop: ready, tablet: ready, phone: ready, watch: no }'),
    /unknown device class "watch"/,
  );
});

test('rejects a missing class', () => {
  throws(fm('devices: { desktop: ready, tablet: ready }'), /missing phone/);
});

test('rejects a class listed twice', () => {
  throws(
    fm('devices: { desktop: ready, desktop: ready, phone: ready }'),
    /"desktop" appears twice/,
  );
});

test('rejects the wrong order', () => {
  throws(fm('devices: { tablet: ready, desktop: ready, phone: ready }'), /wrong order/);
});

test('rejects an unknown value', () => {
  throws(
    fm('devices: { desktop: ready, tablet: yes, phone: ready }'),
    /unknown value "yes" for "tablet"/,
  );
});

test('rejects a note without devices', () => {
  throws(fm('devicesNote: "Orphan."'), /"devicesNote" without a "devices" line/);
});

test('requires a note for partial and for no', () => {
  throws(
    fm('devices: { desktop: ready, tablet: ready, phone: partial }'),
    /"devicesNote" is required .*phone: partial/,
  );
  throws(
    fm('devices: { desktop: ready, tablet: no, phone: ready }'),
    /"devicesNote" is required .*tablet: no/,
  );
});

test('rejects a note longer than 140 characters', () => {
  assert.ok(
    readDevices(
      fm(
        'devices: { desktop: ready, tablet: ready, phone: partial }',
        `devicesNote: "${'x'.repeat(140)}"`,
      ),
    ),
  );
  throws(
    fm(
      'devices: { desktop: ready, tablet: ready, phone: partial }',
      `devicesNote: "${'x'.repeat(141)}"`,
    ),
    /141 characters long/,
  );
});

test('rejects a double quote inside the note', () => {
  throws(
    fm(
      'devices: { desktop: ready, tablet: ready, phone: partial }',
      'devicesNote: "Say "hi" first."',
    ),
    /double quote inside/,
  );
});

test('rejects a note that is not double-quoted', () => {
  throws(
    fm('devices: { desktop: ready, tablet: ready, phone: partial }', "devicesNote: 'Single.'"),
    /one double-quoted line/,
  );
  throws(
    fm('devices: { desktop: ready, tablet: ready, phone: partial }', 'devicesNote: Bare.'),
    /one double-quoted line/,
  );
});

test('rejects an empty note and a backslash', () => {
  throws(
    fm('devices: { desktop: ready, tablet: ready, phone: partial }', 'devicesNote: ""'),
    /is empty/,
  );
  throws(
    fm('devices: { desktop: ready, tablet: ready, phone: partial }', 'devicesNote: "a\\nb"'),
    /backslash/,
  );
});

test('rejects an unknown devices* key and duplicates', () => {
  throws(fm('devicesNotes: "Typo."'), /unknown frontmatter key "devicesNotes"/);
  throws(
    fm(
      'devices: { desktop: ready, tablet: ready, phone: ready }',
      'devices: { desktop: ready, tablet: ready, phone: ready }',
    ),
    /more than once/,
  );
});

test('needsDevices: component pages, not demos, not the exceptions', () => {
  assert.equal(needsDevices('components/button.md'), true);
  assert.equal(needsDevices('components/calendar/week-view.md'), true);
  assert.equal(needsDevices('components/button/demos/basic.md'), false);
  assert.equal(needsDevices('guide/mobile.md'), false);
  assert.equal(needsDevices('foundations/colors.md'), false);
  for (const rel of NO_DEVICES.keys()) assert.equal(needsDevices(rel), false, rel);
});

test('every exception names its reason', () => {
  for (const [rel, reason] of NO_DEVICES) assert.ok(reason.trim(), rel);
});

test('devicesText', () => {
  assert.equal(
    devicesText({ desktop: 'ready', tablet: 'ready', phone: 'partial' }),
    'desktop ready · tablet ready · phone partial',
  );
  assert.equal(
    devicesText({ desktop: 'ready', tablet: 'planned', phone: 'no' }),
    'desktop ready · tablet planned · phone not supported',
  );
});

test('rejects a duplicated devicesNote', () => {
  throws(
    fm(
      'devices: { desktop: ready, tablet: ready, phone: partial }',
      'devicesNote: "One."',
      'devicesNote: "Two."',
    ),
    /"devicesNote" appears more than once/,
  );
});

test('counts the note in code points, not UTF-16 units', () => {
  const devices = 'devices: { desktop: ready, tablet: ready, phone: partial }';
  // 😀 is one character but two UTF-16 units: 140 of them are 280 units.
  assert.equal(readDevices(fm(devices, `devicesNote: "${'😀'.repeat(140)}"`)).note.length, 280);
  throws(fm(devices, `devicesNote: "${'😀'.repeat(141)}"`), /141 characters long/);
});

// --- Page-level rules (checkDevicePages), with the frontmatter parsed as VitePress parses it ---

const READY = 'devices: { desktop: ready, tablet: ready, phone: ready }';
const PARENT = 'devices: { desktop: ready, tablet: partial, phone: no }';
const PARENT_NOTE = 'devicesNote: "Not for phones."';

function page(rel, ...lines) {
  const frontmatter = ['description: "A page."', ...lines].join('\n');
  try {
    return { rel, frontmatter, parsed: matter(`---\n${frontmatter}\n---\n\n# Title\n`, {}).data };
  } catch (error) {
    return { rel, frontmatter, parseError: error.reason || error.message };
  }
}

// A set of pages that satisfies every rule: the exceptions exist without a statement, the pages of
// SAME_DEVICES_AS and their parents carry the same one, plus a component and a guide page.
function base() {
  const pages = new Map();
  for (const rel of NO_DEVICES.keys()) pages.set(rel, page(rel));
  for (const [rel, parent] of SAME_DEVICES_AS) {
    pages.set(parent, page(parent, PARENT, PARENT_NOTE));
    pages.set(rel, page(rel, PARENT, PARENT_NOTE));
  }
  pages.set('components/button.md', page('components/button.md', READY));
  pages.set('guide/mobile.md', page('guide/mobile.md'));
  return pages;
}

function check(pages) {
  return checkDevicePages([...pages.values()]);
}

function expectOne(pages, pattern) {
  const { problems } = check(pages);
  assert.equal(problems.length, 1, problems.join('\n'));
  assert.match(problems[0], pattern);
}

test('checkDevicePages: the base set has no problems and returns the statements', () => {
  const { problems, statements } = check(base());
  assert.deepEqual(problems, []);
  assert.deepEqual(statements.get('components/button.md'), {
    devices: { desktop: 'ready', tablet: 'ready', phone: 'ready' },
    note: null,
  });
  assert.equal(statements.has('guide/mobile.md'), false);
});

test('checkDevicePages: a component page without a statement', () => {
  const pages = base();
  pages.set('components/button.md', page('components/button.md'));
  expectOne(pages, /^components\/button\.md: no "devices" line/);
});

test('checkDevicePages: a nested component page in no list needs a statement', () => {
  const pages = base();
  pages.set('components/calendar/new-view.md', page('components/calendar/new-view.md'));
  expectOne(pages, /^components\/calendar\/new-view\.md: no "devices" line/);
});

test('checkDevicePages: a statement on a page outside components/', () => {
  const pages = base();
  pages.set('guide/mobile.md', page('guide/mobile.md', READY));
  expectOne(pages, /^guide\/mobile\.md: has a "devices" line but is not a component page/);
});

test('checkDevicePages: a statement on a NO_DEVICES page', () => {
  const pages = base();
  pages.set('components/fragment-parser.md', page('components/fragment-parser.md', READY));
  expectOne(
    pages,
    /^components\/fragment-parser\.md: has a "devices" line but is listed in NO_DEVICES/,
  );
});

test('checkDevicePages: a NO_DEVICES entry without a page', () => {
  const pages = base();
  pages.delete('components/fragment-parser.md');
  expectOne(
    pages,
    /^components\/fragment-parser\.md: listed in NO_DEVICES but the page does not exist/,
  );
});

test('checkDevicePages: a readDevices error names the page', () => {
  const pages = base();
  pages.set(
    'components/button.md',
    page('components/button.md', 'devices: { desktop: ready, tablet: yes, phone: ready }'),
  );
  expectOne(pages, /^components\/button\.md: unknown value "yes"/);
});

test('checkDevicePages: lines hidden in a multi-line YAML string', () => {
  const pages = base();
  // VitePress sees one string "metadata" and no devices; the lines alone look fine.
  pages.set(
    'components/button.md',
    page('components/button.md', "metadata: '", READY, 'devicesNote: "Limit."', "'"),
  );
  const { problems } = check(pages);
  assert.ok(problems.length >= 1, 'expected a problem');
  assert.match(problems.join('\n'), /^components\/button\.md: VitePress reads "devices" as null/m);
});

test('checkDevicePages: a quoted duplicate key breaks VitePress', () => {
  const pages = base();
  pages.set(
    'components/button.md',
    page('components/button.md', READY, `"devices": { desktop: ready }`),
  );
  expectOne(
    pages,
    /^components\/button\.md: the frontmatter is not valid YAML for VitePress: duplicated mapping key/,
  );
});

test('checkDevicePages: a quoted devices-like key in any casing', () => {
  const pages = base();
  pages.set(
    'components/button.md',
    page('components/button.md', READY, `"DevicesNote": "Hidden."`),
  );
  expectOne(pages, /^components\/button\.md: unknown frontmatter key "DevicesNote"/);
});

test('checkDevicePages: a SAME_DEVICES_AS page that differs from its parent', () => {
  const pages = base();
  pages.set('components/data-grid/text.md', page('components/data-grid/text.md', READY));
  expectOne(
    pages,
    /^components\/data-grid\/text\.md: must carry the same "devices" and "devicesNote" as components\/data-grid\.md/,
  );
});

test('checkDevicePages: a SAME_DEVICES_AS page whose note differs', () => {
  const pages = base();
  pages.set(
    'components/data-grid/text.md',
    page('components/data-grid/text.md', PARENT, 'devicesNote: "Other."'),
  );
  expectOne(pages, /must carry the same "devices" and "devicesNote" as components\/data-grid\.md/);
});

test('checkDevicePages: a SAME_DEVICES_AS page without a statement', () => {
  const pages = base();
  pages.set('components/data-grid/text.md', page('components/data-grid/text.md'));
  expectOne(pages, /^components\/data-grid\/text\.md: no "devices" line/);
});

test('checkDevicePages: a SAME_DEVICES_AS parent that is missing or has no statement', () => {
  let pages = base();
  pages.delete('components/document-viewer/coar-document-viewer.md');
  expectOne(
    pages,
    /^components\/document-viewer\/toolbar\.md: SAME_DEVICES_AS names components\/document-viewer\/coar-document-viewer\.md, which does not exist/,
  );
  pages = base();
  pages.set('components/data-grid.md', page('components/data-grid.md'));
  const { problems } = check(pages);
  // The parent itself lacks the line, and each of its seven pages reports it.
  assert.match(problems[0], /^components\/data-grid\.md: no "devices" line/);
  assert.equal(problems.filter((p) => /which makes no device statement/.test(p)).length, 7);
});

test('checkDevicePages: a SAME_DEVICES_AS page that does not exist', () => {
  const pages = base();
  pages.delete('components/data-grid/text.md');
  expectOne(
    pages,
    /^components\/data-grid\/text\.md: listed in SAME_DEVICES_AS but the page does not exist/,
  );
});

test('NO_DEVICES and SAME_DEVICES_AS do not overlap, and every parent needs a statement', () => {
  for (const [rel, parent] of SAME_DEVICES_AS) {
    assert.equal(NO_DEVICES.has(rel), false, rel);
    assert.equal(needsDevices(parent), true, parent);
  }
});

test('compareWithParsed: both absent is equal, a different parsed note is not', () => {
  assert.deepEqual(compareWithParsed(null, { description: 'x' }), []);
  const read = readDevices(fm(PARENT, PARENT_NOTE));
  assert.deepEqual(
    compareWithParsed(read, { devices: read.devices, devicesNote: 'Not for phones.' }),
    [],
  );
  assert.match(
    compareWithParsed(read, { devices: read.devices, devicesNote: 'Other.' })[0],
    /devicesNote/,
  );
  assert.match(
    compareWithParsed(read, {
      devices: { ...read.devices, extra: 'x' },
      devicesNote: 'Not for phones.',
    })[0],
    /VitePress reads "devices"/,
  );
});
