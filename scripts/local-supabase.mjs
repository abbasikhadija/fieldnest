import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
export function localSupabase() {
  // Read keys directly into memory; do not print status JSON or privileged keys.
  const executable = path.resolve('node_modules/supabase/dist/supabase.js')
  let status
  try {
    status = JSON.parse(
      execFileSync(process.execPath, [executable, 'status', '-o', 'json'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      }),
    )
  } catch {
    throw new Error(
      'Local Supabase is not running. Start a Docker-compatible runtime and run npx supabase start first.',
    )
  }
  const url = status.API_URL
  if (
    !url ||
    !['127.0.0.1', 'localhost'].includes(new URL(url).hostname) ||
    !status.SERVICE_ROLE_KEY ||
    !status.ANON_KEY
  )
    throw new Error(
      'Only a running local Supabase stack is supported. No hosted administrator keys are accepted.',
    )
  const options = { auth: { persistSession: false, autoRefreshToken: false } }
  return {
    browserConfig: { url, publishableKey: status.ANON_KEY },
    admin: createClient(url, status.SERVICE_ROLE_KEY, options),
    anonymous: () => createClient(url, status.ANON_KEY, options),
  }
}
