import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../remote/database.types'
import type { AuthPort } from './accountStore'
export function supabaseAuth(client: SupabaseClient<Database>): AuthPort {
  return {
    async verify() {
      if (!navigator.onLine) {
        const { data } = await client.auth.getSession()
        return data.session?.user
          ? {
              id: data.session.user.id,
              email: data.session.user.email ?? 'Connected account',
            }
          : null
      }
      const { data, error } = await client.auth.getUser()
      if (error?.name === 'AuthSessionMissingError') return null
      if (error) throw error
      return data.user
        ? { id: data.user.id, email: data.user.email ?? 'Connected account' }
        : null
    },
    listen(listener) {
      const { data } = client.auth.onAuthStateChange(() => {
        // Listener only invalidates state synchronously; verification is deferred.
        listener()
      })
      return () => {
        data.subscription.unsubscribe()
      }
    },
    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    },
    async signOut() {
      const { error } = await client.auth.signOut({ scope: 'local' })
      if (error) throw error
    },
  }
}
