import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
afterEach(cleanup)
vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW: () => ({ needRefresh: [false], updateServiceWorker: vi.fn() }) }))
