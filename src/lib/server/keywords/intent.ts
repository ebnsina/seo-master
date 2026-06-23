import type { SearchIntent } from '$lib/server/db/schema';

const TRANSACTIONAL =
	/\b(buy|order|purchase|price|prices|pricing|cost|cheap|cheapest|deal|deals|coupon|discount|sale|shipping|near me|hire|book|booking|subscribe|download|quote)\b/;
const COMMERCIAL =
	/\b(best|top|review|reviews|vs|versus|comparison|compare|alternative|alternatives|brand|brands)\b/;
const NAVIGATIONAL = /\b(login|log in|sign in|sign up|account|dashboard|portal|official)\b/;
const INFORMATIONAL =
	/\b(how|what|why|when|where|who|which|guide|tutorial|tips|ideas|example|examples|learn|meaning|definition|tutorial)\b/;

/**
 * Classify search intent from the phrase using keyword heuristics — no AI
 * needed. Order matters: a "buy" signal outranks a "best" signal, etc.
 */
export function classifyIntent(phrase: string): SearchIntent {
	const p = phrase.toLowerCase();
	if (TRANSACTIONAL.test(p)) return 'transactional';
	if (COMMERCIAL.test(p)) return 'commercial';
	if (NAVIGATIONAL.test(p)) return 'navigational';
	if (INFORMATIONAL.test(p)) return 'informational';
	return 'informational';
}
