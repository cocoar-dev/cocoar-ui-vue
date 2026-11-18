import { describe, expect, it } from 'vitest';

/**
 * Compact is a set of values. The class `.coar-compact` is one way to apply them and
 * nothing may branch on it, except at this documented boundary. A new use of the class
 * anywhere else in the packages fails here: express it as a value instead.
 */
const BOUNDARY: Record<string, string> = {
  'ui/styles/tokens/compact.css': 'the entry itself: the Compact values for the class (generated)',
  'ui/styles/tokens/derived.css': 'the class is a theme boundary, like .coar-theme-scope',
  'ui/src/components/overlay/useCompactPresentationContext.ts': 'a teleported panel repeats the entry of its origin',
  'ui/src/components/overlay/CoarOverlayOutlet.vue': 'a teleported panel repeats the entry of its origin',
  'ui/src/components/theme-editor/theme-editor-state.ts': 'an editor mounted inside the entry edits that area',
  'ui/src/components/listbox/CoarListbox.vue': '::-webkit-scrollbar replaces the native scrollbar whatever it declares',
  'ui/src/components/scrollbar/vScrollbar-roles.css': 'published precedence of the entry over consumer handle rules',
};

interface Fs {
  readdirSync(path: string, options: { withFileTypes: true }): { name: string; isDirectory(): boolean }[];
  readFileSync(path: string, encoding: 'utf8'): string;
}

async function packagesRoot(): Promise<{ fs: Fs; root: string }> {
  const fsModule = 'node:fs';
  const fs = (await import(/* @vite-ignore */ fsModule)) as Fs;
  const dir = decodeURIComponent(import.meta.url)
    .replace(/^file:\/\//, '')
    .replace(/^\/([A-Za-z]:)/, '$1')
    .replace(/\/[^/]*$/, '');
  return { fs, root: `${dir}/../../..` };
}

function files(fs: Fs, dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'skills', '__screenshots__'].includes(entry.name)) continue;
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) files(fs, path, out);
    else if (/\.(vue|css|ts)$/.test(entry.name) && !/\.(test|spec|stories)\.ts$/.test(entry.name)) out.push(path);
  }
  return out;
}

const withoutComments = (text: string) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, '');

/** The class as a selector or as a class name in script; not `coar-compact-light` and the like. */
const CLASS = /(?:\.|['"`\s])coar-compact(?![\w-])/;

describe('the .coar-compact class', () => {
  it('is used only at the documented compatibility boundary', async () => {
    const { fs, root } = await packagesRoot();
    const found = files(fs, root)
      .filter((path) => CLASS.test(withoutComments(fs.readFileSync(path, 'utf8'))))
      .map((path) => path.slice(root.length + 1))
      .sort();
    expect(found).toEqual(Object.keys(BOUNDARY).sort());
  });
});
