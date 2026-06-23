import { USER_AGENT, politeFetch } from './fetch';

interface RobotsGroup {
	agents: string[];
	disallow: string[];
}

export interface RobotsRules {
	found: boolean;
	/** Sitemap URLs declared in robots.txt. */
	sitemaps: string[];
	/** Returns true if the given path may be crawled by our bot. */
	isAllowed: (path: string) => boolean;
	/** Of the given crawler names, which are blocked from the whole site. */
	blockedAgents: (agents: string[]) => string[];
}

function disallowsRoot(group: RobotsGroup): boolean {
	return group.disallow.some((rule) => rule === '/' || rule === '/*');
}

/**
 * Minimal robots.txt parser — enough for polite crawling and detecting which
 * crawlers are blocked. Groups consecutive `User-agent` lines with the rules
 * that follow. Not a full spec implementation (no Allow precedence / wildcards).
 */
export function parseRobots(text: string, found: boolean): RobotsRules {
	const sitemaps: string[] = [];
	const groups: RobotsGroup[] = [];

	let current: RobotsGroup | null = null;
	let lastWasRule = false;

	for (const rawLine of text.split('\n')) {
		const line = rawLine.replace(/#.*$/, '').trim();
		if (!line) continue;

		const sep = line.indexOf(':');
		if (sep === -1) continue;
		const field = line.slice(0, sep).trim().toLowerCase();
		const value = line.slice(sep + 1).trim();

		if (field === 'sitemap') {
			if (value) sitemaps.push(value);
		} else if (field === 'user-agent') {
			// A user-agent line after rules starts a new group.
			if (current && lastWasRule) {
				groups.push(current);
				current = null;
			}
			current ??= { agents: [], disallow: [] };
			current.agents.push(value.toLowerCase());
			lastWasRule = false;
		} else if (field === 'disallow') {
			current ??= { agents: ['*'], disallow: [] };
			if (value) current.disallow.push(value);
			lastWasRule = true;
		} else if (field === 'allow') {
			lastWasRule = true;
		}
	}
	if (current) groups.push(current);

	/** The most specific group for an agent: a named match, else the `*` group. */
	function groupFor(agent: string): RobotsGroup | undefined {
		const a = agent.toLowerCase();
		const named = groups.find((g) => g.agents.some((name) => name !== '*' && a.includes(name)));
		return named ?? groups.find((g) => g.agents.includes('*'));
	}

	const ourGroup = groupFor(USER_AGENT);

	return {
		found,
		sitemaps,
		isAllowed: (path) => !ourGroup?.disallow.some((rule) => path.startsWith(rule)),
		blockedAgents: (agents) =>
			agents.filter((a) => {
				const group = groupFor(a);
				return group ? disallowsRoot(group) : false;
			})
	};
}

export async function fetchRobots(origin: string): Promise<RobotsRules> {
	const res = await politeFetch(new URL('/robots.txt', origin).href);
	const found = res.status >= 200 && res.status < 300 && res.body.length > 0;
	return parseRobots(found ? res.body : '', found);
}
