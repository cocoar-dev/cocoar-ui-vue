/**
 * `buildAssetProperties(asset, ctx)` — derive the framework-known properties
 * of an `Asset<T>` for a details / info panel. This covers ONLY what the
 * file-explorer framework can know from the canonical `Asset` shape plus the
 * resolved `FileMeta`: name, kind, editor, language, extension, path.
 *
 * Domain-specific facts (size, modified date, author, …) live in the generic
 * `payload<T>` and are the consumer's concern — append your own rows to the
 * result, or build the panel entirely yourself from `selectedAsset`.
 *
 * `useFileExplorer().describeAsset(asset)` is the wired-up entry point: it
 * supplies `meta` (via the 3-stage fallback) and `path` (via `pathOf`) for you,
 * so most consumers never call `buildAssetProperties` directly.
 */

import type { Asset, FileMeta } from './asset-store';

/** One row in an asset info / details panel. */
export interface AssetProperty {
  /**
   * Stable identifier for the row (`'name'`, `'type'`, `'language'`,
   * `'extension'`, `'path'`). Lets consumers key a `v-for`, filter out rows
   * they don't want, or splice their own rows in at a known position.
   */
  key: string;
  /** Human-readable label, e.g. `'Type'`. */
  label: string;
  /** Human-readable value, e.g. `'Markdown'`. */
  value: string;
}

/** Inputs `buildAssetProperties` needs beyond the asset itself. */
export interface DescribeAssetContext {
  /**
   * Resolved editor/language for the asset, or `null` for folders and
   * unrecognised files. `useFileExplorer().describeAsset` passes
   * `fileMeta(asset)` for files and `null` for folders.
   */
  meta: FileMeta | null;
  /**
   * Name path from the tree root to the asset, inclusive — i.e. the result of
   * `pathOf(asset.id)`. A single-element path (a root-level asset) omits the
   * `'path'` row, since it would just repeat the name.
   */
  path: readonly string[];
}

/** Display labels for each `FileEditor`. */
const EDITOR_LABELS: Record<FileMeta['editor'], string> = {
  script: 'Script',
  markdown: 'Markdown',
  pdf: 'PDF',
  image: 'Image',
};

/**
 * Prettier labels for the most common script languages. Anything not listed
 * falls back to the raw language token, so the row is always meaningful.
 */
const LANGUAGE_LABELS: Record<string, string> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  json: 'JSON',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  less: 'Less',
  yaml: 'YAML',
  xml: 'XML',
  sql: 'SQL',
  shell: 'Shell',
  python: 'Python',
  csharp: 'C#',
  cpp: 'C++',
  c: 'C',
  java: 'Java',
  go: 'Go',
  rust: 'Rust',
  ruby: 'Ruby',
  php: 'PHP',
  ini: 'INI',
  dockerfile: 'Dockerfile',
  plaintext: 'Plain text',
};

/**
 * Extension of a filename, INCLUDING the leading dot (`'.vue'`), or `''` when
 * there is none. Dotfiles (`.gitignore`) and extension-less names return `''`
 * — a leading dot marks a name, not an extension.
 */
function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot) : '';
}

/**
 * Build the default, framework-known property rows for an asset. Folders get
 * Name + Type (+ Path); files additionally get Language (script editor only),
 * Extension, and Path. Returns a fresh array each call.
 */
export function buildAssetProperties<T>(
  asset: Asset<T>,
  ctx: DescribeAssetContext,
): AssetProperty[] {
  const rows: AssetProperty[] = [{ key: 'name', label: 'Name', value: asset.name }];

  if (asset.kind === 'folder') {
    rows.push({ key: 'type', label: 'Type', value: 'Folder' });
  } else {
    const editor = ctx.meta?.editor;
    rows.push({
      key: 'type',
      label: 'Type',
      value: editor ? EDITOR_LABELS[editor] : 'File',
    });
    if (editor === 'script' && ctx.meta?.language) {
      const lang = ctx.meta.language;
      rows.push({ key: 'language', label: 'Language', value: LANGUAGE_LABELS[lang] ?? lang });
    }
    const ext = extensionOf(asset.name);
    if (ext) rows.push({ key: 'extension', label: 'Extension', value: ext });
  }

  if (ctx.path.length > 1) {
    rows.push({ key: 'path', label: 'Path', value: ctx.path.join(' / ') });
  }

  return rows;
}
