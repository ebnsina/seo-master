import { defineEnvVars } from '@sveltejs/kit/hooks';
import { z } from 'zod';

// Optional vars: an explicit schema that allows `undefined` (declared vars are
// otherwise required to be non-empty strings).
const optional = z.string().optional();

export const variables = defineEnvVars({
	DATABASE_URL: { description: 'The database connection string.' },

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

	// AI content drafting (optional, BYOK). Brief generation works without it.
	ANTHROPIC_API_KEY: {
		description: 'Anthropic API key for AI content drafts (optional, BYOK).',
		schema: optional
	}
});
