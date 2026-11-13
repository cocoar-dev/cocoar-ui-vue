// node --test .alta/skills/cocoar-pr/scripts/pr.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  changedStoryRecipes,
  recipeSourceProblems,
  storyRecipeProblems,
  changedDefaultBaselines,
  changedHarnessFiles,
  ciProblems,
  fileGateProblems,
  VISUAL_HARNESS,
} from './pr.mjs';

const dir = 'apps/playground/visual/__screenshots__';
const stories = 'apps/playground/src/visual/stories';
const manifest = 'apps/playground/src/visual/stories.json';
const mod = (filename) => ({ filename, status: 'modified' });
const add = (filename) => ({ filename, status: 'added' });
const del = (filename) => ({ filename, status: 'removed' });

// ── default baselines ───────────────────────────────────────────────────────

test('a modified, removed or renamed default baseline is refused', () => {
  const files = [
    mod(`${dir}/button--default-light.png`),
    del(`${dir}/switch--default-dark.png`),
    { filename: `${dir}/checkbox--default-light-old.png`, status: 'renamed', previous_filename: `${dir}/checkbox--default-light.png` },
  ];
  assert.deepEqual(changedDefaultBaselines(files), [
    `${dir}/button--default-light.png`,
    `${dir}/switch--default-dark.png`,
    `${dir}/checkbox--default-light.png → ${dir}/checkbox--default-light-old.png`,
  ]);
});

test('new default baselines, mobile baselines and other files pass', () => {
  const files = [
    add(`${dir}/select--default-light.png`),
    mod(`${dir}/button--mobile-light.png`),
    del(`${dir}/button--mobile-dark.png`),
    { filename: `${dir}/tag--default-dark.png`, status: 'renamed', previous_filename: `${dir}/tag--mobile-dark.png` },
    mod('packages/ui/src/components/button/CoarButton.vue'),
    mod('docs/button--default-light.png'),
  ];
  assert.deepEqual(changedDefaultBaselines(files), []);
});

// ── harness ─────────────────────────────────────────────────────────────────

test('a modified, removed or renamed harness file is refused', () => {
  const files = [
    mod('apps/playground/playwright.visual.config.ts'),
    del('apps/playground/visual/warm-up.ts'),
    { filename: 'apps/playground/scripts/visual2.mjs', status: 'renamed', previous_filename: 'apps/playground/scripts/visual.mjs' },
    mod('.github/workflows/ci.yml'),
    mod('.alta/skills/cocoar-pr/scripts/pr.mjs'),
  ];
  assert.deepEqual(changedHarnessFiles(files), [
    'apps/playground/playwright.visual.config.ts',
    'apps/playground/visual/warm-up.ts',
    'apps/playground/scripts/visual.mjs → apps/playground/scripts/visual2.mjs',
    '.github/workflows/ci.yml',
    '.alta/skills/cocoar-pr/scripts/pr.mjs',
  ]);
  const problems = fileGateProblems(files, files.length);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /--accept-visual-harness-change/);
  assert.deepEqual(fileGateProblems(files, files.length, { acceptHarness: true }), []);
});

test('the harness as added by the pull request that introduces it passes', () => {
  const files = VISUAL_HARNESS.filter((f) => !f.startsWith('.')).map(add);
  assert.deepEqual(changedHarnessFiles(files), []);
});

test('adding a story adds its file, its stories.json entry and baselines: passes', () => {
  const files = [
    add(`${stories}/select.vue`),
    mod(manifest),
    ...['default-light', 'default-dark', 'mobile-light', 'mobile-dark'].map((v) => add(`${dir}/select--${v}.png`)),
  ];
  assert.deepEqual(fileGateProblems(files, files.length), []);
});

test('changing an existing story is refused by both gates: it could hide a component change', () => {
  // With its baselines changed: the baseline gate and the harness gate.
  const withImages = [mod(`${stories}/button.vue`), mod(`${dir}/button--default-light.png`), mod(`${dir}/button--mobile-light.png`)];
  const both = fileGateProblems(withImages, withImages.length);
  assert.equal(both.length, 2);
  assert.match(both[0], /default-presentation baselines/);
  assert.match(both[1], /--accept-visual-harness-change/);
  // Without any image changed (a story whose own CSS undoes a component change): still refused.
  const silent = [mod(`${stories}/button.vue`), mod('packages/ui/src/components/button/CoarButton.vue')];
  const problems = fileGateProblems(silent, silent.length);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /stories\/button\.vue/);
  assert.deepEqual(fileGateProblems(silent, silent.length, { acceptHarness: true }), []);
});

