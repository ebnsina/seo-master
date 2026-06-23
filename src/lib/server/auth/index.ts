import { error, redirect } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import type { SessionUser } from './session';

export * from './password';
export * from './session';
export * from './service';

/**
 * Require an authenticated user inside a remote function or load.
 * Redirects to /login (preserving the target) when unauthenticated.
 */
export function requireUser(): SessionUser {
	const { locals, url } = getRequestEvent();
	if (!locals.user) {
		const redirectTo = url.pathname + url.search;
		redirect(303, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}
	return locals.user;
}

/** Like requireUser, but throws a 401 instead of redirecting (for API-style calls). */
export function requireUserOrError(): SessionUser {
	const { locals } = getRequestEvent();
	if (!locals.user) error(401, 'You must be signed in.');
	return locals.user;
}
