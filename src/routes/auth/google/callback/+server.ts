import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireActiveOrg } from '$lib/server/org';
import { exchangeCode, fetchGoogleEmail, resolveRedirectUri } from '$lib/server/google/oauth';
import { saveConnection } from '$lib/server/google/connection';
import { verifyState } from '$lib/server/google/state';

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	const code = url.searchParams.get('code');
	const stateParam = url.searchParams.get('state');
	const nonce = cookies.get('g_oauth');
	cookies.delete('g_oauth', { path: '/' });

	const state = stateParam ? verifyState(stateParam) : null;

	// Reject forged/mismatched callbacks (CSRF protection via signed state + nonce cookie).
	if (!code || !state || !nonce || state.nonce !== nonce) {
		redirect(303, '/dashboard?google=error');
	}

	if (!locals.user) redirect(303, '/login');
	const { organization } = await requireActiveOrg();

	let connected = true;
	try {
		const tokens = await exchangeCode(code, resolveRedirectUri(url.origin));
		const email = await fetchGoogleEmail(tokens.access_token);
		await saveConnection(organization.id, tokens, email);
	} catch {
		connected = false;
	}

	redirect(303, `${state.returnTo}?google=${connected ? 'connected' : 'error'}`);
};
