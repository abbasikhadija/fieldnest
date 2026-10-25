import { verifiedAccountToken } from './accountRequest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { missingQuestions, validateDraft } from '../domain/inspection'
import type { Database, RemoteInspection, RemoteRecord } from './database.types'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function validateRemoteInspection(value: RemoteInspection) {
  if (
    !uuid.test(value.id) ||
    typeof value.property !== 'string' ||
    !value.property.trim() ||
    value.property.length > 160 ||
    typeof value.address !== 'string' ||
    !value.address.trim() ||
    value.address.length > 300 ||
    ![
      'Routine condition inspection',
      'Move-in inspection',
      'Move-out inspection',
    ].includes(value.kind) ||
    !Number.isFinite(Date.parse(value.created_at)) ||
    (value.due_on !== null && !/^\d{4}-\d{2}-\d{2}$/.test(value.due_on))
  )
    throw new Error(
      'The server returned an invalid inspection. No local records were changed.',
    )
  return value
}
export function validateRemoteRecord(value: RemoteRecord) {
  if (
    !uuid.test(value.inspection_id) ||
    !value.answers ||
    typeof value.answers !== 'object' ||
    Array.isArray(value.answers) ||
    typeof value.notes !== 'string' ||
    !['draft', 'completed'].includes(value.status) ||
    !Number.isSafeInteger(value.version) ||
    value.version < 1 ||
    !Number.isFinite(Date.parse(value.updated_at)) ||
    (value.status === 'completed'
      ? !value.completed_at || !Number.isFinite(Date.parse(value.completed_at))
      : value.completed_at !== null)
  )
    throw new Error('The server returned an invalid record.')
  validateDraft(value)
  if (value.status === 'completed' && missingQuestions(value.answers).length)
    throw new Error('The server returned an incomplete completed record.')
  return value
}
export async function loadAssignments(
  client: SupabaseClient<Database>,
  userId: string,
  offset = 0,
  signal?: AbortSignal,
) {
  const accessToken = await verifiedAccountToken(client, userId)
  let query = client
    .from('inspections')
    .select('*')
    .setHeader('Authorization', `Bearer ${accessToken}`)
    .order('due_on', { ascending: true })
    .order('id')
    .range(offset, offset + 24)
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error)
    throw new Error(
      'Could not load assignments. Check your connection and try again.',
    )
  return (data ?? []).map(validateRemoteInspection)
}
export async function loadRecord(
  client: SupabaseClient<Database>,
  userId: string,
  id: string,
  signal?: AbortSignal,
) {
  const accessToken = await verifiedAccountToken(client, userId)
  let query = client
    .from('inspection_records')
    .select('*')
    .setHeader('Authorization', `Bearer ${accessToken}`)
    .eq('inspection_id', id)
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query.maybeSingle()
  if (error)
    throw new Error(
      'Could not load this record. Check your connection and try again.',
    )
  return data ? validateRemoteRecord(data) : null
}
