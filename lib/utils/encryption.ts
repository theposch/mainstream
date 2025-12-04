/**
 * Encryption Utilities
 * 
 * Provides AES-256-GCM encryption for sensitive data like API tokens.
 * 
 * Setup:
 *   1. Generate a key: `openssl rand -hex 32`
 *   2. Add to .env: ENCRYPTION_KEY=your_64_char_hex_key
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Gets the encryption key from environment
 * Returns null if not configured (allows graceful fallback)
 */
function getEncryptionKey(): Buffer | null {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    console.warn('[encryption] ENCRYPTION_KEY not set - tokens will be stored in plaintext');
    return null;
  }
  
  if (key.length !== 64) {
    console.error('[encryption] ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    return null;
  }
  
  return Buffer.from(key, 'hex');
}

/**
 * Encrypts a string using AES-256-GCM
 * 
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: iv:tag:ciphertext (hex encoded)
 *          Returns original string if encryption key not configured
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  
  // Graceful fallback: return plaintext if no key configured
  if (!key) {
    return plaintext;
  }
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    
    const tag = cipher.getAuthTag();
    
    // Format: iv:tag:ciphertext (all hex encoded)
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (error) {
    console.error('[encryption] Encryption failed:', error);
    // Return plaintext on error to avoid data loss
    return plaintext;
  }
}

/**
 * Decrypts a string encrypted with encrypt()
 * 
 * @param ciphertext - The encrypted string (iv:tag:ciphertext format)
 * @returns Decrypted plaintext string
 *          Returns original string if not in encrypted format
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  
  // If no key configured, assume plaintext
  if (!key) {
    return ciphertext;
  }
  
  // Check if it's in our encrypted format (iv:tag:data)
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    // Not encrypted or different format - return as-is
    return ciphertext;
  }
  
  try {
    const [ivHex, tagHex, encryptedHex] = parts;
    
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('[encryption] Decryption failed:', error);
    // Return original on error (might be plaintext)
    return ciphertext;
  }
}

/**
 * Checks if encryption is properly configured
 */
export function isEncryptionEnabled(): boolean {
  return getEncryptionKey() !== null;
}

