// The one list of Conventional Commit types and scopes of this repository.
// Read by scripts/check-conventional.mjs (CI), the release notes (scripts/release/changelog.toml maps
// the same types) and the agent skills. Change it here, then in changelog.toml if a type is added.

export const TYPES = {
  feat: 'a new feature users see',
  fix: 'a bug fix users notice',
  perf: 'faster, same behaviour',
  refactor: 'code change without a change of behaviour',
  docs: 'documentation, demos, the Agent Skill',
  test: 'tests only',
  ci: 'workflows and release scripts',
  build: 'build configuration, packaging',
  chore: 'maintenance (dependencies: chore(deps))',
  revert: 'reverts an earlier commit',
  style: 'formatting only',
};

// Package folders under packages/ plus the areas that are not a package. A scope is optional.
export const SCOPES = [
  'ui',
  'calendar',
  'data-grid',
  'document-viewer',
  'file-explorer',
  'fragment-parser',
  'icons',
  'localization',
  'map',
  'markdown',
  'markdown-core',
  'markdown-editor',
  'markdown-form',
  'markdown-mermaid',
  'mermaid',
  'page-builder',
  'script-editor',
  'docs',
  'skill',
  'playground',
  'release',
  'deps',
];

const pattern = new RegExp(`^(${Object.keys(TYPES).join('|')})(\\(([a-z0-9-]+(?:,[a-z0-9-]+)*)\\))?(!)?: \\S.*$`);

/** Returns null when the title is valid, otherwise the reason. */
export function checkTitle(title) {
  const text = (title || '').trim();
  const m = pattern.exec(text);
  if (!m) {
    return `"${text}" is not a Conventional Commit title: <type>(<scope>)?(!)?: <subject>, type one of ${Object.keys(TYPES).join(', ')}`;
  }
  const unknown = (m[3] || '').split(',').filter((scope) => scope && !SCOPES.includes(scope));
  if (unknown.length) return `unknown scope ${unknown.join(', ')} in "${text}": use one of ${SCOPES.join(', ')} (or none)`;
  if (text.length > 120) return `"${text}" is ${text.length} characters long: keep a title under 120`;
  return null;
}
