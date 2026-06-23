CREATE TYPE "public"."crawl_status" AS ENUM('queued', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."issue_severity" AS ENUM('critical', 'warning', 'notice');--> statement-breakpoint
CREATE TABLE "audit_issue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crawl_id" uuid NOT NULL,
	"code" text NOT NULL,
	"severity" "issue_severity" NOT NULL,
	"page_url" text,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crawl" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"status" "crawl_status" DEFAULT 'queued' NOT NULL,
	"health_score" integer,
	"pages_crawled" integer DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crawl_id" uuid NOT NULL,
	"url" text NOT NULL,
	"status_code" integer,
	"title" text,
	"meta_description" text,
	"h1_count" integer DEFAULT 0 NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"images_missing_alt" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_issue" ADD CONSTRAINT "audit_issue_crawl_id_crawl_id_fk" FOREIGN KEY ("crawl_id") REFERENCES "public"."crawl"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crawl" ADD CONSTRAINT "crawl_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page" ADD CONSTRAINT "page_crawl_id_crawl_id_fk" FOREIGN KEY ("crawl_id") REFERENCES "public"."crawl"("id") ON DELETE cascade ON UPDATE no action;