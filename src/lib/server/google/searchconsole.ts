const BASE = 'https://www.googleapis.com/webmasters/v3';

export class SearchConsoleError extends Error {}

export interface SiteEntry {
	siteUrl: string;
	permissionLevel: string;
}

/** Permission levels that are allowed to submit sitemaps. */
const SUBMIT_PERMISSIONS = new Set(['siteOwner', 'siteFullUser']);

/** List the Search Console properties the connected account can access. */
export async function listSites(accessToken: string): Promise<SiteEntry[]> {
	const res = await fetch(`${BASE}/sites`, {
		headers: { authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok) throw new SearchConsoleError(`Could not list Search Console sites (${res.status}).`);
	const data = (await res.json()) as { siteEntry?: SiteEntry[] };
	return data.siteEntry ?? [];
}

/**
 * Find a verified, submittable property matching this site among the account's
 * properties. Tries the URL-prefix form (with trailing slash) and the
 * domain property form. Returns the property's `siteUrl`, or null if none match.
 */
export function matchProperty(entries: SiteEntry[], origin: string, domain: string): string | null {
	const candidates = new Set([`${origin}/`, origin, `sc-domain:${domain.replace(/:\d+$/, '')}`]);

	for (const entry of entries) {
		if (!SUBMIT_PERMISSIONS.has(entry.permissionLevel)) continue;
		if (candidates.has(entry.siteUrl)) return entry.siteUrl;
	}
	return null;
}

/** Add a property to the connected account's Search Console (idempotent). */
export async function addSite(accessToken: string, siteUrl: string): Promise<void> {
	const res = await fetch(`${BASE}/sites/${encodeURIComponent(siteUrl)}`, {
		method: 'PUT',
		headers: { authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok)
		throw new SearchConsoleError(`Could not add the site to Search Console (${res.status}).`);
}

export interface SearchAnalyticsRow {
	/** Dimension values, e.g. [query]. */
	keys: string[];
	clicks: number;
	impressions: number;
	ctr: number;
	position: number;
}

/** Query the Search Analytics API (clicks/impressions/ctr/position) for a property. */
export async function searchAnalyticsQuery(
	accessToken: string,
	siteUrl: string,
	body: { startDate: string; endDate: string; dimensions?: string[]; rowLimit?: number }
): Promise<SearchAnalyticsRow[]> {
	const url = `${BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
	const res = await fetch(url, {
		method: 'POST',
		headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
	if (!res.ok) throw new SearchConsoleError(`Search Analytics query failed (${res.status}).`);
	const data = (await res.json()) as { rows?: SearchAnalyticsRow[] };
	return data.rows ?? [];
}

/** Submit (or re-submit) a sitemap to a Search Console property. */
export async function submitSitemap(
	accessToken: string,
	siteUrl: string,
	feedpath: string
): Promise<void> {
	const url = `${BASE}/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(feedpath)}`;
	const res = await fetch(url, {
		method: 'PUT',
		headers: { authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok) throw new SearchConsoleError(`Sitemap submission failed (${res.status}).`);
}
