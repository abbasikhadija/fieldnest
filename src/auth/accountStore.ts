export interface AccountIdentity {
  id: string
  email: string
}
export interface AuthPort {
  verify: () => Promise<AccountIdentity | null>
  listen: (listener: () => void) => () => void
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}
export interface AccountState {
  phase: 'checking' | 'signed-out' | 'ready'
  user: AccountIdentity | null
  message: string | null
  logoutFailed: boolean
}
export class AccountStore {
  private state: AccountState = {
    phase: 'checking',
    user: null,
    message: null,
    logoutFailed: false,
  }
  private listeners = new Set<() => void>()
  private epoch = 0
  private locked = false
  constructor(private auth: AuthPort) {}
  getSnapshot = () => this.state
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  private publish(state: AccountState) {
    this.state = state
    this.listeners.forEach((listener) => listener())
  }
  start() {
    const unsubscribe = this.auth.listen(() => {
      if (this.locked) return
      const epoch = ++this.epoch
      // Hide prior-account data synchronously, then verify outside Auth's lock.
      this.publish({
        phase: 'checking',
        user: null,
        message: null,
        logoutFailed: false,
      })
      setTimeout(() => {
        if (!this.locked && epoch === this.epoch) void this.refresh()
      }, 0)
    })
    void this.refresh()
    return () => {
      ++this.epoch
      unsubscribe()
    }
  }
  refresh = async () => {
    if (this.locked) return
    const epoch = ++this.epoch
    this.publish({
      phase: 'checking',
      user: null,
      message: null,
      logoutFailed: false,
    })
    try {
      const user = await this.auth.verify()
      if (epoch === this.epoch)
        this.publish({
          phase: user ? 'ready' : 'signed-out',
          user,
          message: null,
          logoutFailed: false,
        })
    } catch {
      if (epoch === this.epoch)
        this.publish({
          phase: 'signed-out',
          user: null,
          message:
            'Could not verify your account. Connect to the internet and try again.',
          logoutFailed: false,
        })
    }
  }
  async signIn(email: string, password: string) {
    this.locked = false
    const epoch = ++this.epoch
    this.publish({
      phase: 'checking',
      user: null,
      message: null,
      logoutFailed: false,
    })
    try {
      await this.auth.signIn(email, password)
      await this.refresh()
    } catch {
      if (epoch === this.epoch)
        this.publish({
          phase: 'signed-out',
          user: null,
          message:
            'Could not sign in. Check your email, password and connection, then try again.',
          logoutFailed: false,
        })
    }
  }
  async signOut() {
    this.locked = true
    ++this.epoch
    // Hide private state before an asynchronous sign-out can fail or race.
    this.publish({
      phase: 'checking',
      user: null,
      message: null,
      logoutFailed: false,
    })
    try {
      await this.auth.signOut()
      this.publish({
        phase: 'signed-out',
        user: null,
        message:
          'Signed out on this browser. Your local demo drafts are unchanged.',
        logoutFailed: false,
      })
    } catch {
      this.publish({
        phase: 'signed-out',
        user: null,
        message:
          'Sign-out could not finish. Account records are hidden. Retry before leaving this shared device.',
        logoutFailed: true,
      })
    }
  }
}
