import type {
  ElementNode,
  LocalizedValue,
  PageConfig,
  PageContextValueType,
  PageNode,
  PropertyBinding,
  RuntimeBinding,
  RuntimeExpressionBinding,
  RuntimeExpressionValues,
  RuntimeTemplate,
  PageTranslations,
} from './schema'
import { isTranslationBinding, resolveTranslation } from './translations'

const SAFE_SEGMENT = /^[A-Za-z_][A-Za-z0-9_-]*$/
const FORBIDDEN = new Set(['__proto__', 'prototype', 'constructor'])

export function safeReadPath(value: unknown, path: string): unknown {
  if (!path) return value
  let current = value
  for (const segment of path.split('.')) {
    if (!SAFE_SEGMENT.test(segment) || FORBIDDEN.has(segment)) return undefined
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

export function matchesContextType(value: unknown, type: PageContextValueType): boolean {
  if (value === undefined || value === null) return true
  if (type === 'array') return Array.isArray(value)
  if (type === 'string[]') return Array.isArray(value) && value.every((item) => typeof item === 'string')
  if (type === 'object') return typeof value === 'object' && !Array.isArray(value)
  return typeof value === type
}

export function readAllowedContext(
  context: Record<string, unknown> | undefined,
  config: PageConfig | undefined,
  path: string,
): unknown {
  const contract = config?.contextFields?.find((field) => field.path === path)
  if (!contract) return undefined
  const value = safeReadPath(context, path)
  return matchesContextType(value, contract.type) ? value : undefined
}

function isLocalizedValue(value: unknown): value is LocalizedValue<unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && 'localized' in value && typeof (value as { localized?: unknown }).localized === 'object'
}

export function resolveLocalizedValue(
  value: unknown,
  locale: string | undefined,
  defaultLocale: string | undefined,
): unknown {
  if (!isLocalizedValue(value)) return value
  const translations = value.localized
  if (locale && Object.prototype.hasOwnProperty.call(translations, locale)) return translations[locale]
  if (defaultLocale && Object.prototype.hasOwnProperty.call(translations, defaultLocale)) return translations[defaultLocale]
  if (value.fallback !== undefined) return value.fallback
  return Object.values(translations)[0]
}

function isTemplate(binding: PropertyBinding): binding is RuntimeTemplate {
  return 'template' in binding && 'placeholders' in binding
}

export function isExpressionBinding(binding: PropertyBinding): binding is RuntimeExpressionBinding {
  return 'source' in binding && binding.source === 'expression'
}

/** Missing means enabled for backwards compatibility with existing documents. */
export function isExpressionBindingEnabled(binding: RuntimeExpressionBinding): boolean {
  return binding.enabled !== false
}

/** Stable transport key shared by authoring, host runtime and renderer. */
export function runtimeExpressionKey(nodeId: string, target: string): string {
  return JSON.stringify([nodeId, target])
}

export interface RuntimeResolutionContext {
  config?: PageConfig
  context?: Record<string, unknown>
  state?: string
  locale?: string
  item?: unknown
  allowedItemPaths?: ReadonlySet<string>
  expressionValues?: RuntimeExpressionValues
  translations?: PageTranslations
  hostTranslation?: (locale: string, key: string) => string | undefined
}

export function resolveRuntimeBinding(binding: RuntimeBinding, runtime: RuntimeResolutionContext): unknown {
  let value: unknown
  if (binding.source === 'state') value = runtime.state
  else if (binding.source === 'context' && binding.path) {
    value = readAllowedContext(runtime.context, runtime.config, binding.path)
  } else if (
    binding.source === 'item'
    && binding.path
    && runtime.allowedItemPaths?.has(binding.path)
  ) {
    value = safeReadPath(runtime.item, binding.path)
  }
  return value === undefined || value === null ? binding.fallback : value
}

export function resolvePropertyBinding(binding: PropertyBinding, runtime: RuntimeResolutionContext): unknown {
  if (isExpressionBinding(binding)) return binding.fallback
  if (isTranslationBinding(binding)) {
    return resolveTranslation(
      binding,
      runtime.translations,
      runtime.locale,
      runtime.config?.defaultLocale,
      runtime.hostTranslation,
    )
  }
  if (!isTemplate(binding)) return resolveRuntimeBinding(binding, runtime)
  const rawTemplate = isTranslationBinding(binding.template)
    ? resolveTranslation(
        binding.template,
        runtime.translations,
        runtime.locale,
        runtime.config?.defaultLocale,
        runtime.hostTranslation,
      )
    : resolveLocalizedValue(binding.template, runtime.locale, runtime.config?.defaultLocale)
  const template = typeof rawTemplate === 'string' ? rawTemplate : ''
  return template.replace(/\{([A-Za-z_][A-Za-z0-9_-]*)\}/g, (match, name: string) => {
    const placeholder = binding.placeholders[name]
    if (!placeholder) return match
    const value = resolveRuntimeBinding(placeholder, runtime)
    return value == null ? '' : String(value)
  })
}

export function resolveNodeRuntime(node: PageNode, runtime: RuntimeResolutionContext): PageNode {
  if (node.type === 'page') return node
  const element = node as ElementNode
  const props: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(element.props ?? {})) {
    if (FORBIDDEN.has(key)) continue
    props[key] = isTranslationBinding(value)
      ? resolveTranslation(
          value,
          runtime.translations,
          runtime.locale,
          runtime.config?.defaultLocale,
          runtime.hostTranslation,
        )
      : resolveLocalizedValue(value, runtime.locale, runtime.config?.defaultLocale)
  }
  for (const [key, binding] of Object.entries(element.bindings ?? {})) {
    if (FORBIDDEN.has(key) || key.startsWith('style.')) continue
    if (isExpressionBinding(binding)) {
      if (!isExpressionBindingEnabled(binding)) continue
      const resultKey = runtimeExpressionKey(element.id, key)
      if (runtime.expressionValues && Object.hasOwn(runtime.expressionValues, resultKey)) {
        props[key] = runtime.expressionValues[resultKey]
      } else if (binding.fallback !== undefined) {
        props[key] = binding.fallback
      }
      continue
    }
    props[key] = resolvePropertyBinding(binding, runtime)
  }
  return { ...element, props } as PageNode
}

const STYLE_TARGETS = new Set([
  'surface', 'foreground', 'borderTone', 'borderWidth', 'radius', 'elevation',
  'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
  'textAlign', 'gap', 'padding', 'justify', 'align', 'direction', 'wrap',
  'alignSelf', 'size', 'width', 'minWidth', 'maxWidth', 'height', 'minHeight',
  'hidden',
])

/** Applies only allowlisted `style.*` expression results over responsive/static style. */
export function resolveExpressionStyle(
  node: PageNode,
  staticStyle: PageNode['style'],
  expressionValues?: RuntimeExpressionValues,
): PageNode['style'] {
  if (node.type === 'page' || !expressionValues) return staticStyle
  let resolved = staticStyle
  for (const [target, binding] of Object.entries((node as ElementNode).bindings ?? {})) {
    if (!target.startsWith('style.') || !isExpressionBinding(binding) || !isExpressionBindingEnabled(binding)) continue
    const property = target.slice('style.'.length)
    if (!STYLE_TARGETS.has(property) || FORBIDDEN.has(property)) continue
    const resultKey = runtimeExpressionKey(node.id, target)
    if (!Object.hasOwn(expressionValues, resultKey)) continue
    resolved = { ...(resolved ?? {}), [property]: expressionValues[resultKey] }
  }
  return resolved
}
