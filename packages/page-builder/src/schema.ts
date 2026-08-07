// Type-only import — the runtime dependency points the other way
// (elements/registry.ts imports node types from here), so no cycle exists.
import type { PageElementRegistry } from './elements/registry'

export const CURRENT_PAGE_SCHEMA_VERSION = 4

// ─── Style ────────────────────────────────────────────────────────────────────

export interface NodeStyle {
  // ── Token-controlled visual presentation ──
  surface?: 'default' | 'subtle' | 'raised' | 'accent' | 'success' | 'warning' | 'error'
  foreground?: 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'accent' | 'success' | 'warning' | 'error'
  borderTone?: 'neutral' | 'accent' | 'success' | 'warning' | 'error'
  borderWidth?: '0' | '1px' | '2px'
  radius?: 'none' | 'small' | 'medium' | 'large' | 'full'
  elevation?: 'none' | 'small' | 'medium' | 'large'
  fontFamily?: 'body' | 'heading' | 'mono'
  fontSize?: 'caption' | 'small' | 'base' | 'large' | 'xlarge' | 'display'
  fontWeight?: 'regular' | 'medium' | 'semibold' | 'bold'
  lineHeight?: 'tight' | 'normal' | 'relaxed'
  letterSpacing?: 'tight' | 'normal' | 'wide'
  textAlign?: 'start' | 'center' | 'end'
  // ── Container layout: how this node arranges its children ──
  /** CSS gap between children, e.g. '8px', '1rem'. Applied to inner layout. */
  gap?: string
  /** CSS padding inside this node. */
  padding?: string
  /** justify-content — distribution of children along the main axis. */
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly'
  /** align-items — alignment of children along the cross axis. */
  align?: 'start' | 'center' | 'end' | 'stretch'
  /** Stack direction override. On stack nodes this wins over the legacy props.direction value. */
  direction?: 'column' | 'row'
  /** Whether a row stack wraps. On stack nodes this wins over the legacy props.wrap value. */
  wrap?: boolean

  // ── Self: how this node sits inside its parent ──
  /** align-self — overrides the parent's `align` for just this node. */
  alignSelf?: 'start' | 'center' | 'end' | 'stretch'
  /**
   * Sizing along the parent's main axis:
   * - `fit`   — natural content size (no grow / no shrink)
   * - `fill`  — grow to fill the available space
   * - `fixed` — exact `width`
   */
  size?: 'fit' | 'fill' | 'fixed'
  /** CSS width. Applied when `size` is `fixed` (or when set without a `size`). */
  width?: string
  /** Minimum width of this node's box. */
  minWidth?: string
  /** Maximum width of this node's box. */
  maxWidth?: string
  /** CSS height of this node's box. */
  height?: string
  /**
   * CSS min-height of this node's box, e.g. '100dvh', '400px'. On the `page`
   * root this makes the page fill the viewport so `justify` (vertical) +
   * `align` (horizontal) can center content — e.g. a login card centered on a
   * full-screen page. The host element provides the width; min-height lets the
   * page own its vertical extent without depending on host CSS.
   */
  minHeight?: string
  /** Maximum height of this node's box. */
  maxHeight?: string
  /** Overflow behavior of this node's box. */
  overflow?: 'visible' | 'hidden' | 'clip' | 'auto' | 'scroll'
  /** Responsive presentation switch. Hidden nodes do not render or participate in actions. */
  hidden?: boolean
}

/** Breakpoints use a mobile-first cascade: compact/base → phone → tablet → desktop. */
export type PageBreakpoint = 'compact' | 'phone' | 'tablet' | 'desktop'

/** Per-breakpoint style differences. Compact is represented by the base `style`. */
export type ResponsiveNodeStyles = Partial<Record<Exclude<PageBreakpoint, 'compact'>, Partial<NodeStyle>>>

// ─── Base ─────────────────────────────────────────────────────────────────────

interface PageNodeBase {
  /** Stable UUID assigned by the builder. */
  id: string
  style?: NodeStyle
  /** Host-registered appearance preset id. The document never stores a CSS class. */
  stylePreset?: string
  /** Mobile-first style overrides; unset properties inherit from the preceding breakpoint. */
  responsive?: ResponsiveNodeStyles
}

// ─── Unified element node (schema v2) ─────────────────────────────────────────

/** Element-specific props. Must stay JSON-safe — the bag is persisted verbatim. */
export type ElementProps = Record<string, unknown>

export type PageContextValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'string[]'
  | 'object'
  | 'array'

