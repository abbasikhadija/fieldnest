export const sections = [
  {
    title: 'General condition',
    questions: [
      { id: 'walls', label: 'Walls and ceilings are in good condition' },
      { id: 'floors', label: 'Floors and doors are safe and functional' },
    ],
  },
  {
    title: 'Kitchen',
    questions: [
      {
        id: 'kitchen',
        label: 'Kitchen fixtures and surfaces are in good condition',
      },
      { id: 'water', label: 'Water supply and drainage work correctly' },
    ],
  },
  {
    title: 'Bathroom',
    questions: [
      { id: 'bathroom', label: 'Bathroom fixtures work correctly' },
      { id: 'leaks', label: 'No visible leaks or dampness' },
    ],
  },
  {
    title: 'Electrical and safety',
    questions: [
      { id: 'electrical', label: 'Visible switches and outlets appear safe' },
      { id: 'alarm', label: 'Smoke alarms pass their test' },
    ],
  },
] as const
export const questions = sections.flatMap((section) => [...section.questions])
export type QuestionId = (typeof questions)[number]['id']
export type Answer = 'pass' | 'fail' | 'na'
export type Answers = Partial<Record<QuestionId, Answer>>
export interface Inspection {
  id: string
  property: string
  address: string
  kind: string
  answers: Answers
  notes: string
  status: 'not-started' | 'draft' | 'completed'
  revision: number
  updatedAt: string | null
  completedAt: string | null
}
export type EditableInspection = Pick<Inspection, 'answers' | 'notes'>
export function missingQuestions(answers: Answers) {
  return questions.filter(
    (question) => !['pass', 'fail', 'na'].includes(answers[question.id] ?? ''),
  )
}
export function validateDraft(value: EditableInspection) {
  if (value.notes.length > 5000)
    throw new Error('Keep observations within 5,000 characters.')
  for (const [key, answer] of Object.entries(value.answers)) {
    if (
      !questions.some((question) => question.id === key) ||
      !['pass', 'fail', 'na'].includes(answer)
    ) {
      throw new Error(
        'This checklist contains an invalid answer. Your previous device copy is unchanged.',
      )
    }
  }
}
export function progress(inspection: Pick<Inspection, 'answers'>) {
  return questions.length - missingQuestions(inspection.answers).length
}
export function statusLabel(status: Inspection['status']) {
  return {
    'not-started': 'Not started',
    draft: 'Draft · on this device',
    completed: 'Completed · on this device',
  }[status]
}
