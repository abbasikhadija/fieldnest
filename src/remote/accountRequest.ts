import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
// Capture a session, verify that exact JWT, and bind protected requests to it.
// The client's active account may change while verification is in flight.
export async function verifiedAccountToken(
  client: SupabaseClient<Database>,
  expectedId: string,
) {
  const { data: stored, error: sessionError } = await client.auth.getSession()
  const session = stored.session
  if (sessionError || session?.user.id !== expectedId)
    throw new Error(
      'Your account changed or expired. Sign in again to load assigned work.',
    )
  const { data: verified, error } = await client.auth.getUser(
    session.access_token,
  )
  if (error || verified.user?.id !== expectedId)
    throw new Error(
      'Your account changed or expired. Sign in again to load assigned work.',
    )
  return session.access_token
}
