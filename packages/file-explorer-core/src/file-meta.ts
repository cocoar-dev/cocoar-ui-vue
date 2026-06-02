/**
 * File-type recognition for `<CoarFileExplorer>`.
 *
 *   - `defaultFileMetaFromName(name)` — extension heuristic. Recognises
 *     markdown + PDF + common image formats + ~40 Monaco-supported source
 *     languages + plaintext fallback. Mirrors the POC's `fileMetaFromName`
 *     so behaviour stays identical after the AssetStore migration.
 *
 *   - `resolveFileMeta(asset, config?)` — 3-stage fallback the composable
 *     uses to pick an editor for each `Asset<T>`:
 *       1. `asset.editor`               (explicit override on the asset)
 *       2. `config.getFileMeta(asset)`  (consumer-supplied resolver)
 *       3. `defaultFileMetaFromName(asset.name)`
 */

import type { CoarScriptEditorLanguage } from '@cocoar/vue-script-editor';

import type { Asset, AssetStoreConfig, FileMeta } from './asset-store';

/**
 * Map a filename to its `{ editor, language }`. Returns `null` for
 * extensions that are recognised as binary-only (.exe, .zip, .mp4, …).
 *
 * The caller is expected to skip unrecognised files with a warning —
 * matching the POC's behaviour.
 */
export function defaultFileMetaFromName(name: string): FileMeta | null {
  const lower = name.toLowerCase();
  const ext = lower.split('.').pop() ?? '';

  // Non-script editors first — they win even when the file is technically
  // text (e.g. .md / .svg) because the wrapping editor is more useful.
  if (ext === 'md' || ext === 'markdown') return { editor: 'markdown' };
  if (ext === 'pdf') return { editor: 'pdf' };
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'avif'].includes(ext)) {
    return { editor: 'image' };
  }

  const script = (language: CoarScriptEditorLanguage): FileMeta => ({ editor: 'script', language });

  // TS / JS / JSON
  if (ext === 'ts' || ext === 'tsx') return script('typescript');
  if (ext === 'js' || ext === 'jsx' || ext === 'mjs' || ext === 'cjs') return script('javascript');
  if (ext === 'json' || ext === 'jsonc') return script('json');

  // Markup + config + shell
  if (ext === 'yml' || ext === 'yaml') return script('yaml');
  if (ext === 'css' || ext === 'scss' || ext === 'less') return script('css');
  if (ext === 'html' || ext === 'htm') return script('html');
  if (ext === 'xml') return script('xml');
  if (ext === 'sql') return script('sql');
  if (ext === 'sh' || ext === 'bash' || ext === 'zsh' || ext === 'fish') return script('shell');
  if (ext === 'ini' || ext === 'toml') return script('ini');
  if (lower === 'dockerfile' || lower.endsWith('.dockerfile')) return script('dockerfile');

  // Source languages — common ones first
  if (ext === 'cs') return script('csharp');
  if (ext === 'cpp' || ext === 'cxx' || ext === 'cc' || ext === 'hpp' || ext === 'hxx' || ext === 'hh') return script('cpp');
  if (ext === 'c' || ext === 'h') return script('c');
  if (ext === 'java') return script('java');
  if (ext === 'py' || ext === 'pyw') return script('python');
  if (ext === 'go') return script('go');
  if (ext === 'rs') return script('rust');
  if (ext === 'rb') return script('ruby');
  if (ext === 'php' || ext === 'phtml') return script('php');
  if (ext === 'swift') return script('swift');
  if (ext === 'kt' || ext === 'kts') return script('kotlin');
  if (ext === 'scala' || ext === 'sc') return script('scala');
  if (ext === 'lua') return script('lua');
  if (ext === 'pl' || ext === 'pm') return script('perl');
  if (ext === 'dart') return script('dart');
  if (ext === 'fs' || ext === 'fsx' || ext === 'fsi') return script('fsharp');
  if (ext === 'vb') return script('vb');
  if (ext === 'r') return script('r');
  if (ext === 'ps1' || ext === 'psm1') return script('powershell');
  if (ext === 'm' || ext === 'mm') return script('objective-c');
  if (ext === 'sol') return script('solidity');
  if (ext === 'proto') return script('protobuf');
  if (ext === 'graphql' || ext === 'gql') return script('graphql');

  // Templating
  if (ext === 'cshtml' || ext === 'razor') return script('razor');
  if (ext === 'pug' || ext === 'jade') return script('pug');
  if (ext === 'hbs' || ext === 'handlebars') return script('handlebars');
  if (ext === 'twig') return script('twig');

  // Plaintext fallback — text-ish extensions + extension-less files.
  if (
    [
      'txt', 'log', 'env', 'conf', 'cfg',
      'gitignore', 'editorconfig', 'npmrc', 'nvmrc',
      'csv', 'tsv',
    ].includes(ext) ||
    lower.indexOf('.') === -1
  ) {
    return script('plaintext');
  }

  return null;
}

/**
 * 3-stage fallback: `asset.editor` wins → then `config.getFileMeta(asset)`
 * → then `defaultFileMetaFromName(asset.name)`. Returns `null` if all three
 * decline (consumer override returned null + name is unrecognised).
 *
 * `language` is normalized to `'plaintext'` whenever the resolved editor is
 * `'script'` but no language was supplied. Saves every consumer the
 * `?? 'plaintext'` dance when binding to `<CoarScriptEditor :language>`;
 * matches Monaco's own fallback for unrecognized files.
 */
export function resolveFileMeta<T>(
  asset: Asset<T>,
  config?: Pick<AssetStoreConfig<T>, 'getFileMeta'>,
): FileMeta | null {
  const resolved = resolveRaw(asset, config);
  if (!resolved) return null;
  if (resolved.editor === 'script' && !resolved.language) {
    return { ...resolved, language: 'plaintext' };
  }
  return resolved;
}

function resolveRaw<T>(
  asset: Asset<T>,
  config?: Pick<AssetStoreConfig<T>, 'getFileMeta'>,
): FileMeta | null {
  if (asset.editor) {
    return { editor: asset.editor, language: asset.language };
  }
  const override = config?.getFileMeta?.(asset);
  if (override) return override;
  return defaultFileMetaFromName(asset.name);
}
