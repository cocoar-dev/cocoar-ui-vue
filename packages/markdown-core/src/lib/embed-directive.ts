/**
 * Parser + serializer for generic custom-embed directives.
 *
 * Wire format on disk: a standalone block on its own line —
 *
 *   :::key{attr=value attr2="quoted value" flag}
 *
 * `key` selects a registered embed component (the registry lives in the Vue
 * layer, `@cocoar/vue-markdown`); the attributes become the `props` handed to
 * that component verbatim. The parser here is intentionally **embed-agnostic**:
 * it turns *any* `:::key{…}` into a `{ key, props }` pair and never consults a
 * registry. Lookup happens only at render / edit time. Unknown keys still parse
 * and round-trip losslessly.
 *
 * Why a hand-rolled parser instead of `remark-directive`: it matches the house
 * style (color spans are folded the same way), gives us byte-stable round-trip
 * of the exact single-line form, and avoids remark-directive's container
 * semantics where `:::name` with no closing fence swallows following content.
 *
 * Attribute values are plain strings by source form. Any richer typing /
 * coercion is the registered component's concern. Untrusted author text in an
 * attribute value is safe here because the value is never interpolated into
 * HTML — the Vue renderer binds it as a prop, not via `innerHTML`.
 */

export interface EmbedDirective {
  /** The embed key (the bit right after `:::`). */
  readonly key: string;
  /** Attribute map. Valueless attributes (`flag`) map to an empty string. */
  readonly props: Readonly<Record<string, string>>;
}

/**
 * Whole-line match for `:::key` with an optional `{…}` attribute block.
 *
 * - `key` must start with a letter, then letters / digits / `_` / `-`.
 * - The attribute block is greedy up to the final `}` on the line; trailing
 *   non-whitespace after `}` fails the match (so `:::map{id=x} extra` is left
 *   as an ordinary paragraph, not a half-recognised embed).
 */
const DIRECTIVE_RE = /^:::([A-Za-z][A-Za-z0-9_-]*)[ \t]*(?:\{([\s\S]*)\})?[ \t]*$/;

/** Characters safe to emit unquoted in an attribute value (covers GUIDs, hex
 *  colors like `#6366f1`, numbers, percentages, dates, simple URLs). */
const BAREWORD_RE = /^[A-Za-z0-9_./:%+#-]+$/;

/**
 * Parse a single line into an {@link EmbedDirective}, or `null` when the line
 * is not an embed directive. The caller is expected to pass a trimmed line.
 */
export function parseEmbedDirective(line: string): EmbedDirective | null {
  const match = DIRECTIVE_RE.exec(line);
  if (!match) return null;

  const key = match[1]!;
  const body = match[2];
  const props = body === undefined ? {} : parseAttributes(body);
  return { key, props };
}

/**
 * Serialize an {@link EmbedDirective} back to its canonical single-line form.
 * Round-trips `parseEmbedDirective` for the canonical form; non-canonical input
 * (extra spaces, redundant quoting) is normalized but stays semantically equal.
 */
export function serializeEmbedDirective(directive: EmbedDirective): string {
  return `:::${directive.key}${serializeAttributes(directive.props)}`;
}

function isWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}

/**
 * Tokenize an attribute body (`a=1 b="two words" flag`) into a string map.
 * Tolerant by design: a stray `=` or unmatched quote never throws — it just
 * yields what it can so a malformed embed degrades instead of crashing parse.
 */
function parseAttributes(body: string): Record<string, string> {
  const props: Record<string, string> = {};
  let i = 0;
  const n = body.length;

  while (i < n) {
    while (i < n && isWhitespace(body[i]!)) i++;
    if (i >= n) break;

    // Read the attribute name (up to whitespace or `=`).
    const keyStart = i;
    while (i < n && !isWhitespace(body[i]!) && body[i] !== '=') i++;
    const key = body.slice(keyStart, i);
    if (key.length === 0) {
      i++; // stray char (e.g. a leading `=`) — skip to make progress.
      continue;
    }

    if (i < n && body[i] === '=') {
      i++; // consume '='
      let value = '';
      const quote = body[i];
      if (quote === '"' || quote === "'") {
        i++; // consume opening quote
        let buf = '';
        while (i < n && body[i] !== quote) {
          if (body[i] === '\\' && i + 1 < n) {
            buf += body[i + 1];
            i += 2;
          } else {
            buf += body[i];
            i++;
          }
        }
        i++; // consume closing quote (no-op past end if unmatched)
        value = buf;
      } else {
        const valueStart = i;
        while (i < n && !isWhitespace(body[i]!)) i++;
        value = body.slice(valueStart, i);
      }
      props[key] = value;
    } else {
      props[key] = '';
    }
  }

  return props;
}

function serializeAttributes(props: Readonly<Record<string, string>>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(props)) {
    if (value === '') {
      parts.push(key);
    } else if (BAREWORD_RE.test(value)) {
      parts.push(`${key}=${value}`);
    } else {
      parts.push(`${key}=${quoteValue(value)}`);
    }
  }
  return parts.length > 0 ? `{${parts.join(' ')}}` : '';
}

function quoteValue(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Coerce an unknown `attrs.props` value into a clean `Record<string, string>`,
 * dropping any non-string entries. Used by the serializer, which receives the
 * loosely-typed `MarkdownNode.attrs`.
 */
export function toEmbedProps(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'string') out[key] = raw;
  }
  return out;
}
