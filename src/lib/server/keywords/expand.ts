/** Modifiers that tease out questions, comparisons and long-tail variations. */
const MODIFIERS = [
	'how',
	'what',
	'why',
	'when',
	'where',
	'which',
	'best',
	'cheap',
	'vs',
	'for',
	'with',
	'near me'
];

const MAX_RESULTS = 60;

/** Hit Google's public autocomplete endpoint (no API key) for one query. */
async function autocomplete(query: string, signal: AbortSignal): Promise<string[]> {
	const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=us&q=${encodeURIComponent(query)}`;
	try {
		const res = await fetch(url, { signal });
		if (!res.ok) return [];
		const data = JSON.parse(await res.text()) as [string, string[]];
		return Array.isArray(data[1]) ? data[1] : [];
	} catch {
		return [];
	}
}

/**
 * Expand a seed into related/long-tail/question keyword ideas using Google
 * Autocomplete. Free and key-less, but provides ideas only (no volume).
 */
export async function expandKeywords(seed: string): Promise<string[]> {
	const trimmed = seed.trim().toLowerCase();
	if (!trimmed) return [];

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 8000);

	const queries = [trimmed, ...MODIFIERS.map((m) => `${m} ${trimmed}`), `${trimmed} `];
	try {
		const batches = await Promise.all(queries.map((q) => autocomplete(q, controller.signal)));

		const seen = new Set<string>();
		const out: string[] = [];
		for (const phrase of [trimmed, ...batches.flat()]) {
			const key = phrase.trim().toLowerCase();
			if (key && !seen.has(key)) {
				seen.add(key);
				out.push(key);
				if (out.length >= MAX_RESULTS) break;
			}
		}
		return out;
	} finally {
		clearTimeout(timer);
	}
}
