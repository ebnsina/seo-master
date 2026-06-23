import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { googleConnection, type GoogleConnection } from '$lib/server/db/schema';
import { decryptSecret, encryptSecret } from '$lib/server/crypto';
import { refreshAccessToken, type TokenResponse } from './oauth';

/** Refresh the access token if it expires within this window. */
const EXPIRY_SKEW_MS = 60_000;

export class GoogleNotConnectedError extends Error {}
export class GoogleReconnectRequiredError extends Error {}

export async function getConnection(organizationId: string): Promise<GoogleConnection | null> {
	const [row] = await db
		.select()
		.from(googleConnection)
		.where(eq(googleConnection.organizationId, organizationId));
	return row ?? null;
}

/** Store (or update) an org's Google connection. Existing refresh token is kept if Google omits a new one. */
export async function saveConnection(
	organizationId: string,
	tokens: TokenResponse,
	email: string | undefined
): Promise<void> {
	const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
	const accessTokenEnc = encryptSecret(tokens.access_token);
	const refreshTokenEnc = tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null;

	await db
		.insert(googleConnection)
		.values({
			organizationId,
			email: email ?? null,
			accessTokenEnc,
			refreshTokenEnc,
			expiresAt,
			scope: tokens.scope
		})
		.onConflictDoUpdate({
			target: googleConnection.organizationId,
			set: {
				email: email ?? null,
				accessTokenEnc,
				expiresAt,
				scope: tokens.scope,
				updatedAt: new Date(),
				// Only overwrite the refresh token when Google returns a fresh one.
				...(refreshTokenEnc ? { refreshTokenEnc } : {})
			}
		});
}

export async function deleteConnection(organizationId: string): Promise<void> {
	await db.delete(googleConnection).where(eq(googleConnection.organizationId, organizationId));
}

/** Return a usable access token, transparently refreshing it when expired. */
export async function getValidAccessToken(organizationId: string): Promise<string> {
	const conn = await getConnection(organizationId);
	if (!conn) throw new GoogleNotConnectedError('Google is not connected.');

	if (conn.expiresAt.getTime() - Date.now() > EXPIRY_SKEW_MS) {
		return decryptSecret(conn.accessTokenEnc);
	}

	if (!conn.refreshTokenEnc) {
		throw new GoogleReconnectRequiredError('Your Google connection expired — please reconnect.');
	}

	const tokens = await refreshAccessToken(decryptSecret(conn.refreshTokenEnc));
	await db
		.update(googleConnection)
		.set({
			accessTokenEnc: encryptSecret(tokens.access_token),
			expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
			updatedAt: new Date(),
			...(tokens.refresh_token ? { refreshTokenEnc: encryptSecret(tokens.refresh_token) } : {})
		})
		.where(eq(googleConnection.organizationId, organizationId));

	return tokens.access_token;
}
