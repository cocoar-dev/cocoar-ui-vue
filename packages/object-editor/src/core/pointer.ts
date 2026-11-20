import { isJsonObject, type JsonObject, type JsonValue } from './schema';

/** Splits a JSON Pointer (RFC 6901), such as `/dimensions/width`, into its tokens. */
export function parsePointer(pointer: string): string[] {
  if (pointer === '') return [];
  if (!pointer.startsWith('/')) throw new Error(`Not a JSON Pointer: ${pointer}`);
  return pointer
    .slice(1)
    .split('/')
    .map((token) => token.replace(/~1/g, '/').replace(/~0/g, '~'));
}

export function formatPointer(tokens: readonly string[]): string {
  return tokens.map((token) => `/${token.replace(/~/g, '~0').replace(/\//g, '~1')}`).join('');
}

/** True when `prefix` is `pointer` or one of its ancestors. */
export function isPointerPrefix(prefix: string, pointer: string): boolean {
  return prefix === '' || pointer === prefix || pointer.startsWith(`${prefix}/`);
}

export function getAt(value: JsonValue | undefined, tokens: readonly string[]): JsonValue | undefined {
  let current = value;
  for (const token of tokens) {
    if (Array.isArray(current)) current = current[Number(token)];
    else if (isJsonObject(current)) current = Object.hasOwn(current, token) ? current[token] : undefined;
    else return undefined;
  }
  return current;
}

/**
 * Returns a copy of `root` with the value at `tokens` replaced; `undefined`
 * removes it. Missing objects on the way are created. `root` is never changed.
 */
export function setAt(
  root: JsonValue | undefined,
  tokens: readonly string[],
  next: JsonValue | undefined,
): JsonValue | undefined {
  if (tokens.length === 0) return next;
  const [token, ...rest] = tokens;
  if (Array.isArray(root)) {
    const index = Number(token);
    const copy = [...root];
    const child = setAt(copy[index], rest, next);
    if (child === undefined) copy.splice(index, 1);
    else copy[index] = child;
    return copy;
  }
  const object: JsonObject = isJsonObject(root) ? { ...root } : {};
  const child = setAt(object[token], rest, next);
  if (child === undefined) delete object[token];
  else object[token] = child;
  return object;
}
