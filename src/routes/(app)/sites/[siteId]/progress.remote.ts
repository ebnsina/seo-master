import { z } from 'zod';
import { error } from '@sveltejs/kit';
import { query } from '$app/server';
import { requireActiveOrg } from '$lib/server/org';
import { getSiteForOrg } from '$lib/server/sites/service';
import { computeSiteProgress } from '$lib/server/progress/service';

const siteIdSchema = z.string().uuid();

export const getSiteProgress = query(siteIdSchema, async (siteId) => {
	const { organization } = await requireActiveOrg();
	const site = await getSiteForOrg(organization.id, siteId);
	if (!site) error(404, 'Website not found.');
	return computeSiteProgress(organization.id, site);
});
