import { Principal } from '@dfinity/principal'
import CryptoJS from 'crypto-js'

// Constants
const SUB_ACCOUNT_ZERO = Array(32).fill(0)

/**
 * Convert a principal to an ICP account identifier
 */
export function principalToAccountIdentifier(
  principal: Principal | string,
  subAccount: number[] = SUB_ACCOUNT_ZERO
): Uint8Array {
  // Convert string to Principal if needed
  const principalObj = typeof principal === 'string' 
    ? Principal.fromText(principal) 
    : principal
  
  // Get principal's bytes
  const principalBytes = [...new Uint8Array(principalObj.toUint8Array())]
  
  // Domain separator for account identifier
  const domainSeparator = [...new TextEncoder().encode('\x0Aaccount-id')]
  
  // Combine all data
  const combined = new Uint8Array([
    ...domainSeparator,
    ...principalBytes,
    ...subAccount
  ])
  
  // Create SHA-224 hash
  const hash = CryptoJS.SHA224(bytesToWordArray(combined))
  const hashBytes = wordArrayToByteArray(hash)
  
  // Calculate CRC32 checksum (simplified)
  const checksum = calculateCRC32(hashBytes)
  const checksumBytes = new Uint8Array([
    checksum & 0xff,
    (checksum >> 8) & 0xff,
    (checksum >> 16) & 0xff,
    (checksum >> 24) & 0xff
  ])
  
  // Combine checksum and hash
  const result = new Uint8Array(checksumBytes.length + hashBytes.length)
  result.set(checksumBytes, 0)
  result.set(hashBytes, checksumBytes.length)
  
  return result
}

/**
 * Convert byte array to word array for CryptoJS
 */
function bytesToWordArray(bytes: Uint8Array): CryptoJS.lib.WordArray {
  const words: number[] = []
  for (let i = 0; i < bytes.length; i += 4) {
    words.push(
      (bytes[i] << 24) |
      (bytes[i + 1] << 16) |
      (bytes[i + 2] << 8) |
      bytes[i + 3]
    )
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length)
}

/**
 * Convert CryptoJS word array to byte array
 */
function wordArrayToByteArray(wordArray: CryptoJS.lib.WordArray): Uint8Array {
  const { words, sigBytes } = wordArray
  const result = new Uint8Array(sigBytes)
  for (let i = 0; i < sigBytes; i += 4) {
    const word = words[i / 4]
    result[i] = (word >> 24) & 0xff
    if (i + 1 < sigBytes) result[i + 1] = (word >> 16) & 0xff
    if (i + 2 < sigBytes) result[i + 2] = (word >> 8) & 0xff
    if (i + 3 < sigBytes) result[i + 3] = word & 0xff
  }
  return result
}

/**
 * Simplified CRC32 implementation
 */
function calculateCRC32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    let byte = bytes[i]
    crc = crc ^ byte
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return ~crc
}

/**
 * Convert account identifier to hex string
 */
export function accountIdentifierToHex(accountId: Uint8Array): string {
  return Array.from(accountId)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Get account identifier for ICP ledger from a principal
 */
export function getAccountIdentifier(principal: string | Principal): Uint8Array {
  return principalToAccountIdentifier(principal)
} 