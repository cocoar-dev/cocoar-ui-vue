import { COMPACT_THEME } from '../../theme/compact-theme';
import { ENTERPRISE_THEME } from '../../theme/enterprise-theme';
import { APPEARANCE_INPUT_TOKENS, ROLE_DERIVATION_TOKEN, THEME_COLOR_INPUT_TOKENS } from '../../theme/role-theme';
import { ROLE_DERIVED_TOKENS } from '../../theme/role-derived-tokens';
import { ROLE_THEME_INPUT_DEFAULTS, ROLE_THEME_ROLES } from '../../theme/role-theme-contract';

export { ROLE_DERIVED_TOKENS } from '../../theme/role-derived-tokens';

/** Optional inputs of a surrounding scope; an empty one is carried as `initial`. */
export const COMPACT_APPEARANCE_INPUT_TOKENS = APPEARANCE_INPUT_TOKENS;

/**
 * Explicit transport contract of a role theme, not a snapshot of every computed CSS
 * property: the inputs a theme can set, the mode marker and what is derived from
 * them. A teleported surface receives their effective values at its origin.
 */
export const COMPACT_CONTEXT_TOKENS = [...new Set([
  ...COMPACT_APPEARANCE_INPUT_TOKENS,
  ...THEME_COLOR_INPUT_TOKENS,
  '--coar-compact-color-scheme',
  '--coar-text-on-threshold',
  ...Object.keys(COMPACT_THEME.tokens),
  ...Object.keys(COMPACT_THEME.mobileTokens),
  ...Object.keys(ENTERPRISE_THEME.tokens),
  ...Object.keys(ENTERPRISE_THEME.mobileTokens),
  ...Object.keys(ENTERPRISE_THEME.roles ?? {}),
  ...Object.keys(ROLE_THEME_INPUT_DEFAULTS),
  ...ROLE_THEME_ROLES,
  ...ROLE_DERIVED_TOKENS,
])].filter((token) => token !== ROLE_DERIVATION_TOKEN);
