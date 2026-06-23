import { chat, type ModelMessage } from '@tanstack/ai';
import { createOpenaiChat } from '@tanstack/ai-openai';
import { createAnthropicChat } from '@tanstack/ai-anthropic';
import { createGeminiChat } from '@tanstack/ai-gemini';
import { ollamaText } from '@tanstack/ai-ollama';
import { z } from 'zod';
import { AI_API_KEY, AI_MODEL, AI_PROVIDER } from '$app/env/private';
import type { ContentBrief, ContentDraft } from '$lib/content/types';

/**
 * AI is provider-agnostic (TanStack AI). The deployer/consumer picks the
 * provider, model, and key via env — Anthropic is one option, not a requirement.
 */
export const AI_PROVIDERS = ['openai', 'anthropic', 'gemini', 'ollama'] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

/** Ollama runs locally and needs no API key; the cloud providers do. */
function needsKey(provider: string): boolean {
	return provider !== 'ollama';
}

/** Whether AI drafting is configured. Content briefs work without it. */
export function isAiConfigured(): boolean {
	if (!AI_PROVIDER || !AI_MODEL) return false;
	if (!AI_PROVIDERS.includes(AI_PROVIDER as AiProvider)) return false;
	return !needsKey(AI_PROVIDER) || Boolean(AI_API_KEY);
}

/** Build the configured provider's text adapter. The model string is validated by the provider at call time. */
function buildAdapter() {
	if (!AI_MODEL) throw new Error('AI_MODEL is not set.');
	const key = AI_API_KEY ?? '';

	switch (AI_PROVIDER) {
		case 'openai':
			return createOpenaiChat(model<typeof createOpenaiChat>(AI_MODEL), key);
		case 'anthropic':
			return createAnthropicChat(model<typeof createAnthropicChat>(AI_MODEL), key);
		case 'gemini':
			return createGeminiChat(model<typeof createGeminiChat>(AI_MODEL), key);
		case 'ollama':
			return ollamaText(AI_MODEL);
		default:
			throw new Error(`Unsupported AI provider: ${AI_PROVIDER}`);
	}
}

/** Cast a runtime model string to a provider factory's (literal-union) model param. */
function model<TFn extends (m: never, ...rest: never[]) => unknown>(
	value: string
): Parameters<TFn>[0] {
	return value as Parameters<TFn>[0];
}

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
