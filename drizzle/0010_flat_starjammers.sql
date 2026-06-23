CREATE TYPE "public"."analysis_kind" AS ENUM('competitors', 'links');--> statement-breakpoint
CREATE TABLE "analysis_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"kind" "analysis_kind" NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analysis_snapshot" ADD CONSTRAINT "analysis_snapshot_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "analysis_site_kind_idx" ON "analysis_snapshot" USING btree ("site_id","kind");