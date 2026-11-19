import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { compileStyle, parse } from 'vue/compiler-sfc';
import { SHELL_THEME_CLASS, SHELL_THEME_INIT_SCRIPT, SHELL_THEME_KEY } from '../shell-theme.mjs';

for (const [saved, themed] of [['on', true], ['off', false], [null, false], ['compact', false]]) {
  test(`pre-paint bootstrap restores ${JSON.stringify(saved)} without browser code in SSR`, () => {
    const classes = new Set(['dark', 'unrelated']);
    runInNewContext(SHELL_THEME_INIT_SCRIPT, {
      window: { localStorage: { getItem: (key) => {
        assert.equal(key, SHELL_THEME_KEY);
        return saved;
      } } },
      document: { documentElement: { classList: { toggle: (name, on) => {
        if (on) classes.add(name);
        else classes.delete(name);
      } } } },
    });
    assert.equal(classes.has(SHELL_THEME_CLASS), themed);
    assert.equal(classes.has('dark'), true);
    assert.equal(classes.has('unrelated'), true);
  });
}

test('pre-paint bootstrap tolerates blocked local storage', () => {
  runInNewContext(SHELL_THEME_INIT_SCRIPT, {
    window: { get localStorage() { throw new Error('SecurityError'); } },
    document: { documentElement: { classList: { toggle: () => assert.fail('no saved choice') } } },
  });
});

test('the VitePress bridge applies only while the reader turned it on', () => {
  const css = readFileSync(new URL('../.vitepress/theme/shell-theme.css', import.meta.url), 'utf8');
  for (const [, selector] of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)) {
    if (selector.trim().startsWith('@media')) continue;
    assert.match(selector.trim(), new RegExp(`^:root\\.${SHELL_THEME_CLASS}\\b`), selector);
  }
});

test('the scoped toggle styles never hide VitePress navigation itself', () => {
  const source = readFileSync(new URL('../.vitepress/theme/ShellThemeToggle.vue', import.meta.url), 'utf8');
  const { descriptor } = parse(source);
  const result = compileStyle({ source: descriptor.styles[0].content, id: 'data-v-docs-test', scoped: true });
  assert.deepEqual(result.errors, []);
  assert.match(result.code, /\.VPNavBar \.docs-shell-theme\[data-v-docs-test\]/);
  assert.doesNotMatch(result.code, /\.VPNavBar\s*\{/);
});
