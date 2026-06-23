import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { APP_ENCRYPTION_KEY } from '$app/env/private';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKey(): Buffer {
	if (!APP_ENCRYPTION_KEY) throw new Error('APP_ENCRYPTION_KEY is not set');
	const key = Buffer.from(APP_ENCRYPTION_KEY, 'base64');
	if (key.length !== 32) throw new Error('APP_ENCRYPTION_KEY must decode to 32 bytes');
	return key;
}

/** True if a valid encryption key is configured (used to gate token storage). */
export function hasEncryptionKey(): boolean {
	try {
		getKey();
		return true;
	} catch {
		return false;
	}
}

/** Encrypt a secret with AES-256-GCM. Output: `iv:tag:ciphertext` (all base64). */
export function encryptSecret(plaintext: string): string {
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, getKey(), iv);
	const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decryptSecret(payload: string): string {
	const [ivB64, tagB64, dataB64] = payload.split(':');
	if (!ivB64 || !tagB64 || !dataB64) throw new Error('Malformed ciphertext');

	const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
	decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
	return Buffer.concat([
		decipher.update(Buffer.from(dataB64, 'base64')),
		decipher.final()
	]).toString('utf8');
}
