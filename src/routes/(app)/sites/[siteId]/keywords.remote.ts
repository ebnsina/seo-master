import { z } from 'zod';
import { error } from '@sveltejs/kit';
import { command, query } from '$app/server';
import { requireActiveOrg, requireWriteAccess } from '$lib/server/org';
import { getSiteForOrg } from '$lib/server/sites/service';
import { expandKeywords } from '$lib/server/keywords/expand';
import {
	listSavedKeywords,
	removeKeyword as removeKeywordRow,
	researchKeywords as runResearch,
	saveKeyword as saveKeywordRow
} from '$lib/server/keywords/service';

const siteIdSchema = z.string().uuid();
const intentSchema = z.enum(['informational', 'commercial', 'transactional', 'navigational']);

export const researchKeywords = query(
	z.object({ siteId: siteIdSchema, seed: z.string().trim().min(2, 'Enter a topic or phrase.') }),
	async ({ siteId, seed }) => {
		const { organization } = await requireActiveOrg();
		const site = await getSiteForOrg(organization.id, siteId);
		if (!site) error(404, 'Website not found.');

		const phrases = await expandKeywords(seed);
		return runResearch(seed, phrases);
	}
);

export const getSavedKeywords = query(siteIdSchema, async (siteId) => {
	const { organization } = await requireActiveOrg();
	const site = await getSiteForOrg(organization.id, siteId);
	if (!site) error(404, 'Website not found.');
	return listSavedKeywords(siteId);
});

export const saveKeyword = command(
	z.object({
		siteId: siteIdSchema,
		phrase: z.string().trim().min(1),
		intent: intentSchema,
		volume: z.number().nullable().optional(),
		difficulty: z.number().nullable().optional(),
		cpc: z.number().nullable().optional()
	}),
	async ({ siteId, phrase, intent, volume, difficulty, cpc }) => {
		const { organization } = await requireWriteAccess();
		const site = await getSiteForOrg(organization.id, siteId);
		if (!site) error(404, 'Website not found.');

		await saveKeywordRow(siteId, {
			phrase,
			intent,
			volume: volume ?? null,
			difficulty: difficulty ?? null,
			cpc: cpc ?? null
		});
		await getSavedKeywords(siteId).refresh();
	}
);

export const removeKeyword = command(
	z.object({ siteId: siteIdSchema, keywordId: z.string().uuid() }),
	async ({ siteId, keywordId }) => {
		const { organization } = await requireWriteAccess();
		const site = await getSiteForOrg(organization.id, siteId);
		if (!site) error(404, 'Website not found.');

		await removeKeywordRow(siteId, keywordId);
		await getSavedKeywords(siteId).refresh();
	}
);
