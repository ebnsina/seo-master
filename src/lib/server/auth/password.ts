import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/**
 * Hash a plaintext password with a per-password random salt using scrypt.
 * Returns a self-describing `salt:hash` string (both hex). No external deps.
 */
export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(SALT_LENGTH).toString('hex');
	const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
	return `${salt}:${derivedKey.toString('hex')}`;
}

/** Verify a plaintext password against a stored `salt:hash` string (constant-time). */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [salt, key] = stored.split(':');
	if (!salt || !key) return false;

	const keyBuffer = Buffer.from(key, 'hex');
	const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;

	if (keyBuffer.length !== derivedKey.length) return false;
	return timingSafeEqual(keyBuffer, derivedKey);
}
