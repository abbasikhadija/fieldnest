import { questions } from './inspection'
import type { RemoteRecord } from '../remote/database.types'
export function compareCopies(local: RemoteRecord, server: RemoteRecord) {
  const answer = (value: string | undefined) =>
    ({ pass: 'Pass', fail: 'Fail', na: 'Not applicable' })[
      value as 'pass' | 'fail' | 'na'
    ] ?? 'Not answered'
  return [
    ...questions.map((question) => ({
      label: question.label,
      local: answer(local.answers[question.id]),
      server: answer(server.answers[question.id]),
      different: local.answers[question.id] !== server.answers[question.id],
    })),
    {
      label: 'Additional observations',
      local: local.notes ? `“${local.notes}”` : 'No observations',
      server: server.notes ? `“${server.notes}”` : 'No observations',
      different: local.notes !== server.notes,
    },
    {
      label: 'Completion state',
      local: local.status === 'completed' ? 'Completed' : 'Draft',
      server: server.status === 'completed' ? 'Completed' : 'Draft',
      different: local.status !== server.status,
    },
  ]
}
