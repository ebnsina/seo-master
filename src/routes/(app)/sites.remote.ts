import { z } from 'zod';
import { invalid } from '@sveltejs/kit';
import { command, form, query } from '$app/server';
import { requireActiveOrg, requireWriteAccess } from '$lib/server/org';
import {
	DuplicateSiteError,
	InvalidUrlError,
	createSite,
	deleteSite,
	listSitesForOrg
} from '$lib/server/sites/service';

export const getSites = query(async () => {
	const { organization } = await requireActiveOrg();
	return listSitesForOrg(organization.id);
});

const addSiteSchema = z.object({
	name: z.string().trim().optional(),
	url: z.string().trim().min(1, 'Enter your website address.')
});

export const addSite = form(addSiteSchema, async (data, issue) => {
	const { organization } = await requireWriteAccess();

	try {
		await createSite({ organizationId: organization.id, name: data.name ?? '', url: data.url });
	} catch (err) {
		if (err instanceof InvalidUrlError) invalid(issue.url(err.message));
		if (err instanceof DuplicateSiteError) invalid(issue.url(err.message));
		throw err;
	}

	// Refresh the list on the server so the new site is sent back with the result.
	void getSites().refresh();
});

export const removeSite = command(z.string().uuid(), async (siteId) => {
	const { organization } = await requireWriteAccess();
	await deleteSite(organization.id, siteId);
	await getSites().refresh();
});
