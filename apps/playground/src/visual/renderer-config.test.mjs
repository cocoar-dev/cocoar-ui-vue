import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { loadConfigFromFile } from 'vite';

const file = fileURLToPath(new URL('../../vite.visual.config.ts', import.meta.url));
const loaded = await loadConfigFromFile({ command: 'serve', mode: 'test' }, file);

test('renderer packages and their transitive imports resolve to source without dist output', () => {
  assert.ok(loaded);
  const aliases = loaded.config.resolve.alias;
  for (const name of [
    'page-builder',
    'script-editor',
    'markdown-editor',
    'markdown',
    'markdown-core',
    'markdown-mermaid',
    'mermaid',
  ]) {
    const id = `@cocoar/vue-${name}`;
    const alias = aliases.find((entry) => entry.find instanceof RegExp && entry.find.test(id));
    assert.ok(alias, `missing source alias for ${id}`);
    assert.equal(
      alias.replacement,
      fileURLToPath(new URL(`../../../../packages/${name}/src/index.ts`, import.meta.url)),
    );
    assert.equal(
      alias.find.test(`${id}/styles`),
      false,
      'an entry alias must not swallow package subpaths',
    );
  }
});

test('the builder runtime uses the real source worker entry, not the package import-map dist default', () => {
  const alias = loaded.config.resolve.alias.find(
    (entry) => entry.find instanceof RegExp && entry.find.test('#page-runtime-worker'),
  );
  assert.ok(alias, 'the internal worker import also needs source resolution in a fresh container');
  assert.equal(
    alias.replacement,
    fileURLToPath(
      new URL('../../../../packages/page-builder/src/runtimeWorkerEntry.ts', import.meta.url),
    ),
  );
});
