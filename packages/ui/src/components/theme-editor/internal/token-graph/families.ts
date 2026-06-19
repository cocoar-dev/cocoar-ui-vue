/**
 * Token *families* — collapse a scale into one logical "property" node.
 *
 * Many tokens differ only along one axis: a size step (`component-xs-height`,
 * `…-s-height`, `…-m-height`, `…-l-height`) or a palette step
 * (`color-red-50` … `color-red-900`). For a graph view that's just noise — what
 * you want to see is "CoarTextInput uses a *height* token (which varies by
 * size)". A family is the token name with the varying segment replaced by `*`,
 * e.g. `--coar-component-*-height`; the members are the concrete tokens.
 *
 * The grammar is deliberately conservative: only the well-known size and
 * palette-step vocabularies are treated as variant axes, so semantic roles
 * (`…-error-bold`, `…-neutral-primary`) are NOT merged — those are distinct
 * properties, not variants.
 */

/** Size scale used by component dims, radius, spacing, shadows. */
const SIZE_STEPS = new Set(['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl']);
/** Palette step: a 2–3 digit number (50, 100, … 900). */
const PALETTE_STEP = /^\d{2,3}$/;

export interface Family {
  /** Family key with the variant segment as `*`, e.g. `--coar-component-*-height`. */
  key: string;
  /** The concrete variant segment of this token, e.g. `xs` or `600`. */
  variant: string;
}

/**
 * Return the family this token belongs to, or null if it has no variant axis
 * (and is therefore its own standalone node).
 */
export function familyOf(name: string): Family | null {
  const segs = name.replace(/^--coar-/, '').split('-');
  for (let i = 0; i < segs.length; i++) {
    if (SIZE_STEPS.has(segs[i]) || PALETTE_STEP.test(segs[i])) {
      const key = '--coar-' + segs.map((s, j) => (j === i ? '*' : s)).join('-');
      return { key, variant: segs[i] };
    }
  }
  return null;
}

/**
 * Group the given names by family, keeping only families with ≥2 members in
 * the set (a lone member isn't worth collapsing). Returns familyKey → members.
 */
export function familyMembers(names: Iterable<string>): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const name of names) {
    const fam = familyOf(name);
    if (!fam) continue;
    const list = groups.get(fam.key);
    if (list) list.push(name);
    else groups.set(fam.key, [name]);
  }
  for (const [key, members] of groups) {
    if (members.length < 2) groups.delete(key);
  }
  return groups;
}
