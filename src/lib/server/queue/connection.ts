import IORedis from 'ioredis';
import { REDIS_URL } from '$app/env/private';

/** True when a Redis URL is configured — gates all queue behaviour. */
export function isQueueEnabled(): boolean {
	return Boolean(REDIS_URL);
}

let connection: IORedis | undefined;

/** Shared ioredis connection. `maxRetriesPerRequest: null` is required by BullMQ workers. */
export function getConnection(): IORedis {
	if (!REDIS_URL) throw new Error('REDIS_URL is not set');
	connection ??= new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
	return connection;
}
