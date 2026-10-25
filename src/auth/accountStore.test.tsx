import { describe, expect, it, vi } from 'vitest'
import { AccountStore, type AuthPort } from './accountStore'
const user = { id: 'a', email: 'inspector@example.test' }
function port(overrides: Partial<AuthPort> = {}): AuthPort {
  return {
    verify: vi.fn(async () => user),
    signIn: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    listen: () => () => {},
    ...overrides,
  }
}
describe('account identity boundaries', () => {
  it('hides the previous account synchronously on an Auth event', async () => {
    let changed!: () => void
    const store = new AccountStore(
      port({
        listen: (listener) => {
          changed = listener
          return () => {}
        },
      }),
    )
    const stop = store.start()
    await store.refresh()
    expect(store.getSnapshot().user).toEqual(user)
    changed()
    expect(store.getSnapshot()).toMatchObject({ user: null, phase: 'checking' })
    stop()
  })
  it('shows no account until online verification succeeds', async () => {
    let resolve!: (value: typeof user) => void
    const store = new AccountStore(
      port({
        verify: () =>
          new Promise((done) => {
            resolve = done
          }),
      }),
    )
    const loading = store.refresh()
    expect(store.getSnapshot()).toMatchObject({ user: null, phase: 'checking' })
    resolve(user)
    await loading
    expect(store.getSnapshot()).toMatchObject({ user, phase: 'ready' })
  })
  it('ignores an old account verification after a newer one', async () => {
    let resolve!: (value: typeof user) => void
    const verify = vi
      .fn<AuthPort['verify']>()
      .mockImplementationOnce(
        () =>
          new Promise((done) => {
            resolve = done
          }),
      )
      .mockResolvedValue({ id: 'b', email: 'b@example.test' })
    const store = new AccountStore(port({ verify }))
    const first = store.refresh()
    await store.refresh()
    resolve(user)
    await first
    expect(store.getSnapshot().user?.id).toBe('b')
  })
  it('hides the identity before sign-out finishes and does not restore it after failure', async () => {
    let reject!: (reason: Error) => void
    const store = new AccountStore(
      port({
        signOut: () =>
          new Promise((_done, fail) => {
            reject = fail
          }),
      }),
    )
    await store.refresh()
    const logout = store.signOut()
    expect(store.getSnapshot().user).toBeNull()
    reject(new Error('offline'))
    await logout
    await store.refresh()
    expect(store.getSnapshot()).toMatchObject({
      user: null,
      logoutFailed: true,
    })
  })
  it('ignores a late verification after sign-out', async () => {
    let resolve!: (value: typeof user) => void
    const store = new AccountStore(
      port({
        verify: () =>
          new Promise((done) => {
            resolve = done
          }),
      }),
    )
    const loading = store.refresh()
    await store.signOut()
    resolve(user)
    await loading
    expect(store.getSnapshot()).toMatchObject({
      user: null,
      phase: 'signed-out',
    })
  })
  it('returns a safe sign-in failure without exposing provider details', async () => {
    const store = new AccountStore(
      port({
        signIn: async () => {
          throw new Error('private provider details')
        },
      }),
    )
    await store.signIn('invalid@example.test', 'secret')
    expect(store.getSnapshot().message).toContain('Could not sign in')
    expect(store.getSnapshot().message).not.toContain('private provider')
  })
  it('unsubscribes and invalidates in-flight verification when leaving', async () => {
    const unsubscribe = vi.fn()
    let resolve!: (value: typeof user) => void
    const store = new AccountStore(
      port({
        listen: () => unsubscribe,
        verify: () =>
          new Promise((done) => {
            resolve = done
          }),
      }),
    )
    const stop = store.start()
    stop()
    resolve(user)
    await Promise.resolve()
    expect(unsubscribe).toHaveBeenCalledOnce()
    expect(store.getSnapshot().user).toBeNull()
  })
})
