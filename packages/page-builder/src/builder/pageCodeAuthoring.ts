import type { CoarScriptEditorExtraLib } from '@cocoar/vue-script-editor'
import type { ElementNode, PageConfig, PageNode, PageRootNode } from '../schema'
import { createPageCodeDrafts } from '../pageCode'
import { runtimeTypeLibrary } from './expressionAuthoring'

function jsType(value: unknown): string {
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (Array.isArray(value)) return 'unknown[]'
  if (value && typeof value === 'object') {
    const candidate = value as Record<string, unknown>
    if (candidate.source === 'translation' || candidate.localized) return 'PageLocalizedText'
    return 'Record<string, unknown>'
  }
  return 'unknown'
}

const DRAFT_TYPES = `
interface PageTranslationBinding {
  readonly source: 'translation';
  readonly key: string;
  readonly params?: Readonly<Record<string, unknown>>;
  readonly fallback?: string;
}
type PageLocalizedText = string | PageTranslationBinding;
interface PageI18n {
  text(key: PageTranslationKey, params?: Record<string, unknown>, fallback?: string): PageTranslationBinding;
}
declare const i18n: PageI18n;
interface PageElementProps {
  label?: PageLocalizedText; text?: PageLocalizedText; title?: PageLocalizedText; placeholder?: PageLocalizedText;
  disabled?: boolean; action?: string; validates?: boolean; default?: boolean;
  variant?: string; size?: string; icon?: string; rows?: number; level?: number;
  inputType?: string; options?: Array<{ value: string; label: string }>;
  items?: unknown[]; source?: string; keyPath?: string; emptyText?: string;
  [property: string]: unknown;
}
interface PageNodeStyle {
  width?: string; minWidth?: string; maxWidth?: string; height?: string; minHeight?: string;
  gap?: string; padding?: string; hidden?: boolean; direction?: 'column' | 'row'; wrap?: boolean;
  align?: 'start' | 'center' | 'end' | 'stretch'; justify?: string; alignSelf?: string;
  surface?: string; foreground?: string; radius?: string; elevation?: string;
  fontSize?: string; fontWeight?: string; textAlign?: 'start' | 'center' | 'end';
  [property: string]: unknown;
}
interface PageValidation {
  required?: boolean; minLength?: number; maxLength?: number; pattern?: string;
  matchField?: string; message?: string;
}
interface PageElementDraft<P = PageElementProps> {
  readonly id: string; readonly type: string; readonly name: string;
  props: P;
  style: PageNodeStyle;
  responsive: Record<string, Partial<PageNodeStyle>>;
  validation: PageValidation | null;
  visibleWhen: Record<string, unknown> | null;
  bindings: Record<string, unknown>;
  defaultValue?: unknown;
  enterSubmits?: boolean;
}
`

function translationKeyDeclaration(schema: PageNode): string {
  const root = schema.type === 'page' ? schema as PageRootNode : undefined
  const keys = new Set<string>()
  for (const messages of Object.values(root?.translations ?? {})) {
    for (const key of Object.keys(messages)) keys.add(key)
  }
  const type = keys.size > 0
    ? [...keys].sort().map((key) => JSON.stringify(key)).join(' | ')
    : 'string'
  return `type PageTranslationKey = ${type};`
}

/** Legacy whole-page code IntelliSense, retained for v4 documents. */
export function pageCodeTypeLibrary(
  schema: PageNode,
  config?: PageConfig,
): CoarScriptEditorExtraLib[] {
  const drafts = createPageCodeDrafts(schema)
  const elementLines = Object.entries(drafts.elements).map(([alias, draft]) => {
    const currentProps = Object.entries(draft.props)
      .map(([key, value]) => `    ${JSON.stringify(key)}?: ${jsType(value)};`)
      .join('\n')
    return `  readonly ${JSON.stringify(alias)}: PageElementDraft<PageElementProps & {\n${currentProps}\n  }>;`
  }).join('\n')

  return [
    ...runtimeTypeLibrary(config),
    {
      filePath: 'file:///page-builder/page-code.d.ts',
      content: `${translationKeyDeclaration(schema)}
${DRAFT_TYPES}
interface PageElements {
${elementLines || '  readonly [name: string]: PageElementDraft;'}
}
interface PageCodeScope<S extends Record<string, unknown>> {
  readonly elements: PageElements;
  readonly fields: Readonly<PageFields>;
  readonly form: Readonly<PageForm>;
  state: S;
  readonly context: Readonly<PageContext>;
  readonly resources: Readonly<PageResources>;
  readonly viewport: Readonly<PageViewport>;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly [capability: string]: unknown;
}
interface PageCodeDefinition<S extends Record<string, unknown>> {
  state: S;
  compute?: (scope: PageCodeScope<S>) => void | Promise<void>;
  actions?: Record<string, (scope: PageCodeScope<S>) => void | Promise<void>>;
}
declare function definePage<S extends Record<string, unknown>>(
  definition: PageCodeDefinition<S>,
): PageCodeDefinition<S>;
`,
    },
  ]
}

