import type { Acknowledgment, ConnectedDatabase, Operation } from './database'
export class SyncFailure extends Error {
  constructor(
    message: string,
    public permanent = false,
  ) {
    super(message)
  }
}
export class SyncWorker {
  private running = false
  private stopped = false
  private owner = crypto.randomUUID()
  constructor(
    private db: ConnectedDatabase,
    private send: (
      operation: Operation,
      signal: AbortSignal,
    ) => Promise<Acknowledgment>,
    private active: () => boolean,
    private now = Date.now,
    private random = Math.random,
  ) {}
  start() {
    this.stopped = false
  }
  stop() {
    this.stopped = true
  }
  async run() {
    if (this.running || this.stopped || !this.active()) return
    this.running = true
    try {
      for (
        let count = 0;
        count < 10 && !this.stopped && this.active();
        count++
      ) {
        const operation = await this.db.claim(this.owner, this.now())
        if (!operation) break
        const controller = new AbortController()
        let timeout: ReturnType<typeof setTimeout> | undefined
        const deadline = new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            controller.abort()
            reject(new Error('Request timed out'))
          }, 20_000)
        })
        try {
          const result = await Promise.race([
            this.send(operation, controller.signal),
            deadline,
          ])
          // Always durably process a received acknowledgment, even after sign-out.
          await this.db.acknowledge(operation, result)
        } catch (error) {
          await this.db.fail(
            operation,
            error instanceof SyncFailure
              ? error.message
              : 'Unable to sync. Your device copy is safe; retrying when connected.',
            error instanceof SyncFailure && error.permanent,
            this.now(),
            this.random(),
          )
        } finally {
          clearTimeout(timeout)
        }
      }
    } finally {
      this.running = false
    }
  }
}
