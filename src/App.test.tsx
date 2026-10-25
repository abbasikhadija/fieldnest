import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { App } from './App'
describe('foundation navigation', () => {
  it('explains preview scope and navigates to activity', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'My work' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Activity' }))
    expect(
      await screen.findByRole('heading', { name: 'Nothing saved yet.' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Demo records are never synchronized with a server/),
    ).toBeInTheDocument()
  })
  it('provides recovery for an unknown route', () => {
    render(
      <MemoryRouter initialEntries={['/missing']}>
        <App />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('link', { name: 'Back to my work' }),
    ).toHaveAttribute('href', '/')
  })
})
