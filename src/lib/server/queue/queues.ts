import { Queue } from 'bullmq';
import { getConnection } from './connection';

export const CRAWL_QUEUE = 'crawl';
export const RANK_QUEUE = 'rank-refresh';

let crawl: Queue | undefined;
let rank: Queue | undefined;

function crawlQueue(): Queue {
	return (crawl ??= new Queue(CRAWL_QUEUE, { connection: getConnection() }));
}
function rankQueue(): Queue {
	return (rank ??= new Queue(RANK_QUEUE, { connection: getConnection() }));
}

const JOB_OPTS = { removeOnComplete: true, removeOnFail: 100 };

/** Queue a crawl to run in the background. */
export async function enqueueCrawl(crawlId: string): Promise<void> {
	await crawlQueue().add('run', { crawlId }, JOB_OPTS);
}

/** Queue a rank refresh for one site. */
export async function enqueueRankRefresh(siteId: string): Promise<void> {
	await rankQueue().add('refresh', { siteId }, JOB_OPTS);
}

/** Register the daily rank-sweep scheduler (idempotent — upsert). */
export async function scheduleDailyRankSweep(): Promise<void> {
	await rankQueue().upsertJobScheduler(
		'daily-rank-sweep',
		{ pattern: '0 6 * * *' },
		{ name: 'sweep' }
	);
}
