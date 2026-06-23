import { Worker } from 'bullmq';
import { getConnection, isQueueEnabled } from './connection';
import {
	CRAWL_QUEUE,
	RANK_QUEUE,
	REPORT_QUEUE,
	enqueueRankRefresh,
	scheduleDailyRankSweep,
	scheduleWeeklyReports
} from './queues';
import { runCrawl } from '$lib/server/audit/run';
import { getSiteById } from '$lib/server/sites/service';
import { refreshSiteRankings, sitesNeedingRankRefresh } from '$lib/server/rankings/service';
import { sendWeeklyReports } from '$lib/server/email/report';

/** Persist the "started" flag on globalThis so HMR / re-imports don't double-start workers. */
const globalState = globalThis as unknown as { __seomasterWorkers?: boolean };

/**
 * Start the in-process BullMQ workers once. No-op when Redis isn't configured.
 * Runs alongside the SvelteKit server so it shares the DB + provider modules;
 * extract to a separate process when scaling horizontally.
 */
export function startWorkers(): void {
	if (!isQueueEnabled() || globalState.__seomasterWorkers) return;
	globalState.__seomasterWorkers = true;

	const connection = getConnection();

	new Worker(
		CRAWL_QUEUE,
		async (job) => {
			await runCrawl(job.data.crawlId as string);
		},
		{ connection }
	);

	new Worker(
		RANK_QUEUE,
		async (job) => {
			if (job.name === 'sweep') {
				const sites = await sitesNeedingRankRefresh();
				for (const s of sites) await enqueueRankRefresh(s.id);
				return;
			}
			const site = await getSiteById(job.data.siteId as string);
			if (site) await refreshSiteRankings(site);
		},
		{ connection }
	);

	new Worker(
		REPORT_QUEUE,
		async () => {
			await sendWeeklyReports();
		},
		{ connection }
	);

	void scheduleDailyRankSweep();
	void scheduleWeeklyReports();
}
