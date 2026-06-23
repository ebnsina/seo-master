import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	auditIssue,
	crawl,
	page,
	type AuditIssue,
	type Crawl,
	type Page
} from '$lib/server/db/schema';

export interface AuditSnapshot {
	crawl: Crawl;
	issues: AuditIssue[];
	pages: Page[];
}

/** Create a queued crawl for a site. The caller triggers `runCrawl` to execute it. */
export async function createCrawl(siteId: string): Promise<Crawl> {
	const [created] = await db.insert(crawl).values({ siteId, status: 'queued' }).returning();
	return created;
}

export async function getLatestCrawl(siteId: string): Promise<Crawl | null> {
	const [latest] = await db
		.select()
		.from(crawl)
		.where(eq(crawl.siteId, siteId))
		.orderBy(desc(crawl.createdAt))
		.limit(1);
	return latest ?? null;
}

/** Latest crawl for a site plus its issues and pages, or null if never audited. */
export async function getLatestAudit(siteId: string): Promise<AuditSnapshot | null> {
	const latest = await getLatestCrawl(siteId);
	if (!latest) return null;

	const [issues, pages] = await Promise.all([
		db.select().from(auditIssue).where(eq(auditIssue.crawlId, latest.id)),
		db.select().from(page).where(eq(page.crawlId, latest.id))
	]);

	return { crawl: latest, issues, pages };
}

/** True if a crawl for this site is currently queued or running (avoid duplicates). */
export async function hasActiveCrawl(siteId: string): Promise<boolean> {
	const latest = await getLatestCrawl(siteId);
	return latest?.status === 'queued' || latest?.status === 'running';
}
