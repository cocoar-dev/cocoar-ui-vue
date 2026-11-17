import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { compileStyle, parse } from 'vue/compiler-sfc';
import { isPresentation, PRESENTATION_INIT_SCRIPT, PRESENTATION_KEY } from '../presentation.mjs';

test('only known presentation choices are accepted', () => {
  for (const value of ['legacy', 'compact']) assert.equal(isPresentation(value), true);
  for (const value of [null, undefined, {}, '', 'dark', 'true']) {
    assert.equal(isPresentation(value), false);
  }
});

for (const [saved, compact] of [['compact', true], ['legacy', false], [null, false], ['invalid', false]]) {
  test(`pre-paint bootstrap restores ${JSON.stringify(saved)} without importing browser code in SSR`, () => {
    const classes = new Set(['dark', 'unrelated']);
    runInNewContext(PRESENTATION_INIT_SCRIPT, {
      window: { localStorage: { getItem: (key) => {
        assert.equal(key, PRESENTATION_KEY);
        return saved;
      } } },
      document: { documentElement: { classList: { toggle: (name, on) => {
        if (on) classes.add(name);
        else classes.delete(name);
      } } } },
    });
    assert.equal(classes.has('coar-compact'), compact);
    assert.equal(classes.has('dark'), true);
    assert.equal(classes.has('unrelated'), true);
  });
}

test('pre-paint bootstrap tolerates blocked local storage', () => {
  runInNewContext(PRESENTATION_INIT_SCRIPT, {
    window: { get localStorage() { throw new Error('SecurityError'); } },
    document: { documentElement: { classList: { toggle: () => assert.fail('no saved opt-in') } } },
  });
});

test('the VitePress bridge is confined to the compact root', () => {
  const css = readFileSync(new URL('../.vitepress/theme/compact.css', import.meta.url), 'utf8');
  const selectors = css.replace(/\/\*[\s\S]*?\*\//g, '')
    .matchAll(/([^{}]+)\{/g);
  for (const [_, selector] of selectors) {
    if (selector.trim().startsWith('@media')) continue;
    assert.match(selector.trim(), /^:root\.coar-compact/, selector);
  }
});

test('the scoped switcher styles never hide VitePress navigation itself', () => {
  const source = readFileSync(new URL('../components/PresentationSwitcher.vue', import.meta.url), 'utf8');
  const { descriptor } = parse(source);
  const result = compileStyle({ source: descriptor.styles[0].content, id: 'data-v-docs-test', scoped: true });
  assert.deepEqual(result.errors, []);
  assert.match(result.code, /\.VPNavBar \.docs-presentation\[data-v-docs-test\]/);
  assert.doesNotMatch(result.code, /\.VPNavBar\s*\{/);
});
