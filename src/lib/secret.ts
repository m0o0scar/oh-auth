const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const PBKDF2_ITERATIONS = 150_000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encodeBase64(data: Uint8Array): string {
  if (typeof btoa === 'function') {
    let binary = '';
    data.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(data).toString('base64');
  }
  throw new Error('No base64 encoder available.');
}

function decodeBase64(base64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  throw new Error('No base64 decoder available.');
}

function toBase64Url(data: Uint8Array): string {
  return encodeBase64(data)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return decodeBase64(normalized + padding);
}

async function deriveKey(password: string, salt: Uint8Array) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptUrlSecret(url: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(url),
  );

  const ciphertextBytes = new Uint8Array(ciphertext);
  const combined = new Uint8Array(SALT_LENGTH + IV_LENGTH + ciphertextBytes.byteLength);
  combined.set(salt, 0);
  combined.set(iv, SALT_LENGTH);
  combined.set(ciphertextBytes, SALT_LENGTH + IV_LENGTH);

  return toBase64Url(combined);
}

export async function decryptUrlSecret(secret: string, password: string): Promise<string> {
  const bytes = fromBase64Url(secret);
  if (bytes.length <= SALT_LENGTH + IV_LENGTH) {
    throw new Error('Invalid secret payload');
  }

  const salt = bytes.slice(0, SALT_LENGTH);
  const iv = bytes.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = bytes.slice(SALT_LENGTH + IV_LENGTH);
  const key = await deriveKey(password, salt);

  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return decoder.decode(plaintext);
}

