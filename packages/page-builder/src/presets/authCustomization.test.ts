import { describe, expect, it } from 'vitest'
import { validatePageDocument } from '../documentValidation'
import {
  createAuthPageConfig,
  createAuthPageDocument,
  type AuthPageSlot,
} from './authCustomization'

const slots: AuthPageSlot[] = ['login', 'password-forgot', 'logout', 'consent']

describe('Auth Lab code-authored documents', () => {
  it.each(slots)('creates a valid %s document with Page State and Element Code', (slot) => {
    const schema = createAuthPageDocument(slot)
    const result = validatePageDocument(schema, createAuthPageConfig(slot, 'de'))

    expect(result.issues).toEqual([])
    expect(schema).toMatchObject({
      type: 'page',
      stateCode: expect.stringContaining('definePageState'),
    })
    expect(JSON.stringify(schema)).toContain('defineElement')
  })
})
