import type { Handle } from '@sveltejs/kit';
import {
	SESSION_COOKIE_NAME,
	deleteSessionCookie,
	setSessionCookie,
	toSessionUser,
	validateSession
} from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE_NAME);

	if (!token) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await validateSession(token);

	if (session) {
		// Refresh the cookie so the sliding expiry reaches the browser.
		setSessionCookie(event.cookies, session.id, session.expiresAt);
		event.locals.session = session;
		event.locals.user = toSessionUser(user);
	} else {
		deleteSessionCookie(event.cookies);
		event.locals.session = null;
		event.locals.user = null;
	}

	return resolve(event);
};
