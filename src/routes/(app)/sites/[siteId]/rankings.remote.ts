import { z } from 'zod';
import { error } from '@sveltejs/kit';
import { command, query } from '$app/server';
import { requireActiveOrg, requireWriteAccess } from '$lib/server/org';
import { getSiteForOrg } from '$lib/server/sites/service';
import { getConnection } from '$lib/server/google/connection';
import { getRankings as loadRankings, refreshSiteRankings } from '$lib/server/rankings/service';

const siteIdSchema = z.string().uuid();

export const getRankings = query(siteIdSchema, async (siteId) => {
	const { organization } = await requireActiveOrg();
	const site = await getSiteForOrg(organization.id, siteId);
	if (!site) error(404, 'Website not found.');

	const connection = await getConnection(organization.id);
	return { connected: Boolean(connection), rows: await loadRankings(siteId) };
});

export interface RefreshResult {
	ok: boolean;
	message: string;
	updated?: number;
	needsConnect?: boolean;
	needsVerification?: boolean;
}

export const refreshRankings = command(siteIdSchema, async (siteId): Promise<RefreshResult> => {
	const { organization } = await requireWriteAccess();
	const site = await getSiteForOrg(organization.id, siteId);
	if (!site) error(404, 'Website not found.');

	const outcome = await refreshSiteRankings(site);
	if (outcome.ok) {
		await getRankings(siteId).refresh();
		return {
			ok: true,
			updated: outcome.updated,
			message: outcome.updated
				? `Updated ${outcome.updated} keyword${outcome.updated === 1 ? '' : 's'} from Google.`
				: 'No Search Console data yet for your saved keywords.'
		};
	}

	return {
		ok: false,
		needsConnect: outcome.reason === 'not_connected',
		needsVerification: outcome.reason === 'no_property',
		message: outcome.message
	};
});
