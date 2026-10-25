import Dexie, { type Table } from 'dexie'
import {
  missingQuestions,
  validateDraft,
  type EditableInspection,
  type Inspection,
} from '../domain/inspection'

export class StaleDraftError extends Error {
  constructor() {
    super(
      'This inspection changed in another tab. Your edits are kept here. Download them before loading the newer device copy.',
    )
    this.name = 'StaleDraftError'
  }
}
export class DemoDatabase extends Dexie {
  inspections!: Table<Inspection, string>
  meta!: Table<{ key: string; value: string }, string>
  constructor(name = 'fieldnest-demo-v1') {
    super(name)
    this.version(1).stores({
      inspections: '&id,status,updatedAt',
      meta: '&key',
    })
    this.on('versionchange', () => this.close())
  }
}
export const db = new DemoDatabase()
const properties = [
  {
    id: 'willow-court',
    property: '12 Willow Court',
    address: 'Westbrook · Apartment 2B',
    kind: 'Routine condition inspection',
  },
  {
    id: 'cedar-house',
    property: '8 Cedar House',
    address: 'Oakridge · Ground floor',
    kind: 'Move-in inspection',
  },
  {
    id: 'meadow-lane',
    property: '24 Meadow Lane',
    address: 'Westbrook · Townhouse',
    kind: 'Routine condition inspection',
  },
]
export async function startDemo(database = db) {
  await database.transaction(
    'rw',
    database.meta,
    database.inspections,
    async () => {
      if (await database.meta.get('initialized')) return
      await database.inspections.bulkAdd(
        properties.map((property) => ({
          ...property,
          answers: {},
          notes: '',
          status: 'not-started',
          revision: 0,
          updatedAt: null,
          completedAt: null,
        })),
      )
      await database.meta.add({ key: 'initialized', value: '1' })
    },
  )
}
export async function saveDraft(
  id: string,
  revision: number,
  draft: EditableInspection,
  complete = false,
  database = db,
) {
  validateDraft(draft)
  if (complete && missingQuestions(draft.answers).length)
    throw new Error(
      'Answer every checklist question before completing this inspection.',
    )
  return database.transaction('rw', database.inspections, async () => {
    const current = await database.inspections.get(id)
    if (!current)
      throw new Error('This inspection is no longer available on this device.')
    if (current.revision !== revision) throw new StaleDraftError()
    if (current.status === 'completed')
      throw new Error(
        'This inspection is already completed. Its saved answers are unchanged.',
      )
    const timestamp = new Date().toISOString()
    const saved: Inspection = {
      ...current,
      answers: { ...draft.answers },
      notes: draft.notes,
      revision: current.revision + 1,
      status: complete ? 'completed' : 'draft',
      updatedAt: timestamp,
      completedAt: complete ? timestamp : null,
    }
    await database.inspections.put(saved)
    return saved
  })
}
