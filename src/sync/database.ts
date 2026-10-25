import { StaleDraftError } from '../persistence/database'
import Dexie, { type Table } from 'dexie'
import { missingQuestions, validateDraft } from '../domain/inspection'
import type { RemoteInspection, RemoteRecord } from '../remote/database.types'

import type { Payload, Acknowledgment } from '../domain/synchronization'
export type { Payload, Acknowledgment } from '../domain/synchronization'
export interface CachedInspection {
  id: string
  inspection: RemoteInspection
  record: RemoteRecord
  revision: number
  dirty: boolean
  state: 'synced' | 'pending' | 'syncing' | 'conflict' | 'blocked'
  message?: string
  remote?: RemoteRecord
}
export interface Operation {
  id: string
  inspectionId: string
  baseVersion: number
  revision: number
  payload: Payload
  attempts: number
  nextAttempt: number
  leaseUntil: number
  owner?: string
  blocked: boolean
}
export class ConnectedDatabase extends Dexie {
  records!: Table<CachedInspection, string>
  operations!: Table<Operation, string>
  constructor(accountId: string, project: string) {
    super(`fieldnest-connected-${encodeURIComponent(project)}-${accountId}`)
    this.version(1).stores({
      records: 'id, state',
      operations: 'id, &inspectionId, nextAttempt',
    })
    this.on('versionchange', () => this.close())
  }
  async cache(inspection: RemoteInspection, record: RemoteRecord) {
    await this.transaction('rw', this.records, async () => {
      const previous = await this.records.get(inspection.id)
      if (
        previous &&
        (previous.dirty ||
          previous.state !== 'synced' ||
          record.version < previous.record.version)
      )
        return
      await this.records.put({
        id: inspection.id,
        inspection,
        record,
        revision: (previous?.revision ?? 0) + 1,
        dirty: false,
        state: 'synced',
      })
    })
  }
  async save(id: string, revision: number, payload: Payload) {
    validateDraft(payload)
    if (
      payload.status === 'completed' &&
      missingQuestions(payload.answers).length
    )
      throw new Error('Answer every checklist question before completing.')
    await this.transaction('rw', this.records, this.operations, async () => {
      const current = await this.records.get(id)
      if (!current || current.revision !== revision) throw new StaleDraftError()
      if (
        current.record.status === 'completed' ||
        current.state === 'conflict' ||
        current.state === 'blocked'
      )
        throw new Error(
          'This inspection cannot be edited until its saved work is reviewed.',
        )
      const updated = {
        ...current,
        record: { ...current.record, ...payload },
        revision: revision + 1,
        dirty: true,
        state: 'pending' as const,
        message: undefined,
      }
      await this.records.put(updated)
      if (!(await this.operations.where('inspectionId').equals(id).first()))
        await this.enqueue(updated)
    })
  }
  private async enqueue(value: CachedInspection) {
    await this.operations.add({
      id: crypto.randomUUID(),
      inspectionId: value.id,
      baseVersion: value.record.version,
      revision: value.revision,
      payload: {
        answers: value.record.answers,
        notes: value.record.notes,
        status: value.record.status,
      },
      attempts: 0,
      nextAttempt: 0,
      leaseUntil: 0,
      blocked: false,
    })
  }
  async retryBlocked() {
    await this.transaction('rw', this.records, this.operations, async () => {
      for (const operation of await this.operations.toArray()) {
        const record = await this.records.get(operation.inspectionId)
        if (operation.blocked && record?.state === 'blocked') {
          await this.operations.update(operation.id, {
            blocked: false,
            nextAttempt: 0,
            leaseUntil: 0,
            owner: undefined,
          })
          await this.records.update(record.id, {
            state: 'pending',
            message: undefined,
          })
        }
      }
    })
  }
  async claim(owner: string, now: number) {
    return this.transaction('rw', this.operations, this.records, async () => {
      const operation = (await this.operations.toArray()).find(
        (item) =>
          !item.blocked && item.nextAttempt <= now && item.leaseUntil <= now,
      )
      if (!operation) return null
      const claimed = { ...operation, owner, leaseUntil: now + 45_000 }
      await this.operations.put(claimed)
      await this.records.update(operation.inspectionId, {
        state: 'syncing',
        message: undefined,
      })
      return claimed
    })
  }
  async acknowledge(operation: Operation, acknowledgment: Acknowledgment) {
    await this.transaction('rw', this.records, this.operations, async () => {
      const queued = await this.operations.get(operation.id)
      const local = await this.records.get(operation.inspectionId)
      if (!queued || !local) return
      if (
        acknowledgment.record.inspection_id !== local.id ||
        (acknowledgment.kind === 'accepted' &&
          acknowledgment.record.version !== operation.baseVersion + 1)
      )
        throw new Error('Invalid server acknowledgment.')
      if (acknowledgment.kind === 'conflict') {
        await this.operations.update(operation.id, {
          blocked: true,
          owner: undefined,
          leaseUntil: 0,
        })
        await this.records.put({
          ...local,
          state: 'conflict',
          remote: acknowledgment.record,
          message:
            'Someone updated this inspection. Your device copy is preserved. Conflict resolution is available in a later release.',
        })
        return
      }
      await this.operations.delete(operation.id)
      const newer = local.revision !== operation.revision
      const updated: CachedInspection = {
        ...local,
        record: newer
          ? {
              ...local.record,
              version: acknowledgment.record.version,
              updated_at: acknowledgment.record.updated_at,
            }
          : acknowledgment.record,
        dirty: newer,
        state: newer ? 'pending' : 'synced',
        message: undefined,
      }
      await this.records.put(updated)
      if (newer) await this.enqueue(updated)
    })
  }
  async fail(
    operation: Operation,
    message: string,
    permanent: boolean,
    now: number,
    random: number,
  ) {
    await this.transaction('rw', this.records, this.operations, async () => {
      const current = await this.operations.get(operation.id)
      if (!current || current.owner !== operation.owner) return
      const attempts = current.attempts + 1
      const delay =
        Math.min(60_000, 1000 * 2 ** Math.min(attempts - 1, 6)) *
        (1 + random * 0.25)
      await this.operations.update(operation.id, {
        attempts,
        nextAttempt: now + delay,
        leaseUntil: 0,
        owner: undefined,
        blocked: permanent,
      })
      await this.records.update(operation.inspectionId, {
        state: permanent ? 'blocked' : 'pending',
        message,
      })
    })
  }
}
