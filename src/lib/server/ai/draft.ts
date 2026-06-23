import { chat, type ModelMessage } from '@tanstack/ai';
import { z } from 'zod';
import type { ContentBrief, ContentDraft } from '$lib/content/types';
import { buildAdapter, isAiConfigured } from './provider';

// Re-exported for existing call sites (content engine gates on these).
export { AI_PROVIDERS, isAiConfigured, type AiProvider } from './provider';

const DraftSchema = z.object({
	title: z.string(),
	metaDescription: z.string(),
	outline: z.array(z.object({ heading: z.string(), points: z.array(z.string()) }))
});

const SYSTEM = `You are an expert SEO content strategist. Given a content brief, produce a draft scaffold for a page that can rank on Google: a compelling title (~55 chars, includes the keyword), a meta description (~150 chars), and a section outline (H2 headings with 2-4 bullet points each) that covers the questions and topics. Match the search intent. Do not write the full article — just the scaffold.`;

/**
 * Generate a draft scaffold from a content brief using the configured provider.
 * Throws if AI isn't configured — callers gate on isAiConfigured().
 */
export async function generateDraft(brief: ContentBrief): Promise<ContentDraft> {
	if (!isAiConfigured()) throw new Error('AI drafting is not configured.');

	const prompt = [
		SYSTEM,
		'',
		'Content brief:',
		`Keyword: ${brief.keyword}`,
		`Search intent: ${brief.intent}`,
		`Target length: ~${brief.recommendedWords} words`,
		`Questions to answer: ${brief.questions.join('; ') || '(none found)'}`,
		`Topics to cover: ${brief.entities.join(', ') || '(none found)'}`,
		`Suggested headings: ${brief.headings.join('; ')}`
	].join('\n');

	const messages: ModelMessage[] = [{ role: 'user', content: prompt }];

	// With an outputSchema and no streaming, chat() resolves to the parsed object.
	const draft = await chat({ adapter: buildAdapter(), messages, outputSchema: DraftSchema });
	return draft;
}
