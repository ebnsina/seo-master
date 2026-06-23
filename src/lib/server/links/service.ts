import type { Site } from '$lib/server/db/schema';
import { crawlSite } from '$lib/server/crawler';
import { tokenize } from '$lib/server/keywords/cluster';

const MAX_PAGES = 25;
const MIN_SHARED_TERMS = 2;
const SUGGESTION_LIMIT = 15;
const ORPHAN_LIMIT = 20;

interface PageNode {
	url: string;
	title: string;
	terms: Set<string>;
	outbound: Set<string>;
	inbound: number;
}

/** A page with no internal links pointing to it — hard for Google and visitors to find. */
export interface OrphanPage {
	url: string;
	title: string;
}

/** Suggest adding an internal link from one related page to another. */
export interface LinkSuggestion {
	fromUrl: string;
	fromTitle: string;
	toUrl: string;
	toTitle: string;
	/** Shared topic words that make these two pages related. */
	sharedTerms: string[];
}

export interface LinkAnalysis {
	analyzed: boolean;
	needsCrawl?: boolean;
	pagesAnalyzed: number;
	orphans: OrphanPage[];
	suggestions: LinkSuggestion[];
}

function isHomepage(url: string): boolean {
	try {
		return new URL(url).pathname === '/';
	} catch {
		return false;
	}
}

function termSet(title: string, metaDescription: string | undefined): Set<string> {
	return new Set(tokenize(`${title} ${metaDescription ?? ''}`));
}

function shared(a: Set<string>, b: Set<string>): string[] {
	const out: string[] = [];
	for (const t of a) if (b.has(t)) out.push(t);
	return out;
}

/**
 * Crawl the user's own site and analyze its internal-link structure:
 *  - orphan pages (nothing links to them), and
 *  - link opportunities (topically-related pages that don't link to each other).
 * Free: uses our own crawler, no third-party API. On-demand (crawling is slow).
 */
export async function analyzeInternalLinks(site: Site): Promise<LinkAnalysis> {
	const crawl = await crawlSite(site.url, { maxPages: MAX_PAGES });
	const usable = crawl.pages.filter((p) => p.ok && p.title);
	if (usable.length < 2) {
		return {
			analyzed: false,
			needsCrawl: true,
			pagesAnalyzed: usable.length,
			orphans: [],
			suggestions: []
		};
	}

	const urls = new Set(usable.map((p) => p.url));
	const nodes: PageNode[] = usable.map((p) => ({
		url: p.url,
		title: p.title ?? p.url,
		terms: termSet(p.title ?? '', p.metaDescription),
		// Only links that point to pages we actually crawled count toward the graph.
		outbound: new Set(p.internalLinks.filter((l) => urls.has(l))),
		inbound: 0
	}));

	// Tally inbound links across the graph.
	const byUrl = new Map(nodes.map((n) => [n.url, n]));
	for (const node of nodes) {
		for (const target of node.outbound) {
			if (target !== node.url) byUrl.get(target)!.inbound += 1;
		}
	}

	const orphans: OrphanPage[] = nodes
		.filter((n) => n.inbound === 0 && !isHomepage(n.url))
		.slice(0, ORPHAN_LIMIT)
		.map((n) => ({ url: n.url, title: n.title }));

	// Topically-related pages that aren't linked in either direction.
	const suggestions: LinkSuggestion[] = [];
	for (let i = 0; i < nodes.length; i++) {
		for (let j = i + 1; j < nodes.length; j++) {
			const a = nodes[i];
			const b = nodes[j];
			if (a.outbound.has(b.url) || b.outbound.has(a.url)) continue;
			const common = shared(a.terms, b.terms);
			if (common.length < MIN_SHARED_TERMS) continue;

			// Link from the stronger page (more inbound) to the weaker one, spreading authority.
			const [from, to] = a.inbound >= b.inbound ? [a, b] : [b, a];
			suggestions.push({
				fromUrl: from.url,
				fromTitle: from.title,
				toUrl: to.url,
				toTitle: to.title,
				sharedTerms: common.slice(0, 5)
			});
		}
	}

	suggestions.sort((x, y) => y.sharedTerms.length - x.sharedTerms.length);

	return {
		analyzed: true,
		pagesAnalyzed: usable.length,
		orphans,
		suggestions: suggestions.slice(0, SUGGESTION_LIMIT)
	};
}
