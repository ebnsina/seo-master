import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { contentBrief, type ContentBriefRow, type Site } from '$lib/server/db/schema';
import type { ContentDraft } from '$lib/content/types';
import { generateBrief } from './brief';

export function listBriefs(siteId: string): Promise<ContentBriefRow[]> {
	return db
		.select()
		.from(contentBrief)
		.where(eq(contentBrief.siteId, siteId))
		.orderBy(desc(contentBrief.createdAt));
}

export async function getBrief(siteId: string, briefId: string): Promise<ContentBriefRow | null> {
	const [row] = await db
		.select()
		.from(contentBrief)
		.where(and(eq(contentBrief.siteId, siteId), eq(contentBrief.id, briefId)));
	return row ?? null;
}

/** Generate a brief for a keyword and persist it. */
export async function createBrief(site: Site, keyword: string): Promise<ContentBriefRow> {
	const brief = await generateBrief(site, keyword);
	const [created] = await db
		.insert(contentBrief)
		.values({ siteId: site.id, keyword: brief.keyword, intent: brief.intent, brief })
		.returning();
	return created;
}

export async function saveDraft(
	siteId: string,
	briefId: string,
	draft: ContentDraft
): Promise<void> {
	await db
		.update(contentBrief)
		.set({ draft })
		.where(and(eq(contentBrief.siteId, siteId), eq(contentBrief.id, briefId)));
}

export async function deleteBrief(siteId: string, briefId: string): Promise<void> {
	await db
		.delete(contentBrief)
		.where(and(eq(contentBrief.siteId, siteId), eq(contentBrief.id, briefId)));
}
