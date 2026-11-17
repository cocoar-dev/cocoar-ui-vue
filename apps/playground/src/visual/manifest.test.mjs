// Runs with `pnpm test` of the playground (and so in CI): node --experimental-strip-types --test src/visual/manifest.test.mjs
// The validation of stories.json and the modes, baselines and root width it derives; no browser. Node strips the
// types of manifest.ts when it imports it (the flag is needed below Node 22.18).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { URL } from 'node:url';
import {
  manifestProblems,
  rootWidth,
  storyBaselines,
  storyModes,
  storyProblems,
  storyRootWidth,
  visualStories,
} from './manifest.ts';

const phone = { width: 390, height: 844 };
const mobileOnly = (more = {}) => ({
  name: 'phone-form',
  capture: 'page',
  modes: ['mobile'],
  viewport: phone,
  ...more,
});
const problems = (entry) => storyProblems(entry).map((p) => p.replace(/^[^:]+: /, ''));

test('the entries of stories.json are valid', () => {
  assert.deepEqual(manifestProblems, []);
});

test('renderer readiness rejects empty or malformed selector lists', () => {
  assert.deepEqual(problems({ name: 'renderers', ready: ['.monaco-editor .view-line', '.coar-mermaid[data-status=rendered] svg'] }), []);
  assert.deepEqual(problems({ name: 'plain' }), []);
  for (const ready of [[], '', '.renderer', null, true, {}, [''], [' '], [1], ['.renderer', null]]) {
    assert.deepEqual(problems({ name: 'renderers', ready }), ['ready must be a non-empty list of renderer selectors'], JSON.stringify(ready));
  }
});

test('the baselines on disk are exactly those of the stories', () => {
  const dir = new URL('../../visual/__screenshots__/', import.meta.url);
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.png'))
    .sort();
  assert.deepEqual(files, visualStories.flatMap(storyBaselines).sort());
});

test('a mobile-only story with a phone viewport: mobile images only, root as wide as the page allows', () => {
  const story = mobileOnly();
  assert.deepEqual(problems(story), []);
  assert.deepEqual(storyModes(story), ['mobile']);
  assert.deepEqual(storyBaselines(story), [
    'phone-form--mobile-light.png',
    'phone-form--mobile-dark.png',
  ]);
  assert.equal(storyRootWidth(story), 390 - 16);
  assert.deepEqual(problems(mobileOnly({ viewport: { width: 320, height: 568 } })), []);
  assert.deepEqual(problems(mobileOnly({ viewport: { width: 480, height: 932 } })), []);
  assert.deepEqual(problems(mobileOnly({ capture: undefined })), []);
});

test('a phone viewport without modes ["mobile"] is refused: a default image keeps the desktop viewport', () => {
  const [p, ...rest] = problems({ name: 'shrunk', capture: 'page', viewport: phone });
  assert.equal(rest.length, 0);
  assert.match(p, /phone viewport .* needs modes \["mobile"\]/);
  assert.equal(problems({ name: 'shrunk', viewport: { width: 1023, height: 768 } }).length, 1);
  assert.equal(problems({ name: 'shrunk', viewport: { width: 1024, height: 767 } }).length, 1);
  assert.deepEqual(problems({ name: 'wide', viewport: { width: 1024, height: 768 } }), []);
});

test('a scope "local" story keeps the desktop viewport and takes no modes', () => {
  const local = { name: 'local', capture: 'page', scope: 'local' };
  assert.equal(problems({ ...local, viewport: phone }).length, 1);
  assert.match(problems({ ...local, modes: ['mobile'] })[0], /modes is not for scope "local"/);
  assert.deepEqual(storyModes(local), ['mobile']);
});

test('modes takes only ["mobile"]', () => {
  for (const modes of [
    ['default'],
    ['mobile', 'default'],
    ['default', 'mobile'],
    [],
    'mobile',
    ['mobile', 'mobile'],
    true,
  ]) {
    assert.deepEqual(
      problems(mobileOnly({ modes, viewport: undefined })),
      ['modes must be ["mobile"] (without it a story is photographed in both modes)'],
      JSON.stringify(modes),
    );
  }
});

test('a mobile-only story may keep a desktop viewport; nothing between phone and desktop, nothing outside', () => {
  const desktop = mobileOnly({ viewport: { width: 1024, height: 768 } });
  assert.deepEqual(problems(desktop), []);
  assert.equal(storyRootWidth(desktop), rootWidth);
  assert.deepEqual(problems(mobileOnly({ viewport: undefined })), []);
  for (const viewport of [
    { width: 481, height: 844 },
    { width: 800, height: 900 },
    { width: 319, height: 844 },
    { width: 390, height: 567 },
    { width: 390, height: 933 },
    { width: 390.5, height: 844 },
    { width: 390, height: 844, depth: 1 },
  ]) {
    assert.equal(problems(mobileOnly({ viewport })).length, 1, JSON.stringify(viewport));
  }
});

test('width is refused with a phone viewport and keeps its rules otherwise', () => {
  assert.match(problems(mobileOnly({ width: 300 }))[0], /width is not for a phone viewport/);
  assert.match(problems(mobileOnly({ width: 374 }))[0], /width is not for a phone viewport/);
  assert.equal(problems({ name: 'narrow-root', width: 500 }).length, 1);
  const wide = { name: 'wide', viewport: { width: 1280, height: 900 }, width: 1232 };
  assert.deepEqual(problems(wide), []);
  assert.equal(storyRootWidth(wide), 1232);
  assert.equal(storyRootWidth({ name: 'plain' }), rootWidth);
});

test('the stories that take both modes still do', () => {
  assert.deepEqual(storyModes({ name: 'plain' }), ['default', 'mobile']);
  assert.deepEqual(storyModes({ name: 'html', scope: 'html' }), ['default', 'mobile']);
});
