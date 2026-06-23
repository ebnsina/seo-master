import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { analysisSnapshot } from '$lib/server/db/schema';

export type AnalysisKind = 'competitors' | 'links';

export interface StoredAnalysis<T> {
	data: T;
	createdAt: Date;
}

/** Save (or overwrite) the latest analysis of a given kind for a site. */
export async function saveAnalysis(
	siteId: string,
	kind: AnalysisKind,
	data: unknown
): Promise<void> {
	await db
		.insert(analysisSnapshot)
		.values({ siteId, kind, data })
		.onConflictDoUpdate({
			target: [analysisSnapshot.siteId, analysisSnapshot.kind],
			set: { data, createdAt: new Date() }
		});
}

/** Load the latest stored analysis of a kind for a site, if any. */
export async function loadAnalysis<T>(
	siteId: string,
	kind: AnalysisKind
): Promise<StoredAnalysis<T> | null> {
	const [row] = await db
		.select({ data: analysisSnapshot.data, createdAt: analysisSnapshot.createdAt })
		.from(analysisSnapshot)
		.where(and(eq(analysisSnapshot.siteId, siteId), eq(analysisSnapshot.kind, kind)));
	return row ? { data: row.data as T, createdAt: row.createdAt } : null;
}
