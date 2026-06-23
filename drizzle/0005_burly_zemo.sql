CREATE TABLE "rank_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"keyword_id" uuid NOT NULL,
	"captured_date" date NOT NULL,
	"position" double precision,
	"clicks" integer DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"ctr" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rank_snapshot" ADD CONSTRAINT "rank_snapshot_keyword_id_keyword_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."keyword"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "rank_snapshot_keyword_date_idx" ON "rank_snapshot" USING btree ("keyword_id","captured_date");