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

/**
 * Build a weighted set of topic terms from pages — single words *and* adjacent
 * word pairs (bigrams) so we surface real topics ("trail running") rather than
 * lone tokens. Bigrams are weighted higher; title and description are tokenized
 * separately so phrases never bridge unrelated fields.
 */
function termsFromPages(
	pages: { title: string | null; metaDescription: string | null }[]
): Map<string, number> {
	const counts = new Map<string, number>();
	const bump = (term: string, by: number) => counts.set(term, (counts.get(term) ?? 0) + by);
	const addField = (text: string) => {
		const tokens = tokenize(text);
		for (let i = 0; i < tokens.length; i++) {
			bump(tokens[i], 1);
			if (i + 1 < tokens.length) bump(`${tokens[i]} ${tokens[i + 1]}`, 2);
		}
	};
	for (const p of pages) {
		addField(p.title ?? '');
		addField(p.metaDescription ?? '');
	}
	return counts;
}

/** Prefer multi-word topics, then frequency — phrases are more actionable. */
function rankTerms(a: [string, number], b: [string, number]): number {
	const phraseA = a[0].includes(' ') ? 1 : 0;
	const phraseB = b[0].includes(' ') ? 1 : 0;
	if (phraseA !== phraseB) return phraseB - phraseA;
	return b[1] - a[1];
}

export interface CompetitorAnalysis {
	domain: string;
	url: string;
	pagesAnalyzed: number;
	/** Distinct topics this competitor covers. */
	topicsCovered: number;
	/** Topics you both cover. */
	sharedTopics: number;
	/** Topics they cover that you don't. */
	gapTopics: number;
	topPages: { title: string; url: string }[];
	/** Top topics this competitor covers that the user's site doesn't. */
	gapTerms: string[];
}

/** A content opportunity, with how many of the analyzed competitors cover it. */
export interface Opportunity {
	term: string;
	competitors: number;
}

export interface AnalysisResult {
	analyzed: boolean;
	needsAudit?: boolean;
	needsCompetitors?: boolean;
	/** Distinct topics your own site covers. */
	yourTopics: number;
	competitors: CompetitorAnalysis[];
	/** Combined biggest content opportunities across all competitors. */
	topOpportunities: Opportunity[];
}

/**
 * Crawl each competitor and compare their topic coverage to the user's site
 * (from its latest audit), surfacing topics competitors cover that the user
 * doesn't — the content gap. Free: uses our own crawler, no third-party API.
 */
export async function analyzeCompetitors(site: Site): Promise<AnalysisResult> {
	const competitors = await listCompetitors(site.id);
	if (competitors.length === 0)
		return {
			analyzed: false,
			needsCompetitors: true,
			yourTopics: 0,
			competitors: [],
			topOpportunities: []
		};

	const snapshot = await getLatestAudit(site.id);
	if (!snapshot || snapshot.pages.length === 0) {
		return {
			analyzed: false,
			needsAudit: true,
			yourTopics: 0,
			competitors: [],
			topOpportunities: []
		};
	}

	const userTerms = termsFromPages(snapshot.pages);
	// term -> set of competitor domains that cover it (opportunity strength)
	const coverage = new Map<string, Set<string>>();
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

			const covered = [...compTerms.entries()].filter(([term]) => !exclude.has(term));
			const gap = covered.filter(([term]) => !userTerms.has(term)).sort(rankTerms);
			const shared = covered.length - gap.length;

			for (const [term, count] of gap) {
				combined.set(term, (combined.get(term) ?? 0) + count);
				(coverage.get(term) ?? coverage.set(term, new Set()).get(term)!).add(c.domain);
			}

			return {
				domain: c.domain,
				url: c.url,
				pagesAnalyzed: crawl.pages.length,
				topicsCovered: covered.length,
				sharedTopics: shared,
				gapTopics: gap.length,
				topPages: crawl.pages
					.filter((p) => p.ok && p.title)
					.slice(0, 8)
					.map((p) => ({ title: p.title ?? '', url: p.url })),
				gapTerms: gap.slice(0, GAP_LIMIT).map(([term]) => term)
			};
		})
	);

	const topOpportunities: Opportunity[] = [...combined.entries()]
		.sort((a, b) => {
			// Opportunities multiple competitors cover are the strongest signal.
			const byReach = (coverage.get(b[0])?.size ?? 0) - (coverage.get(a[0])?.size ?? 0);
			return byReach !== 0 ? byReach : rankTerms(a, b);
		})
		.slice(0, GAP_LIMIT)
		.map(([term]) => ({ term, competitors: coverage.get(term)?.size ?? 1 }));

	return { analyzed: true, yourTopics: userTerms.size, competitors: analyses, topOpportunities };
}
