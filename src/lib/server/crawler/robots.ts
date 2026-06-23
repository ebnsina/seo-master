import { USER_AGENT, politeFetch } from './fetch';

export interface RobotsRules {
	found: boolean;
	/** Sitemap URLs declared in robots.txt. */
	sitemaps: string[];
	/** Returns true if the given path may be crawled by our bot. */
	isAllowed: (path: string) => boolean;
}

/**
 * Minimal robots.txt parser — enough for polite crawling. Honours `Disallow`
 * rules in the groups matching our user-agent or `*`, and collects `Sitemap:`
 * declarations. Not a full spec implementation (no wildcards/Allow precedence).
 */
export function parseRobots(text: string, found: boolean): RobotsRules {
	const sitemaps: string[] = [];
	const disallow: string[] = [];

	let appliesToUs = false;
	const ourAgent = USER_AGENT.toLowerCase();

	for (const rawLine of text.split('\n')) {
		const line = rawLine.replace(/#.*$/, '').trim();
		if (!line) continue;

		const sep = line.indexOf(':');
		if (sep === -1) continue;
		const field = line.slice(0, sep).trim().toLowerCase();
		const value = line.slice(sep + 1).trim();

		if (field === 'sitemap') {
			if (value) sitemaps.push(value);
			continue;
		}
		if (field === 'user-agent') {
			const ua = value.toLowerCase();
			appliesToUs = ua === '*' || ourAgent.includes(ua);
			continue;
		}
		if (field === 'disallow' && appliesToUs && value) {
			disallow.push(value);
		}
	}

	return {
		found,
		sitemaps,
		isAllowed: (path: string) => !disallow.some((rule) => path.startsWith(rule))
	};
}

export async function fetchRobots(origin: string): Promise<RobotsRules> {
	const res = await politeFetch(new URL('/robots.txt', origin).href);
	const found = res.status >= 200 && res.status < 300 && res.body.length > 0;
	return parseRobots(found ? res.body : '', found);
}
