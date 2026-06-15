import { parse as parseYaml } from 'yaml';

/**
 * One displayable key/value row of a parsed YAML frontmatter block.
 * `value` is already flattened to a human-readable string (nested objects /
 * arrays are compacted) so renderers can drop it straight into a cell.
 */
export interface FrontmatterEntry {
  readonly key: string;
  readonly value: string;
}

export interface ParsedFrontmatter {
  /** The original YAML text, verbatim — the source of truth for round-trip. */
  readonly raw: string;
  /** The parsed YAML as an object, or `null` when it isn't a key/value map
   *  (parse error, or a top-level scalar/array). Renderers fall back to `raw`. */
  readonly data: Readonly<Record<string, unknown>> | null;
  /** Flattened, display-ready rows. Empty when `data` is `null`. */
  readonly entries: readonly FrontmatterEntry[];
}

/**
 * Parse a raw YAML frontmatter string into display-ready rows.
 *
 * Shared by the viewer (parse-time, stored on the node) and the editor's
 * frontmatter NodeView (render-time, from the PM node's `value` attr) so both
 * surfaces show the exact same metadata. Never throws — malformed YAML yields
 * `data: null` + empty `entries`, and the caller shows the raw text instead.
 */
export function parseFrontmatter(raw: string): ParsedFrontmatter {
  let data: Record<string, unknown> | null = null;
  try {
    const parsed = parseYaml(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      data = parsed as Record<string, unknown>;
    }
  } catch {
    data = null;
  }

  const entries: FrontmatterEntry[] = data
    ? Object.entries(data).map(([key, value]) => ({ key, value: formatValue(value) }))
    : [];

  return { raw, data, entries };
}

/** Flatten a YAML value to a compact, single-string display form. */
function formatValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(formatValue).join(', ');
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${formatValue(v)}`)
      .join(', ');
  }
  return String(value);
}