export interface PageContextItemField {
  path: string
  type: Exclude<PageContextValueType, 'array'>
}

/** One explicitly exposed host-context path. Paths not listed here are unreadable. */
export interface PageContextField {
  path: string
  type: PageContextValueType
  itemFields?: PageContextItemField[]
}

export interface RuntimeBinding {
  source: 'context' | 'state' | 'item' | 'index' | 'field' | 'selection'
  /** Context/page-state/item/field/selection path. Index bindings omit it. */
  path?: string
  fallback?: unknown
}

/**
 * A pure JavaScript expression authored by the tenant. The expression returns
 * one value for exactly one target property; it never mutates the page tree.
 * Evaluation happens in the host-provided sandbox runtime, not in the schema
 * resolver. Until a result exists (startup/error), the persisted static value
 * remains authoritative, with `fallback` as the optional final fallback.
 */
export interface RuntimeExpressionBinding {
  source: 'expression'
  /** False keeps the authored expression but makes the static property authoritative. */
  enabled?: boolean
  expression: string
  fallback?: unknown
}

export interface LocalizedValue<T = string> {
  localized: Record<string, T>
  fallback?: T
}

/**
 * A locale-reactive reference into the page/host translation catalogue.
 * It stays JSON-safe when produced by Element Code; the renderer resolves it
 * after the sandbox result has been applied.
 */
export interface TranslationBinding {
  source: 'translation'
  key: string
  params?: Record<string, unknown>
  fallback?: string
}

/** Page-owned messages, grouped by locale and addressed by stable dot keys. */
export type PageTranslations = Record<string, Record<string, string>>

export interface RuntimeTemplate {
  template: string | LocalizedValue<string> | TranslationBinding
  placeholders: Record<string, RuntimeBinding>
}

export type PropertyBinding = RuntimeBinding | RuntimeTemplate | RuntimeExpressionBinding | TranslationBinding

/** Results supplied by the sandbox runtime, keyed by runtimeExpressionKey(). */
export type RuntimeExpressionValues = Readonly<Record<string, unknown>>

/**
 * The unified node grammar: `type` is an open string (the element-registry
 * key), everything element-specific lives in the `props` bag, and the host
 * vocabulary stays at node level (`id`, `style`, the value-model trio, and
 * `children` for containers). The bag exists so consumer-registered elements
 * can never collide with host fields; built-ins follow the same grammar for
 * uniformity.
 *
 * Every element has one page-wide unique public `name`. Element Code uses it
 * as the stable authoring identity; value elements additionally use the exact
 * same name as their form/value-model key. `defaultValue`/`validation` are only
 * meaningful when the registry definition declares a `value` spec;
 * `children` only when it declares `container`.
 */
export interface ElementNode<
  K extends string = string,
  P extends ElementProps = ElementProps,
> extends PageNodeBase {
  type: K
  props: P
  /**
   * Public Page-Code name; also the form key when the definition has a value
   * spec. Canonical v4 documents always contain it. It remains optional in
   * this ingest type so pre-v4 documents can be passed to the normalizer.
   */
  name?: string
  defaultValue?: unknown
  validation?: FieldValidation
  /** Safe host-provided values mapped onto top-level element props. */
  bindings?: Record<string, PropertyBinding>
  /** Conditional visibility against the live value model. See `VisibleWhen`. */
  visibleWhen?: VisibleWhen
  /**
   * JavaScript configuration for this element. The host evaluates it in its
   * sandbox runtime with a mutable `element` draft and read-only page inputs.
   * Structure, type and name are never part of the returned patch.
   */
  elementCode?: string
  children?: PageNode[]
}

/** Marker bag for elements without element-specific props. */
export type EmptyProps = Record<string, never>

/** Option entry shared by the option-based inputs (radio-group, select, multi-select). */
export interface OptionItem {
  value: string
  label: string
}

// ─── Root ─────────────────────────────────────────────────────────────────────

/**
 * Root-level page container. Behaves like a column; always the schema root.
 * The one node shape outside the element grammar — it is a schema-shape
 * marker, not a placeable element, and carries the wire-format version.
 */
