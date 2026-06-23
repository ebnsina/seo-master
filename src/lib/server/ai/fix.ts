import { chat, type ModelMessage } from '@tanstack/ai';
import { z } from 'zod';
import { getGuidance } from '$lib/guidance/issues';
import { buildAdapter, isAiConfigured } from './provider';

/** Optional page context so the fix is tailored to the actual page, not generic. */
export interface FixPageContext {
	url: string;
	title: string | null;
	metaDescription: string | null;
	/** Extra detail captured by the audit rule (e.g. the offending value). */
	detail: string | null;
}

export interface FixSiteContext {
	name: string;
	domain: string;
	url: string;
}

const FixSchema = z.object({
	/** One or two sentences, in plain language, tailored to this page/site. */
	summary: z.string(),
	/** Concrete, ordered steps the user can follow. */
	steps: z.array(z.string()),
	/** A ready-to-paste snippet (meta tag, robots.txt, JSON-LD, llms.txt…), if applicable. */
	snippet: z.string().nullable(),
	/** Where the snippet goes, e.g. "Add inside <head>" or "Save as /robots.txt". */
	snippetLabel: z.string().nullable()
});

export type IssueFix = z.infer<typeof FixSchema>;

const SYSTEM = `You are an expert SEO engineer helping a non-technical website owner fix one specific issue on their site. Be concrete and specific to THEIR page — use the real title, URL, and topic provided. Write the summary and steps in plain, friendly language (no jargon without a quick explanation). When a fix can be expressed as something they paste into their site, return it in "snippet" with a short "snippetLabel" saying exactly where it goes (e.g. "Add inside the <head> tag", "Save as /robots.txt at your site root", "Add as a <script type=\\"application/ld+json\\"> block"). If no snippet makes sense, set snippet and snippetLabel to null. Keep snippets minimal and valid. Never invent facts about the business — keep generated copy generic where you lack detail, and tell the user what to customize.`;

/**
 * Generate a tailored, copy-pasteable fix for a single audit issue using the
 * configured AI provider. Throws if AI isn't configured — callers gate on
 * isAiConfigured(). The manual guidance in $lib/guidance always works without AI.
 */
export async function generateIssueFix(params: {
	code: string;
	site: FixSiteContext;
	page?: FixPageContext;
}): Promise<IssueFix> {
	if (!isAiConfigured()) throw new Error('AI is not configured.');

	const guidance = getGuidance(params.code);
	const lines: string[] = [
		SYSTEM,
		'',
		`Website: ${params.site.name} (${params.site.url})`,
		`Issue: ${guidance?.title ?? params.code}`,
		guidance ? `What it is: ${guidance.whatItIs}` : '',
		guidance ? `General how-to: ${guidance.howToFix.join(' ')}` : ''
	];

	if (params.page) {
		lines.push(
			'',
			'The affected page:',
			`URL: ${params.page.url}`,
			`Current title: ${params.page.title ?? '(none)'}`,
			`Current meta description: ${params.page.metaDescription ?? '(none)'}`,
			params.page.detail ? `Audit detail: ${params.page.detail}` : ''
		);
	}

	const prompt = lines.filter(Boolean).join('\n');
	const messages: ModelMessage[] = [{ role: 'user', content: prompt }];

	// With an outputSchema and no streaming, chat() resolves to the parsed object.
	return chat({ adapter: buildAdapter(), messages, outputSchema: FixSchema });
}
