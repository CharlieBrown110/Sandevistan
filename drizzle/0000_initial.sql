CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"email_verified" boolean DEFAULT false,
	"image" text,
	"username" text NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"token" text NOT NULL UNIQUE,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"expires_at" timestamp with time zone,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "tournaments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL UNIQUE,
	"creator_id" text NOT NULL REFERENCES "users"("id"),
	"title" text NOT NULL,
	"description" text DEFAULT '',
	"mode" text NOT NULL,
	"mode_value" integer NOT NULL,
	"language" text DEFAULT 'english' NOT NULL,
	"punctuation" boolean DEFAULT false NOT NULL,
	"numbers" boolean DEFAULT false NOT NULL,
	"min_accuracy" integer DEFAULT 90 NOT NULL,
	"max_participants" integer DEFAULT 50 NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournaments_mode_check" CHECK ("mode" IN ('time', 'words')),
	CONSTRAINT "tournaments_time_check" CHECK ("ends_at" > "starts_at")
);

CREATE TABLE IF NOT EXISTS "tournament_participants" (
	"tournament_id" uuid NOT NULL REFERENCES "tournaments"("id") ON DELETE cascade,
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts_count" integer DEFAULT 0 NOT NULL,
	"best_attempt_id" uuid,
	"best_wpm" numeric(6, 2),
	"best_accuracy" numeric(5, 2),
	"best_at" timestamp with time zone,
	CONSTRAINT "tournament_participants_pk" PRIMARY KEY("tournament_id", "user_id")
);

CREATE TABLE IF NOT EXISTS "tournament_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL REFERENCES "tournaments"("id") ON DELETE cascade,
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"seed" integer NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	"wpm" numeric(6, 2),
	"raw_wpm" numeric(6, 2),
	"accuracy" numeric(5, 2),
	"consistency" numeric(5, 2),
	"chars_correct" integer,
	"chars_incorrect" integer,
	"chars_extra" integer,
	"chars_missed" integer,
	"duration_ms" integer,
	"eligible" boolean DEFAULT false NOT NULL,
	"reject_reason" text,
	"events" jsonb
);

CREATE INDEX IF NOT EXISTS "tournaments_creator_idx" ON "tournaments" ("creator_id");
CREATE INDEX IF NOT EXISTS "tournament_participants_lb_idx" ON "tournament_participants" ("tournament_id", "best_wpm" DESC NULLS LAST, "best_accuracy" DESC, "best_at" ASC);
CREATE INDEX IF NOT EXISTS "tournament_participants_user_idx" ON "tournament_participants" ("user_id");
CREATE INDEX IF NOT EXISTS "tournament_attempts_hist_idx" ON "tournament_attempts" ("tournament_id", "user_id", "started_at" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_attempts_started_unique_idx" ON "tournament_attempts" ("tournament_id", "user_id") WHERE status = 'started';
