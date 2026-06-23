import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { member, organization, type MemberRole, type Organization } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/auth';

export interface ActiveOrg {
	organization: Organization;
	role: MemberRole;
}

/**
 * Resolve the current user's active organization and their role in it.
 * Each user currently belongs to a single (personal) org created at signup;
 * when multi-org support lands this becomes a lookup against a selected org id.
 */
export async function requireActiveOrg(): Promise<ActiveOrg> {
	const user = requireUser();

	const [row] = await db
		.select({ organization, role: member.role })
		.from(member)
		.innerJoin(organization, eq(member.organizationId, organization.id))
		.where(eq(member.userId, user.id))
		.limit(1);

	if (!row) error(403, 'No organization found for this account.');
	return { organization: row.organization, role: row.role };
}

/** Roles permitted to make changes (everything except read-only viewers). */
const WRITE_ROLES: MemberRole[] = ['owner', 'editor'];

/** Require that the current user can modify org-owned resources. */
export async function requireWriteAccess(): Promise<ActiveOrg> {
	const active = await requireActiveOrg();
	if (!WRITE_ROLES.includes(active.role)) {
		error(403, 'You do not have permission to make changes.');
	}
	return active;
}
