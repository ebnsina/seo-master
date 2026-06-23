import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { auditIssue, crawl, page, site } from '$lib/server/db/schema';
import { crawlSite } from '$lib/server/crawler';
import { isLocalHostname } from '$lib/server/sites/service';
import { runAuditRules } from './rules';
import { computeHealthScore, severityForCode } from './score';

/**
 * Execute a queued crawl end-to-end: fetch + analyse the site, persist the pages
 * and findings, and record the health score. Failures are captured on the crawl
 * row so the UI can surface them. This is the unit of work a job queue (BullMQ)
 * would run; for now it's invoked detached from the startAudit command.
 */
export async function runCrawl(crawlId: string): Promise<void> {
	const [target] = await db
		.select({ url: site.url })
		.from(crawl)
		.innerJoin(site, eq(crawl.siteId, site.id))
		.where(eq(crawl.id, crawlId));
	if (!target) return;

	await db
		.update(crawl)
		.set({ status: 'running', startedAt: new Date() })
		.where(eq(crawl.id, crawlId));

	try {
		const result = await crawlSite(target.url);
		const isLocal = isLocalHostname(new URL(target.url).hostname);
		const findings = runAuditRules({ ...result, isLocal });

		const issueRows = findings.map((f) => ({
			crawlId,
			code: f.code,
			severity: severityForCode(f.code),
			pageUrl: f.pageUrl ?? null,
			detail: f.detail ?? null
		}));
		const score = computeHealthScore(issueRows);

		if (result.pages.length) {
			await db.insert(page).values(
				result.pages.map((p) => ({
					crawlId,
					url: p.url,
					statusCode: p.statusCode,
					title: p.title ?? null,
					metaDescription: p.metaDescription ?? null,
					h1Count: p.h1Count,
					wordCount: p.wordCount,
					imagesMissingAlt: p.imagesMissingAlt
				}))
			);
		}
		if (issueRows.length) await db.insert(auditIssue).values(issueRows);

		await db
			.update(crawl)
			.set({
				status: 'completed',
				healthScore: score,
				pagesCrawled: result.pages.length,
				finishedAt: new Date()
			})
			.where(eq(crawl.id, crawlId));
	} catch (err) {
		await db
			.update(crawl)
			.set({
				status: 'failed',
				error: err instanceof Error ? err.message : 'Crawl failed',
				finishedAt: new Date()
			})
			.where(eq(crawl.id, crawlId));
	}
}
