import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { site, type Site } from '$lib/server/db/schema';

export class SiteError extends Error {}
export class InvalidUrlError extends SiteError {}
export class DuplicateSiteError extends SiteError {}

export interface NormalizedSite {
	/** Full origin used for crawling, e.g. `https://example.com` or `http://localhost:5173`. */
	url: string;
	/** Identifier for the site within an org — hostname (or host:port for local). */
	domain: string;
	/** True for localhost / private addresses — used for the pre-launch local check. */
	isLocal: boolean;
}

/** Recognise local / private addresses so users can audit a dev site before launch. */
export function isLocalHostname(hostname: string): boolean {
	const h = hostname.toLowerCase();
	return (
		h === 'localhost' ||
		h.endsWith('.localhost') ||
		h.endsWith('.local') ||
		h === '0.0.0.0' ||
		h === '::1' ||
		/^127\.\d+\.\d+\.\d+$/.test(h) ||
		/^192\.168\.\d+\.\d+$/.test(h) ||
		/^10\.\d+\.\d+\.\d+$/.test(h)
	);
}

/**
 * Normalize free-form user input into a canonical origin + identifier.
 * Accepts inputs with or without a protocol ("example.com", "http://localhost:5173").
 * Localhost/private addresses (and ports) are allowed so a site can be audited
 * locally before it goes live. Throws InvalidUrlError for anything unusable.
 */
export function normalizeSiteUrl(input: string): NormalizedSite {
	const trimmed = input.trim();
	if (!trimmed) throw new InvalidUrlError('Enter a website address.');

	const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

	let parsed: URL;
	try {
		parsed = new URL(withProtocol);
	} catch {
		throw new InvalidUrlError('That doesn’t look like a valid website address.');
	}

	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		throw new InvalidUrlError('Only http and https websites are supported.');
	}

	const hostname = parsed.hostname.toLowerCase();
	const host = parsed.host.toLowerCase(); // includes :port when present
	const isLocal = isLocalHostname(hostname);
	const domain = isLocal ? host : hostname.replace(/^www\./, '');

	if (!isLocal && !domain.includes('.')) {
		throw new InvalidUrlError('Enter a full domain, like example.com.');
	}

	return { url: `${parsed.protocol}//${host}`, domain, isLocal };
}

export function listSitesForOrg(organizationId: string): Promise<Site[]> {
	return db
		.select()
		.from(site)
		.where(eq(site.organizationId, organizationId))
		.orderBy(desc(site.createdAt));
}

export async function getSiteForOrg(organizationId: string, siteId: string): Promise<Site | null> {
	const [found] = await db
		.select()
		.from(site)
		.where(and(eq(site.organizationId, organizationId), eq(site.id, siteId)));
	return found ?? null;
}

/** Create a site for an org. Throws DuplicateSiteError if the domain already exists. */
export async function createSite(input: {
	organizationId: string;
	name: string;
	url: string;
}): Promise<Site> {
	const { url, domain } = normalizeSiteUrl(input.url);
	const name = input.name.trim() || domain;

	const [existing] = await db
		.select({ id: site.id })
		.from(site)
		.where(and(eq(site.organizationId, input.organizationId), eq(site.domain, domain)));
	if (existing) throw new DuplicateSiteError('That website has already been added.');

	const [created] = await db
		.insert(site)
		.values({ organizationId: input.organizationId, name, domain, url })
		.returning();
	return created;
}

/** Fetch a site by id without org scoping — internal/worker use only. */
export async function getSiteById(siteId: string): Promise<Site | null> {
	const [found] = await db.select().from(site).where(eq(site.id, siteId));
	return found ?? null;
}

/** Mark a site as ownership-verified (org-scoped). */
export async function markSiteVerified(organizationId: string, siteId: string): Promise<void> {
	await db
		.update(site)
		.set({ verificationStatus: 'verified' })
		.where(and(eq(site.organizationId, organizationId), eq(site.id, siteId)));
}

/** Set (or clear) the connected GA4 property for a site (org-scoped). */
export async function setGa4Property(
	organizationId: string,
	siteId: string,
	propertyId: string | null
): Promise<void> {
	await db
		.update(site)
		.set({ ga4PropertyId: propertyId })
		.where(and(eq(site.organizationId, organizationId), eq(site.id, siteId)));
}

/** Delete a site, scoped to its org. Returns true if a row was removed. */
export async function deleteSite(organizationId: string, siteId: string): Promise<boolean> {
	const deleted = await db
		.delete(site)
		.where(and(eq(site.organizationId, organizationId), eq(site.id, siteId)))
		.returning({ id: site.id });
	return deleted.length > 0;
}
