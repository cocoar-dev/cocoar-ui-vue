// ─── Style ────────────────────────────────────────────────────────────────────

export interface NodeStyle {
  /** CSS gap value, e.g. '8px', '1rem'. Applied to container's inner layout. */
  gap?: string
  /** CSS padding value. */
  padding?: string
  /** CSS width value or flex share (number string like '2'). */
  width?: string
  /** Align children (flex align-items) or self inside a row. */
  align?: 'start' | 'center' | 'end' | 'stretch'
}

// ─── Base ─────────────────────────────────────────────────────────────────────

interface PageNodeBase {
  /** Stable UUID assigned by the builder. */
  id: string
  style?: NodeStyle
}

// ─── Layout / Containers ──────────────────────────────────────────────────────

/** Root-level page container. Behaves like a column; always the schema root. */
export interface PageRootNode extends PageNodeBase {
  type: 'page'
  children: PageNode[]
}

/**
 * Generic flex container. Direction is toggleable in the props panel, so users
 * never have to delete + recreate to switch between vertical and horizontal stacks.
 */
export interface StackNode extends PageNodeBase {
  type: 'stack'
  /** Flex direction. Defaults to 'column'. */
  direction?: 'column' | 'row'
  /** Wrap children to the next line. Only meaningful for direction = 'row'. */
  wrap?: boolean
  children: PageNode[]
}

export interface CardNode extends PageNodeBase {
  type: 'card'
  title?: string
  children: PageNode[]
}

export interface SectionNode extends PageNodeBase {
  type: 'section'
  title?: string
  children: PageNode[]
}

export interface DividerNode extends PageNodeBase {
  type: 'divider'
}

export interface SpacerNode extends PageNodeBase {
  type: 'spacer'
  /** CSS size, e.g. '24px'. Defaults to flex:1 (fills available space). */
  size?: string
}

// ─── Typography ───────────────────────────────────────────────────────────────

export interface HeadingNode extends PageNodeBase {
  type: 'heading'
  text: string
  level?: 1 | 2 | 3 | 4 | 5 | 6
}

export interface ParagraphNode extends PageNodeBase {
  type: 'paragraph'
  text: string
}

// ─── Inputs ───────────────────────────────────────────────────────────────────

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

export interface TextInputNode extends PageNodeBase {
  type: 'text-input'
  /** When set, value is managed by the renderer and passed to actions. */
  name?: string
  label?: string
  placeholder?: string
  /** Controls HTML input type and autocomplete hints. Defaults to 'text'. */
  inputType?: 'text' | 'email' | 'password' | 'url'
  defaultValue?: string
  validation?: FieldValidation
  disabled?: boolean
}

export interface CheckboxNode extends PageNodeBase {
  type: 'checkbox'
  /** When set, value is managed by the renderer and passed to actions. */
  name?: string
  label: string
  defaultValue?: boolean
  validation?: Pick<FieldValidation, 'required'>
  disabled?: boolean
}

export interface SelectNode extends PageNodeBase {
  type: 'select'
  /** When set, value is managed by the renderer and passed to actions. */
  name?: string
  label?: string
  placeholder?: string
  options?: { value: string; label: string }[]
  defaultValue?: string
  validation?: Pick<FieldValidation, 'required'>
  disabled?: boolean
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export interface ButtonNode extends PageNodeBase {
  type: 'button'
  label: string
  /** Action ID matched against the `actions` map passed to the renderer. */
  action?: string
  /** When true, validates all named fields before calling the action. */
  validates?: boolean
  icon?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'xs' | 's' | 'm' | 'l'
}

export interface LinkNode extends PageNodeBase {
  type: 'link'
  label: string
  /** Action ID matched against the `actions` map passed to the renderer. */
  action?: string
}

// ─── Media ────────────────────────────────────────────────────────────────────

export interface ImageNode extends PageNodeBase {
  type: 'image'
  /** Asset ID resolved by `assetResolver` at render time. Never a raw URL. */
  assetId: string
  alt?: string
}

// ─── Union ────────────────────────────────────────────────────────────────────

export type ContainerNode = PageRootNode | StackNode | CardNode | SectionNode

export type PageNode =
  | PageRootNode
  | StackNode
  | CardNode
  | SectionNode
  | DividerNode
  | SpacerNode
  | HeadingNode
  | ParagraphNode
  | TextInputNode
  | CheckboxNode
  | SelectNode
  | ButtonNode
  | LinkNode
  | ImageNode

export type ElementType = PageNode['type']

// ─── Type guards ──────────────────────────────────────────────────────────────

export function isContainerNode(node: PageNode): node is ContainerNode {
  return (
    node.type === 'page' ||
    node.type === 'stack' ||
    node.type === 'card' ||
    node.type === 'section'
  )
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
   * Element types permitted to appear in the tree. Omit to allow every type.
   * `page` (the root marker) is always implicitly allowed regardless of this list.
   */
  allowedElements?: ElementType[]
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
export function isElementAllowed(type: ElementType, config?: PageConfig): boolean {
  if (type === 'page') return true
  if (!config?.allowedElements) return true
  return config.allowedElements.includes(type)
}
