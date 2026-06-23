import { createOpenaiChat } from '@tanstack/ai-openai';
import { createAnthropicChat } from '@tanstack/ai-anthropic';
import { createGeminiChat } from '@tanstack/ai-gemini';
import { ollamaText } from '@tanstack/ai-ollama';
import { AI_API_KEY, AI_MODEL, AI_PROVIDER } from '$app/env/private';

/**
 * AI is provider-agnostic (TanStack AI). The deployer/consumer picks the
 * provider, model, and key via env — Anthropic is one option, not a requirement.
 * Every AI feature gates on isAiConfigured() and degrades gracefully when off.
 */
export const AI_PROVIDERS = ['openai', 'anthropic', 'gemini', 'ollama'] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

/** Ollama runs locally and needs no API key; the cloud providers do. */
function needsKey(provider: string): boolean {
	return provider !== 'ollama';
}

/** Whether an AI provider is configured. AI features are optional everywhere. */
export function isAiConfigured(): boolean {
	if (!AI_PROVIDER || !AI_MODEL) return false;
	if (!AI_PROVIDERS.includes(AI_PROVIDER as AiProvider)) return false;
	return !needsKey(AI_PROVIDER) || Boolean(AI_API_KEY);
}

/** Cast a runtime model string to a provider factory's (literal-union) model param. */
function model<TFn extends (m: never, ...rest: never[]) => unknown>(
	value: string
): Parameters<TFn>[0] {
	return value as Parameters<TFn>[0];
}

/** Build the configured provider's text adapter. The model string is validated by the provider at call time. */
export function buildAdapter() {
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
