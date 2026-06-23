import { z } from 'zod';
import { error } from '@sveltejs/kit';
import { command, query } from '$app/server';
import { requireActiveOrg } from '$lib/server/org';
import { getSiteForOrg } from '$lib/server/sites/service';
import { analyzeInternalLinks, type LinkAnalysis } from '$lib/server/links/service';
import { loadAnalysis, saveAnalysis } from '$lib/server/analysis/store';

const siteIdSchema = z.string().uuid();

/** The last stored internal-links analysis for a site, with when it was run. */
export const getLastLinkAnalysis = query(siteIdSchema, async (siteId) => {
	const { organization } = await requireActiveOrg();
	const site = await getSiteForOrg(organization.id, siteId);
	if (!site) error(404, 'Website not found.');
	return loadAnalysis<LinkAnalysis>(siteId, 'links');
});

export const analyzeLinks = command(siteIdSchema, async (siteId) => {
	const { organization } = await requireActiveOrg();
	const site = await getSiteForOrg(organization.id, siteId);
	if (!site) error(404, 'Website not found.');
	const result = await analyzeInternalLinks(site);
	if (result.analyzed) {
		await saveAnalysis(siteId, 'links', result);
		await getLastLinkAnalysis(siteId).refresh();
	}
	return result;
});
