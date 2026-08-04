import { interpolate } from '@cocoar/vue-localization'
import type {
  PageTranslations,
  TranslationBinding,
} from './schema'

const FORBIDDEN = new Set(['__proto__', 'prototype', 'constructor'])

export function isTranslationBinding(value: unknown): value is TranslationBinding {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Partial<TranslationBinding>
  return candidate.source === 'translation'
    && typeof candidate.key === 'string'
    && candidate.key.length > 0
}

/** Data-only helper mirrored by the sandbox authoring preamble. */
export function translation(
  key: string,
  params?: Record<string, unknown>,
  fallback?: string,
): TranslationBinding {
  return {
    source: 'translation',
    key,
    ...(params ? { params } : {}),
    ...(fallback !== undefined ? { fallback } : {}),
  }
}

function localeCandidates(locale?: string, defaultLocale?: string): string[] {
  const result: string[] = []
  const add = (candidate?: string) => {
    if (!candidate || result.includes(candidate)) return
    result.push(candidate)
    const separator = candidate.indexOf('-')
    if (separator > 0) {
      const base = candidate.slice(0, separator)
      if (!result.includes(base)) result.push(base)
    }
  }
  add(locale)
  add(defaultLocale)
  return result
}

export function pageTranslationTemplate(
  messages: PageTranslations | undefined,
  key: string,
  locale?: string,
  defaultLocale?: string,
): string | undefined {
  if (!key || key.split('.').some((part) => !part || FORBIDDEN.has(part))) return undefined
  for (const candidate of localeCandidates(locale, defaultLocale)) {
    const value = messages?.[candidate]?.[key]
    if (typeof value === 'string') return value
  }
  return undefined
}

export function resolveTranslation(
  binding: TranslationBinding,
  messages: PageTranslations | undefined,
  locale?: string,
  defaultLocale?: string,
  hostTemplate?: (locale: string, key: string) => string | undefined,
): string {
  let template = pageTranslationTemplate(messages, binding.key, locale, defaultLocale)
  if (template === undefined && hostTemplate) {
    for (const candidate of localeCandidates(locale, defaultLocale)) {
      template = hostTemplate(candidate, binding.key)
      if (template !== undefined) break
    }
  }
  return interpolate(template ?? binding.fallback ?? binding.key, binding.params)
}

export function translationKeyFor(elementName: string, path: string): string {
  const safeName = elementName.trim().replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'element'
  const safePath = path.replace(/^props\./, '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'text'
  return `page.${safeName}.${safePath}`
}
