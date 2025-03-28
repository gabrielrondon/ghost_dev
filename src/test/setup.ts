import '@testing-library/jest-dom'
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Configure vitest to support jest-dom matchers
expect.extend(await import('@testing-library/jest-dom/matchers').then(module => module.default || module))

afterEach(() => {
  cleanup()
}) 