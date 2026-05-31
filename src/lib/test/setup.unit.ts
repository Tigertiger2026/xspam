import { vi } from 'vitest'

vi.mock('webextension-polyfill', () => {
  return {
    default: {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined),
          remove: vi.fn().mockResolvedValue(undefined),
        },
      },
    },
  }
})

// Inject a minimal chrome stub to satisfy any generic webextension checks in dependencies
;(globalThis as any).chrome = {
  runtime: {
    id: 'mock-plugin-id',
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
} as any

;(globalThis as any).browser = (globalThis as any).chrome as any
