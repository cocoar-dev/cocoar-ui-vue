import type { ActionValues } from './context'
import type { ActionProps } from './schema'

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor'])
const MAX_JSON_DEPTH = 50

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/** True when a value can cross the persisted Page JSON boundary without coercion. */
export function isJsonSafeActionValue(
  value: unknown,
  depth = 0,
  ancestors = new Set<object>(),
): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value)
  if (depth >= MAX_JSON_DEPTH || typeof value !== 'object') return false
  if (ancestors.has(value)) return false

  ancestors.add(value)
  const valid = Array.isArray(value)
    ? value.every((entry) => isJsonSafeActionValue(entry, depth + 1, ancestors))
    : isPlainRecord(value) && Object.entries(value).every(([key, entry]) =>
        !FORBIDDEN_KEYS.has(key) && isJsonSafeActionValue(entry, depth + 1, ancestors),
      )
  ancestors.delete(value)
  return valid
}

export function isSafeActionValueField(field: unknown): field is string {
  return typeof field === 'string' && field.length > 0 && !FORBIDDEN_KEYS.has(field)
}

/** Keys addressable through the flat `actionValues.<key>` binding target. */
export function isBindableActionValueField(field: unknown): field is string {
  return isSafeActionValueField(field) && /^[A-Za-z_][A-Za-z0-9_-]*$/.test(field)
}

export function isJsonSafeActionValues(value: unknown): value is Record<string, unknown> {
  return isPlainRecord(value) && isJsonSafeActionValue(value)
}

function cloneJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneJsonValue)
  if (isPlainRecord(value)) {
    const result: Record<string, unknown> = Object.create(null)
    for (const [key, entry] of Object.entries(value)) result[key] = cloneJsonValue(entry)
    return result
  }
  return value
}

/**
 * Resolves the optional per-element action arguments. The single dynamic
 * value is deliberately applied last, so it can override a static entry with
 * the same key. Invalid/non-JSON runtime values never reach the host handler.
 */
export function actionValuesFromProps(props: ActionProps): ActionValues {
  const result: ActionValues = Object.create(null)
  if (isPlainRecord(props.actionValues)) {
    for (const [key, value] of Object.entries(props.actionValues)) {
      if (!FORBIDDEN_KEYS.has(key) && isJsonSafeActionValue(value)) {
        result[key] = cloneJsonValue(value)
      }
    }
  }
  if (isSafeActionValueField(props.actionValueField) && isJsonSafeActionValue(props.actionValue)) {
    result[props.actionValueField] = cloneJsonValue(props.actionValue)
  }
  return result
}

/**
 * Final handler payload. Explicit per-action values win collisions with form
 * fields because they are the trigger-specific arguments authored for this
 * exact action. The returned object is a new top-level payload snapshot.
 */
export function mergeActionValues(formValues: ActionValues, actionValues?: ActionValues): ActionValues {
  return { ...formValues, ...(actionValues ?? {}) }
}
