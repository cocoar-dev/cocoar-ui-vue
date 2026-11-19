import { COMPACT_THEME } from './compact-theme';
import { ENTERPRISE_THEME } from './enterprise-theme';
import { ROLE_DERIVED_TOKENS } from './role-derived-tokens';
import { ROLE_INPUT_DEFAULTS } from './role-input-defaults';

/** One contract, including unset slots, for every first-party preset and export. */
export const ROLE_THEME_ROLES = [...new Set([
  ...ROLE_DERIVED_TOKENS, ...Object.keys(ENTERPRISE_THEME.roles ?? {}),
])];

const roles = new Set(ROLE_THEME_ROLES);
export const ROLE_THEME_INPUT_DEFAULTS = Object.fromEntries(
  [...new Set([COMPACT_THEME, ENTERPRISE_THEME].flatMap(theme => [
    ...Object.keys(theme.tokens), ...Object.keys(theme.mobileTokens),
  ]))].filter(name => !roles.has(name))
    .map(name => [name, ROLE_INPUT_DEFAULTS[name] ?? 'initial']),
);

/** Only these slots can be written by an outer preset's legacy mobile rules. */
export const ROLE_THEME_MOBILE_INPUTS = [...new Set([COMPACT_THEME, ENTERPRISE_THEME]
  .flatMap(theme => Object.keys(theme.mobileTokens)))].filter(name => !roles.has(name));
