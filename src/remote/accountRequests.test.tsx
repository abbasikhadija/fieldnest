import { afterEach, describe, expect, it, vi } from 'vitest'
import { createClient, type Session, type User } from '@supabase/supabase-js'
import type { Database, RemoteInspection, RemoteRecord } from './database.types'
import { loadAssignments, loadRecord } from './inspections'
import { sendOperation } from './operations'
import type { Operation } from '../sync/database'
const userA: User = {
  id: '20000000-0000-4000-8000-000000000001',
  email: 'a@example.test',
  aud: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-10-25T00:00:00Z',
}
const userB = {
  ...userA,
  id: '20000000-0000-4000-8000-000000000002',
  email: 'b@example.test',
}
const inspection: RemoteInspection = {
  id: '10000000-0000-4000-8000-000000000001',
  property: 'Fictional property',
  address: 'Fictional',
  kind: 'Routine condition inspection',
  created_at: userA.created_at,
  due_on: null,
}
const record: RemoteRecord = {
  inspection_id: inspection.id,
  answers: { walls: 'pass' },
  notes: 'Account A work',
  status: 'draft',
  version: 2,
  updated_at: userA.created_at,
  completed_at: null,
}
const operation: Operation = {
  id: '30000000-0000-4000-8000-000000000001',
  inspectionId: inspection.id,
  baseVersion: 1,
  revision: 2,
  payload: { answers: record.answers, notes: record.notes, status: 'draft' },
  attempts: 0,
  nextAttempt: 0,
  leaseUntil: 0,
  blocked: false,
}
const session = (user: User): Session => ({
  user,
  access_token: user.id === userA.id ? 'token-a' : 'token-b',
  refresh_token: 'fixture-refresh',
  expires_in: 3600,
  token_type: 'bearer',
})
afterEach(() => vi.restoreAllMocks())
async function switchingClient() {
  const headers: Headers[] = []
  const client = createClient<Database>(
    'https://fixture.supabase.co',
    'sb_publishable_fixture',
    {
      auth: {
        storageKey: crypto.randomUUID(),
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: async (input, init) => {
          headers.push(new Headers(init?.headers))
          const url = new URL(String(input))
          const body = url.pathname.includes('/rpc/')
            ? { kind: 'accepted', record }
            : url.pathname.endsWith('/inspection_records')
              ? [record]
              : [inspection]
          return new Response(JSON.stringify(body), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        },
      },
    },
  )
  await client.auth.initialize()
  let switched = false
  const getSession = vi
    .spyOn(client.auth, 'getSession')
    .mockImplementation(async () => ({
      data: { session: session(switched ? userB : userA) },
      error: null,
    }))
  const getUser = vi
    .spyOn(client.auth, 'getUser')
    .mockImplementation(async () => {
      switched = true
      return { data: { user: userA }, error: null }
    })
  return { client, headers, getSession, getUser }
}
describe('account-bound remote requests', () => {
  for (const action of ['assignments', 'record', 'upload'] as const) {
    it(`binds ${action} to the verified token even if the shared client changes accounts before fetch`, async () => {
      const { client, headers, getUser } = await switchingClient()
      if (action === 'assignments') await loadAssignments(client, userA.id)
      else if (action === 'record')
        await loadRecord(client, userA.id, inspection.id)
      else
        await sendOperation(
          client,
          userA.id,
          operation,
          new AbortController().signal,
        )
      expect(headers).toHaveLength(1)
      expect(headers[0].get('Authorization')).toBe('Bearer token-a')
      expect(getUser).toHaveBeenCalledWith('token-a')
    })
  }
  it('never sends account A work when the locally active session is already account B', async () => {
    const { client, headers, getSession } = await switchingClient()
    getSession.mockResolvedValue({
      data: { session: session(userB) },
      error: null,
    })
    await expect(
      sendOperation(client, userA.id, operation, new AbortController().signal),
    ).rejects.toThrow('account changed')
    expect(headers).toHaveLength(0)
  })
  it('leaves a timed-out request unsent when identity verification finally returns', async () => {
    const { client, headers } = await switchingClient()
    const controller = new AbortController()
    controller.abort()
    await expect(
      sendOperation(client, userA.id, operation, controller.signal),
    ).rejects.toThrow()
    expect(headers).toHaveLength(0)
  })
})
