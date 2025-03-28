import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Configure vitest to support jest-dom matchers
expect.extend(await import('@testing-library/jest-dom/matchers').then(module => module.default || module))

// Define a simple mock for SubtleCrypto
const mockSubtleCrypto = {
  digest: vi.fn().mockImplementation(() => Promise.resolve(new Uint8Array(32).buffer)),
  encrypt: vi.fn().mockImplementation(() => Promise.resolve(new ArrayBuffer(32))),
  decrypt: vi.fn().mockImplementation(() => Promise.resolve(new ArrayBuffer(32))),
  sign: vi.fn().mockImplementation(() => Promise.resolve(new ArrayBuffer(64))),
  verify: vi.fn().mockReturnValue(Promise.resolve(true)),
  generateKey: vi.fn().mockImplementation(() => Promise.resolve({
    type: 'secret',
    extractable: true,
    algorithm: { name: 'HMAC' },
    usages: ['sign', 'verify']
  })),
  deriveKey: vi.fn().mockImplementation(() => Promise.resolve({
    type: 'secret',
    extractable: true,
    algorithm: { name: 'HMAC' },
    usages: ['sign', 'verify']
  })),
  deriveBits: vi.fn().mockImplementation(() => Promise.resolve(new ArrayBuffer(32))),
  importKey: vi.fn().mockImplementation(() => Promise.resolve({
    type: 'secret',
    extractable: true,
    algorithm: { name: 'HMAC' },
    usages: ['sign', 'verify']
  })),
  exportKey: vi.fn().mockImplementation((format) => {
    if (format === 'jwk') {
      return Promise.resolve({ kty: 'oct', k: 'mockKey', alg: 'HS256', ext: true });
    } 
    return Promise.resolve(new ArrayBuffer(32));
  }),
  wrapKey: vi.fn().mockImplementation(() => Promise.resolve(new ArrayBuffer(32))),
  unwrapKey: vi.fn().mockImplementation(() => Promise.resolve({
    type: 'secret',
    extractable: true,
    algorithm: { name: 'HMAC' },
    usages: ['sign', 'verify']
  }))
};

// Define a simple mock for Crypto
const mockCrypto = {
  subtle: mockSubtleCrypto,
  getRandomValues: vi.fn().mockImplementation((array) => {
    if (!array) return array;
    
    // Fill with pseudo-random numbers
    const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
  randomUUID: vi.fn().mockImplementation(() => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  })
};

// Check if crypto needs to be mocked
const needsPolyfill = typeof global.crypto === 'undefined' || 
                     (typeof global.crypto !== 'undefined' && !global.crypto.subtle);

// Set up the global.crypto object for the test environment if needed
if (needsPolyfill) {
  console.log('Polyfilling crypto API for test environment');
  
  // Define crypto on global
  Object.defineProperty(global, 'crypto', {
    value: mockCrypto,
    writable: false,
    configurable: false
  });
  
  // Also define it on window if available
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'crypto', {
      value: mockCrypto,
      writable: false,
      configurable: false
    });
  }
} else {
  console.log('Using existing crypto implementation');
}

afterEach(() => {
  cleanup();
}); 