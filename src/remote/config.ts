export interface SupabaseConfig {
  url: string
  publishableKey: string
}
export function readSupabaseConfig(
  url?: string,
  key?: string,
): SupabaseConfig | null {
  if (!url && !key) return null
  if (!url || !key)
    throw new Error('Both Supabase URL and publishable key are required.')
  const parsed = new URL(url)
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
  if (
    (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== '/'
  ) {
    throw new Error(
      'Use an HTTPS Supabase project URL, or HTTP on localhost for development.',
    )
  }
  let browserSafe = key.startsWith('sb_publishable_')
  if (!browserSafe && key.split('.').length === 3) {
    try {
      browserSafe =
        JSON.parse(
          atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
        ).role === 'anon'
    } catch {
      browserSafe = false
    }
  }
  if (!browserSafe)
    throw new Error(
      'Use a publishable key or legacy anon key. Secret and service-role keys are forbidden.',
    )
  return { url: parsed.origin, publishableKey: key }
}
