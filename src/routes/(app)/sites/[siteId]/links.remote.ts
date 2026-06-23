import { z } from 'zod';
import { error } from '@sveltejs/kit';
import { command } from '$app/server';
import { requireActiveOrg } from '$lib/server/org';
import { getSiteForOrg } from '$lib/server/sites/service';
import { analyzeInternalLinks } from '$lib/server/links/service';

const siteIdSchema = z.string().uuid();

export const analyzeLinks = command(siteIdSchema, async (siteId) => {
	const { organization } = await requireActiveOrg();
	const site = await getSiteForOrg(organization.id, siteId);
	if (!site) error(404, 'Website not found.');
	return analyzeInternalLinks(site);
});
