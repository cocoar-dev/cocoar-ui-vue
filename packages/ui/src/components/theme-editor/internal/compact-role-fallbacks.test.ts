import { describe, expect, it } from 'vitest';

/**
 * The compact profile (`.coar-compact`, Preview) only sets role tokens; outside it they
 * are undefined. Every component that reads one must therefore name the value it had
 * before as the fallback — `var(--coar-ui-font-size, var(--coar-body-small-base-size))`
 * — or it would change the default and mobile presentation. This guards that contract
 * for the display, navigation and container components.
 */
const sources = import.meta.glob(
  '../../{avatar,badge,breadcrumb,card,code-block,data-list,divider,dual-listbox,link,listbox,menu,navbar,note,notice,pagination,panel-layout,popconfirm,popover,progress-bar,scrollbar,segmented-control,sidebar,spinner,table,tabs,tag,theme-editor,toast,tooltip,transitions,tree,wizard}/**/*.vue',
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;
// The scrollbar's role stylesheet is checked in scrollbar/vScrollbar-roles.test.ts
// (Vitest blanks CSS imports).

/** Roles defined only by the compact profile. */
const PROFILE_ROLES = [
  '--coar-ui-font-size',
  '--coar-ui-line-height',
  '--coar-ui-font-weight',
  '--coar-label-font-weight',
  '--coar-field-font-size',
  '--coar-caption-font-size',
  '--coar-interactive-row-height',
  '--coar-panel-padding',
  '--coar-content-gap',
  '--coar-control-radius',
  '--coar-panel-radius',
  '--coar-badge-font-weight',
  '--coar-card-outlined-border-color',
  '--coar-pane-divider-active-color',
  '--coar-popconfirm-title-font-size',
  '--coar-toast-title-font-size',
  '--coar-table-cell-padding',
  '--coar-tree-checkbox-radius',
  '--coar-data-list-surface',
  '--coar-scrollbar-handle-bg',
  '--coar-scrollbar-handle-bg-hover',
  '--coar-scrollbar-handle-bg-active',
];

/** Each `var(<role> …)` call in `text`, with its arguments, parentheses balanced. */
function roleCalls(text: string): { role: string; args: string }[] {
  const calls: { role: string; args: string }[] = [];
  const re = /var\(\s*(--coar-[a-z0-9-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (!PROFILE_ROLES.includes(m[1])) continue;
    let depth = 1;
    let i = re.lastIndex;
    for (; i < text.length && depth > 0; i++) {
      if (text[i] === '(') depth++;
      else if (text[i] === ')') depth--;
    }
    calls.push({ role: m[1], args: text.slice(re.lastIndex, i - 1) });
  }
  return calls;
}

describe('compact profile roles in display and navigation components', () => {
  const files = Object.entries(sources);

  it('finds the component sources', () => {
    expect(files.length).toBeGreaterThan(60);
  });

  it('reads the roles somewhere (the guard is not vacuous)', () => {
    expect(files.some(([, text]) => roleCalls(text).length > 0)).toBe(true);
  });

  it.each(files)('%s keeps a fallback for every profile role', (_file, text) => {
    for (const { role, args } of roleCalls(text)) {
      expect(args.trim(), `${role} without fallback`).toMatch(/^,\s*\S/);
    }
  });

  it('never declares a profile role in a component (the profile owns the values)', () => {
    for (const [file, text] of files) {
      for (const role of PROFILE_ROLES) {
        expect(text.includes(`${role}:`), `${file} declares ${role}`).toBe(false);
      }
    }
  });
});
