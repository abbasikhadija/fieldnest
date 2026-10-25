import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './database'
export function useInspections() {
  return useLiveQuery(async () => {
    try {
      return { records: await db.inspections.toArray(), error: false }
    } catch {
      return { records: [], error: true }
    }
  }, [])
}
