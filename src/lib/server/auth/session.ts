import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { session, user, type Session, type User } from '$lib/server/db/schema';

export const SESSION_COOKIE_NAME = 'session';

const DAY_MS = 1000 * 60 * 60 * 24;
const SESSION_DURATION_MS = DAY_MS * 30;
/** When a session has less than this remaining, extend it on use (sliding expiry). */
const SESSION_RENEW_THRESHOLD_MS = DAY_MS * 15;

export type SessionValidationResult =
	| { session: Session; user: User }
	| { session: null; user: null };

/** Public-safe user shape exposed to the app (never includes the password hash). */
export type SessionUser = Pick<User, 'id' | 'email' | 'name'>;

export function toSessionUser(u: User): SessionUser {
	return { id: u.id, email: u.email, name: u.name };
}

function generateSessionToken(): string {
	return randomBytes(32).toString('hex');
}

/** Create a new session row for a user and return the opaque token + expiry. */
export async function createSession(userId: string): Promise<Session> {
	const token = generateSessionToken();
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

	const [created] = await db.insert(session).values({ id: token, userId, expiresAt }).returning();

	return created;
}

/**
 * Validate a session token. Returns the session + user, deleting expired
 * sessions and extending ones that are close to expiry (sliding window).
 */
export async function validateSession(token: string): Promise<SessionValidationResult> {
	const [row] = await db
		.select({ session, user })
		.from(session)
		.innerJoin(user, eq(session.userId, user.id))
		.where(eq(session.id, token));

	if (!row) return { session: null, user: null };

	if (Date.now() >= row.session.expiresAt.getTime()) {
		await db.delete(session).where(eq(session.id, token));
		return { session: null, user: null };
	}

	if (row.session.expiresAt.getTime() - Date.now() < SESSION_RENEW_THRESHOLD_MS) {
		const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
		await db.update(session).set({ expiresAt }).where(eq(session.id, token));
		row.session.expiresAt = expiresAt;
	}

	return { session: row.session, user: row.user };
}

export async function invalidateSession(token: string): Promise<void> {
	await db.delete(session).where(eq(session.id, token));
}

export async function invalidateAllSessions(userId: string): Promise<void> {
	await db.delete(session).where(eq(session.userId, userId));
}

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: Date): void {
	cookies.set(SESSION_COOKIE_NAME, token, {
		path: '/',
		httpOnly: true,
		secure: !import.meta.env.DEV,
		sameSite: 'lax',
		expires: expiresAt
	});
}

export function deleteSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}
