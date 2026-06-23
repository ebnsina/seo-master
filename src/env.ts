import { defineEnvVars } from '@sveltejs/kit/hooks';
import { z } from 'zod';

// Optional vars: an explicit schema that allows `undefined` (declared vars are
// otherwise required to be non-empty strings).
const optional = z.string().optional();

export const variables = defineEnvVars({
	DATABASE_URL: { description: 'The database connection string.' },

	// Background jobs (optional). When set, crawls + rank refreshes run via a
	// BullMQ worker; when unset, crawls run in-process and rank refresh is manual.
	REDIS_URL: {
		description: 'Redis connection string for the job queue (optional).',
		schema: optional
	},

	// PageSpeed Insights — optional key for higher rate limits (works without it).
	PAGESPEED_API_KEY: {
		description: 'Google PageSpeed Insights API key (optional).',
		schema: optional
	},

	// Google Search Console integration. All optional — when unset, the app
	// falls back to guided manual submission instead of the API flow.
	GOOGLE_CLIENT_ID: {
		description: 'Google OAuth client ID for the Search Console integration (optional).',
		schema: optional
	},
	GOOGLE_CLIENT_SECRET: {
		description: 'Google OAuth client secret (optional).',
		schema: optional
	},
	GOOGLE_REDIRECT_URI: {
		description: 'OAuth callback URL. Defaults to <request-origin>/auth/google/callback.',
		schema: optional
	},
	APP_ENCRYPTION_KEY: {
		description: 'Base64-encoded 32-byte key used to encrypt stored OAuth tokens (optional).',
		schema: optional
	},

	// Keyword metrics provider (optional). Without these, keyword research still
	// returns ideas + intent + clusters, just no search volume / difficulty.
	DATAFORSEO_LOGIN: {
		description: 'DataForSEO account login for keyword metrics (optional).',
		schema: optional
	},
	DATAFORSEO_PASSWORD: { description: 'DataForSEO account password (optional).', schema: optional },

	// AI content drafting (optional, provider-agnostic via TanStack AI).
	// Choose any provider — Anthropic is not required. Brief generation works without it.
	AI_PROVIDER: {
		description: 'AI provider for content drafts: openai | anthropic | gemini | ollama (optional).',
		schema: z.enum(['openai', 'anthropic', 'gemini', 'ollama']).optional()
	},
	AI_MODEL: { description: 'Model id for the chosen AI provider (optional).', schema: optional },
	AI_API_KEY: {
		description: 'API key for the chosen AI provider (not needed for ollama).',
		schema: optional
	}
});