test('removing a story is refused, with or without its baselines', () => {
  const withImages = [
    del(`${stories}/switch.vue`),
    mod(manifest),
    ...['default-light', 'default-dark', 'mobile-light', 'mobile-dark'].map((v) => del(`${dir}/switch--${v}.png`)),
  ];
  assert.deepEqual(changedDefaultBaselines(withImages), [`${dir}/switch--default-light.png`, `${dir}/switch--default-dark.png`]);
  const without = [del(`${stories}/switch.vue`), mod(manifest)];
  assert.match(fileGateProblems(without, without.length)[0], /stories\/switch\.vue/);
});

test('the manifest module is guarded, the list of stories is not', () => {
  assert.deepEqual(changedHarnessFiles([mod('apps/playground/src/visual/manifest.ts')]), ['apps/playground/src/visual/manifest.ts']);
  assert.deepEqual(changedHarnessFiles([mod(manifest)]), []);
});

test('focus images of the default presentation are default baselines; mobile ones are not', () => {
  const files = [
    mod(`${dir}/button--default-light-focus.png`),
    del(`${dir}/tabs--default-dark-focus.png`),
    mod(`${dir}/button--mobile-light-focus.png`),
    add(`${dir}/select--default-light-focus.png`),
  ];
  assert.deepEqual(changedDefaultBaselines(files), [
    `${dir}/button--default-light-focus.png`,
    `${dir}/tabs--default-dark-focus.png`,
  ]);
});

test('the page of the visual baselines (visual.html, its main.ts) is guarded', () => {
  const files = [mod('apps/playground/visual.html'), mod('apps/playground/src/visual/main.ts')];
  assert.deepEqual(changedHarnessFiles(files), files.map((f) => f.filename));
  assert.deepEqual(changedHarnessFiles(files.map((f) => add(f.filename))), []);
});

// ── recipes in stories.json ─────────────────────────────────────────────────

const recipes = (entries) => JSON.stringify(entries);
const button = { name: 'button', focus: '.coar-button >> nth=0' };
const select = { name: 'select-open', capture: 'page', open: { actions: [{ dispatch: 'click', on: '[role=combobox]' }], overlays: 1 } };

test('a new entry in stories.json passes', () => {
  assert.deepEqual(changedStoryRecipes(recipes([button]), recipes([button, { name: 'tabs' }])), []);
});

