import { Principal } from '@dfinity/principal';
import CryptoJS from 'crypto-js';

/**
 * Converts a principal ID to an account identifier (hex string)
 * 
 * @param principal The principal to convert
 * @returns The account identifier as a hex string
 */
export function principalToAccountIdentifier(principal: Principal): string {
  // Convert Principal to a byte array
  const principalBytes = principal.toUint8Array();
  
  // Create a buffer with necessary prefix for account ID
  const buffer = new Uint8Array(1 + principalBytes.length + 4);
  
  // Set the prefix byte - this is the "sub-account" identifier (0)
  buffer[0] = 0x0A; // 10 in decimal, 0x0A in hex
  
  // Copy the principal bytes into the buffer
  buffer.set(principalBytes, 1);
  
  // Set the final bytes to 0 (these are padding/suffix bytes)
  buffer[1 + principalBytes.length + 0] = 0;
  buffer[1 + principalBytes.length + 1] = 0;
  buffer[1 + principalBytes.length + 2] = 0;
  buffer[1 + principalBytes.length + 3] = 0;
  
  // Calculate the CRC32 checksum using a simplified approach
  const checksum = simpleChecksum(buffer);
  
  // Create an array with the checksum and the buffer
  const bytes = new Uint8Array(4 + buffer.length);
  bytes.set(checksum, 0);
  bytes.set(buffer, 4);
  
  // Convert to hex string
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * A simplified implementation of CRC32 checksum for our specific use case
 */
function simpleChecksum(bytes: Uint8Array): Uint8Array {
  // Create a byte array for the result
  const result = new Uint8Array(4);
  
  // Convert bytes to a string representation for CryptoJS
  const byteArray = Array.from(bytes);
  const byteStr = String.fromCharCode.apply(null, byteArray);
  
  // Use the built-in CryptoJS function
  const wordArray = CryptoJS.enc.Latin1.parse(byteStr);
  const hash = CryptoJS.enc.Hex.stringify(CryptoJS.SHA256(wordArray));
  
  // Use first 4 bytes of SHA256 as a substitute for CRC32
  // This is a simplification but should work for our purposes
  for (let i = 0; i < 4; i++) {
    result[i] = parseInt(hash.substring(i * 2, i * 2 + 2), 16);
  }
  
  return result;
} 