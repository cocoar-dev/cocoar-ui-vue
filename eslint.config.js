import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  eslintConfigPrettier,
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        sourceType: 'module',
      },
    },
    rules: {
      'no-undef': 'off', // TypeScript handles this
      'vue/no-v-html': 'off', // Needed for icon SVG rendering from trusted registries
      // `aria-*` attrs in HTML get fall-through-attr treatment from Vue's
      // runtime — they are not coerced kebab→camel like normal props. To
      // bind them to a camelCase prop on a child component (and have
      // vue-tsc see the prop binding) we need the camelCase form in the
      // template. The hyphenation style rule fights with that.
      'vue/attribute-hyphenation': 'off',
    },
  },
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.turbo/**'],
  },
  // ───────────────────────────────────────────────────────────────────────
  // Test files frequently declare multiple `defineComponent({ ... })`
  // wrappers in one file (mount harness, slot-content stubs, parent-child
  // pairings) — the standard Vue test pattern. `vue/one-component-per-file`
  // exists for production SFCs and isn't a meaningful signal in tests.
  // ───────────────────────────────────────────────────────────────────────
  {
    files: ['**/*.test.{ts,js}', '**/*.spec.{ts,js}', '**/__tests__/**/*.{ts,js,vue}'],
    rules: {
      'vue/one-component-per-file': 'off',
      // Tests often pass `props: ['name1', 'name2']` (array form) to inline
      // harness components — explicit prop type definitions add bookkeeping
      // for no production-relevant safety here.
      'vue/require-prop-types': 'off',
    },
  },
  // ───────────────────────────────────────────────────────────────────────
  // @cocoar/vue-calendar: enforce one-way import boundary.
  //
  // Files under `packages/calendar/src/core/` are framework-agnostic pure
  // TypeScript. They MUST NOT import from `../components/` or
  // `../composables/` (which depend on Vue). This makes the core
  // mechanically extractable to a non-Vue package later if React/Svelte
  // bindings ship — see design doc v0.2 §0.3 / §3.1.
  // ───────────────────────────────────────────────────────────────────────
  {
    files: [
      'packages/calendar/src/core/**/*.{ts,js}',
      'packages/calendar-v2/src/core/**/*.{ts,js}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/components/**', '**/composables/**', 'vue', '@vue/*'],
              message:
                'packages/{calendar,calendar-v2}/src/core/ must stay framework-agnostic — no Vue, no components/, no composables/ imports allowed.',
            },
          ],
        },
      ],
    },
  },
];
