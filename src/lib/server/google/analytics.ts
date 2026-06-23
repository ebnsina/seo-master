const ADMIN = 'https://analyticsadmin.googleapis.com/v1beta';
const DATA = 'https://analyticsdata.googleapis.com/v1beta';

export class AnalyticsError extends Error {}

export interface Ga4Property {
	/** e.g. `properties/123456789` */
	property: string;
	displayName: string;
	account: string;
}

/** List GA4 properties the connected account can access (Admin API). */
export async function listProperties(accessToken: string): Promise<Ga4Property[]> {
	const res = await fetch(`${ADMIN}/accountSummaries`, {
		headers: { authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok) throw new AnalyticsError(`Could not list Analytics properties (${res.status}).`);

	const data = (await res.json()) as {
		accountSummaries?: {
			displayName?: string;
			propertySummaries?: { property?: string; displayName?: string }[];
		}[];
	};

	const out: Ga4Property[] = [];
	for (const account of data.accountSummaries ?? []) {
		for (const p of account.propertySummaries ?? []) {
			if (p.property) {
				out.push({
					property: p.property,
					displayName: p.displayName ?? p.property,
					account: account.displayName ?? ''
				});
			}
		}
	}
	return out;
}

export interface AnalyticsSummary {
	users: number;
	sessions: number;
	pageViews: number;
}

function toInt(value: string | undefined): number {
	const n = value ? parseInt(value, 10) : 0;
	return Number.isFinite(n) ? n : 0;
}

/** Run a GA4 summary report (users / sessions / page views) for a date range. */
export async function runSummaryReport(
	accessToken: string,
	propertyId: string,
	startDate: string,
	endDate: string
): Promise<AnalyticsSummary> {
	const res = await fetch(`${DATA}/${propertyId}:runReport`, {
		method: 'POST',
		headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
		body: JSON.stringify({
			dateRanges: [{ startDate, endDate }],
			metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }]
		})
	});
	if (!res.ok) throw new AnalyticsError(`Analytics report failed (${res.status}).`);

	const data = (await res.json()) as { rows?: { metricValues?: { value?: string }[] }[] };
	const values = data.rows?.[0]?.metricValues ?? [];
	return {
		users: toInt(values[0]?.value),
		sessions: toInt(values[1]?.value),
		pageViews: toInt(values[2]?.value)
	};
}
