import { SEVERITY_WEIGHT, getGuidance } from '$lib/guidance/issues';
import type { IssueSeverity } from '$lib/server/db/schema';

interface SeverityCarrier {
	severity: IssueSeverity;
}

/** 0–100 health score: start at 100 and subtract a weighted penalty per issue. */
export function computeHealthScore(issues: SeverityCarrier[]): number {
	let penalty = 0;
	for (const issue of issues) penalty += SEVERITY_WEIGHT[issue.severity];
	return Math.max(0, Math.round(100 - penalty));
}

export interface Readiness {
	/** True when the site is in good enough shape to submit to Google. */
	ready: boolean;
	criticalCount: number;
	warningCount: number;
	noticeCount: number;
	headline: string;
	detail: string;
}

/**
 * Decide whether a site is ready to be submitted to Google. The bar is: no
 * critical issues. For a local site we additionally remind the user it must be
 * deployed (and re-checked live) before it can actually be submitted.
 */
export function computeReadiness(issues: SeverityCarrier[], isLocal: boolean): Readiness {
	let criticalCount = 0;
	let warningCount = 0;
	let noticeCount = 0;
	for (const issue of issues) {
		if (issue.severity === 'critical') criticalCount++;
		else if (issue.severity === 'warning') warningCount++;
		else noticeCount++;
	}

	const clean = criticalCount === 0;

	if (!clean) {
		return {
			ready: false,
			criticalCount,
			warningCount,
			noticeCount,
			headline: 'Not ready to submit yet',
			detail: `Fix ${criticalCount} critical ${criticalCount === 1 ? 'issue' : 'issues'} first — these will stop your site from ranking.`
		};
	}

	if (isLocal) {
		return {
			ready: true,
			criticalCount,
			warningCount,
			noticeCount,
			headline: 'Looks good locally',
			detail:
				'No critical issues found. Deploy your site to its live address, then run the audit on the public URL before submitting to Google.'
		};
	}

	return {
		ready: true,
		criticalCount,
		warningCount,
		noticeCount,
		headline: 'Ready to submit to Google',
		detail: warningCount
			? `No critical issues. Addressing the ${warningCount} warning${warningCount === 1 ? '' : 's'} will improve your results further.`
			: 'No critical issues found — you’re good to submit to Google Search Console.'
	};
}

/** Look up the severity for an issue code (defaults to notice for unknown codes). */
export function severityForCode(code: string): IssueSeverity {
	return getGuidance(code)?.severity ?? 'notice';
}
