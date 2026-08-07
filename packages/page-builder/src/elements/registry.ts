/**
 * The element-registry contract: one `PageElementDefinition` packages
 * everything the renderer and the builder need to know about one element
 * type. Built-ins and consumer elements ride the same contract — built-ins
 * are pre-registered, consumer registrations merge additively over them via
 * `PageConfig.elements` (per-instance data; there is deliberately no global
 * `register()` so two builders with different registries can coexist).
 *
 * The definition splits into a renderer half (this object's top level —
 * everything a renderer-only app needs) and an optional `builder` half
 * (palette/canvas/inspector concerns). Contract packages should keep the two
 * in separate modules so renderer bundles never pull builder-only components.
 */
import { markRaw } from 'vue';
import type { Component, InjectionKey } from 'vue';
import type { CoreIconName } from '@cocoar/vue-ui';
import type { ActionValues } from '../context';
import type { ElementNode, ElementProps, PageConfig, PageValueType } from '../schema';
import { warnDev } from '../builder/operations';

/**
 * i18n (key, fallback) pair, translated at render time via
 * `t(key, undefined, fallback)` — consumer labels work without registering
 * translations, and localize when the consumer adds the key.
 */
export interface I18nText {
  key: string;
  fallback: string;
}

/**
 * Value-model participation. Presence of this spec (plus a `name` on the
 * node) makes the element a managed field: it seeds defaults, joins
 * required/matchField gating, and its value is passed to actions.
 */
export interface ElementValueSpec<P extends ElementProps = ElementProps> {
  /**
   * Value types this element can edit — matched against
   * `PageFieldSpec.valueType` when a field contract is configured. Omitted =
   * unconstrained (compatible with every field). Built-ins declare theirs;
   * consumer elements should too, so they show up for the right DTO fields.
   */
  types?: PageValueType[];
  /**
   * Opt into the host-enforced string rules (`minLength`/`maxLength`/
   * `pattern` from `validation`) — they need the localized message pipeline
   * and the cached, crash-safe pattern compiler, so the host runs them. Only
   * meaningful for elements whose value is a string.
   */
  textRules?: boolean;
  /**
   * Whether a plain Enter inside this element may submit the page (fire the
   * page's default button) — only effective when the page root opts in via
   * `enterSubmits`. Single-line inputs declare true; multi-line/multi-value
   * elements (textarea, multi-select, OTP) stay false — as does everything
   * that leaves this undeclared. The function form decides per props bag
   * (text-input: only while `rows <= 1`).
   */
  submitOnEnter?: boolean | ((props: P) => boolean);
  /** Fallback default when the node carries no `defaultValue`. */
  defaultValue?: (props: P) => unknown;
  /**
   * Emptiness test for `validation.required`.
   * Default: `undefined | null | '' | false | []` count as empty.
   */
  isEmpty?: (value: unknown, props: P) => boolean;
  /**
   * Element-owned validation, run after `required`/`matchField`. Returns an
   * error message or null. Messages are the element author's responsibility
   * (including their localization).
   */
  validate?: (
    value: unknown,
    node: ElementNode<string, P>,
    values: ActionValues,
  ) => string | null;
}

/** A builder-lint finding for one node; `error` blocks nothing but renders prominently. */
export interface ElementLintIssue {
  severity: 'error' | 'warning';
  message: I18nText;
}

export interface PageElementQuickPropertyOption {
  value: string;
  label: I18nText;
}

/**
 * One optional Properties-Panel shortcut for Element Code. The path is a
 * mutable element-draft property; changing the control writes a deterministic,
 * locked assignment before the customer's free compute body.
 */
export interface PageElementQuickProperty {
  path: `props.${string}` | `style.${string}` | `validation.${string}`;
  label: I18nText;
  control: 'text' | 'boolean' | 'select';
  /** Explicit authoring contract; never inferred from the current value. */
  valueKind?: 'literal' | 'localized-text';
  options?: readonly PageElementQuickPropertyOption[];
}

