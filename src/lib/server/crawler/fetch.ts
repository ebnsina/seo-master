export const USER_AGENT = 'SEOMasterBot/1.0 (+https://seomaster.app/bot)';

export interface FetchResult {
	/** HTTP status, or 0 if the request never completed (network error / timeout). */
	status: number;
	/** URL after following redirects. */
	finalUrl: string;
	contentType: string;
	body: string;
	/** Set when status is 0. */
	error?: string;
}

/**
 * Fetch a URL politely: identifies our bot, follows redirects, and aborts after
 * a timeout so one slow page can't stall a crawl. Network failures resolve to a
 * status-0 result rather than throwing, so the crawler can record them.
 */
export async function politeFetch(url: string, timeoutMs = 10_000): Promise<FetchResult> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const res = await fetch(url, {
			headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' },
			redirect: 'follow',
			signal: controller.signal
		});

		const contentType = res.headers.get('content-type') ?? '';
		// Only read the body for HTML — skip large binaries.
		const body =
			contentType.includes('html') || contentType.includes('xml') ? await res.text() : '';

		return { status: res.status, finalUrl: res.url || url, contentType, body };
	} catch (err) {
		const error = err instanceof Error ? err.message : 'request failed';
		return { status: 0, finalUrl: url, contentType: '', body: '', error };
	} finally {
		clearTimeout(timer);
	}
}
