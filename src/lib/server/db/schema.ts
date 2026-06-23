import { relations } from 'drizzle-orm';
import {
	date,
	doublePrecision,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import type { ContentBrief, ContentDraft } from '$lib/content/types';

/** Roles a user can hold within an organization. */
export const memberRole = pgEnum('member_role', ['owner', 'editor', 'viewer']);

/** Ownership-verification state of a connected site. */
export const siteVerificationStatus = pgEnum('site_verification_status', ['pending', 'verified']);

/** Lifecycle of an audit crawl. */
export const crawlStatus = pgEnum('crawl_status', ['queued', 'running', 'completed', 'failed']);

/** How serious an audit finding is. */
export const issueSeverity = pgEnum('issue_severity', ['critical', 'warning', 'notice']);

/** What a searcher is trying to do — drives content strategy. */
export const searchIntent = pgEnum('search_intent', [
	'informational',
	'commercial',
	'transactional',
	'navigational'
]);

export const user = pgTable('user', {
	id: uuid('id').primaryKey().defaultRandom(),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	name: text('name').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const organization = pgTable('organization', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

/** Join table linking users to organizations with a role (multi-tenancy). */
export const member = pgTable(
	'member',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organization.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		role: memberRole('role').notNull().default('owner'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [uniqueIndex('member_org_user_idx').on(t.organizationId, t.userId)]
);

/**
 * Opaque session tokens. The cookie holds the token id directly; the cookie is
 * httpOnly + secure, so it is never exposed to client JS. No third-party auth.
 */
export const session = pgTable('session', {
	id: text('id').primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

/** A website connected to an organization — the unit SEO work is scoped to. */
export const site = pgTable(
	'site',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organization.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		/** Normalized hostname, e.g. `example.com` (no protocol, no trailing slash). */
		domain: text('domain').notNull(),
		/** Full normalized origin used for crawling, e.g. `https://example.com`. */
		url: text('url').notNull(),
		verificationStatus: siteVerificationStatus('verification_status').notNull().default('pending'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [uniqueIndex('site_org_domain_idx').on(t.organizationId, t.domain)]
);

/** One audit run for a site: crawl + analysis + resulting health score. */
export const crawl = pgTable('crawl', {
	id: uuid('id').primaryKey().defaultRandom(),
	siteId: uuid('site_id')
		.notNull()
		.references(() => site.id, { onDelete: 'cascade' }),
	status: crawlStatus('status').notNull().default('queued'),
	/** 0–100, null until the crawl completes. */
	healthScore: integer('health_score'),
	pagesCrawled: integer('pages_crawled').notNull().default(0),
	/** PageSpeed Insights lab metrics (null when unavailable). */
	performanceScore: integer('performance_score'),
	lcpMs: integer('lcp_ms'),
	clsScore: doublePrecision('cls_score'),
	tbtMs: integer('tbt_ms'),
	error: text('error'),
	startedAt: timestamp('started_at', { withTimezone: true }),
	finishedAt: timestamp('finished_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

/** A single page captured during a crawl, with the on-page signals we extracted. */
export const page = pgTable('page', {
	id: uuid('id').primaryKey().defaultRandom(),
	crawlId: uuid('crawl_id')
		.notNull()
		.references(() => crawl.id, { onDelete: 'cascade' }),
	url: text('url').notNull(),
	statusCode: integer('status_code'),
	title: text('title'),
	metaDescription: text('meta_description'),
	h1Count: integer('h1_count').notNull().default(0),
	wordCount: integer('word_count').notNull().default(0),
	imagesMissingAlt: integer('images_missing_alt').notNull().default(0),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

/**
 * An audit finding. `code` keys into the guidance content in `$lib/guidance`;
 * `pageUrl` is null for site-level issues (e.g. missing sitemap).
 */
export const auditIssue = pgTable('audit_issue', {
	id: uuid('id').primaryKey().defaultRandom(),
	crawlId: uuid('crawl_id')
		.notNull()
		.references(() => crawl.id, { onDelete: 'cascade' }),
	code: text('code').notNull(),
	severity: issueSeverity('severity').notNull(),
	pageUrl: text('page_url'),
	detail: text('detail'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

/**
 * A connected Google account for an organization (one per org). OAuth tokens are
 * stored encrypted at rest via `$lib/server/crypto`.
 */
export const googleConnection = pgTable('google_connection', {
	id: uuid('id').primaryKey().defaultRandom(),
	organizationId: uuid('organization_id')
		.notNull()
		.unique()
		.references(() => organization.id, { onDelete: 'cascade' }),
	email: text('email'),
	accessTokenEnc: text('access_token_enc').notNull(),
	refreshTokenEnc: text('refresh_token_enc'),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	scope: text('scope').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

/** A keyword saved to a site for tracking / content planning. */
export const keyword = pgTable(
	'keyword',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		siteId: uuid('site_id')
			.notNull()
			.references(() => site.id, { onDelete: 'cascade' }),
		phrase: text('phrase').notNull(),
		intent: searchIntent('intent').notNull().default('informational'),
		/** Monthly search volume (null until a metrics provider is connected). */
		volume: integer('volume'),
		/** Competition/difficulty 0–100 (null until enriched). */
		difficulty: integer('difficulty'),
		cpc: doublePrecision('cpc'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [uniqueIndex('keyword_site_phrase_idx').on(t.siteId, t.phrase)]
);

/** A competitor website tracked against one of the org's sites. */
export const competitor = pgTable(
	'competitor',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		siteId: uuid('site_id')
			.notNull()
			.references(() => site.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		domain: text('domain').notNull(),
		url: text('url').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [uniqueIndex('competitor_site_domain_idx').on(t.siteId, t.domain)]
);

export const userRelations = relations(user, ({ many }) => ({
	memberships: many(member),
	sessions: many(session)
}));

export const organizationRelations = relations(organization, ({ many, one }) => ({
	members: many(member),
	sites: many(site),
	googleConnection: one(googleConnection, {
		fields: [organization.id],
		references: [googleConnection.organizationId]
	})
}));

export const siteRelations = relations(site, ({ one, many }) => ({
	organization: one(organization, {
		fields: [site.organizationId],
		references: [organization.id]
	}),
	crawls: many(crawl),
	keywords: many(keyword),
	competitors: many(competitor),
	contentBriefs: many(contentBrief)
}));

export const competitorRelations = relations(competitor, ({ one }) => ({
	site: one(site, { fields: [competitor.siteId], references: [site.id] })
}));

/** A content brief for a target keyword, with an optional AI draft scaffold. */
export const contentBrief = pgTable('content_brief', {
	id: uuid('id').primaryKey().defaultRandom(),
	siteId: uuid('site_id')
		.notNull()
		.references(() => site.id, { onDelete: 'cascade' }),
	keyword: text('keyword').notNull(),
	intent: searchIntent('intent').notNull().default('informational'),
	brief: jsonb('brief').$type<ContentBrief>().notNull(),
	draft: jsonb('draft').$type<ContentDraft>(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const contentBriefRelations = relations(contentBrief, ({ one }) => ({
	site: one(site, { fields: [contentBrief.siteId], references: [site.id] })
}));

/**
 * A point-in-time capture of a keyword's Google Search performance (from the
 * Search Console Search Analytics API). One row per keyword per capture date;
 * comparing across dates gives the trend.
 */
export const rankSnapshot = pgTable(
	'rank_snapshot',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		keywordId: uuid('keyword_id')
			.notNull()
			.references(() => keyword.id, { onDelete: 'cascade' }),
		capturedDate: date('captured_date').notNull(),
		/** Average Google position (lower is better). */
		position: doublePrecision('position'),
		clicks: integer('clicks').notNull().default(0),
		impressions: integer('impressions').notNull().default(0),
		ctr: doublePrecision('ctr'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [uniqueIndex('rank_snapshot_keyword_date_idx').on(t.keywordId, t.capturedDate)]
);

export const keywordRelations = relations(keyword, ({ one, many }) => ({
	site: one(site, { fields: [keyword.siteId], references: [site.id] }),
	snapshots: many(rankSnapshot)
}));

export const rankSnapshotRelations = relations(rankSnapshot, ({ one }) => ({
	keyword: one(keyword, { fields: [rankSnapshot.keywordId], references: [keyword.id] })
}));

export const crawlRelations = relations(crawl, ({ one, many }) => ({
	site: one(site, { fields: [crawl.siteId], references: [site.id] }),
	pages: many(page),
	issues: many(auditIssue)
}));

export const pageRelations = relations(page, ({ one }) => ({
	crawl: one(crawl, { fields: [page.crawlId], references: [crawl.id] })
}));

export const auditIssueRelations = relations(auditIssue, ({ one }) => ({
	crawl: one(crawl, { fields: [auditIssue.crawlId], references: [crawl.id] })
}));

export const memberRelations = relations(member, ({ one }) => ({
	organization: one(organization, {
		fields: [member.organizationId],
		references: [organization.id]
	}),
	user: one(user, { fields: [member.userId], references: [user.id] })
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, { fields: [session.userId], references: [user.id] })
}));

export type User = typeof user.$inferSelect;
export type Organization = typeof organization.$inferSelect;
export type Member = typeof member.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Site = typeof site.$inferSelect;
export type Crawl = typeof crawl.$inferSelect;
export type Page = typeof page.$inferSelect;
export type AuditIssue = typeof auditIssue.$inferSelect;
export type GoogleConnection = typeof googleConnection.$inferSelect;
export type Keyword = typeof keyword.$inferSelect;
export type RankSnapshot = typeof rankSnapshot.$inferSelect;
export type Competitor = typeof competitor.$inferSelect;
export type ContentBriefRow = typeof contentBrief.$inferSelect;
export type SearchIntent = (typeof searchIntent.enumValues)[number];
export type MemberRole = (typeof memberRole.enumValues)[number];
export type SiteVerificationStatus = (typeof siteVerificationStatus.enumValues)[number];
export type CrawlStatus = (typeof crawlStatus.enumValues)[number];
export type IssueSeverity = (typeof issueSeverity.enumValues)[number];
