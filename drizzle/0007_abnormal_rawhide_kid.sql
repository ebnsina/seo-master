CREATE TABLE "content_brief" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"keyword" text NOT NULL,
	"intent" "search_intent" DEFAULT 'informational' NOT NULL,
	"brief" jsonb NOT NULL,
	"draft" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_brief" ADD CONSTRAINT "content_brief_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;