export interface PageRootNode extends PageNodeBase {
  type: 'page'
  /**
   * Wire-format version. `4` makes every element name mandatory and unique;
   * `3` adds responsive overrides, runtime bindings, repeaters and feedback
   * zones. Older documents are migrated on ingest.
   */
  schemaVersion?: number
  /**
   * Enter submits the page: a plain Enter inside an Enter-eligible input
   * (see `ElementValueSpec.submitOnEnter`) fires the page's default button —
   * the first button with `default: true`, else the first `validates: true`
   * button in tree order. Off by default.
   */
  enterSubmits?: boolean
  /**
   * One JavaScript page program evaluated by a host-provided sandbox runtime.
   * The page-builder persists and edits the source, but never evaluates it.
   * Structural fields (`id`, `type`, `name`, `children`) remain owned by the
   * visual builder; the program can only return configuration drafts.
   */
  pageCode?: string
  /**
   * Reactive configuration for the page root itself. Unlike the legacy
   * whole-page `pageCode`, this has the same narrow responsibility as an
   * element's `elementCode`: it may configure only the existing root draft
   * (`style`, `responsive`, and `enterSubmits`).
   */
  rootCode?: string
  /** Customer-authored initial state shared by this page's element scripts. */
  stateCode?: string
  /** Customer-owned messages edited in the Builder's Translations tab. */
  translations?: PageTranslations
  children: PageNode[]
}

export interface PagePreviewFixture {
  id: string
  label: string
  context: Record<string, unknown>
  state?: string
  locale?: string
  /** Viewport selected atomically with the fixture. */
  viewport?: PageBreakpoint | { width: number; height?: number }
}

// ─── Built-in elements ────────────────────────────────────────────────────────
// Aliases over the unified grammar. Containers narrow `children` to required.

/**
 * Generic flex container. Direction is toggleable in the props panel, so users
 * never have to delete + recreate to switch between vertical and horizontal stacks.
 */
export interface StackNode extends ElementNode<'stack', {
  /** Flex direction. Defaults to 'column'. */
  direction?: 'column' | 'row'
  /** Wrap children to the next line. Only meaningful for direction = 'row'. */
  wrap?: boolean
}> { children: PageNode[] }

export interface CardNode extends ElementNode<'card', {
  title?: string
}> { children: PageNode[] }

export interface SectionNode extends ElementNode<'section', {
  title?: string
}> { children: PageNode[] }

export interface RepeatSelection {
  /** ActionValues array field produced by `$selection` checkboxes in the template. */
  name: string
  valuePath: string
  requiredPath?: string
  /** Initial selection for newly observed optional items. */
  defaultSelection?: 'none' | 'all'
  /** @deprecated Use `defaultSelection: 'all'`. */
  defaultSelected?: boolean
}

/** Native template repeater over one allowlisted host-context array. */
export interface RepeatNode extends ElementNode<'repeat', {
  /** Legacy/host-context source. Page Code may instead provide `items`. */
  source?: string
  keyPath?: string
  /** Runtime-only data source produced by Page Code (still JSON-safe data). */
  items?: unknown[]
  itemAlias?: string
  maxItems?: number
  emptyText?: string
  selection?: RepeatSelection
}> { children: PageNode[] }

export type DividerNode = ElementNode<'divider', EmptyProps>

export type SpacerNode = ElementNode<'spacer', {
  /** CSS size, e.g. '24px'. Defaults to flex:1 (fills available space). */
  size?: string
}>

export type HeadingNode = ElementNode<'heading', {
  text: string
  level?: 1 | 2 | 3 | 4 | 5 | 6
}>

export type ParagraphNode = ElementNode<'paragraph', {
  text: string
}>

export type NoteNode = ElementNode<'note', {
  text: string
  /** Visual tone of the note box. Defaults to the design system's 'neutral'. */
  variant?: 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'accent'
}>

/** Authorable semantic placement for renderer/host feedback. */
export type FeedbackNode = ElementNode<'feedback', {
  kind?: 'form-error' | 'error' | 'success' | 'info' | 'loading'
  text?: string
  emptyText?: string
}>

export type TextInputNode = ElementNode<'text-input', {
  label?: string
  placeholder?: string
  /** Controls HTML input type and autocomplete hints. Defaults to 'text'. */
  inputType?: 'text' | 'email' | 'url'
  /** Visible text rows; 2+ renders a multiline textarea. Defaults to 1. */
  rows?: number
  disabled?: boolean
}>

/**
 * Masked single-line input. Its own element (not a text-input variant) so it
 * is directly pickable — in the palette and as a representation for string
 * fields. Legacy `text-input` nodes with `inputType: 'password'` migrate here.
 */
export type PasswordInputNode = ElementNode<'password-input', {
  label?: string
  placeholder?: string
  disabled?: boolean
}>

