import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env['ENCRYPTION_KEY'] || 'ajr-encryption-key-32chars-2026';
const IV_LENGTH = 16;

export function encryptValue(text: string): string {
  if (!text) return '';
  let key = ENCRYPTION_KEY;
  if (key.length < 32) key = key.padEnd(32, '0');
  else if (key.length > 32) key = key.substring(0, 32);

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decryptValue(text: string): string {
  if (!text) return '';
  try {
    let key = ENCRYPTION_KEY;
    if (key.length < 32) key = key.padEnd(32, '0');
    else if (key.length > 32) key = key.substring(0, 32);

    const parts = text.split(':');
    if (parts.length < 2) return text;
    const iv = Buffer.from(parts.shift() || '', 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    return text;
  }
}
