import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { member, organization, user, type User } from '$lib/server/db/schema';
import { hashPassword, verifyPassword } from './password';

export class AuthError extends Error {}
export class EmailInUseError extends AuthError {}
export class InvalidCredentialsError extends AuthError {}

function slugify(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/** Build a unique org slug by appending a short suffix when the base is taken. */
async function uniqueOrgSlug(base: string): Promise<string> {
	const root = slugify(base) || 'workspace';
	for (let attempt = 0; attempt < 5; attempt++) {
		const slug = attempt === 0 ? root : `${root}-${randomSuffix()}`;
		const [existing] = await db
			.select({ id: organization.id })
			.from(organization)
			.where(eq(organization.slug, slug));
		if (!existing) return slug;
	}
	return `${root}-${randomSuffix()}`;
}

function randomSuffix(): string {
	return Math.floor(Math.random() * 1e6)
		.toString(36)
		.padStart(4, '0');
}

/**
 * Register a new user. Creates the user, a personal organization, and an
 * owner membership in a single transaction. Throws EmailInUseError on conflict.
 */
export async function registerUser(input: {
	email: string;
	password: string;
	name: string;
	organizationName?: string;
}): Promise<User> {
	const email = input.email.toLowerCase().trim();

	const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
	if (existing) throw new EmailInUseError('That email is already registered.');

	const passwordHash = await hashPassword(input.password);
	const orgName = input.organizationName?.trim() || `${input.name}'s workspace`;
	const slug = await uniqueOrgSlug(orgName);

	return db.transaction(async (tx) => {
		const [createdUser] = await tx
			.insert(user)
			.values({ email, passwordHash, name: input.name.trim() })
			.returning();

		const [createdOrg] = await tx.insert(organization).values({ name: orgName, slug }).returning();

		await tx.insert(member).values({
			organizationId: createdOrg.id,
			userId: createdUser.id,
			role: 'owner'
		});

		return createdUser;
	});
}

/** Verify email + password. Throws InvalidCredentialsError on any mismatch. */
export async function authenticateUser(input: { email: string; password: string }): Promise<User> {
	const email = input.email.toLowerCase().trim();
	const [found] = await db.select().from(user).where(eq(user.email, email));

	// Always run a hash comparison to reduce user-enumeration timing differences.
	const stored = found?.passwordHash ?? 'x:0';
	const valid = await verifyPassword(input.password, stored);

	if (!found || !valid) throw new InvalidCredentialsError('Incorrect email or password.');
	return found;
}
