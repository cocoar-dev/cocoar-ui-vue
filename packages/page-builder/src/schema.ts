// Type-only import — the runtime dependency points the other way
// (elements/registry.ts imports node types from here), so no cycle exists.
import type { PageElementRegistry } from './elements/registry'

// ─── Style ────────────────────────────────────────────────────────────────────

export interface NodeStyle {
  // ── Container layout: how this node arranges its children ──
  /** CSS gap between children, e.g. '8px', '1rem'. Applied to inner layout. */
  gap?: string
  /** CSS padding inside this node. */
  padding?: string
  /** justify-content — distribution of children along the main axis. */
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly'
  /** align-items — alignment of children along the cross axis. */
  align?: 'start' | 'center' | 'end' | 'stretch'

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
  /**
   * CSS min-height of this node's box, e.g. '100vh', '400px'. On the `page`
   * root this makes the page fill the viewport so `justify` (vertical) +
   * `align` (horizontal) can center content — e.g. a login card centered on a
   * full-screen page. The host element provides the width; min-height lets the
   * page own its vertical extent without depending on host CSS.
   */
  minHeight?: string
}

// ─── Base ─────────────────────────────────────────────────────────────────────

interface PageNodeBase {
  /** Stable UUID assigned by the builder. */
  id: string
  style?: NodeStyle
}

// ─── Unified element node (schema v2) ─────────────────────────────────────────

/** Element-specific props. Must stay JSON-safe — the bag is persisted verbatim. */
export type ElementProps = Record<string, unknown>

/**
 * The unified node grammar: `type` is an open string (the element-registry
 * key), everything element-specific lives in the `props` bag, and the host
 * vocabulary stays at node level (`id`, `style`, the value-model trio, and
 * `children` for containers). The bag exists so consumer-registered elements
 * can never collide with host fields; built-ins follow the same grammar for
 * uniformity.
 *
 * `name`/`defaultValue`/`validation` are only meaningful when the element's
 * registry definition declares a `value` spec; `children` only when it
 * declares `container`.
 */
export interface ElementNode<
  K extends string = string,
  P extends ElementProps = ElementProps,
> extends PageNodeBase {
  type: K
  props: P
  /** When set (and the definition has a value spec), the renderer manages this node's value. */
  name?: string
  defaultValue?: unknown
  validation?: FieldValidation
  /** Conditional visibility against the live value model. See `VisibleWhen`. */
  visibleWhen?: VisibleWhen
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
   * Wire-format version. `2` = unified props-bag grammar (current). `1` /
   * absent = the pre-GA flat grammar, migrated transparently on ingest by
   * `normalizePageSchema` (and on the fly by the renderer).
   */
  schemaVersion?: number
  /**
   * Enter submits the page: a plain Enter inside an Enter-eligible input
   * (see `ElementValueSpec.submitOnEnter`) fires the page's default button —
   * the first button with `default: true`, else the first `validates: true`
   * button in tree order. Off by default.
   */
  enterSubmits?: boolean
  children: PageNode[]
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

export type ButtonNode = ElementNode<'button', {
  label: string
  /** Action ID matched against the `actions` map passed to the renderer. */
  action?: string
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

export type LinkNode = ElementNode<'link', {
  label: string
  /** Action ID matched against the `actions` map passed to the renderer. */
  action?: string
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
  field: string
  /** Visible while the field's value equals this (JSON-safe values compare by content). */
  equals?: unknown
  /** Visible while the field's value is one of these. */
  in?: unknown[]
}

// ─── Union ────────────────────────────────────────────────────────────────────

export type ContainerNode = PageRootNode | StackNode | CardNode | SectionNode

/** The built-in element set (closed — drives the internal per-type tables). */
export type BuiltinNode =
  | StackNode
  | CardNode
  | SectionNode
  | DividerNode
  | SpacerNode
  | HeadingNode
  | ParagraphNode
  | NoteNode
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
   * The data contract behind the page (DTO fields). When present, the
   * builder's Field section offers these instead of a free-text name —
   * filtered to the fields the selected element can edit (see
   * `ElementValueSpec.types`) — and the lint flags unknown names,
   * incompatible bindings, and missing required fields.
   */
  fields?: PageFieldSpec[]
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
   * Action IDs that buttons and links may reference. When provided, the builder's
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