const quickLabel = (fallback: string): I18nText => ({
  key: `coar.pageBuilder.quick.${fallback.toLowerCase().replaceAll(' ', '')}`,
  fallback,
});

/** Shared descriptors are conveniences only; custom elements can define any supported path. */
export const QUICK_PROPERTY_PRESETS = {
  label: { path: 'props.label', label: quickLabel('Label'), control: 'text', valueKind: 'localized-text' },
  text: { path: 'props.text', label: quickLabel('Text'), control: 'text', valueKind: 'localized-text' },
  placeholder: { path: 'props.placeholder', label: quickLabel('Placeholder'), control: 'text', valueKind: 'localized-text' },
  disabled: { path: 'props.disabled', label: quickLabel('Disabled'), control: 'boolean' },
  required: { path: 'validation.required', label: quickLabel('Required'), control: 'boolean' },
  width: { path: 'style.width', label: quickLabel('Width'), control: 'text' },
  hidden: { path: 'style.hidden', label: quickLabel('Hidden'), control: 'boolean' },
  gap: { path: 'style.gap', label: quickLabel('Gap'), control: 'text' },
  padding: { path: 'style.padding', label: quickLabel('Padding'), control: 'text' },
  variant: {
    path: 'props.variant', label: quickLabel('Variant'), control: 'select',
    options: ['primary', 'secondary', 'ghost', 'danger'].map((value) => ({ value, label: quickLabel(value) })),
  },
  direction: {
    path: 'style.direction', label: quickLabel('Direction'), control: 'select',
    options: ['column', 'row'].map((value) => ({ value, label: quickLabel(value) })),
  },
  align: {
    path: 'style.align', label: quickLabel('Align'), control: 'select',
    options: ['start', 'center', 'end', 'stretch'].map((value) => ({ value, label: quickLabel(value) })),
  },
} as const satisfies Record<string, PageElementQuickProperty>;

/** Editor-only half: how the element appears in palette, canvas and inspector. */
export interface PageElementBuilderDefinition<P extends ElementProps = ElementProps> {
  label: I18nText;
  icon?: CoreIconName;
  /**
   * Palette/add-menu grouping. Defaults to 'element'. The 'element' group is
   * presented split: definitions WITH a value spec show under "Inputs" (the
   * offering `hideElementPicker` removes), the rest under "Elements".
   */
  group?: 'container' | 'element';
  /** Props bag for a freshly dropped node. The host mints `id`, `name` and `children`. */
  defaults: () => P;
  /**
   * Canvas preview component (receives `{ node }`, mounted inert). Absent →
   * the canvas shows a neutral icon+label chip. Previews never receive the
   * runtime renderer context — they render from the node alone.
   */
  preview?: Component;
  /**
   * Element section of the props panel. Receives `{ node, patch }` where
   * `patch(update)` merges into the props bag with delete-on-empty semantics.
   * Absent → only the host-owned sections (Field/Style) are shown.
   */
  inspector?: Component;
  inspectorTitle?: I18nText;
  /**
   * Keep the element-owned source inspector available in code authoring mode.
   * Use this only for editors whose content is itself an authored resource
   * (for example HTML/CSS), not as a second UI for ordinary computed props.
   */
  inspectorInCodeMode?: boolean;
  /** Suppress the universal Style section (spacer-style minimal elements). */
  hideStyleSection?: boolean;
  /**
   * Editor for the node-level `defaultValue` in the host-owned Field section
   * (receives `{ modelValue, props }`, emits `update:modelValue`). Absent →
   * the host offers a plain text input.
   */
  defaultValueInput?: Component;
  /** Common code-backed controls shown in code authoring mode. */
  quickProperties?: readonly PageElementQuickProperty[];
  /** Authoring diagnostics, merged into the builder's validation panel. */
  lint?: (node: ElementNode<string, P>, config?: PageConfig) => ElementLintIssue[];
}

