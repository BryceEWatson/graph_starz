// Required polyfills (must be first)
import { TextEncoder, TextDecoder } from 'node:util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock performance API for consistent testing
global.performance = {
  now: jest.fn(() => Date.now())
}

// Export window for tests that need direct access
export const dom = {
  window: global.window,
  document: global.document,
  navigator: global.navigator,
  Element: global.Element
}
