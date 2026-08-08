import { describe, expect, it } from 'vitest'
import {
  actionValuesFromProps,
  isJsonSafeActionValue,
  isJsonSafeActionValues,
  mergeActionValues,
} from './actionValues'

describe('shared action values contract', () => {
  it('keeps every action argument optional', () => {
    expect(actionValuesFromProps({})).toEqual({})
    expect(mergeActionValues({ email: 'person@example.test' })).toEqual({
      email: 'person@example.test',
    })
  })

  it('accepts JSON data and rejects coercive, cyclic, or prototype-bearing values', () => {
    expect(isJsonSafeActionValue({ language: 'de', flags: [true, null, 2] })).toBe(true)
    expect(isJsonSafeActionValue(Number.POSITIVE_INFINITY)).toBe(false)
    expect(isJsonSafeActionValue(new Date())).toBe(false)
    expect(isJsonSafeActionValue(() => undefined)).toBe(false)
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    expect(isJsonSafeActionValue(cyclic)).toBe(false)
    expect(isJsonSafeActionValues([])).toBe(false)
  })

  it('applies one dynamic value over static action values and drops unsafe entries', () => {
    const actionValues = Object.create(null) as Record<string, unknown>
    actionValues.language = 'en'
    actionValues.safe = { nested: true }
    actionValues.bad = new Date()

    expect(actionValuesFromProps({
      action: 'auth:set-language',
      actionValues,
      actionValueField: 'language',
      actionValue: 'de',
    })).toEqual({ language: 'de', safe: { nested: true } })
  })

  it('defines explicit action values as the collision winner over form fields', () => {
    expect(mergeActionValues(
      { email: 'person@example.test', language: 'en' },
      { language: 'de', source: 'language-switcher' },
    )).toEqual({
      email: 'person@example.test',
      language: 'de',
      source: 'language-switcher',
    })
  })
})
