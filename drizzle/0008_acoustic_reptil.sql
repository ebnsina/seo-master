ALTER TABLE "crawl" ADD COLUMN "performance_score" integer;--> statement-breakpoint
ALTER TABLE "crawl" ADD COLUMN "lcp_ms" integer;--> statement-breakpoint
ALTER TABLE "crawl" ADD COLUMN "cls_score" double precision;--> statement-breakpoint
ALTER TABLE "crawl" ADD COLUMN "tbt_ms" integer;