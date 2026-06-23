import { z } from 'zod';
import { error } from '@sveltejs/kit';
import { command, getRequestEvent, query } from '$app/server';
import { requireActiveOrg, requireWriteAccess } from '$lib/server/org';
import { getSiteForOrg, isLocalHostname, markSiteVerified } from '$lib/server/sites/service';
import { buildAuthUrl, isGoogleConfigured, resolveRedirectUri } from '$lib/server/google/oauth';
import {
	GoogleNotConnectedError,
	GoogleReconnectRequiredError,
	deleteConnection,
	getConnection,
	getValidAccessToken
} from '$lib/server/google/connection';
import { addSite, listSites, matchProperty, submitSitemap } from '$lib/server/google/searchconsole';
import {
	SiteVerificationError,
	getVerificationToken,
	propertyFor,
	verifyOwnership as verifySiteOwnership
} from '$lib/server/google/siteverification';
import { createState } from '$lib/server/google/state';

const siteIdSchema = z.string().uuid();
const verificationMethodSchema = z.enum(['META', 'FILE', 'DNS_TXT']);
const verifyInputSchema = z.object({ siteId: siteIdSchema, method: verificationMethodSchema });
const SEARCH_CONSOLE_URL = 'https://search.google.com/search-console/sitemaps';

export const getGoogleStatus = query(siteIdSchema, async (siteId) => {
	const { organization } = await requireActiveOrg();
	const site = await getSiteForOrg(organization.id, siteId);
	if (!site) error(404, 'Website not found.');

	const connection = await getConnection(organization.id);
	return {
		configured: isGoogleConfigured(),
		connected: Boolean(connection),
		verified: site.verificationStatus === 'verified',
		email: connection?.email ?? null,
		isLocal: isLocalHostname(new URL(site.url).hostname),
		sitemapUrl: `${site.url}/sitemap.xml`,
		propertyUrl: `${site.url}/`,
		searchConsoleUrl: SEARCH_CONSOLE_URL
	};
});

/** Build the consent URL and stash a CSRF nonce; the client navigates to the result. */
export const connectGoogle = command(siteIdSchema, async (siteId) => {
	const { organization } = await requireWriteAccess();
	const site = await getSiteForOrg(organization.id, siteId);
	if (!site) error(404, 'Website not found.');
	if (!isGoogleConfigured()) error(400, 'Google integration is not configured on this server.');

	const { url, cookies } = getRequestEvent();
	const { state, nonce } = createState(siteId, `/sites/${siteId}`);
	cookies.set('g_oauth', nonce, {
		path: '/',
		httpOnly: true,
		secure: !import.meta.env.DEV,
		sameSite: 'lax',
		maxAge: 600
	});

	return { authUrl: buildAuthUrl(state, resolveRedirectUri(url.origin)) };
});

export interface VerificationInstructions {
	method: 'META' | 'FILE' | 'DNS_TXT';
	/** Full meta tag to paste into <head> (META). */
	metaTag?: string;
	/** File to upload at the site root (FILE). */
	fileName?: string;
	fileContent?: string;
	fileUrl?: string;
	/** DNS TXT record to add (DNS_TXT). */
	dnsValue?: string;
}

function buildInstructions(
	method: 'META' | 'FILE' | 'DNS_TXT',
	token: string,
	origin: string
): VerificationInstructions {
	if (method === 'META') return { method, metaTag: token };
	if (method === 'FILE') {
		return {
			method,
			fileName: token,
			fileContent: `google-site-verification: ${token}`,
			fileUrl: `${origin}/${token}`
		};
	}
	return { method, dnsValue: token };
}

/** Request a verification token and the human instructions for placing it. */
export const getVerificationInstructions = command(
	verifyInputSchema,
	async ({ siteId, method }): Promise<VerificationInstructions> => {
		const { organization } = await requireWriteAccess();
		const site = await getSiteForOrg(organization.id, siteId);
		if (!site) error(404, 'Website not found.');
		if (!isGoogleConfigured()) error(400, 'Google integration is not configured.');

		const accessToken = await getValidAccessToken(organization.id);
		const token = await getVerificationToken(accessToken, method, site.url, site.domain);
		return buildInstructions(method, token, site.url);
	}
);

/** Confirm ownership with Google, add the property to Search Console, and mark verified. */
export const verifyOwnership = command(
	verifyInputSchema,
	async ({ siteId, method }): Promise<SubmitResult> => {
		const { organization } = await requireWriteAccess();
		const site = await getSiteForOrg(organization.id, siteId);
		if (!site) error(404, 'Website not found.');

		try {
			const accessToken = await getValidAccessToken(organization.id);
			await verifySiteOwnership(accessToken, method, site.url, site.domain);

			// Best-effort: register the property so sitemap submission works next.
			try {
				await addSite(accessToken, propertyFor(method, site.url, site.domain));
			} catch {
				/* ownership is verified; adding the property can be retried on submit */
			}

			await markSiteVerified(organization.id, siteId);
			await getGoogleStatus(siteId).refresh();
			return { ok: true, message: 'Ownership verified — you can now submit your sitemap.' };
		} catch (err) {
			if (err instanceof GoogleNotConnectedError || err instanceof GoogleReconnectRequiredError) {
				return { ok: false, needsReconnect: true, message: err.message };
			}
			if (err instanceof SiteVerificationError) return { ok: false, message: err.message };
			return { ok: false, message: err instanceof Error ? err.message : 'Verification failed.' };
		}
	}
);

export interface SubmitResult {
	ok: boolean;
	message: string;
	needsVerification?: boolean;
	needsReconnect?: boolean;
}

export const submitToGoogle = command(siteIdSchema, async (siteId): Promise<SubmitResult> => {
	const { organization } = await requireWriteAccess();
	const site = await getSiteForOrg(organization.id, siteId);
	if (!site) error(404, 'Website not found.');

	if (isLocalHostname(new URL(site.url).hostname)) {
		return {
			ok: false,
			message: 'This is a local site. Deploy it to a public address before submitting to Google.'
		};
	}

	try {
		const accessToken = await getValidAccessToken(organization.id);
		const property = matchProperty(await listSites(accessToken), site.url, site.domain);

		if (!property) {
			return {
				ok: false,
				needsVerification: true,
				message:
					'We couldn’t find this site as a verified property in your Search Console. Add and verify it there first, then try again.'
			};
		}

		await submitSitemap(accessToken, property, `${site.url}/sitemap.xml`);
		return { ok: true, message: 'Sitemap submitted to Google Search Console.' };
	} catch (err) {
		if (err instanceof GoogleNotConnectedError) {
			return { ok: false, needsReconnect: true, message: 'Connect Google first.' };
		}
		if (err instanceof GoogleReconnectRequiredError) {
			return { ok: false, needsReconnect: true, message: err.message };
		}
		return { ok: false, message: err instanceof Error ? err.message : 'Submission failed.' };
	}
});

export const disconnectGoogle = command(siteIdSchema, async (siteId) => {
	const { organization } = await requireWriteAccess();
	await deleteConnection(organization.id);
	await getGoogleStatus(siteId).refresh();
});