export type NumberInputNode = ElementNode<'number-input', {
  label?: string
  placeholder?: string
  min?: number
  max?: number
  step?: number
  /** Number of decimal places. Defaults to 0 (integers). */
  decimals?: number
  disabled?: boolean
}>

export type CheckboxNode = ElementNode<'checkbox', {
  label: string
  disabled?: boolean
}>

/** `validation.required` means the switch must be ON (consent-style, like checkbox). */
export type SwitchNode = ElementNode<'switch', {
  label: string
  disabled?: boolean
}>

export type RadioGroupNode = ElementNode<'radio-group', {
  label?: string
  options?: OptionItem[]
  /** Dynamic option list: resolved via `config.optionsSource` at render time; wins over `options`. */
  optionsSourceId?: string
  /** Layout of the radio buttons. Defaults to 'vertical'. */
  orientation?: 'vertical' | 'horizontal'
  disabled?: boolean
}>

export type SelectNode = ElementNode<'select', {
  label?: string
  placeholder?: string
  options?: OptionItem[]
  /** Dynamic option list: resolved via `config.optionsSource` at render time; wins over `options`. */
  optionsSourceId?: string
  disabled?: boolean
}>

/** `validation.required` means at least one option must be selected. */
export type MultiSelectNode = ElementNode<'multi-select', {
  label?: string
  placeholder?: string
  options?: OptionItem[]
  /** Dynamic option list: resolved via `config.optionsSource` at render time; wins over `options`. */
  optionsSourceId?: string
  disabled?: boolean
}>

/** `validation.required` means the code must be COMPLETE (all cells filled). */
export type OtpInputNode = ElementNode<'otp-input', {
  label?: string
  /** Number of code cells. Defaults to 6. */
  length?: number
  /** Accepted character set. Defaults to 'numeric'. */
  otpType?: 'numeric' | 'alphanumeric' | 'text'
  /** Render cells masked (like a password). */
  mask?: boolean
  disabled?: boolean
}>

/**
 * Date value wire format: ISO string `YYYY-MM-DD` (in `defaultValue` and the
 * value model). The renderer converts to/from `Temporal.PlainDate` at the
 * component boundary; an unparsable value renders as empty instead of crashing.
 */
export type DateInputNode = ElementNode<'date-input', {
  label?: string
  placeholder?: string
  disabled?: boolean
}>

/** Date-time wire format: ISO `YYYY-MM-DDTHH:mm[:ss]` (no time zone — plain wall time). */
export type DateTimeInputNode = ElementNode<'datetime-input', {
  label?: string
  placeholder?: string
  disabled?: boolean
}>

/** Shared props contract for every registry element that declares `action: true`. */
export interface ActionProps extends ElementProps {
  /** Action ID matched against the `actions` map passed to the renderer. */
  action?: string
  /** Static, JSON-safe additions merged into this action call only. */
  actionValues?: Record<string, unknown>
  /** Optional single dynamic action value; bind `actionValue` from context, item data, or an expression. */
  actionValueField?: string
  actionValue?: unknown
}

export type ButtonNode = ElementNode<'button', ActionProps & {
  label: string
  /** Static or runtime-resolved interaction state. */
  disabled?: boolean
  /** When true, validates all named fields before calling the action. */
  validates?: boolean
  /**
   * The page's default button: Enter-to-submit (page `enterSubmits`) fires
   * this one. Without it, Enter falls back to the first `validates: true`
   * button in tree order.
   */
  default?: boolean
  icon?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'xs' | 's' | 'm' | 'l'
}>

export type LinkNode = ElementNode<'link', ActionProps & {
  label: string
}>

export type ImageNode = ElementNode<'image', {
  /** Asset ID resolved by `assetResolver` at render time. Never a raw URL. */
  assetId: string
  alt?: string
}>

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Declarative field validation, at node level (host vocabulary — uniform for
 * every valued element). Which rules an element actually enforces is the
 * element's concern: the built-in inputs enforce `required`/`matchField`
 * everywhere and the text rules (`minLength`/`maxLength`/`pattern`) on
 * text-input only.
 */
export interface FieldValidation {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: string
  /** Field must equal the value of another named field. */
  matchField?: string
  /** Overrides the default error message for any rule on this field. */
  message?: string
}

/**
 * Declarative conditional visibility, at node level (host vocabulary — works
 * on every element, containers included). The node and its whole subtree
 * render only while the condition holds against the LIVE value model, and a
 * hidden subtree leaves the value model with it: hidden required fields never
 * veto a validating button, and hidden values never ship in action payloads.
 * Values typed before hiding are kept internally and return when re-shown.
 * A malformed condition fails OPEN (the node stays visible).
 */
