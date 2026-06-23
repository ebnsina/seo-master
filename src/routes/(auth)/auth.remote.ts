import { z } from 'zod';
import { invalid, redirect } from '@sveltejs/kit';
import { form, getRequestEvent } from '$app/server';
import {
	EmailInUseError,
	InvalidCredentialsError,
	authenticateUser,
	createSession,
	deleteSessionCookie,
	invalidateSession,
	registerUser,
	setSessionCookie
} from '$lib/server/auth';

/** Only allow same-origin relative paths to prevent open-redirect abuse. */
function safeRedirect(target: string | undefined): string {
	if (target && target.startsWith('/') && !target.startsWith('//')) return target;
	return '/dashboard';
}

// Fields prefixed with `_` are never returned to the client, so passwords are
// not echoed back into the HTML on a validation error.
const registerSchema = z.object({
	name: z.string().trim().min(1, 'Please enter your name.'),
	email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
	_password: z.string().min(8, 'Use at least 8 characters.'),
	redirectTo: z.string().optional()
});

const loginSchema = z.object({
	email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
	_password: z.string().min(1, 'Enter your password.'),
	redirectTo: z.string().optional()
});

export const register = form(registerSchema, async (data, issue) => {
	let userId: string;
	try {
		const created = await registerUser({
			email: data.email,
			password: data._password,
			name: data.name
		});
		userId = created.id;
	} catch (err) {
		if (err instanceof EmailInUseError) {
			invalid(issue.email('That email is already registered.'));
		}
		throw err;
	}

	const { cookies } = getRequestEvent();
	const session = await createSession(userId);
	setSessionCookie(cookies, session.id, session.expiresAt);

	redirect(303, safeRedirect(data.redirectTo));
});

export const login = form(loginSchema, async (data, issue) => {
	let userId: string;
	try {
		const user = await authenticateUser({ email: data.email, password: data._password });
		userId = user.id;
	} catch (err) {
		if (err instanceof InvalidCredentialsError) {
			invalid(issue.email('Incorrect email or password.'));
		}
		throw err;
	}

	const { cookies } = getRequestEvent();
	const session = await createSession(userId);
	setSessionCookie(cookies, session.id, session.expiresAt);

	redirect(303, safeRedirect(data.redirectTo));
});

export const logout = form(async () => {
	const { cookies, locals } = getRequestEvent();
	if (locals.session) await invalidateSession(locals.session.id);
	deleteSessionCookie(cookies);
	redirect(303, '/login');
});
