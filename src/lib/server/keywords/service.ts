import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { keyword, type Keyword, type SearchIntent } from '$lib/server/db/schema';
import { clusterKeywords, type Cluster } from './cluster';
import { classifyIntent } from './intent';
import { getMetrics, isMetricsConfigured } from './metrics';

export interface KeywordSuggestion {
	phrase: string;
	intent: SearchIntent;
	volume: number | null;
	difficulty: number | null;
	cpc: number | null;
}

export interface ResearchResult {
	seed: string;
	/** True if a metrics provider supplied volume/difficulty. */
	metricsAvailable: boolean;
	total: number;
	clusters: Cluster<KeywordSuggestion>[];
}

/** Expand a seed → classify intent → enrich with metrics → group into themes. */
export async function researchKeywords(seed: string, phrases: string[]): Promise<ResearchResult> {
	const metrics = await getMetrics(phrases);

	const suggestions: KeywordSuggestion[] = phrases.map((phrase) => {
		const m = metrics.get(phrase);
		return {
			phrase,
			intent: classifyIntent(phrase),
			volume: m?.volume ?? null,
			difficulty: m?.difficulty ?? null,
			cpc: m?.cpc ?? null
		};
	});

	// Highest volume first within a theme (unknown volume sinks to the bottom).
	const clusters = clusterKeywords(suggestions, seed).map((c) => ({
		...c,
		items: [...c.items].sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1))
	}));

	return { seed, metricsAvailable: isMetricsConfigured(), total: suggestions.length, clusters };
}

export function listSavedKeywords(siteId: string): Promise<Keyword[]> {
	return db
		.select()
		.from(keyword)
		.where(eq(keyword.siteId, siteId))
		.orderBy(desc(keyword.volume), desc(keyword.createdAt));
}

/** Save a keyword to a site (idempotent on phrase; refreshes metrics if re-saved). */
export async function saveKeyword(siteId: string, input: KeywordSuggestion): Promise<void> {
	const phrase = input.phrase.trim().toLowerCase();
	if (!phrase) return;

	await db
		.insert(keyword)
		.values({
			siteId,
			phrase,
			intent: input.intent,
			volume: input.volume,
			difficulty: input.difficulty,
			cpc: input.cpc
		})
		.onConflictDoUpdate({
			target: [keyword.siteId, keyword.phrase],
			set: {
				intent: input.intent,
				volume: input.volume,
				difficulty: input.difficulty,
				cpc: input.cpc
			}
		});
}

export async function removeKeyword(siteId: string, keywordId: string): Promise<void> {
	await db.delete(keyword).where(and(eq(keyword.siteId, siteId), eq(keyword.id, keywordId)));
}
