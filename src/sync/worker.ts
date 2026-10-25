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
    let storageFailed = false
    try {
      for (
        let count = 0;
        count < 10 && !this.stopped && this.active();
        count++
      ) {
        const operation = await this.db.claim(this.owner, this.now())
        if (!operation) break
        if (this.stopped || !this.active()) {
          await this.db.fail(
            operation,
            'Saved on this device. Reconnect to resume synchronization.',
            false,
            this.now(),
            this.random(),
          )
          break
        }
        const controller = new AbortController()
        let timeout: ReturnType<typeof setTimeout> | undefined
        const deadline = new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            controller.abort()
            reject(new Error('Request timed out'))
          }, 20_000)
        })
        let received = false
        try {
          const result = await Promise.race([
            this.send(operation, controller.signal),
            deadline,
          ])
          received = true
          clearTimeout(timeout)
          // Always durably process a received acknowledgment, even after sign-out.
          await this.db.acknowledge(operation, result)
        } catch (error) {
          if (received) storageFailed = true
          try {
            await this.db.fail(
              operation,
              received
                ? 'The server response could not be saved on this device. Your saved work is retained; retry to confirm the result.'
                : error instanceof SyncFailure
                  ? error.message
                  : 'The server result is not confirmed. Your saved device copy is retained; retrying when connected.',
              !received && error instanceof SyncFailure && error.permanent,
              this.now(),
              this.random(),
            )
          } catch {
            // The existing lease and immutable operation remain replayable.
            storageFailed = true
          }
        } finally {
          clearTimeout(timeout)
        }
      }
      if (storageFailed)
        throw new Error(
          'Some synchronization results could not be saved on this device. Pending work is retained.',
        )
    } finally {
      this.running = false
    }
  }
}
