import { canonicalizeUrl, extractPageData, type PageData } from './extract';
import { politeFetch } from './fetch';
import { fetchRobots } from './robots';
import { discoverSitemapUrls } from './sitemap';

export type { PageData } from './extract';

export interface CrawlOptions {
	maxPages?: number;
	concurrency?: number;
	timeoutMs?: number;
}

export interface CrawlResult {
	origin: string;
	isHttps: boolean;
	robotsFound: boolean;
	sitemapFound: boolean;
	pages: PageData[];
}

const DEFAULTS = { maxPages: 20, concurrency: 5, timeoutMs: 10_000 };

function minimalPageData(url: string, statusCode: number): PageData {
	return {
		url,
		statusCode,
		ok: false,
		h1Count: 0,
		wordCount: 0,
		imageCount: 0,
		imagesMissingAlt: 0,
		noindex: false,
		hasViewport: false,
		internalLinks: [],
		externalLinkCount: 0
	};
}

/**
 * Crawl a site starting from its origin: same-origin BFS, seeded by the sitemap,
 * bounded by `maxPages`, fetched `concurrency` pages at a time, honouring
 * robots.txt Disallow rules. Returns every page's on-page signals for auditing.
 */
export async function crawlSite(origin: string, options: CrawlOptions = {}): Promise<CrawlResult> {
	const { maxPages, concurrency, timeoutMs } = { ...DEFAULTS, ...options };
	const isHttps = new URL(origin).protocol === 'https:';

	const robots = await fetchRobots(origin);
	const sitemap = await discoverSitemapUrls(origin, robots.sitemaps, maxPages);

	const start = canonicalizeUrl(origin, origin) ?? origin;
	const queue: string[] = [start, ...sitemap.urls];
	const queued = new Set<string>(queue);
	const visited = new Set<string>();
	const pages: PageData[] = [];

	while (queue.length && pages.length < maxPages) {
		const batch: string[] = [];
		while (queue.length && batch.length < concurrency && pages.length + batch.length < maxPages) {
			const url = queue.shift();
			if (!url || visited.has(url)) continue;
			if (!robots.isAllowed(new URL(url).pathname)) continue;
			visited.add(url);
			batch.push(url);
		}
		if (!batch.length) break;

		const results = await Promise.all(
			batch.map(async (url) => {
				const res = await politeFetch(url, timeoutMs);
				if (res.body && res.contentType.includes('html')) {
					return extractPageData(res.body, res.finalUrl, res.status, origin);
				}
				return minimalPageData(res.finalUrl, res.status);
			})
		);

		for (const p of results) {
			pages.push(p);
			for (const link of p.internalLinks) {
				if (!visited.has(link) && !queued.has(link) && queued.size < maxPages * 5) {
					queued.add(link);
					queue.push(link);
				}
			}
		}
	}

	return {
		origin,
		isHttps,
		robotsFound: robots.found,
		sitemapFound: sitemap.found,
		pages
	};
}
