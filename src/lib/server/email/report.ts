import { eq } from 'drizzle-orm';
import { APP_URL } from '$app/env/private';
import { db } from '$lib/server/db';
import { member, user, type Site, type User } from '$lib/server/db/schema';
import { listSitesForOrg } from '$lib/server/sites/service';
import { getLatestAudit } from '$lib/server/audit/service';
import { isEmailConfigured, sendMail } from './mailer';

interface SiteLine {
	name: string;
	url: string;
	healthScore: number | null;
	issues: number;
	criticalIssues: number;
	reportUrl: string | null;
}

function esc(s: string): string {
	return s.replace(
		/[&<>"]/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!
	);
}

async function buildSiteLines(sites: Site[]): Promise<SiteLine[]> {
	const base = APP_URL?.replace(/\/$/, '');
	return Promise.all(
		sites.map(async (s) => {
			const snapshot = await getLatestAudit(s.id);
			const issues = snapshot?.issues ?? [];
			return {
				name: s.name,
				url: s.url,
				healthScore: snapshot?.crawl.healthScore ?? null,
				issues: issues.length,
				criticalIssues: issues.filter((i) => i.severity === 'critical').length,
				reportUrl: base ? `${base}/sites/${s.id}` : null
			};
		})
	);
}

function renderEmail(name: string, lines: SiteLine[]): { html: string; text: string } {
	const rows = lines
		.map((l) => {
			const score = l.healthScore == null ? '—' : String(l.healthScore);
			const link = l.reportUrl
				? `<a href="${esc(l.reportUrl)}" style="color:#0068a8;text-decoration:none;">${esc(l.name)}</a>`
				: esc(l.name);
			const critical =
				l.criticalIssues > 0
					? `<span style="color:#d6443a;font-weight:600;">${l.criticalIssues} critical</span>`
					: `<span style="color:#1c9a55;">no critical issues</span>`;
			return `<tr>
				<td style="padding:10px 0;border-bottom:1px solid #eee;">${link}<br><span style="color:#888;font-size:12px;">${esc(l.url)}</span></td>
				<td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${score}</td>
				<td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;">${l.issues} issues<br><span style="font-size:12px;">${critical}</span></td>
			</tr>`;
		})
		.join('');

	const html = `<!doctype html><html><body style="margin:0;background:#f4f3ef;font-family:Arial,Helvetica,sans-serif;color:#161a20;">
		<div style="max-width:560px;margin:0 auto;padding:24px;">
			<p style="font-size:20px;font-weight:700;margin:0 0 4px;">SEO<span style="color:#0068a8;">Master</span></p>
			<h1 style="font-size:22px;margin:16px 0 4px;">Your weekly SEO summary</h1>
			<p style="color:#586072;margin:0 0 20px;">Hi ${esc(name)}, here’s where your websites stand this week.</p>
			<table style="width:100%;border-collapse:collapse;font-size:14px;">
				<thead><tr style="text-align:left;color:#8a92a1;font-size:11px;text-transform:uppercase;">
					<th style="padding-bottom:6px;">Website</th>
					<th style="padding-bottom:6px;text-align:right;">Health</th>
					<th style="padding-bottom:6px;text-align:right;">Issues</th>
				</tr></thead>
				<tbody>${rows}</tbody>
			</table>
			<p style="color:#8a92a1;font-size:12px;margin-top:24px;">You’re getting this because you turned on weekly reports in SEOMaster. You can turn them off in Settings.</p>
		</div>
	</body></html>`;

	const text = [
		`Your weekly SEO summary`,
		`Hi ${name}, here’s where your websites stand this week.`,
		'',
		...lines.map(
			(l) =>
				`• ${l.name} (${l.url}) — health ${l.healthScore ?? '—'}, ${l.issues} issues, ${l.criticalIssues} critical`
		),
		'',
		`Turn off weekly reports anytime in Settings.`
	].join('\n');

	return { html, text };
}

/** All sites a user can see, across the organizations they belong to. */
async function sitesForUser(userId: string): Promise<Site[]> {
	const memberships = await db
		.select({ organizationId: member.organizationId })
		.from(member)
		.where(eq(member.userId, userId));
	const lists = await Promise.all(memberships.map((m) => listSitesForOrg(m.organizationId)));
	// De-dupe by site id (a user could share orgs that surface the same site).
	const seen = new Map<string, Site>();
	for (const s of lists.flat()) seen.set(s.id, s);
	return [...seen.values()];
}

/** Compose and send the weekly summary to a single user. Returns false if skipped. */
export async function sendWeeklyReportTo(u: User): Promise<boolean> {
	const sites = await sitesForUser(u.id);
	if (sites.length === 0) return false;
	const lines = await buildSiteLines(sites);
	const { html, text } = renderEmail(u.name, lines);
	await sendMail({ to: u.email, subject: 'Your weekly SEO summary', html, text });
	return true;
}

/**
 * Send the weekly summary to every user who opted in. No-op when email isn't
 * configured. Called by the scheduled report job.
 */
export async function sendWeeklyReports(): Promise<{ sent: number; skipped: number }> {
	if (!isEmailConfigured()) return { sent: 0, skipped: 0 };
	const recipients = await db.select().from(user).where(eq(user.weeklyReport, true));

	let sent = 0;
	let skipped = 0;
	for (const u of recipients) {
		try {
			if (await sendWeeklyReportTo(u)) sent++;
			else skipped++;
		} catch {
			skipped++;
		}
	}
	return { sent, skipped };
}
