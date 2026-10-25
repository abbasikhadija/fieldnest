import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AuthApiError,
  AuthRetryableFetchError,
  type SupabaseClient,
} from '@supabase/supabase-js'
import type { Database } from '../remote/database.types'
import { supabaseAuth } from './supabaseAuth'
const user = { id: 'account-a', email: 'private@example.test' }
function adapter(error: Error | null = null, cached = true) {
  const getUser = vi.fn(async () => ({
    data: { user: error ? null : user },
    error,
  }))
  const getSession = vi.fn(async () => ({
    data: { session: cached ? { user } : null },
    error: null,
  }))
  const client = {
    auth: { getUser, getSession },
  } as unknown as SupabaseClient<Database>
  return { auth: supabaseAuth(client), getUser, getSession }
}
afterEach(() => vi.restoreAllMocks())
describe('offline account continuity', () => {
  it('opens only the locally retained session when the browser reports offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const value = adapter()
    expect(await value.auth.verify()).toEqual(user)
    expect(value.getUser).not.toHaveBeenCalled()
  })
  it('uses local identity for retryable connectivity failure even when navigator says online', async () => {
    const value = adapter(new AuthRetryableFetchError('Connection lost', 0))
    expect(await value.auth.verify()).toEqual(user)
    expect(value.getSession).toHaveBeenCalledOnce()
  })
  it('never substitutes a cached identity for an explicitly rejected online session', async () => {
    const value = adapter(new AuthApiError('Invalid JWT', 401, 'bad_jwt'))
    await expect(value.auth.verify()).rejects.toThrow('Invalid JWT')
    expect(value.getSession).not.toHaveBeenCalled()
  })
  it('cannot open an offline workspace without a locally retained session', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    expect(await adapter(null, false).auth.verify()).toBeNull()
  })
})
