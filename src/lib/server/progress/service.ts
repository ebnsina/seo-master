import type { Site } from '$lib/server/db/schema';
import { getLatestAudit } from '$lib/server/audit/service';
import { getConnection } from '$lib/server/google/connection';
import { listSavedKeywords } from '$lib/server/keywords/service';
import { listBriefs } from '$lib/server/content/service';

/** A single onboarding step toward a site that ranks. */
export interface ProgressStep {
	key: 'added' | 'audited' | 'no_critical' | 'google' | 'keywords' | 'content';
	label: string;
	hint: string;
	done: boolean;
}

export interface SiteProgress {
	steps: ProgressStep[];
	completed: number;
	total: number;
	percent: number;
}

/**
 * Compute a beginner-friendly "how far along is this site" checklist by reading
 * the data each feature already produces. Read-only; no side effects.
 */
export async function computeSiteProgress(
	organizationId: string,
	site: Site
): Promise<SiteProgress> {
	const [snapshot, connection, keywords, briefs] = await Promise.all([
		getLatestAudit(site.id),
		getConnection(organizationId),
		listSavedKeywords(site.id),
		listBriefs(site.id)
	]);

	const audited = snapshot?.crawl.status === 'completed';
	const criticalCount = snapshot?.issues.filter((i) => i.severity === 'critical').length ?? 0;

	const steps: ProgressStep[] = [
		{ key: 'added', label: 'Add your website', hint: 'Done — your site is set up.', done: true },
		{
			key: 'audited',
			label: 'Run your first audit',
			hint: 'See exactly what to fix, in plain language.',
			done: audited
		},
		{
			key: 'no_critical',
			label: 'Fix critical issues',
			hint: audited
				? criticalCount > 0
					? `${criticalCount} critical ${criticalCount === 1 ? 'issue' : 'issues'} left to fix.`
					: 'No critical issues — great.'
				: 'Run an audit to check for blockers.',
			done: audited && criticalCount === 0
		},
		{
			key: 'google',
			label: 'Connect to Google',
			hint: 'Submit your site and track real rankings.',
			done: Boolean(connection)
		},
		{
			key: 'keywords',
			label: 'Research keywords',
			hint: 'Find what your audience actually searches for.',
			done: keywords.length > 0
		},
		{
			key: 'content',
			label: 'Plan your content',
			hint: 'Create a brief for a page you want to rank.',
			done: briefs.length > 0
		}
	];

	const completed = steps.filter((s) => s.done).length;
	return {
		steps,
		completed,
		total: steps.length,
		percent: Math.round((completed / steps.length) * 100)
	};
}