export interface VisibleWhen {
  /** Name of the controlling field (a named input on the page). */
  field?: string
  /** Visible while the field's value equals this (JSON-safe values compare by content). */
  equals?: unknown
  /** Visible while the field's value is one of these. */
  in?: unknown[]
  /** Safe source for the extended condition grammar. Legacy conditions omit this. */
  source?: 'field' | 'context' | 'state' | 'item'
  /** Field/context path. State conditions may omit it and compare the current state id. */
  path?: string
  operator?: 'equals' | 'notEquals' | 'in' | 'notIn' | 'exists' | 'isEmpty' | 'isNotEmpty'
  value?: unknown
  /** Bounded boolean composition; free expressions are deliberately unsupported. */
  all?: VisibleWhen[]
  any?: VisibleWhen[]
}

// ─── Union ────────────────────────────────────────────────────────────────────

export type ContainerNode = PageRootNode | StackNode | CardNode | SectionNode | RepeatNode

/** The built-in element set (closed — drives the internal per-type tables). */
export type BuiltinNode =
  | StackNode
  | CardNode
  | SectionNode
  | RepeatNode
  | DividerNode
  | SpacerNode
  | HeadingNode
  | ParagraphNode
  | NoteNode
  | FeedbackNode
  | TextInputNode
  | PasswordInputNode
  | NumberInputNode
  | CheckboxNode
  | SwitchNode
  | RadioGroupNode
  | SelectNode
  | MultiSelectNode
  | OtpInputNode
  | DateInputNode
  | DateTimeInputNode
  | ButtonNode
  | LinkNode
  | ImageNode

/**
 * Any node in a page tree. The union is OPEN: the last member admits
 * consumer-registered elements (whose `type` is their registry key). Code
 * that needs the closed built-in set uses `ElementType`/`BuiltinNode`;
 * dispatch on the open set goes through the element registry, not switches.
 */
export type PageNode = PageRootNode | BuiltinNode | ElementNode

/** Built-in type strings (closed). The wire format admits any string `type`. */
export type ElementType = 'page' | BuiltinNode['type']

// ─── Type guards ──────────────────────────────────────────────────────────────

export function isContainerNode(node: PageNode): node is ContainerNode {
  return (
    node.type === 'page' ||
    node.type === 'stack' ||
    node.type === 'card' ||
    node.type === 'section'
    || node.type === 'repeat'
  )
}

// ─── Field contract ───────────────────────────────────────────────────────────

/**
 * Value type of a contract field / of the values an element can edit. Open
 * union: consumers can introduce their own tokens (e.g. 'geo', 'money') —
 * compatibility is exact token match between field and element.
 */
export type PageValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'string[]'
  | 'date'
  | 'datetime'
  | (string & {})

/**
 * One field of the data contract behind a page — typically a DTO property.
 * The contract constrains AUTHORING only: the persisted schema stays
 * self-contained (binding is just `node.name === field.name`), and documents
 * remain renderable without it.
 */
export interface PageFieldSpec {
  /** The ActionValues key — the DTO property name. */
  name: string
  valueType: PageValueType
  /** Display label, applied to the element on binding (when still default). */
  label?: string
  /**
   * Contract-level requirement: binding sets `validation.required`, and the
   * builder lint warns while the field is missing from the page.
   */
  required?: boolean
  /** Preferred element type for the field-first flow (palette drag). */
  defaultElement?: string
}

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * Shared between `<CoarPageBuilder>` and `<CoarPageRenderer>`. The IDP / consumer
 * passes the SAME config to both — the builder uses it to filter UI affordances
 * (palette, add-child menu), the renderer uses it as the **security boundary**:
 * disallowed nodes are never rendered, even if they appear in hand-written JSON.
 */
