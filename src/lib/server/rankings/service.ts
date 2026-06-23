import { desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { keyword, rankSnapshot, type Keyword, type RankSnapshot } from '$lib/server/db/schema';
import { searchAnalyticsQuery, type SearchAnalyticsRow } from '$lib/server/google/searchconsole';

function ymd(d: Date): string {
	return d.toISOString().slice(0, 10);
}

export interface RankingRow {
	keyword: Keyword;
	latest: RankSnapshot | null;
	/** Positions improved since the previous capture (positive = moved up). Null if no history. */
	delta: number | null;
}

/**
 * Pull the trailing-28-day Search Console performance for a property and store a
 * snapshot (dated today) for each saved keyword that has data. Repeated calls on
 * different days build the trend history.
 */
export async function refreshRankings(
	siteId: string,
	accessToken: string,
	property: string
): Promise<{ updated: number }> {
	const saved = await db.select().from(keyword).where(eq(keyword.siteId, siteId));
	if (saved.length === 0) return { updated: 0 };

	const end = new Date();
	const start = new Date();
	start.setDate(start.getDate() - 28);

	const rows = await searchAnalyticsQuery(accessToken, property, {
		startDate: ymd(start),
		endDate: ymd(end),
		dimensions: ['query'],
		rowLimit: 25000
	});

	const byQuery = new Map<string, SearchAnalyticsRow>();
	for (const row of rows) {
		const q = row.keys[0]?.toLowerCase();
		if (q) byQuery.set(q, row);
	}

	const today = ymd(new Date());
	const values = saved.flatMap((k) => {
		const m = byQuery.get(k.phrase.toLowerCase());
		return m
			? [
					{
						keywordId: k.id,
						capturedDate: today,
						position: m.position,
						clicks: m.clicks,
						impressions: m.impressions,
						ctr: m.ctr
					}
				]
			: [];
	});

	if (values.length > 0) {
		await db
			.insert(rankSnapshot)
			.values(values)
			.onConflictDoUpdate({
				target: [rankSnapshot.keywordId, rankSnapshot.capturedDate],
				set: {
					position: sql`excluded.position`,
					clicks: sql`excluded.clicks`,
					impressions: sql`excluded.impressions`,
					ctr: sql`excluded.ctr`
				}
			});
	}

	return { updated: values.length };
}

/** Saved keywords with their latest snapshot and movement since the previous capture. */
export async function getRankings(siteId: string): Promise<RankingRow[]> {
	const saved = await db
		.select()
		.from(keyword)
		.where(eq(keyword.siteId, siteId))
		.orderBy(desc(keyword.volume), desc(keyword.createdAt));
	if (saved.length === 0) return [];

	const snaps = await db
		.select()
		.from(rankSnapshot)
		.where(
			inArray(
				rankSnapshot.keywordId,
				saved.map((k) => k.id)
			)
		)
		.orderBy(desc(rankSnapshot.capturedDate));

	const byKeyword = new Map<string, RankSnapshot[]>();
	for (const snap of snaps) {
		const list = byKeyword.get(snap.keywordId) ?? [];
		list.push(snap);
		byKeyword.set(snap.keywordId, list);
	}

	return saved.map((k) => {
		const history = byKeyword.get(k.id) ?? [];
		const latest = history[0] ?? null;
		const previous = history[1] ?? null;
		const delta =
			latest?.position != null && previous?.position != null
				? previous.position - latest.position
				: null;
		return { keyword: k, latest, delta };
	});
}
