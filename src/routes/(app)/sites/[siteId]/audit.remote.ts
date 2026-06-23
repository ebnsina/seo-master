import { z } from 'zod';
import { error } from '@sveltejs/kit';
import { command, query } from '$app/server';
import { requireActiveOrg, requireWriteAccess } from '$lib/server/org';
import { getSiteForOrg, isLocalHostname } from '$lib/server/sites/service';
import { createCrawl, getLatestAudit, hasActiveCrawl } from '$lib/server/audit/service';
import { runCrawl } from '$lib/server/audit/run';
import { computeReadiness } from '$lib/server/audit/score';
import { isQueueEnabled } from '$lib/server/queue/connection';
import { enqueueCrawl } from '$lib/server/queue/queues';

const siteIdSchema = z.string().uuid();

export const getAudit = query(siteIdSchema, async (siteId) => {
	const { organization } = await requireActiveOrg();
	const site = await getSiteForOrg(organization.id, siteId);
	if (!site) error(404, 'Website not found.');

	const isLocal = isLocalHostname(new URL(site.url).hostname);
	const snapshot = await getLatestAudit(siteId);
	const readiness =
		snapshot && snapshot.crawl.status === 'completed'
			? computeReadiness(snapshot.issues, isLocal)
			: null;

	return {
		site: {
			id: site.id,
			name: site.name,
			domain: site.domain,
			url: site.url,
			isLocal,
			verificationStatus: site.verificationStatus
		},
		audit: snapshot,
		readiness
	};
});

export const startAudit = command(siteIdSchema, async (siteId) => {
	const { organization } = await requireWriteAccess();
	const site = await getSiteForOrg(organization.id, siteId);
	if (!site) error(404, 'Website not found.');

	// Don't queue a second crawl while one is already in flight.
	if (!(await hasActiveCrawl(siteId))) {
		const created = await createCrawl(siteId);
		// Prefer the job queue; fall back to in-process execution when Redis is off.
		if (isQueueEnabled()) await enqueueCrawl(created.id);
		else void runCrawl(created.id).catch(() => {});
	}

	await getAudit(siteId).refresh();
});
