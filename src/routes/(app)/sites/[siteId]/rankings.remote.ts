import { z } from 'zod';
import { error } from '@sveltejs/kit';
import { command, query } from '$app/server';
import { requireActiveOrg, requireWriteAccess } from '$lib/server/org';
import { getSiteForOrg } from '$lib/server/sites/service';
import {
	GoogleNotConnectedError,
	GoogleReconnectRequiredError,
	getConnection,
	getValidAccessToken
} from '$lib/server/google/connection';
import { listSites, matchProperty } from '$lib/server/google/searchconsole';
import {
	getRankings as loadRankings,
	refreshRankings as runRefresh
} from '$lib/server/rankings/service';

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

	try {
		const accessToken = await getValidAccessToken(organization.id);
		const property = matchProperty(await listSites(accessToken), site.url, site.domain);
		if (!property) {
			return {
				ok: false,
				needsVerification: true,
				message: 'Verify this site in Search Console first, then refresh rankings.'
			};
		}

		const { updated } = await runRefresh(siteId, accessToken, property);
		await getRankings(siteId).refresh();
		return {
			ok: true,
			updated,
			message: updated
				? `Updated ${updated} keyword${updated === 1 ? '' : 's'} from Google.`
				: 'No Search Console data yet for your saved keywords.'
		};
	} catch (err) {
		if (err instanceof GoogleNotConnectedError || err instanceof GoogleReconnectRequiredError) {
			return { ok: false, needsConnect: true, message: 'Connect Google Search Console first.' };
		}
		return { ok: false, message: err instanceof Error ? err.message : 'Refresh failed.' };
	}
});
