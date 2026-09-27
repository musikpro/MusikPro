CREATE TABLE "song_publications" (
	"song_group_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"job_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "song_publications_slug_unique" UNIQUE("slug")
);
