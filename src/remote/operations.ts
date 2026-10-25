import { verifiedAccountToken } from './accountRequest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import type { Acknowledgment, Operation } from '../sync/database'
import { SyncFailure } from '../sync/worker'
import { validateRemoteRecord } from './inspections'
export async function sendOperation(
  client: SupabaseClient<Database>,
  userId: string,
  operation: Operation,
  signal: AbortSignal,
): Promise<Acknowledgment> {
  let accessToken: string
  try {
    accessToken = await verifiedAccountToken(client, userId)
  } catch {
    throw new SyncFailure(
      'Your account changed or expired. Reconnect and sign in to sync your saved work.',
    )
  }
  if (signal.aborted) throw new Error('Request expired')
  const { data, error } = await client
    .rpc('apply_inspection_operation', {
      operation_id: operation.id,
      inspection_id: operation.inspectionId,
      base_version: operation.baseVersion,
      payload: operation.payload,
    })
    .setHeader('Authorization', `Bearer ${accessToken}`)
    .abortSignal(signal)
  if (error)
    throw new SyncFailure(
      error.code === 'PGRST202'
        ? 'Server synchronization setup is needed. Ask your administrator to apply the M3 migration in docs/BACKEND_SETUP.md, then choose Sync saved work.'
        : error.code === '42501'
          ? 'Your access is unavailable. Your device copy is preserved; contact your administrator.'
          : 'Unable to sync. Your device copy is preserved.',
      ['42501', '22023', '23514', 'PGRST202'].includes(error.code),
    )
  if (!data || (data.kind !== 'accepted' && data.kind !== 'conflict'))
    throw new Error('Invalid acknowledgment')
  return { kind: data.kind, record: validateRemoteRecord(data.record) }
}
