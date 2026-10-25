import type { EditableInspection } from './inspection'
import type { RemoteRecord } from '../remote/database.types'
export type Payload = EditableInspection & { status: 'draft' | 'completed' }
export interface Acknowledgment {
  kind: 'accepted' | 'conflict'
  record: RemoteRecord
}
