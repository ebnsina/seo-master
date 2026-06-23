import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { competitor, type Competitor, type Site } from '$lib/server/db/schema';
import { crawlSite } from '$lib/server/crawler';
import { getLatestAudit } from '$lib/server/audit/service';
import { tokenize } from '$lib/server/keywords/cluster';
import { InvalidUrlError, normalizeSiteUrl } from '$lib/server/sites/service';

export class DuplicateCompetitorError extends Error {}

const MAX_ANALYZED = 4;
const PAGES_PER_COMPETITOR = 10;
const GAP_LIMIT = 12;

export function listCompetitors(siteId: string): Promise<Competitor[]> {
	return db
		.select()
		.from(competitor)
		.where(eq(competitor.siteId, siteId))
		.orderBy(desc(competitor.createdAt));
}

export async function addCompetitor(siteId: string, urlInput: string): Promise<Competitor> {
	const { url, domain, isLocal } = normalizeSiteUrl(urlInput);
	if (isLocal) throw new InvalidUrlError('Enter a public competitor website.');

	const [existing] = await db
		.select({ id: competitor.id })
		.from(competitor)
		.where(and(eq(competitor.siteId, siteId), eq(competitor.domain, domain)));
	if (existing) throw new DuplicateCompetitorError('That competitor is already added.');

	const [created] = await db
		.insert(competitor)
		.values({ siteId, name: domain, domain, url })
		.returning();
	return created;
}

export async function removeCompetitor(siteId: string, competitorId: string): Promise<void> {
	await db
		.delete(competitor)
		.where(and(eq(competitor.siteId, siteId), eq(competitor.id, competitorId)));
}

/** Count meaningful topic terms across a set of pages (from titles + descriptions). */
function termsFromPages(
	pages: { title: string | null; metaDescription: string | null }[]
): Map<string, number> {
	const counts = new Map<string, number>();
	for (const p of pages) {
		for (const token of tokenize(`${p.title ?? ''} ${p.metaDescription ?? ''}`)) {
			counts.set(token, (counts.get(token) ?? 0) + 1);
		}
	}
	return counts;
}

export interface CompetitorAnalysis {
	domain: string;
	url: string;
	pagesAnalyzed: number;
	topPages: { title: string; url: string }[];
	/** Topics this competitor covers that the user's site doesn't. */
	gapTerms: string[];
}

export interface AnalysisResult {
	analyzed: boolean;
	needsAudit?: boolean;
	needsCompetitors?: boolean;
	competitors: CompetitorAnalysis[];
	/** Combined biggest content opportunities across all competitors. */
	topOpportunities: string[];
}

/**
 * Crawl each competitor and compare their topic coverage to the user's site
 * (from its latest audit), surfacing topics competitors cover that the user
 * doesn't — the content gap. Free: uses our own crawler, no third-party API.
 */
export async function analyzeCompetitors(site: Site): Promise<AnalysisResult> {
	const competitors = await listCompetitors(site.id);
	if (competitors.length === 0)
		return { analyzed: false, needsCompetitors: true, competitors: [], topOpportunities: [] };

	const snapshot = await getLatestAudit(site.id);
	if (!snapshot || snapshot.pages.length === 0) {
		return { analyzed: false, needsAudit: true, competitors: [], topOpportunities: [] };
	}

	const userTerms = termsFromPages(snapshot.pages);
	const combined = new Map<string, number>();

	const analyses = await Promise.all(
		competitors.slice(0, MAX_ANALYZED).map(async (c): Promise<CompetitorAnalysis> => {
			const crawl = await crawlSite(c.url, { maxPages: PAGES_PER_COMPETITOR });
			const exclude = new Set(tokenize(c.domain));
			const compTerms = termsFromPages(
				crawl.pages.map((p) => ({
					title: p.title ?? null,
					metaDescription: p.metaDescription ?? null
				}))
			);

			const gap = [...compTerms.entries()]
				.filter(([term]) => !userTerms.has(term) && !exclude.has(term))
				.sort((a, b) => b[1] - a[1]);

			for (const [term, count] of gap) combined.set(term, (combined.get(term) ?? 0) + count);

			return {
				domain: c.domain,
				url: c.url,
				pagesAnalyzed: crawl.pages.length,
				topPages: crawl.pages
					.filter((p) => p.ok && p.title)
					.slice(0, 8)
					.map((p) => ({ title: p.title ?? '', url: p.url })),
				gapTerms: gap.slice(0, GAP_LIMIT).map(([term]) => term)
			};
		})
	);

	const topOpportunities = [...combined.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, GAP_LIMIT)
		.map(([term]) => term);

	return { analyzed: true, competitors: analyses, topOpportunities };
}