function pascalIdentifier(value: string): string {
  const words = value.split(/[^A-Za-z0-9_$]+/).filter(Boolean)
  const joined = words.map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`).join('')
  const safe = (joined || 'Custom').replace(/^[^A-Za-z_$]/, (match) => `_${match}`)
  return safe
}

export function elementAuthoringTypeName(node: ElementNode): string {
  return `Page${pascalIdentifier(node.type)}Element`
}

function elementDraftType(schema: PageNode, node: ElementNode): string {
  const drafts = createPageCodeDrafts(schema)
  const entry = Object.entries(drafts.nodeIds).find(([, nodeId]) => nodeId === node.id)
  const draft = entry ? drafts.elements[entry[0]] : undefined
  const currentProps = Object.entries(draft?.props ?? {})
    .map(([key, value]) => `  ${JSON.stringify(key)}?: ${jsType(value)};`)
    .join('\n')
  const typeName = elementAuthoringTypeName(node)
  const propsName = `${typeName}Props`
  return `interface ${propsName} extends PageElementProps {\n${currentProps}\n}\ninterface ${typeName} extends PageElementDraft<${propsName}> {\n  readonly type: ${JSON.stringify(node.type)};\n  readonly name: ${JSON.stringify(node.name ?? '')};\n}`
}

const ELEMENT_AUTHORING_TYPES = `
${DRAFT_TYPES}
interface PageCapabilities {}
type PageComputeContext<S extends Record<string, unknown>> = PageCapabilities & {
  readonly state: Readonly<S>;
  readonly fields: Readonly<PageFields>;
  readonly form: Readonly<PageForm>;
  readonly context: Readonly<PageContext>;
  readonly resources: Readonly<PageResources>;
  readonly viewport: Readonly<PageViewport>;
  readonly viewState?: string;
  readonly locale?: string;
};
type PageActionContext<S extends Record<string, unknown>> = PageCapabilities & {
  state: S;
  readonly fields: Readonly<PageFields>;
  readonly form: Readonly<PageForm>;
  readonly context: Readonly<PageContext>;
  readonly resources: Readonly<PageResources>;
  readonly viewport: Readonly<PageViewport>;
  readonly viewState?: string;
  readonly locale?: string;
};
interface PageAction {
  readonly payload: Readonly<Record<string, unknown>>;
}
interface ElementDefinition<S extends Record<string, unknown>, E extends PageElementDraft> {
  compute?: (element: E, page: PageComputeContext<S>) => void;
  actions?: Record<string, (element: E, page: PageActionContext<S>, action: PageAction) => void | Promise<void>>;
}
type DefineElement<S extends Record<string, unknown>, E extends PageElementDraft> = (definition: ElementDefinition<S, E>) => ElementDefinition<S, E>;
`

export function pageStateTypeLibrary(config?: PageConfig): CoarScriptEditorExtraLib[] {
  return [
    ...runtimeTypeLibrary(config),
    {
      filePath: 'file:///page-builder/page-state.d.ts',
      content: 'declare function definePageState<S extends Record<string, unknown>>(state: S): S;',
    },
  ]
}

export function elementCodeTypeLibrary(
  schema: PageNode,
  node: ElementNode,
  config?: PageConfig,
): CoarScriptEditorExtraLib[] {
  return [
    ...runtimeTypeLibrary(config),
    {
      filePath: `file:///page-builder/element-code-${node.id}.d.ts`,
      content: `${translationKeyDeclaration(schema)}\n${ELEMENT_AUTHORING_TYPES}\n${elementDraftType(schema, node)}`,
    },
  ]
}

const PAGE_ROOT_AUTHORING_TYPES = `
${DRAFT_TYPES}
interface PageRootDraft {
  readonly id: string;
  readonly type: 'page';
  readonly name: 'page';
  style: PageNodeStyle;
  responsive: Record<string, Partial<PageNodeStyle>>;
  enterSubmits: boolean;
}
interface PageCapabilities {}
type PageRootRuntime<S extends Record<string, unknown>> = PageCapabilities & {
  readonly state: Readonly<S>;
  readonly fields: Readonly<PageFields>;
  readonly form: Readonly<PageForm>;
  readonly context: Readonly<PageContext>;
  readonly resources: Readonly<PageResources>;
  readonly viewport: Readonly<PageViewport>;
  readonly viewState?: string;
  readonly locale?: string;
};
interface PageRootDefinition<S extends Record<string, unknown>> {
  compute?: (page: PageRootDraft, runtime: PageRootRuntime<S>) => void;
}
type DefinePageRoot<S extends Record<string, unknown>> =
  (definition: PageRootDefinition<S>) => PageRootDefinition<S>;
`

export function pageRootCodeTypeLibrary(
  schema: PageNode,
  config?: PageConfig,
): CoarScriptEditorExtraLib[] {
  return [
    ...runtimeTypeLibrary(config),
    {
      filePath: 'file:///page-builder/page-root-code.d.ts',
      content: `${translationKeyDeclaration(schema)}\n${PAGE_ROOT_AUTHORING_TYPES}`,
    },
  ]
}

export function elementCodePreamble(stateCode: string, node: ElementNode): string {
  const typeName = elementAuthoringTypeName(node)
  return `
const definePageState = /** @type {<S extends Record<string, unknown>>(state: S) => S} */ ((state) => state);
const i18n = /** @type {PageI18n} */ ({ text: (key, params, fallback) => ({ source: 'translation', key, params, fallback }) });
const __pageState = (${stateCode}
);
const defineElement = /** @type {DefineElement<typeof __pageState, ${typeName}>} */ ((definition) => definition);
`
}

export function pageRootCodePreamble(stateCode: string): string {
  return `
const definePageState = /** @type {<S extends Record<string, unknown>>(state: S) => S} */ ((state) => state);
const __pageState = (${stateCode}
);
const definePageRoot = /** @type {DefinePageRoot<typeof __pageState>} */ ((definition) => definition);
`
}
