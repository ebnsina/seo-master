const STOPWORDS = new Set([
	'the',
	'a',
	'an',
	'and',
	'or',
	'for',
	'to',
	'of',
	'in',
	'on',
	'with',
	'without',
	'near',
	'me',
	'my',
	'your',
	'is',
	'are',
	'be',
	'how',
	'what',
	'why',
	'when',
	'where',
	'which',
	'who',
	'can',
	'does',
	'do',
	'will',
	'vs',
	'versus',
	'best',
	'top',
	'cheap',
	'cheapest',
	'free',
	'online'
]);

export function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

export interface Cluster<T> {
	/** The shared theme word these keywords group around. */
	label: string;
	items: T[];
}

/**
 * Group keyword ideas into themes. Each phrase is labelled by its most common
 * meaningful token across the whole set (excluding stop words and the seed),
 * so related long-tails land together. Lightweight — no embeddings.
 */
export function clusterKeywords<T extends { phrase: string }>(
	items: T[],
	seed: string
): Cluster<T>[] {
	const seedTokens = new Set(tokenize(seed));

	const freq = new Map<string, number>();
	for (const item of items) {
		for (const token of tokenize(item.phrase)) {
			if (!seedTokens.has(token)) freq.set(token, (freq.get(token) ?? 0) + 1);
		}
	}

	const byLabel = new Map<string, T[]>();
	const order: string[] = [];
	for (const item of items) {
		const tokens = tokenize(item.phrase).filter((t) => !seedTokens.has(t));
		let label = 'general';
		let bestFreq = 0;
		for (const token of tokens) {
			const f = freq.get(token) ?? 0;
			if (f > bestFreq) {
				bestFreq = f;
				label = token;
			}
		}
		if (!byLabel.has(label)) {
			byLabel.set(label, []);
			order.push(label);
		}
		byLabel.get(label)?.push(item);
	}

	return order
		.map((label) => ({ label, items: byLabel.get(label) ?? [] }))
		.sort((a, b) => b.items.length - a.items.length);
}
