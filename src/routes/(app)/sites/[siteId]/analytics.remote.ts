import { z } from 'zod';
import { error } from '@sveltejs/kit';
import { command, query } from '$app/server';
import { requireActiveOrg, requireWriteAccess } from '$lib/server/org';
import { getSiteForOrg, setGa4Property } from '$lib/server/sites/service';
import { getConnection } from '$lib/server/google/connection';
import { getAnalyticsSummary, getAvailableProperties } from '$lib/server/analytics/service';

const siteIdSchema = z.string().uuid();

export const getAnalytics = query(siteIdSchema, async (siteId) => {
	const { organization } = await requireActiveOrg();
	const site = await getSiteForOrg(organization.id, siteId);
	if (!site) error(404, 'Website not found.');

	const connection = await getConnection(organization.id);
	const summary = connection && site.ga4PropertyId ? await getAnalyticsSummary(site) : null;

	return {
		connected: Boolean(connection),
		propertyId: site.ga4PropertyId,
		summary
	};
});

/** List the GA4 properties the connected account can access (for the picker). */
export const listAnalyticsProperties = command(siteIdSchema, async (siteId) => {
	const { organization } = await requireWriteAccess();
	const site = await getSiteForOrg(organization.id, siteId);
	if (!site) error(404, 'Website not found.');

	try {
		return { ok: true as const, properties: await getAvailableProperties(organization.id) };
	} catch (err) {
		return {
			ok: false as const,
			message: err instanceof Error ? err.message : 'Could not load properties.'
		};
	}
});

export const setAnalyticsProperty = command(
	z.object({ siteId: siteIdSchema, propertyId: z.string().min(1) }),
	async ({ siteId, propertyId }) => {
		const { organization } = await requireWriteAccess();
		const site = await getSiteForOrg(organization.id, siteId);
		if (!site) error(404, 'Website not found.');

		await setGa4Property(organization.id, siteId, propertyId);
		await getAnalytics(siteId).refresh();
	}
);
