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
const _TAG_LENGTH = 16;

/**
 * Gets the encryption key from environment.
 * Throws if not configured or invalid — sensitive data must not be stored in plaintext.
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      '[encryption] ENCRYPTION_KEY is not set. ' +
      'Generate one with: openssl rand -hex 32'
    );
  }

  if (key.length !== 64) {
    throw new Error(
      '[encryption] ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). ' +
      `Got ${key.length} characters.`
    );
  }

  return Buffer.from(key, 'hex');
}

/**
 * Encrypts a string using AES-256-GCM.
 * Throws if ENCRYPTION_KEY is not configured.
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: iv:tag:ciphertext (hex encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  // Format: iv:tag:ciphertext (all hex encoded)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts a string encrypted with encrypt().
 * Falls back to returning the original string when ENCRYPTION_KEY is not set,
 * to support reading legacy plaintext values already in the database.
 *
 * @param ciphertext - The encrypted string (iv:tag:ciphertext format)
 * @returns Decrypted plaintext string
 */
export function decrypt(ciphertext: string): string {
  // Check if it's in our encrypted format (iv:tag:data) — three hex segments
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    // Not in encrypted format — treat as legacy plaintext
    return ciphertext;
  }

  const key = getEncryptionKey();

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
    throw new Error(
      `[encryption] Decryption failed — key may have changed or data is corrupt: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Checks if encryption is properly configured
 */
export function isEncryptionEnabled(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

