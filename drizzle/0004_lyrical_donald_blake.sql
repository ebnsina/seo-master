CREATE TYPE "public"."search_intent" AS ENUM('informational', 'commercial', 'transactional', 'navigational');--> statement-breakpoint
CREATE TABLE "keyword" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"phrase" text NOT NULL,
	"intent" "search_intent" DEFAULT 'informational' NOT NULL,
	"volume" integer,
	"difficulty" integer,
	"cpc" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "keyword" ADD CONSTRAINT "keyword_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "keyword_site_phrase_idx" ON "keyword" USING btree ("site_id","phrase");