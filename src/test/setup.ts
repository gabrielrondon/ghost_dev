import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Configure vitest to support jest-dom matchers
expect.extend(await import('@testing-library/jest-dom/matchers').then(module => module.default || module))

// Mock SubtleCrypto for Internet Computer SDK
class MockSubtleCrypto {
  async digest(algorithm: string, data: BufferSource): Promise<ArrayBuffer> {
    // Simple mock that returns a fixed buffer
    return new Uint8Array(32).buffer;
  }
  
  // Add other required methods as empty implementations
  async encrypt() { return new ArrayBuffer(0); }
  async decrypt() { return new ArrayBuffer(0); }
  async sign() { return new ArrayBuffer(0); }
  async verify() { return false; }
  async generateKey() { return {}; }
  async deriveKey() { return {}; }
  async deriveBits() { return new ArrayBuffer(0); }
  async importKey() { return {}; }
  async exportKey() { return {}; }
  async wrapKey() { return new ArrayBuffer(0); }
  async unwrapKey() { return {}; }
}

// Mock Crypto for Internet Computer SDK
class MockCrypto {
  subtle = new MockSubtleCrypto();
  
  getRandomValues<T extends ArrayBufferView | null>(array: T): T {
    if (array === null) return array;
    // Fill with pseudo-random numbers
    const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }
  
  randomUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Set up the global.crypto object for the test environment
if (typeof global.crypto === 'undefined') {
  Object.defineProperty(global, 'crypto', {
    value: new MockCrypto()
  });
}

afterEach(() => {
  cleanup()
}) 