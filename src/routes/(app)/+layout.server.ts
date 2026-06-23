import { redirect } from '@sveltejs/kit';
import { requireActiveOrg } from '$lib/server/org';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		const redirectTo = url.pathname + url.search;
		redirect(303, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	const { organization, role } = await requireActiveOrg();
	return { user: locals.user, organization, role };
};
