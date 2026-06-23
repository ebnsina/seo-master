import type { IssueSeverity } from '$lib/server/db/schema';

/** Where an issue applies — a single page, or the whole site. */
export type IssueScope = 'page' | 'site';

/** How hard the fix is for a non-technical user. */
export type IssueDifficulty = 'easy' | 'technical';

/** `seo` = classic search; `geo` = being found by AI answer engines. */
export type IssueCategory = 'seo' | 'geo';

export interface IssueGuidance {
	/** Short, plain-language headline (no jargon). */
	title: string;
	severity: IssueSeverity;
	scope: IssueScope;
	difficulty: IssueDifficulty;
	/** Defaults to `seo` when omitted. */
	category?: IssueCategory;
	/** What the thing is, explained to someone new to SEO. */
	whatItIs: string;
	/** Why it matters for ranking / visitors. */
	whyItMatters: string;
	/** Concrete steps to fix it. */
	howToFix: string[];
}

/**
 * Every audit finding references one of these codes. Keeping the human-facing
 * content here (not in the DB) means we can improve explanations without a
 * migration, and the audit rules stay focused on detection.
 */
export const ISSUE_GUIDANCE = {
	missing_title: {
		title: 'Page is missing a title',
		severity: 'critical',
		scope: 'page',
		difficulty: 'easy',
		whatItIs:
			'The title is the headline Google shows in search results and what appears on the browser tab.',
		whyItMatters:
			'Without a title, Google has to guess what your page is about — and your result looks broken to people searching.',
		howToFix: [
			'Add a clear, descriptive title (50–60 characters) that includes what the page is about.',
			'Make each page’s title unique.'
		]
	},
	title_too_long: {
		title: 'Title is too long',
		severity: 'notice',
		scope: 'page',
		difficulty: 'easy',
		whatItIs: 'The page title is longer than Google typically shows in search results.',
		whyItMatters: 'Long titles get cut off, so people may not see the most important words.',
		howToFix: ['Shorten the title to about 50–60 characters.', 'Put the important words first.']
	},
	missing_meta_description: {
		title: 'Page has no description',
		severity: 'warning',
		scope: 'page',
		difficulty: 'easy',
		whatItIs:
			'The meta description is the short summary shown under your title in Google’s results.',
		whyItMatters:
			'A good description acts like an ad — it convinces people to click your result instead of a competitor’s.',
		howToFix: [
			'Write a 1–2 sentence summary (about 120–160 characters) of what the page offers.',
			'Make it compelling and specific to the page.'
		]
	},
	meta_description_too_long: {
		title: 'Description is too long',
		severity: 'notice',
		scope: 'page',
		difficulty: 'easy',
		whatItIs: 'The meta description is longer than Google usually displays.',
		whyItMatters: 'The end of a long description gets cut off, so the key message may be lost.',
		howToFix: ['Trim the description to roughly 120–160 characters.']
	},
	missing_h1: {
		title: 'Page has no main heading',
		severity: 'warning',
		scope: 'page',
		difficulty: 'easy',
		whatItIs: 'The H1 is the main visible headline on the page itself (not the browser tab).',
		whyItMatters:
			'Google and visitors use the main heading to understand, at a glance, what the page is about.',
		howToFix: ['Add one clear main heading near the top that describes the page’s topic.']
	},
	multiple_h1: {
		title: 'Page has more than one main heading',
		severity: 'notice',
		scope: 'page',
		difficulty: 'easy',
		whatItIs: 'There are multiple H1 headings, when a page should usually have just one.',
		whyItMatters: 'Multiple main headings can confuse what the page’s primary topic is.',
		howToFix: ['Keep a single main heading (H1).', 'Turn the others into sub-headings (H2, H3).']
	},
	thin_content: {
		title: 'Page has very little content',
		severity: 'warning',
		scope: 'page',
		difficulty: 'easy',
		whatItIs: 'The page has very few words of text.',
		whyItMatters:
			'Pages with little content rarely rank, because Google can’t tell they’re helpful or relevant.',
		howToFix: [
			'Add useful, original content that fully answers what the visitor is looking for.',
			'Aim for genuinely helpful depth, not padding.'
		]
	},
	images_missing_alt: {
		title: 'Some images have no description',
		severity: 'notice',
		scope: 'page',
		difficulty: 'easy',
		whatItIs:
			'Alt text is a short written description of an image, used by screen readers and Google.',
		whyItMatters:
			'It helps your images show up in image search and makes your site accessible to everyone.',
		howToFix: ['Add a short, accurate description (alt text) to each meaningful image.']
	},
	page_noindex: {
		title: 'Page is hidden from Google',
		severity: 'warning',
		scope: 'page',
		difficulty: 'technical',
		whatItIs: 'This page tells search engines not to include it in results (a “noindex” tag).',
		whyItMatters:
			'If this is a page you want found, hiding it means it can never rank — often this is left on by accident.',
		howToFix: [
			'If the page should be findable, remove the noindex tag.',
			'This is usually a setting in your CMS or a meta robots tag — your developer can help.'
		]
	},
	broken_page: {
		title: 'Page could not be loaded',
		severity: 'critical',
		scope: 'page',
		difficulty: 'technical',
		whatItIs: 'The page returned an error instead of loading normally.',
		whyItMatters:
			'Broken pages frustrate visitors and waste Google’s time, hurting trust in your site.',
		howToFix: [
			'Open the page to confirm the problem.',
			'Fix the error or set up a redirect to a working page.'
		]
	},
	no_https: {
		title: 'Site is not secure (no HTTPS)',
		severity: 'critical',
		scope: 'site',
		difficulty: 'technical',
		whatItIs: 'Your site loads over http instead of the secure https.',
		whyItMatters:
			'Browsers warn visitors that the site is “Not secure”, and Google favours secure sites.',
		howToFix: [
			'Install an SSL certificate (most hosts offer this free).',
			'Redirect all http traffic to https.'
		]
	},
	robots_missing: {
		title: 'No robots.txt file',
		severity: 'notice',
		scope: 'site',
		difficulty: 'technical',
		whatItIs:
			'robots.txt is a small file that tells search engines how to crawl your site, and points to your sitemap.',
		whyItMatters:
			'It’s not required, but it helps search engines crawl efficiently and find your sitemap.',
		howToFix: ['Add a robots.txt file at your site’s root that links to your sitemap.']
	},
	sitemap_missing: {
		title: 'No sitemap found',
		severity: 'warning',
		scope: 'site',
		difficulty: 'technical',
		whatItIs: 'A sitemap is a list of your pages that helps search engines discover them all.',
		whyItMatters: 'Without one, Google may miss pages — especially on newer sites with few links.',
		howToFix: [
			'Generate a sitemap.xml (most CMSs and SEO plugins do this automatically).',
			'Reference it from your robots.txt and submit it in Google Search Console.'
		]
	},

	// --- AI search readiness (GEO) ----------------------------------------
	ai_crawlers_blocked: {
		title: 'AI assistants are blocked from your site',
		severity: 'warning',
		scope: 'site',
		difficulty: 'technical',
		category: 'geo',
		whatItIs:
			'Your robots.txt tells AI tools (like ChatGPT, Claude and Perplexity) not to read your site.',
		whyItMatters:
			'If these crawlers are blocked, AI assistants can’t read or cite your pages when people ask them questions — so you stay invisible in AI answers.',
		howToFix: [
			'In your robots.txt, allow the AI crawlers you want (e.g. GPTBot, ClaudeBot, PerplexityBot).',
			'Only keep them blocked if you deliberately don’t want to appear in AI tools.'
		]
	},
	llms_txt_missing: {
		title: 'No llms.txt file for AI tools',
		severity: 'notice',
		scope: 'site',
		difficulty: 'technical',
		category: 'geo',
		whatItIs:
			'llms.txt is a simple file that tells AI assistants what your site is about and which pages matter most.',
		whyItMatters:
			'It’s an emerging standard that helps AI engines understand and summarise your site accurately.',
		howToFix: [
			'Add a plain-text file at /llms.txt with a short description of your site and links to your key pages.'
		]
	},
	missing_structured_data: {
		title: 'No structured data on the page',
		severity: 'notice',
		scope: 'page',
		difficulty: 'technical',
		category: 'geo',
		whatItIs:
			'Structured data (schema.org) is hidden labelling that tells machines what your content means — who you are, what you sell, your articles, FAQs.',
		whyItMatters:
			'It powers Google’s rich results and helps AI engines extract accurate facts to cite about you.',
		howToFix: [
			'Add JSON-LD structured data appropriate to the page (Organization, Article, Product, FAQ).',
			'Most CMS SEO plugins can add this for you.'
		]
	},
	missing_open_graph: {
		title: 'No social/preview tags (Open Graph)',
		severity: 'notice',
		scope: 'page',
		difficulty: 'easy',
		category: 'geo',
		whatItIs:
			'Open Graph tags give a clean title, description and image when your page is shared or summarised.',
		whyItMatters:
			'They control how your page looks when shared on social media and previewed by some AI and chat tools.',
		howToFix: ['Add og:title, og:description and og:image tags to your pages’ <head>.']
	}
} as const satisfies Record<string, IssueGuidance>;

export type IssueCode = keyof typeof ISSUE_GUIDANCE;

export function getGuidance(code: string): IssueGuidance | undefined {
	return ISSUE_GUIDANCE[code as IssueCode];
}

/** Category for a code (defaults to `seo`). */
export function getCategory(code: string): IssueCategory {
	return getGuidance(code)?.category ?? 'seo';
}

/** Penalty applied to the 0–100 health score per issue, by severity. */
export const SEVERITY_WEIGHT: Record<IssueSeverity, number> = {
	critical: 10,
	warning: 4,
	notice: 1.5
};

/** Display order for grouping. */
export const SEVERITY_ORDER: IssueSeverity[] = ['critical', 'warning', 'notice'];
