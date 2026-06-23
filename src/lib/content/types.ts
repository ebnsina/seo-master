import type { SearchIntent } from '$lib/server/db/schema';

/** A content brief: everything a writer needs to create a page that ranks. */
export interface ContentBrief {
	keyword: string;
	intent: SearchIntent;
	/** Suggested target length in words. */
	recommendedWords: number;
	/** Real questions people search around this topic (answer these). */
	questions: string[];
	/** Suggested section headings (H2s). */
	headings: string[];
	/** Topics/entities to cover for completeness. */
	entities: string[];
	/** Existing pages on the site to link from. */
	internalLinks: { title: string; url: string }[];
}

/** An optional AI-generated draft scaffold (title, meta, outline). */
export interface ContentDraft {
	title: string;
	metaDescription: string;
	outline: { heading: string; points: string[] }[];
}
