import { z } from 'zod';
import { error } from '@sveltejs/kit';
import { command, query } from '$app/server';
import { requireActiveOrg, requireWriteAccess } from '$lib/server/org';
import { getSiteForOrg } from '$lib/server/sites/service';
import { SiteError } from '$lib/server/sites/service';
import {
	DuplicateCompetitorError,
	addCompetitor as addCompetitorRow,
	analyzeCompetitors as runAnalysis,
	listCompetitors,
	removeCompetitor as removeCompetitorRow,
	type AnalysisResult
} from '$lib/server/competitors/service';
import { loadAnalysis, saveAnalysis } from '$lib/server/analysis/store';

const siteIdSchema = z.string().uuid();

export const getCompetitors = query(siteIdSchema, async (siteId) => {
	const { organization } = await requireActiveOrg();
	const site = await getSiteForOrg(organization.id, siteId);
	if (!site) error(404, 'Website not found.');
	return listCompetitors(siteId);
});

export interface AddResult {
	ok: boolean;
	message?: string;
}

export const addCompetitor = command(
	z.object({ siteId: siteIdSchema, url: z.string().trim().min(1, 'Enter a website address.') }),
	async ({ siteId, url }): Promise<AddResult> => {
		const { organization } = await requireWriteAccess();
		const site = await getSiteForOrg(organization.id, siteId);
		if (!site) error(404, 'Website not found.');

		try {
			await addCompetitorRow(siteId, url);
		} catch (err) {
			if (err instanceof DuplicateCompetitorError || err instanceof SiteError) {
				return { ok: false, message: err.message };
			}
			throw err;
		}
		await getCompetitors(siteId).refresh();
		return { ok: true };
	}
);

export const removeCompetitor = command(
	z.object({ siteId: siteIdSchema, competitorId: z.string().uuid() }),
	async ({ siteId, competitorId }) => {
		const { organization } = await requireWriteAccess();
		const site = await getSiteForOrg(organization.id, siteId);
		if (!site) error(404, 'Website not found.');

		await removeCompetitorRow(siteId, competitorId);
		await getCompetitors(siteId).refresh();
	}
);

/** The last stored competitor analysis for a site, with when it was run. */
export const getLastAnalysis = query(siteIdSchema, async (siteId) => {
	const { organization } = await requireActiveOrg();
	const site = await getSiteForOrg(organization.id, siteId);
	if (!site) error(404, 'Website not found.');
	return loadAnalysis<AnalysisResult>(siteId, 'competitors');
});

export const analyzeCompetitors = command(siteIdSchema, async (siteId) => {
	const { organization } = await requireActiveOrg();
	const site = await getSiteForOrg(organization.id, siteId);
	if (!site) error(404, 'Website not found.');
	const result = await runAnalysis(site);
	// Only cache real analyses, not the "needs setup" placeholders.
	if (result.analyzed) {
		await saveAnalysis(siteId, 'competitors', result);
		await getLastAnalysis(siteId).refresh();
	}
	return result;
});
