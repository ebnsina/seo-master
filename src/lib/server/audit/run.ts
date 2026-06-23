import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { auditIssue, crawl, page, site } from '$lib/server/db/schema';
import { crawlSite } from '$lib/server/crawler';
import { isLocalHostname } from '$lib/server/sites/service';
import { CWV_THRESHOLDS, fetchPageSpeed } from '$lib/server/pagespeed/client';
import { runAuditRules, type Finding } from './rules';
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

		// PageSpeed / Core Web Vitals (best-effort) — adds metrics + speed findings.
		const speed = isLocal ? null : await fetchPageSpeed(target.url);
		if (speed) {
			const cwv: Finding[] = [];
			if (
				speed.performanceScore != null &&
				speed.performanceScore < CWV_THRESHOLDS.performanceScore
			)
				cwv.push({ code: 'slow_site', detail: `Performance score ${speed.performanceScore}/100` });
			if (speed.lcpMs != null && speed.lcpMs > CWV_THRESHOLDS.lcpMs)
				cwv.push({ code: 'poor_lcp', detail: `${(speed.lcpMs / 1000).toFixed(1)}s` });
			if (speed.clsScore != null && speed.clsScore > CWV_THRESHOLDS.clsScore)
				cwv.push({ code: 'poor_cls', detail: speed.clsScore.toFixed(2) });
			findings.push(...cwv);
		}

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
				performanceScore: speed?.performanceScore ?? null,
				lcpMs: speed?.lcpMs ?? null,
				clsScore: speed?.clsScore ?? null,
				tbtMs: speed?.tbtMs ?? null,
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