export interface PageElementDefinition<P extends ElementProps = ElementProps> {
  /** Runtime renderer. Receives `{ node }`; containers get children via the default slot. */
  renderer: Component;
  /**
   * Declares the shared ActionProps contract. The builder adds its universal
   * Action editor and validation; renderers fire through
   * `usePageElement().triggerElementAction()`.
   */
  action?: boolean;
  /** Presence = value-model participation (with `node.name`). */
  value?: ElementValueSpec<P>;
  /** Children + dropzones + container style fields. Defaults to false. */
  container?: boolean;
  /** Inline-natured leaf — host applies the width:fit-content treatment. Defaults to false. */
  inline?: boolean;
  /** Ingest healing for the props bag (untrusted JSON), run by `normalizePageSchema`. */
  normalizeProps?: (raw: unknown) => P;
  /** Editor half — omit in renderer-only bundles. */
  builder?: PageElementBuilderDefinition<P>;
}

/**
 * Keyed by element type (= the wire `type` string). The slot type is
 * intentionally `PageElementDefinition<any>` so definitions created with a
 * concrete `P` assign without erasing their own generic (composition sites
 * keep `keyof P` checking through `definePageElement`).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PageElementRegistry = Record<string, PageElementDefinition<any>>;

/** Consumer element keys: lowercase kebab, colon-free (survives the markdown embed grammar). */
export const ELEMENT_KEY_PATTERN = /^[a-z][a-z0-9-]*$/;

/**
 * Identity helper that preserves `P` inference for the definition's hooks and
 * marks the component fields raw (definitions travel through reactive config
 * objects; proxying a component definition is pure overhead).
 */
export function definePageElement<P extends ElementProps>(
  def: PageElementDefinition<P>,
): PageElementDefinition<P> {
  markRaw(def.renderer);
  if (def.builder?.preview) markRaw(def.builder.preview);
  if (def.builder?.inspector) markRaw(def.builder.inspector);
  if (def.builder?.defaultValueInput) markRaw(def.builder.defaultValueInput);
  if (def.container && def.builder?.preview) {
    warnDev(
      'element definition declares `container: true` AND `builder.preview` — the canvas ' +
        'renders the generic children body for containers, so the preview component is ' +
        'never mounted. Value+container elements work at runtime, but their own chrome ' +
        'is not previewed on the canvas (only in the Preview tab).',
    );
  }
  return def;
}

/**
 * App-wide default registry channel (`app.provide`). `PageConfig.elements`
 * wins over it per instance. `Symbol.for` per the cross-package house
 * convention so duplicated module instances still share the channel.
 */
export const PAGE_ELEMENTS_KEY: InjectionKey<PageElementRegistry> =
  Symbol.for('coar:page-elements') as InjectionKey<PageElementRegistry>;

/**
 * Additive merge: consumer entries extend the base (built-in) set. Shadowing
 * a base key is legal but almost always a mistake (a future built-in landing
 * on a consumer's key), so it warns in DEV. Returns a new object; inputs are
 * not mutated.
 */
export function mergeElementRegistries(
  base: PageElementRegistry,
  overlay?: PageElementRegistry,
): PageElementRegistry {
  if (!overlay) return { ...base };
  for (const key of Object.keys(overlay)) {
    if (key in base) {
      warnDev(
        `element registration "${key}" shadows an existing element of the same name — ` +
          'prefix consumer keys (e.g. "acme-rating") to keep them collision-free.',
      );
    } else if (!ELEMENT_KEY_PATTERN.test(key)) {
      warnDev(
        `element key "${key}" does not match ${ELEMENT_KEY_PATTERN} — ` +
          'keys must be lowercase kebab-case (colon-free) to stay portable.',
      );
    }
  }
  return { ...base, ...overlay };
}
