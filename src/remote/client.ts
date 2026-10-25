import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { readSupabaseConfig } from './config'

export function createConfiguredClient() {
  const config = readSupabaseConfig(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  )
  return config
    ? createClient<Database>(config.url, config.publishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storageKey: `fieldnest-auth:${new URL(config.url).host}`,
        },
      })
    : null
}
