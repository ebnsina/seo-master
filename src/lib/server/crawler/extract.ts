import * as cheerio from 'cheerio';

/** On-page signals extracted from a single fetched page. */
export interface PageData {
	/** Final URL after redirects. */
	url: string;
	statusCode: number;
	/** True for a successful HTML response. */
	ok: boolean;
	title?: string;
	metaDescription?: string;
	h1Count: number;
	wordCount: number;
	imageCount: number;
	imagesMissingAlt: number;
	canonical?: string;
	/** True if the page asks search engines not to index it. */
	noindex: boolean;
	hasViewport: boolean;
	/** schema.org JSON-LD present — helps search + AI engines understand the page. */
	hasStructuredData: boolean;
	/** Open Graph tags present — used by social + AI preview/summary tools. */
	hasOpenGraph: boolean;
	/** Same-origin links discovered on the page (absolute, de-duplicated). */
	internalLinks: string[];
	externalLinkCount: number;
}

/** Strip the hash and trailing slash so the same page isn't crawled twice. */
export function canonicalizeUrl(href: string, base: string): string | null {
	try {
		const u = new URL(href, base);
		if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
		u.hash = '';
		let out = u.href;
		if (out.endsWith('/') && u.pathname !== '/') out = out.slice(0, -1);
		return out;
	} catch {
		return null;
	}
}

function countWords(text: string): number {
	const cleaned = text.replace(/\s+/g, ' ').trim();
	return cleaned ? cleaned.split(' ').length : 0;
}

/**
 * Parse an HTML document into the signals the audit rules need. `origin` is the
 * site's origin, used to classify links as internal vs external.
 */
export function extractPageData(
	html: string,
	finalUrl: string,
	statusCode: number,
	origin: string
): PageData {
	const $ = cheerio.load(html);

	const title = $('head > title').first().text().trim() || undefined;
	const metaDescription = $('meta[name="description"]').attr('content')?.trim() || undefined;
	const canonical = $('link[rel="canonical"]').attr('href')?.trim() || undefined;
	const robots = ($('meta[name="robots"]').attr('content') ?? '').toLowerCase();
	const noindex = robots.includes('noindex');
	const hasViewport = $('meta[name="viewport"]').length > 0;
	const hasStructuredData = $('script[type="application/ld+json"]').length > 0;
	const hasOpenGraph =
		$('meta[property="og:title"]').length > 0 || $('meta[property="og:description"]').length > 0;

	const h1Count = $('h1').length;

	let imageCount = 0;
	let imagesMissingAlt = 0;
	$('img').each((_, el) => {
		imageCount++;
		const alt = $(el).attr('alt');
		if (alt === undefined || alt.trim() === '') imagesMissingAlt++;
	});

	// Word count from the visible body text (scripts/styles excluded).
	const $body = $('body').clone();
	$body.find('script, style, noscript').remove();
	const wordCount = countWords($body.text());

	const originHost = new URL(origin).host;
	const internal = new Set<string>();
	let externalLinkCount = 0;
	$('a[href]').each((_, el) => {
		const href = $(el).attr('href');
		if (!href) return;
		const abs = canonicalizeUrl(href, finalUrl);
		if (!abs) return;
		if (new URL(abs).host === originHost) internal.add(abs);
		else externalLinkCount++;
	});

	return {
		url: finalUrl,
		statusCode,
		ok: statusCode >= 200 && statusCode < 300,
		title,
		metaDescription,
		h1Count,
		wordCount,
		imageCount,
		imagesMissingAlt,
		canonical,
		noindex,
		hasViewport,
		hasStructuredData,
		hasOpenGraph,
		internalLinks: [...internal],
		externalLinkCount
	};
}
