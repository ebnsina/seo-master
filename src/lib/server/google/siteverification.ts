const BASE = 'https://www.googleapis.com/siteVerification/v1';

export class SiteVerificationError extends Error {}

/** Methods we surface to users (the most approachable subset). */
export type VerificationMethod = 'META' | 'FILE' | 'DNS_TXT';

interface SiteRef {
	type: 'SITE' | 'INET_DOMAIN';
	identifier: string;
}

/** META/FILE verify a URL-prefix site; DNS_TXT verifies the whole domain. */
function siteRefFor(method: VerificationMethod, origin: string, domain: string): SiteRef {
	if (method === 'DNS_TXT') {
		return { type: 'INET_DOMAIN', identifier: domain.replace(/:\d+$/, '') };
	}
	return { type: 'SITE', identifier: `${origin}/` };
}

/** The Search Console property string that corresponds to a verified method. */
export function propertyFor(method: VerificationMethod, origin: string, domain: string): string {
	return method === 'DNS_TXT' ? `sc-domain:${domain.replace(/:\d+$/, '')}` : `${origin}/`;
}

/** Request a verification token to place on the site. */
export async function getVerificationToken(
	accessToken: string,
	method: VerificationMethod,
	origin: string,
	domain: string
): Promise<string> {
	const res = await fetch(`${BASE}/token`, {
		method: 'POST',
		headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
		body: JSON.stringify({ verificationMethod: method, site: siteRefFor(method, origin, domain) })
	});
	if (!res.ok)
		throw new SiteVerificationError(`Could not get a verification token (${res.status}).`);
	const data = (await res.json()) as { token?: string };
	if (!data.token) throw new SiteVerificationError('Google did not return a verification token.');
	return data.token;
}

/** Ask Google to confirm the token is in place and record this account as an owner. */
export async function verifyOwnership(
	accessToken: string,
	method: VerificationMethod,
	origin: string,
	domain: string
): Promise<void> {
	const res = await fetch(`${BASE}/webResource?verificationMethod=${method}`, {
		method: 'POST',
		headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
		body: JSON.stringify({ site: siteRefFor(method, origin, domain) })
	});
	if (!res.ok) {
		throw new SiteVerificationError(
			'Google could not find your verification token yet. Make sure it’s live, then try again.'
		);
	}
}
