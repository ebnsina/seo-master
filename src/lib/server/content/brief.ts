import type { Site } from '$lib/server/db/schema';
import type { ContentBrief } from '$lib/content/types';
import { getLatestAudit } from '$lib/server/audit/service';
import { expandKeywords } from '$lib/server/keywords/expand';
import { classifyIntent } from '$lib/server/keywords/intent';
import { tokenize } from '$lib/server/keywords/cluster';

const QUESTION_WORDS = [
	'how',
	'what',
	'why',
	'when',
	'where',
	'which',
	'who',
	'can',
	'does',
	'is',
	'are'
];

const RECOMMENDED_WORDS = {
	informational: 1500,
	commercial: 1200,
	transactional: 700,
	navigational: 500
} as const;

function titleCase(phrase: string): string {
	return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

/**
 * Build a content brief for a keyword — works with zero AI. Pulls real questions
 * and related topics from autocomplete, recommends a length by intent, and
 * suggests internal links from the site's own crawled pages.
 */
export async function generateBrief(site: Site, keyword: string): Promise<ContentBrief> {
	const seed = keyword.trim();
	const intent = classifyIntent(seed);
	const phrases = await expandKeywords(seed);

	const seedTokens = new Set(tokenize(seed));

	// Questions: autocomplete phrases that begin with a question word.
	const questions = phrases
		.filter((p) => QUESTION_WORDS.includes(p.split(' ')[0]))
		.slice(0, 8)
		.map(titleCase);

	// Entities/topics: most common meaningful tokens across the expansion.
	const freq = new Map<string, number>();
	for (const p of phrases) {
		for (const token of tokenize(p)) {
			if (!seedTokens.has(token)) freq.set(token, (freq.get(token) ?? 0) + 1);
		}
	}
	const entities = [...freq.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10)
		.map(([term]) => term);

	// Suggested headings: questions first, then sensible defaults.
	const headings = [
		...questions.slice(0, 4),
		`What is ${seed}?`,
		`How to choose ${seed}`,
		`Common mistakes with ${seed}`,
		`${titleCase(seed)} FAQ`
	]
		.filter((h, i, arr) => arr.indexOf(h) === i)
		.slice(0, 6);

	// Internal links: existing pages whose title shares a word with the keyword.
	const snapshot = await getLatestAudit(site.id);
	const internalLinks = (snapshot?.pages ?? [])
		.filter((p) => {
			if (!p.title) return false;
			const titleTokens = new Set(tokenize(p.title));
			return [...seedTokens].some((t) => titleTokens.has(t));
		})
		.slice(0, 5)
		.map((p) => ({ title: p.title ?? p.url, url: p.url }));

	return {
		keyword: seed,
		intent,
		recommendedWords: RECOMMENDED_WORDS[intent],
		questions,
		headings,
		entities,
		internalLinks
	};
}
