// Required polyfills (must be first)
import { TextEncoder, TextDecoder } from 'node:util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Import DOM setup
import './src/lib/d3/__test_utils__/dom-setup'

// Testing library setup
import '@testing-library/jest-dom'

// Environment validation tests
describe('Jest Environment Setup', () => {
  test('TextEncoder/Decoder are defined', () => {
    expect(global.TextEncoder).toBeDefined()
    expect(global.TextDecoder).toBeDefined()
    expect(new TextEncoder()).toBeInstanceOf(TextEncoder)
  })

  test('DOM environment is properly setup', () => {
    expect(global.window).toBeDefined()
    expect(global.document).toBeDefined()
    expect(global.navigator).toBeDefined()
  })

  test('Performance API is available', () => {
    expect(global.performance).toBeDefined()
    expect(typeof global.performance.now).toBe('function')
  })
})