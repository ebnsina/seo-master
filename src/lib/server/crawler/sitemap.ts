import * as cheerio from 'cheerio';
import { canonicalizeUrl } from './extract';
import { politeFetch } from './fetch';

function parseLocs(xml: string): string[] {
	const $ = cheerio.load(xml, { xml: true });
	const locs: string[] = [];
	$('loc').each((_, el) => {
		const value = $(el).text().trim();
		if (value) locs.push(value);
	});
	return locs;
}

/**
 * Discover page URLs from sitemaps. Tries the sitemaps declared in robots.txt,
 * then falls back to /sitemap.xml. Resolves one level of sitemap-index nesting.
 * Returns same-origin page URLs (capped), or [] if no sitemap exists.
 */
export async function discoverSitemapUrls(
	origin: string,
	declaredSitemaps: string[],
	cap = 50
): Promise<{ found: boolean; urls: string[] }> {
	const candidates = declaredSitemaps.length
		? declaredSitemaps
		: [new URL('/sitemap.xml', origin).href];

	const originHost = new URL(origin).host;
	const pageUrls = new Set<string>();
	let found = false;

	for (const sitemapUrl of candidates) {
		const res = await politeFetch(sitemapUrl);
		if (res.status < 200 || res.status >= 300 || !res.body) continue;
		found = true;

		const locs = parseLocs(res.body);
		const nested = locs.filter((l) => l.toLowerCase().endsWith('.xml')).slice(0, 5);
		const direct = locs.filter((l) => !l.toLowerCase().endsWith('.xml'));

		for (const url of direct) addSameOrigin(url, origin, originHost, pageUrls, cap);

		for (const sub of nested) {
			if (pageUrls.size >= cap) break;
			const subRes = await politeFetch(sub);
			if (subRes.status < 200 || subRes.status >= 300 || !subRes.body) continue;
			for (const url of parseLocs(subRes.body)) {
				addSameOrigin(url, origin, originHost, pageUrls, cap);
			}
		}

		if (pageUrls.size >= cap) break;
	}

	return { found, urls: [...pageUrls] };
}

function addSameOrigin(
	url: string,
	origin: string,
	originHost: string,
	out: Set<string>,
	cap: number
): void {
	if (out.size >= cap) return;
	const abs = canonicalizeUrl(url, origin);
	if (abs && new URL(abs).host === originHost) out.add(abs);
}
