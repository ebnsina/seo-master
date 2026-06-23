import { z } from 'zod';
import { error } from '@sveltejs/kit';
import { command, query } from '$app/server';
import { requireActiveOrg, requireWriteAccess } from '$lib/server/org';
import { getSiteForOrg } from '$lib/server/sites/service';
import {
	createBrief as createBriefRow,
	deleteBrief as deleteBriefRow,
	getBrief,
	listBriefs,
	saveDraft
} from '$lib/server/content/service';
import { generateDraft, isAiConfigured } from '$lib/server/ai/draft';

const siteIdSchema = z.string().uuid();

export const getContent = query(siteIdSchema, async (siteId) => {
	const { organization } = await requireActiveOrg();
	const site = await getSiteForOrg(organization.id, siteId);
	if (!site) error(404, 'Website not found.');
	return { aiAvailable: isAiConfigured(), briefs: await listBriefs(siteId) };
});

export const createBrief = command(
	z.object({
		siteId: siteIdSchema,
		keyword: z.string().trim().min(2, 'Enter a topic or keyword.')
	}),
	async ({ siteId, keyword }) => {
		const { organization } = await requireWriteAccess();
		const site = await getSiteForOrg(organization.id, siteId);
		if (!site) error(404, 'Website not found.');

		await createBriefRow(site, keyword);
		await getContent(siteId).refresh();
	}
);

export interface DraftResult {
	ok: boolean;
	message: string;
}

export const generateBriefDraft = command(
	z.object({ siteId: siteIdSchema, briefId: z.string().uuid() }),
	async ({ siteId, briefId }): Promise<DraftResult> => {
		const { organization } = await requireWriteAccess();
		const site = await getSiteForOrg(organization.id, siteId);
		if (!site) error(404, 'Website not found.');

		if (!isAiConfigured()) {
			return { ok: false, message: 'AI drafting isn’t configured on this server.' };
		}

		const row = await getBrief(siteId, briefId);
		if (!row) error(404, 'Brief not found.');

		try {
			const draft = await generateDraft(row.brief);
			await saveDraft(siteId, briefId, draft);
			await getContent(siteId).refresh();
			return { ok: true, message: 'Draft generated.' };
		} catch (err) {
			return {
				ok: false,
				message: err instanceof Error ? err.message : 'Draft generation failed.'
			};
		}
	}
);

export const deleteBrief = command(
	z.object({ siteId: siteIdSchema, briefId: z.string().uuid() }),
	async ({ siteId, briefId }) => {
		const { organization } = await requireWriteAccess();
		const site = await getSiteForOrg(organization.id, siteId);
		if (!site) error(404, 'Website not found.');

		await deleteBriefRow(siteId, briefId);
		await getContent(siteId).refresh();
	}
);
