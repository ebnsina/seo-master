import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { command, query } from '$app/server';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/auth';
import { isEmailConfigured } from '$lib/server/email/mailer';

export const getSettings = query(async () => {
	const u = requireUser();
	const [row] = await db
		.select({ weeklyReport: user.weeklyReport, email: user.email })
		.from(user)
		.where(eq(user.id, u.id));
	return {
		email: row?.email ?? u.email,
		weeklyReport: row?.weeklyReport ?? false,
		emailConfigured: isEmailConfigured()
	};
});

export const setWeeklyReport = command(z.boolean(), async (enabled) => {
	const u = requireUser();
	await db.update(user).set({ weeklyReport: enabled }).where(eq(user.id, u.id));
	await getSettings().refresh();
});
