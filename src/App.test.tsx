import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { App } from './App'
describe('foundation navigation', () => {
  it('explains preview scope and navigates to activity', async () => {
    render(<MemoryRouter><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'My work' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Activity' }))
    expect(screen.getByRole('heading', { name: 'Nothing to report yet.' })).toBeInTheDocument()
    expect(screen.getByText(/No records have been saved or synchronized/)).toBeInTheDocument()
  })
  it('provides recovery for an unknown route', () => {
    render(<MemoryRouter initialEntries={['/missing']}><App /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Back to my work' })).toHaveAttribute('href', '/')
  })
})
