// The device statements of all component pages, for the table in the mobile guide
// (DeviceMatrix.vue). Grouped and ordered like the skill's index (apps/docs/scripts/sections.mjs);
// the rules of the `devices` line are checked by sync-skill.mjs, not here.
import { createContentLoader } from 'vitepress';
import { SECTIONS } from '../../scripts/sections.mjs';
import { SAME_DEVICES_AS } from '../../scripts/devices.mjs';
import { plainHeadingTitle } from '../../scripts/titles.mjs';

export interface DevicePage {
  url: string;
  title: string;
  devices: { desktop: string; tablet: string; phone: string };
  note: string | null;
}

export interface DeviceSection {
  title: string;
  pages: DevicePage[];
}

declare const data: DeviceSection[];
export { data };

// '/components/map/' → 'components/map/index.md', '/components/button.html' → 'components/button.md'
function relOf(url: string): string {
  const path = decodeURI(url)
    .replace(/^\//, '')
    .replace(/\.html$/, '');
  return path.endsWith('/') || path === '' ? `${path}index.md` : `${path}.md`;
}

function titleOf(src: string | undefined, fallback: string): string {
  return plainHeadingTitle(src?.match(/^# (.+)$/m)?.[1] ?? fallback);
}

export default createContentLoader('components/**/*.md', {
  includeSrc: true,
  transform(raw): DeviceSection[] {
    const byRel = new Map<string, DevicePage>();
    for (const page of raw) {
      if (page.url.includes('/demos/') || !page.frontmatter.devices) continue;
      const rel = relOf(page.url);
      // Same statement as another page: its row would repeat that page's row (see SAME_DEVICES_AS).
      if (SAME_DEVICES_AS.has(rel)) continue;
      byRel.set(rel, {
        url: page.url,
        title: titleOf(page.src, rel),
        devices: page.frontmatter.devices,
        note: page.frontmatter.devicesNote ?? null,
      });
    }
    return (SECTIONS as { title: string; pages: string[] }[])
      .map((section) => ({
        title: section.title,
        pages: section.pages.flatMap((rel) => (byRel.has(rel) ? [byRel.get(rel)!] : [])),
      }))
      .filter((section) => section.pages.length > 0);
  },
});
