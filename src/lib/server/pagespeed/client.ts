import { PAGESPEED_API_KEY } from '$app/env/private';

const ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

export interface PageSpeedMetrics {
	/** Overall performance score, 0–100. */
	performanceScore: number | null;
	/** Largest Contentful Paint (ms). */
	lcpMs: number | null;
	/** Cumulative Layout Shift (unitless). */
	clsScore: number | null;
	/** Total Blocking Time (ms). */
	tbtMs: number | null;
}

interface LighthouseAudit {
	numericValue?: number;
}
interface PageSpeedResponse {
	lighthouseResult?: {
		categories?: { performance?: { score?: number | null } };
		audits?: Record<string, LighthouseAudit>;
	};
}

function round(value: number | undefined): number | null {
	return typeof value === 'number' ? Math.round(value) : null;
}

/**
 * Fetch PageSpeed Insights lab metrics for a URL. Best-effort: returns null on
 * any failure (it's slow and rate-limited) so it never breaks an audit.
 */
export async function fetchPageSpeed(
	url: string,
	strategy: 'mobile' | 'desktop' = 'mobile'
): Promise<PageSpeedMetrics | null> {
	const params = new URLSearchParams({ url, strategy, category: 'performance' });
	if (PAGESPEED_API_KEY) params.set('key', PAGESPEED_API_KEY);

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 60_000);
	try {
		const res = await fetch(`${ENDPOINT}?${params.toString()}`, { signal: controller.signal });
		if (!res.ok) return null;

		const data = (await res.json()) as PageSpeedResponse;
		const lr = data.lighthouseResult;
		if (!lr) return null;

		const score = lr.categories?.performance?.score;
		const audits = lr.audits ?? {};
		return {
			performanceScore: typeof score === 'number' ? Math.round(score * 100) : null,
			lcpMs: round(audits['largest-contentful-paint']?.numericValue),
			clsScore: audits['cumulative-layout-shift']?.numericValue ?? null,
			tbtMs: round(audits['total-blocking-time']?.numericValue)
		};
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}

/** Core Web Vitals "good" thresholds (lab proxies). */
export const CWV_THRESHOLDS = { lcpMs: 2500, clsScore: 0.1, performanceScore: 50 };
