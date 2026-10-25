import { describe, expect, it } from 'vitest'
import { readSupabaseConfig } from './config'
describe('browser-safe backend configuration', () => {
  it('keeps the demo available without configuration', () =>
    expect(readSupabaseConfig()).toBeNull())
  it('accepts HTTPS publishable keys and loopback development URLs', () => {
    expect(
      readSupabaseConfig(
        'https://project.supabase.co',
        'sb_publishable_example',
      )?.url,
    ).toBe('https://project.supabase.co')
    expect(
      readSupabaseConfig('http://127.0.0.1:54321', 'sb_publishable_example'),
    ).toBeTruthy()
  })
  it('rejects partial configuration, unsafe URLs and privileged keys', () => {
    for (const [url, key] of [
      ['https://project.supabase.co', ''],
      ['http://example.com', 'sb_publishable_example'],
      ['https://project.supabase.co/private', 'sb_publishable_example'],
      ['https://user:password@project.supabase.co', 'sb_publishable_example'],
      ['https://project.supabase.co', 'sb_secret_example'],
      [
        'https://project.supabase.co',
        `x.${btoa(JSON.stringify({ role: 'service_role' }))}.x`,
      ],
    ]) {
      expect(() => readSupabaseConfig(url, key)).toThrow()
    }
  })
  it('accepts only anon-role legacy JWT keys', () => {
    expect(
      readSupabaseConfig(
        'https://project.supabase.co',
        `x.${btoa(JSON.stringify({ role: 'anon' }))}.x`,
      ),
    ).toBeTruthy()
  })
})
