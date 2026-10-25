import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  loadAssignments,
  validateRemoteInspection,
  validateRemoteRecord,
} from './inspections'
import type { Database, RemoteInspection, RemoteRecord } from './database.types'
const inspection: RemoteInspection = {
  id: '10000000-0000-4000-8000-000000000001',
  property: 'Fictional property',
  address: 'Test address',
  kind: 'Move-in inspection',
  due_on: null,
  created_at: '2026-10-25T00:00:00Z',
}
const record: RemoteRecord = {
  inspection_id: inspection.id,
  answers: {},
  notes: '',
  version: 1,
  status: 'draft',
  updated_at: inspection.created_at,
  completed_at: null,
}
describe('remote response and identity validation', () => {
  it('accepts the server schema and rejects invalid values', () => {
    expect(validateRemoteInspection(inspection)).toBe(inspection)
    expect(validateRemoteRecord(record)).toBe(record)
    expect(() =>
      validateRemoteInspection({ ...inspection, property: '' }),
    ).toThrow()
    expect(() =>
      validateRemoteRecord({
        ...record,
        answers: JSON.parse('{"walls":"maybe"}'),
      }),
    ).toThrow()
    expect(() =>
      validateRemoteRecord({
        ...record,
        status: 'completed',
        completed_at: inspection.created_at,
      }),
    ).toThrow()
    expect(() => validateRemoteRecord({ ...record, version: 0 })).toThrow()
  })
  it('never loads assignments if the verified account changed', async () => {
    const from = vi.fn()
    const client = {
      auth: {
        getSession: async () => ({
          data: {
            session: {
              user: { id: 'expected' },
              access_token: 'fixture-token',
            },
          },
          error: null,
        }),
        getUser: async () => ({ data: { user: { id: 'other' } }, error: null }),
      },
      from,
    } as unknown as SupabaseClient<Database>
    await expect(loadAssignments(client, 'expected')).rejects.toThrow(
      'account changed',
    )
    expect(from).not.toHaveBeenCalled()
  })
})
