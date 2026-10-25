import type { Answers } from '../domain/inspection'
export interface RemoteInspection {
  id: string
  property: string
  address: string
  kind:
    | 'Routine condition inspection'
    | 'Move-in inspection'
    | 'Move-out inspection'
  due_on: string | null
  created_at: string
}
export interface RemoteRecord {
  inspection_id: string
  answers: Answers
  notes: string
  status: 'draft' | 'completed'
  version: number
  updated_at: string
  completed_at: string | null
}
type Table<Row> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: []
}
// Schema contract for the checked-in M2 migration; keep in step with migrations.
export interface Database {
  public: {
    Tables: {
      inspections: Table<RemoteInspection>
      inspection_records: Table<RemoteRecord>
      inspection_assignments: Table<{
        inspection_id: string
        user_id: string
        assigned_at: string
      }>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
