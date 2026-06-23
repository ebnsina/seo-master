import { DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD } from '$app/env/private';

export interface KeywordMetrics {
	/** Monthly search volume. */
	volume: number | null;
	/** Competition/difficulty 0–100. */
	difficulty: number | null;
	/** Cost per click in USD. */
	cpc: number | null;
}

/** US, English by default (DataForSEO location/language codes). */
const LOCATION_CODE = 2840;
const LANGUAGE_CODE = 'en';
const ENDPOINT = 'https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live';

/** Whether a paid metrics provider is configured. Volume/difficulty need this. */
export function isMetricsConfigured(): boolean {
	return Boolean(DATAFORSEO_LOGIN && DATAFORSEO_PASSWORD);
}

interface DfsResultItem {
	keyword?: string;
	search_volume?: number | null;
	competition_index?: number | null;
	cpc?: number | null;
}

/**
 * Fetch volume/difficulty/cpc for phrases from DataForSEO (BYOK via env).
 * Returns an empty map when not configured or on error, so callers degrade
 * gracefully to ideas-only results.
 */
export async function getMetrics(phrases: string[]): Promise<Map<string, KeywordMetrics>> {
	const result = new Map<string, KeywordMetrics>();
	if (!isMetricsConfigured() || phrases.length === 0) return result;

	const auth = Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64');
	try {
		const res = await fetch(ENDPOINT, {
			method: 'POST',
			headers: { authorization: `Basic ${auth}`, 'content-type': 'application/json' },
			body: JSON.stringify([
				{
					keywords: phrases.slice(0, 1000),
					location_code: LOCATION_CODE,
					language_code: LANGUAGE_CODE
				}
			])
		});
		if (!res.ok) return result;

		const data = (await res.json()) as { tasks?: { result?: DfsResultItem[] }[] };
		for (const item of data.tasks?.[0]?.result ?? []) {
			if (!item.keyword) continue;
			result.set(item.keyword.toLowerCase(), {
				volume: item.search_volume ?? null,
				difficulty: item.competition_index ?? null,
				cpc: item.cpc ?? null
			});
		}
		return result;
	} catch {
		return result;
	}
}
