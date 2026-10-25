import { StaleDraftError } from '../persistence/database'
import Dexie, { type Table } from 'dexie'
import {
  questions,
  missingQuestions,
  validateDraft,
} from '../domain/inspection'
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
export interface ResolutionRecovery {
  id: string
  inspectionId: string
  createdAt: string
  choice: 'device' | 'server'
  local: RemoteRecord
  server: RemoteRecord
  operation: Operation
}
export class ConnectedDatabase extends Dexie {
  records!: Table<CachedInspection, string>
  operations!: Table<Operation, string>
  resolutions!: Table<ResolutionRecovery, string>
  constructor(accountId: string, project: string) {
    super(`fieldnest-connected-${encodeURIComponent(project)}-${accountId}`)
    this.version(1).stores({
      records: 'id, state',
      operations: 'id, &inspectionId, nextAttempt',
    })
    this.version(2).stores({
      records: 'id, state',
      operations: 'id, &inspectionId, nextAttempt',
      resolutions: 'id, inspectionId, createdAt',
    })
    this.on('versionchange', () => this.close())
  }
  async refreshConflict(id: string, revision: number, remote: RemoteRecord) {
    await this.transaction('rw', this.records, async () => {
      const current = await this.records.get(id)
      if (
        !current ||
        current.state !== 'conflict' ||
        current.revision !== revision
      )
        throw new StaleDraftError()
      if (
        remote.inspection_id !== id ||
        !current.remote ||
        remote.version < current.remote.version
      )
        throw new Error(
          'The server copy could not be verified. Your device draft is unchanged.',
        )
      if (remote.version === current.remote.version) return
      await this.records.put({
        ...current,
        remote,
        revision: current.revision + 1,
      })
    })
  }
  async resolveConflict(
    id: string,
    revision: number,
    serverVersion: number,
    choice: 'device' | 'server',
  ) {
    if (choice !== 'device' && choice !== 'server')
      throw new Error('Choose a copy to keep.')
    await this.transaction(
      'rw',
      this.records,
      this.operations,
      this.resolutions,
      async () => {
        const current = await this.records.get(id)
        if (
          !current ||
          current.state !== 'conflict' ||
          current.revision !== revision ||
          !current.remote ||
          current.remote.version !== serverVersion
        )
          throw new StaleDraftError()
        const operation = await this.operations
          .where('inspectionId')
          .equals(id)
          .first()
        if (!operation || !operation.blocked)
          throw new Error(
            'The saved conflict changed. Reopen it before choosing a copy.',
          )
        if (choice === 'device') {
          if (current.remote.status === 'completed')
            throw new Error(
              'The server inspection is completed. Its answers cannot be replaced.',
            )
          validateDraft(current.record)
          if (
            current.record.status === 'completed' &&
            missingQuestions(current.record.answers).length
          )
            throw new Error(
              'Complete every checklist answer before submitting this copy.',
            )
        }
        await this.resolutions.add({
          id: crypto.randomUUID(),
          inspectionId: id,
          createdAt: new Date().toISOString(),
          choice,
          local: current.record,
          server: current.remote,
          operation,
        })
        await this.operations.delete(operation.id)
        const updated: CachedInspection = {
          ...current,
          record:
            choice === 'server'
              ? current.remote
              : { ...current.record, version: serverVersion },
          revision: current.revision + 1,
          dirty: choice === 'device',
          state: choice === 'device' ? 'pending' : 'synced',
          message: undefined,
          remote: undefined,
        }
        await this.records.put(updated)
        if (choice === 'device') await this.enqueue(updated)
      },
    )
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
  async retryBlocked(now = Date.now()) {
    await this.transaction('rw', this.records, this.operations, async () => {
      for (const operation of await this.operations.toArray()) {
        const record = await this.records.get(operation.inspectionId)
        if (
          record &&
          record.state !== 'conflict' &&
          operation.leaseUntil <= now &&
          (record.state === 'blocked' || !operation.blocked)
        ) {
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
      if (!queued) return
      if (queued.inspectionId !== operation.inspectionId)
        throw new Error('Invalid operation identity.')
      const local = await this.records.get(queued.inspectionId)
      if (!local) return
      if (
        acknowledgment.record.inspection_id !== local.id ||
        (acknowledgment.kind === 'accepted' &&
          (acknowledgment.record.version !== queued.baseVersion + 1 ||
            acknowledgment.record.notes !== queued.payload.notes ||
            acknowledgment.record.status !== queued.payload.status ||
            Object.keys(acknowledgment.record.answers).length !==
              Object.keys(queued.payload.answers).length ||
            !questions.every(
              (question) =>
                acknowledgment.record.answers[question.id] ===
                queued.payload.answers[question.id],
            ))) ||
        acknowledgment.record.version < queued.baseVersion
      )
        throw new Error('Invalid server acknowledgment.')
      if (acknowledgment.kind === 'conflict') {
        // A late replay cannot replace a newer snapshot already under review.
        if (
          local.state === 'conflict' &&
          local.remote &&
          local.remote.version >= acknowledgment.record.version
        ) return
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
            'Someone updated this inspection while you were working. Both copies are preserved. Review the differences before choosing what to keep.',
        })
        return
      }
      await this.operations.delete(operation.id)
      const newer = local.revision !== queued.revision
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
      if (
        !current ||
        current.owner !== operation.owner ||
        current.leaseUntil !== operation.leaseUntil ||
        current.blocked
      ) return
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
