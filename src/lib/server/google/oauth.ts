import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } from '$app/env/private';
import { hasEncryptionKey } from '$lib/server/crypto';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo';

/**
 * webmasters → submit sitemaps; siteverification → verify ownership in-app;
 * openid+email → identify the connected account.
 */
export const GOOGLE_SCOPES = [
	'https://www.googleapis.com/auth/webmasters',
	'https://www.googleapis.com/auth/siteverification',
	'https://www.googleapis.com/auth/analytics.readonly',
	'openid',
	'email'
];

export interface TokenResponse {
	access_token: string;
	expires_in: number;
	refresh_token?: string;
	scope: string;
	token_type: string;
}

/** The integration is usable only when the OAuth app and an encryption key are configured. */
export function isGoogleConfigured(): boolean {
	return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && hasEncryptionKey());
}

function requireCreds(): { clientId: string; clientSecret: string } {
	if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
		throw new Error('Google OAuth is not configured.');
	}
	return { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET };
}

export function resolveRedirectUri(origin: string): string {
	return GOOGLE_REDIRECT_URI || `${origin}/auth/google/callback`;
}

/** Build the Google consent screen URL (offline + consent to guarantee a refresh token). */
export function buildAuthUrl(state: string, redirectUri: string): string {
	const { clientId } = requireCreds();
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: GOOGLE_SCOPES.join(' '),
		access_type: 'offline',
		prompt: 'consent',
		include_granted_scopes: 'true',
		state
	});
	return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<TokenResponse> {
	const { clientId, clientSecret } = requireCreds();
	const res = await fetch(TOKEN_ENDPOINT, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			code,
			client_id: clientId,
			client_secret: clientSecret,
			redirect_uri: redirectUri,
			grant_type: 'authorization_code'
		})
	});
	if (!res.ok) throw new Error(`Google token exchange failed (${res.status}).`);
	return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
	const { clientId, clientSecret } = requireCreds();
	const res = await fetch(TOKEN_ENDPOINT, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			refresh_token: refreshToken,
			client_id: clientId,
			client_secret: clientSecret,
			grant_type: 'refresh_token'
		})
	});
	if (!res.ok) throw new Error(`Google token refresh failed (${res.status}).`);
	return res.json();
}

/** Best-effort lookup of the connected account's email for display. */
export async function fetchGoogleEmail(accessToken: string): Promise<string | undefined> {
	const res = await fetch(USERINFO_ENDPOINT, {
		headers: { authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok) return undefined;
	const data = (await res.json()) as { email?: string };
	return data.email;
}
