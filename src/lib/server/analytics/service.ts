import type { Site } from '$lib/server/db/schema';
import {
	GoogleNotConnectedError,
	GoogleReconnectRequiredError,
	getValidAccessToken
} from '$lib/server/google/connection';
import {
	listProperties,
	runSummaryReport,
	type AnalyticsSummary,
	type Ga4Property
} from '$lib/server/google/analytics';

function ymd(d: Date): string {
	return d.toISOString().slice(0, 10);
}

export type SummaryOutcome =
	| { ok: true; summary: AnalyticsSummary }
	| { ok: false; reason: 'not_connected' | 'no_property' | 'error'; message: string };

/** Traffic summary (last 28 days) for a site's connected GA4 property. */
export async function getAnalyticsSummary(target: Site): Promise<SummaryOutcome> {
	if (!target.ga4PropertyId) {
		return {
			ok: false,
			reason: 'no_property',
			message: 'Choose a Google Analytics property first.'
		};
	}
	try {
		const accessToken = await getValidAccessToken(target.organizationId);
		const end = new Date();
		const start = new Date();
		start.setDate(start.getDate() - 28);
		const summary = await runSummaryReport(accessToken, target.ga4PropertyId, ymd(start), ymd(end));
		return { ok: true, summary };
	} catch (err) {
		if (err instanceof GoogleNotConnectedError || err instanceof GoogleReconnectRequiredError) {
			return { ok: false, reason: 'not_connected', message: err.message };
		}
		return { ok: false, reason: 'error', message: err instanceof Error ? err.message : 'Failed.' };
	}
}

/** GA4 properties the org's connected account can access (for the picker). */
export async function getAvailableProperties(organizationId: string): Promise<Ga4Property[]> {
	const accessToken = await getValidAccessToken(organizationId);
	return listProperties(accessToken);
}
