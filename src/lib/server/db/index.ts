import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { DATABASE_URL } from '$app/env/private';

type Database = PostgresJsDatabase<typeof schema>;

let instance: Database | undefined;

/**
 * Lazily create the Drizzle client on first use. Keeping it lazy means the
 * build/prerender step never needs a live database connection — the client is
 * only instantiated when a query actually runs at request time.
 */
function getDb(): Database {
	if (!instance) {
		if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
		instance = drizzle(postgres(DATABASE_URL), { schema });
	}
	return instance;
}

export const db: Database = new Proxy({} as Database, {
	get(_target, prop, receiver) {
		const database = getDb();
		const value = Reflect.get(database, prop, receiver);
		return typeof value === 'function' ? value.bind(database) : value;
	}
});
