import type { CrawlResult, PageData } from '$lib/server/crawler';
import type { IssueCode } from '$lib/guidance/issues';

/** A detected problem, ready to be persisted and explained via its guidance. */
export interface Finding {
	code: IssueCode;
	/** Undefined for site-level findings. */
	pageUrl?: string;
	/** Extra context shown to the user, e.g. "Title is 78 characters". */
	detail?: string;
}

export type AuditInput = CrawlResult & { isLocal: boolean };

const TITLE_MAX = 60;
const META_MAX = 160;
const THIN_CONTENT_WORDS = 200;

function auditPage(p: PageData): Finding[] {
	const findings: Finding[] = [];

	if (!p.ok) {
		findings.push({
			code: 'broken_page',
			pageUrl: p.url,
			detail: p.statusCode ? `Returned status ${p.statusCode}` : 'Did not respond'
		});
		return findings; // no point checking on-page signals for a page that didn't load
	}

	if (!p.title) findings.push({ code: 'missing_title', pageUrl: p.url });
	else if (p.title.length > TITLE_MAX)
		findings.push({
			code: 'title_too_long',
			pageUrl: p.url,
			detail: `${p.title.length} characters`
		});

	if (!p.metaDescription) findings.push({ code: 'missing_meta_description', pageUrl: p.url });
	else if (p.metaDescription.length > META_MAX)
		findings.push({
			code: 'meta_description_too_long',
			pageUrl: p.url,
			detail: `${p.metaDescription.length} characters`
		});

	if (p.h1Count === 0) findings.push({ code: 'missing_h1', pageUrl: p.url });
	else if (p.h1Count > 1)
		findings.push({ code: 'multiple_h1', pageUrl: p.url, detail: `${p.h1Count} found` });

	if (p.wordCount < THIN_CONTENT_WORDS)
		findings.push({ code: 'thin_content', pageUrl: p.url, detail: `${p.wordCount} words` });

	if (p.imagesMissingAlt > 0)
		findings.push({
			code: 'images_missing_alt',
			pageUrl: p.url,
			detail: `${p.imagesMissingAlt} of ${p.imageCount} images`
		});

	if (p.noindex) findings.push({ code: 'page_noindex', pageUrl: p.url });

	// AI search readiness (GEO).
	if (!p.hasStructuredData) findings.push({ code: 'missing_structured_data', pageUrl: p.url });
	if (!p.hasOpenGraph) findings.push({ code: 'missing_open_graph', pageUrl: p.url });

	return findings;
}

/** Run all site- and page-level checks over a crawl result. */
export function runAuditRules(input: AuditInput): Finding[] {
	const findings: Finding[] = [];

	// Site-level. A local dev site is expected to be http, so don't flag HTTPS there.
	if (!input.isHttps && !input.isLocal) findings.push({ code: 'no_https' });
	if (!input.robotsFound) findings.push({ code: 'robots_missing' });
	if (!input.sitemapFound) findings.push({ code: 'sitemap_missing' });

	// Site-level AI search readiness (GEO).
	if (input.blockedAiCrawlers.length > 0) {
		findings.push({
			code: 'ai_crawlers_blocked',
			detail: `Blocked: ${input.blockedAiCrawlers.join(', ')}`
		});
	}
	if (!input.llmsTxtFound) findings.push({ code: 'llms_txt_missing' });

	for (const p of input.pages) findings.push(...auditPage(p));

	return findings;
}
