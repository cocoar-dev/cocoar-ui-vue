// The title of a docs page from its H1, for the device tables. Shared by sync-skill.mjs (the
// skill's Markdown table) and .vitepress/theme/devices.data.ts (the site's table). Side-effect free.

/**
 * The H1 as Markdown, without the `<Badge … />` tags: `` `<CoarPageBuilder>` <Badge text="Preview" /> ``
 * → `` `<CoarPageBuilder>` ``. Inline code stays, so `<CoarPageBuilder>` is not read as an HTML tag.
 */
export function headingTitle(h1) {
  return h1.replace(/<Badge\b[^>]*\/>/g, '').trim();
}

const ENTITIES = { '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&amp;': '&' };

/**
 * The H1 as plain text, for Vue interpolation: no badge tags, no backticks, and the HTML
 * entities a heading may contain decoded (`AssetStore&lt;T&gt;` → `AssetStore<T>`).
 */
export function plainHeadingTitle(h1) {
  return headingTitle(h1)
    .replace(/`/g, '')
    .replace(/&(?:lt|gt|quot|#39|amp);/g, (entity) => ENTITIES[entity]);
}
