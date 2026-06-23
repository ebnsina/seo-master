import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { ANTHROPIC_API_KEY } from '$app/env/private';
import type { ContentBrief, ContentDraft } from '$lib/content/types';

/** Whether AI drafting is configured (BYOK). Brief generation works without it. */
export function isAiConfigured(): boolean {
	return Boolean(ANTHROPIC_API_KEY);
}

const DraftSchema = z.object({
	title: z.string(),
	metaDescription: z.string(),
	outline: z.array(z.object({ heading: z.string(), points: z.array(z.string()) }))
});

const SYSTEM = `You are an expert SEO content strategist. Given a content brief, produce a draft scaffold for a page that can rank on Google: a compelling title (~55 chars, includes the keyword), a meta description (~150 chars), and a section outline (H2 headings with 2-4 bullet points each) that covers the questions and topics. Match the search intent. Do not write the full article — just the scaffold.`;

/**
 * Generate an AI draft scaffold from a content brief using the user's Anthropic
 * key (BYOK). Throws if AI isn't configured — callers gate on isAiConfigured().
 */
export async function generateDraft(brief: ContentBrief): Promise<ContentDraft> {
	if (!ANTHROPIC_API_KEY) throw new Error('AI drafting is not configured.');

	const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

	const prompt = [
		`Keyword: ${brief.keyword}`,
		`Search intent: ${brief.intent}`,
		`Target length: ~${brief.recommendedWords} words`,
		`Questions to answer: ${brief.questions.join('; ') || '(none found)'}`,
		`Topics to cover: ${brief.entities.join(', ') || '(none found)'}`,
		`Suggested headings: ${brief.headings.join('; ')}`
	].join('\n');

	const message = await client.messages.parse({
		model: 'claude-opus-4-8',
		max_tokens: 8000,
		system: SYSTEM,
		messages: [{ role: 'user', content: prompt }],
		output_config: { format: zodOutputFormat(DraftSchema) }
	});

	if (!message.parsed_output) throw new Error('AI did not return a usable draft.');
	return message.parsed_output;
}