export interface PageConfig {
  /**
   * Element types permitted to appear in the tree (built-in types and
   * consumer-registered keys alike). Omit to allow every type. `page` (the
   * root marker) is always implicitly allowed regardless of this list.
   */
  allowedElements?: (ElementType | (string & {}))[]
  /**
   * Consumer-registered elements, merged ADDITIVELY over the built-in set
   * (shadowing a built-in key warns in DEV). The same config reaches builder
   * and renderer, so one registration serves palette, canvas, inspector and
   * runtime. App-wide defaults can be provided under `PAGE_ELEMENTS_KEY`
   * instead; this field wins when both are present.
   */
  elements?: PageElementRegistry
  /**
   * Host-owned CSS presets exposed as safe ids. The builder stores only `id`;
   * renderer and preview resolve the class through this same registration.
   */
  stylePresets?: PageStylePreset[]
  /**
   * The data contract behind the page (DTO fields). When present, the
   * builder's Field section offers these instead of a free-text name —
   * filtered to the fields the selected element can edit (see
   * `ElementValueSpec.types`) — and the lint flags unknown names,
   * incompatible bindings, and missing required fields.
   */
  fields?: PageFieldSpec[]
  /** Typed allowlist of host values the document may bind or use in conditions. */
  contextFields?: PageContextField[]
  /** State ids the host may expose and authors may select in conditions/previews. */
  availableStates?: { id: string; label: string }[]
  /** Locales offered by the builder for LocalizedValue props. */
  locales?: { id: string; label: string }[]
  defaultLocale?: string
  /** Nodes the host requires for security or flow completeness. */
  requiredNodes?: {
    id: string
    type: string
    lockVisibility?: boolean
    lockStyle?: boolean
    /** Optional generic placement invariant for high-priority content. */
    parentId?: string
    maxIndex?: number
  }[]
  documentLimits?: {
    maxNodes?: number
    maxDepth?: number
  }
  /** Named, non-persisted sample contexts for deterministic builder previews. */
  previewFixtures?: PagePreviewFixture[]
  /**
   * Allow binding names outside `fields`. Defaults to false — with a
   * contract, authors pick from it.
   */
  allowCustomFields?: boolean
  /**
   * Hide the free INPUTS offering (the palette's Inputs group and the input
   * entries of the outline's add-child menu) — i.e. exactly the value
   * elements the field contract replaces; authors then bind fields by
   * dragging contract `fields`. Containers and content/action elements
   * (headings, notes, buttons, links, images) stay available — every form
   * needs layout and chrome. The split is registry-derived (value-spec
   * presence), so consumer elements sort themselves. Pure authoring UI —
   * `allowedElements` remains the boundary for what may be USED at all.
   */
  hideElementPicker?: boolean
  /**
   * Action IDs that any registry element with `action: true` may reference. When provided, the builder's
   * Action-ID input becomes a dropdown of these choices instead of free text.
   * Omit to allow any string (development / single-tenant scenarios).
   *
   * Note: the renderer's `actions` map is the actual security boundary — it only
   * invokes handlers that exist there. `availableActions` is a UX affordance so
   * tenants pick from labeled choices instead of memorising IDs.
   */
  availableActions?: { id: string; label: string }[]
  /**
   * Resolves an `assetId` to a URL. Used by the builder for image thumbnails
   * (in the canvas preview, props panel, and Preview-tab renderer) and by the
   * runtime renderer for the final `<img src>` — same contract as the
   * renderer's `:asset-resolver` prop.
   *
   * The IDP / consumer typically returns `${cdnBase}/${id}` or similar. When
   * omitted, the builder shows placeholder thumbnails and the renderer falls
   * back to its `:asset-resolver` prop only.
   */
  assetResolver?: (id: string) => string
  /**
   * Resolves an options-source id to the option list of a choice input
   * (select / multi-select / radio-group) — the async sibling of
   * `assetResolver` in the callback family, for API-backed lists (countries,
   * users, …). A node opts in via its `optionsSourceId` prop; static
   * `options` remain the default and the fallback when this callback is
   * absent. Called once per element instance — memoize consumer-side when
   * several elements share a source.
   */
  optionsSource?: (sourceId: string) => Promise<OptionItem[]>
  /**
   * Opens the consumer's own asset picker UI (modal, drawer — whatever you
   * want) and resolves to the chosen `assetId`, or `null` if the user
   * cancelled. The library does not ship a picker — the IDP owns the entire
   * UX (browse, upload, search, delete, categorisation, …).
   *
   * When omitted, the image element falls back to a free-text Asset ID input.
   */
  pickAsset?: (currentId?: string) => Promise<string | null>
}

export interface PageStylePreset {
  id: string
  label: string
  className: string
  /** Element registry types that may use the preset. Includes the `page` root marker. */
  allowedOn: string[]
}

/**
 * True when this element type is permitted by the config (or no config given).
 * The root `page` type is always allowed — it's a schema-shape marker, not a
 * user-placeable element.
 */
export function isElementAllowed(type: string, config?: PageConfig): boolean {
  if (type === 'page') return true
  if (!config?.allowedElements) return true
  return (config.allowedElements as string[]).includes(type)
}