test('an option changed, added or removed on an existing entry is refused, naming the story', () => {
  const viewport = { ...button, viewport: { width: 1280, height: 800 } };
  for (const head of [viewport, { name: 'button' }, { ...button, focus: '.coar-button >> nth=1' }]) {
    const changed = changedStoryRecipes(recipes([button, select]), recipes([head, select]));
    assert.equal(changed.length, 1);
    assert.match(changed[0], /^button \(/);
  }
  const nested = { ...select, open: { ...select.open, overlays: 2 } };
  assert.match(changedStoryRecipes(recipes([select]), recipes([nested]))[0], /^select-open \(/);
  const problems = storyRecipeProblems(changedStoryRecipes(recipes([button]), recipes([{ name: 'button' }])));
  assert.match(problems[0], /recipe of existing stories[\s\S]*button[\s\S]*--accept-visual-harness-change/);
  assert.deepEqual(storyRecipeProblems(['button (…)'], { acceptHarness: true }), []);
});

test('a removed entry is refused; the file removed counts as all entries removed', () => {
  assert.deepEqual(changedStoryRecipes(recipes([button, select]), recipes([select])), ['button (removed)']);
  assert.deepEqual(changedStoryRecipes(recipes([button]), null), ['button (removed)']);
});

test('reordering entries or their keys is no change', () => {
  const reordered = { focus: button.focus, name: 'button' };
  assert.deepEqual(changedStoryRecipes(recipes([button, select]), recipes([select, reordered])), []);
});

test('the file added (no base) passes', () => {
  assert.deepEqual(changedStoryRecipes(null, recipes([button, select])), []);
});

test('unparsable or malformed stories.json at either side is refused', () => {
  assert.match(changedStoryRecipes('[{', recipes([button]))[0], /at the base cannot be parsed/);
  assert.match(changedStoryRecipes(recipes([button]), '{"name":"button"}')[0], /at the head is not a list/);
  assert.match(changedStoryRecipes(recipes([button]), recipes([button, button]))[0], /names a story twice: button/);
});

test('the server configuration of the visual page is guarded', () => {
  assert.deepEqual(changedHarnessFiles([mod('apps/playground/vite.visual.config.ts')]), ['apps/playground/vite.visual.config.ts']);
});

test('an incomplete file list is refused', () => {
  const problems = fileGateProblems([mod('README.md')], 3001);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /incomplete: the API listed 1 of 3001/);
});

// ── CI verdict ──────────────────────────────────────────────────────────────

const sha = 'a'.repeat(40);
const run = (id, extra = {}) => ({ databaseId: id, event: 'pull_request', status: 'completed', headSha: sha, attempt: 1, ...extra });
const job = (name, conclusion) => ({ name, conclusion, status: 'completed' });
const pass = (name, workflow = 'ci') => ({ name, bucket: 'pass', workflow });
const skip = (name, workflow = 'ci') => ({ name, bucket: 'skipping', workflow });

test('both required jobs succeeded in the ci.yml run of the head: ok', () => {
  const problems = ciProblems({
    sha,
    runs: [run(1)],
    jobs: [job('Build, test & pack', 'success'), job('Visual image', 'success'), job('Visual', 'success'), job('Publish', 'skipped')],
    checks: [pass('Build, test & pack'), pass('Visual'), skip('Publish')],
  });
  assert.deepEqual(problems, []);
});

test('a skipped real Visual job plus a passing namesake from another workflow is refused', () => {
  const problems = ciProblems({
    sha,
    runs: [run(1)],
    jobs: [job('Build, test & pack', 'success'), job('Visual', 'skipped')],
    checks: [pass('Build, test & pack'), skip('Visual'), pass('Visual', 'sneaky')],
  });
  assert.deepEqual(problems, ['job "Visual" did not succeed in the ci.yml run 1: skipped']);
});

test('a missing required job is refused', () => {
  const problems = ciProblems({ sha, runs: [run(1)], jobs: [job('Build, test & pack', 'success')], checks: [pass('Build, test & pack')] });
  assert.deepEqual(problems, ['job "Visual" is missing in the ci.yml run 1']);
});

test('no pull_request run for the head commit is refused', () => {
  const runs = [run(1, { headSha: 'b'.repeat(40) }), run(2, { event: 'push' })];
  const problems = ciProblems({ sha, runs, jobs: [], checks: [pass('Visual', 'sneaky')] });
  assert.deepEqual(problems, [`no pull_request run of ci.yml for ${sha.slice(0, 8)}`]);
});

test('the newest run decides, and any red check refuses', () => {
  const problems = ciProblems({
    sha,
    runs: [run(1), run(7, { status: 'in_progress' })],
    jobs: [job('Build, test & pack', 'success'), job('Visual', 'success')],
    checks: [pass('Build, test & pack'), pass('Visual'), { name: 'CodeQL', bucket: 'fail', workflow: 'codeql' }],
  });
  assert.deepEqual(problems, ['CodeQL not green', 'the ci.yml run 7 is in_progress']);
});

test('a stories.json that cannot be read where it must exist is refused, not taken for a new file', () => {
  // Added by the pull request: no base is expected.
  assert.deepEqual(recipeSourceProblems('added', null, '[]'), []);
  // Modified: a base lookup that finds nothing (a 404 for any reason) must not make every recipe "new".
  assert.match(recipeSourceProblems('modified', null, '[]')[0], /could not be read at its base/);
  assert.match(recipeSourceProblems('modified', '[]', null)[0], /could not be read at the head/);
  // Removed by the pull request: no head is expected, the base is.
  assert.deepEqual(recipeSourceProblems('removed', '[]', null), []);
  assert.match(recipeSourceProblems('removed', null, null)[0], /could not be read at its base/);
  assert.deepEqual(recipeSourceProblems('modified', '[]', '[]'), []);
});

test('everything under stories/ is guarded once it exists, also what stories share', () => {
  const shared = `${stories}/calendar-events.ts`;
  assert.deepEqual(changedHarnessFiles([mod(shared)]), [shared]);
  assert.deepEqual(changedHarnessFiles([del(shared)]), [shared]);
  assert.deepEqual(changedHarnessFiles([add(shared), add(`${stories}/calendar-month.vue`)]), []);
  // Odd names too: a pattern with `.` would miss a newline in a file name.
  const odd = `${stories}/shared\nhelper.ts`;
  assert.deepEqual(changedHarnessFiles([mod(odd)]), [odd]);
  assert.deepEqual(changedHarnessFiles([mod(`${stories}/sub/deep.ts`)]), [`${stories}/sub/deep.ts`]);
});
