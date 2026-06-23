import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { APP_ENCRYPTION_KEY } from '$app/env/private';

export interface OAuthState {
	siteId: string;
	nonce: string;
	/** Local path to return to after the OAuth round-trip. */
	returnTo: string;
}

function secret(): string {
	if (!APP_ENCRYPTION_KEY) throw new Error('APP_ENCRYPTION_KEY is not set');
	return APP_ENCRYPTION_KEY;
}

function b64url(input: Buffer | string): string {
	return Buffer.from(input)
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

function sign(payload: string): string {
	return b64url(createHmac('sha256', secret()).update(payload).digest());
}

/** Create a tamper-proof OAuth `state` value plus the nonce to store in a cookie. */
export function createState(siteId: string, returnTo: string): { state: string; nonce: string } {
	const nonce = randomBytes(16).toString('hex');
	const payload = b64url(JSON.stringify({ siteId, nonce, returnTo } satisfies OAuthState));
	return { state: `${payload}.${sign(payload)}`, nonce };
}

/** Verify the signature and decode the state, or return null if invalid. */
export function verifyState(state: string): OAuthState | null {
	const [payload, signature] = state.split('.');
	if (!payload || !signature) return null;

	const expected = sign(payload);
	const a = Buffer.from(signature);
	const b = Buffer.from(expected);
	if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

	try {
		const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
		const parsed = JSON.parse(json) as OAuthState;
		if (!parsed.siteId || !parsed.nonce || !parsed.returnTo) return null;
		return parsed;
	} catch {
		return null;
	}
}
