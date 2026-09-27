CREATE TABLE IF NOT EXISTS "sources" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "kind" text DEFAULT 'telegram_public' NOT NULL,
  "telegram_username" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "priority" integer DEFAULT 100 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "sources_telegram_username_uq"
  ON "sources" ("telegram_username");
CREATE INDEX IF NOT EXISTS "sources_enabled_priority_idx"
  ON "sources" ("enabled", "priority");

CREATE TABLE IF NOT EXISTS "source_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_id" uuid NOT NULL REFERENCES "sources"("id") ON DELETE CASCADE,
  "external_id" text NOT NULL,
  "source_url" text NOT NULL,
  "official_url" text,
  "status" text DEFAULT 'new' NOT NULL,
  "error_code" text,
  "detected_at" timestamptz DEFAULT now() NOT NULL,
  "processed_at" timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS "source_items_source_external_uq"
  ON "source_items" ("source_id", "external_id");
CREATE INDEX IF NOT EXISTS "source_items_official_url_idx"
  ON "source_items" ("official_url");
CREATE INDEX IF NOT EXISTS "source_items_status_idx"
  ON "source_items" ("status");

CREATE TABLE IF NOT EXISTS "official_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "url" text NOT NULL,
  "title" text,
  "content" text NOT NULL,
  "content_hash" text NOT NULL,
  "fetched_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "official_documents_url_uq"
  ON "official_documents" ("url");
CREATE INDEX IF NOT EXISTS "official_documents_content_hash_idx"
  ON "official_documents" ("content_hash");

CREATE TABLE IF NOT EXISTS "drafts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_item_id" uuid NOT NULL REFERENCES "source_items"("id") ON DELETE CASCADE,
  "document_id" uuid NOT NULL REFERENCES "official_documents"("id") ON DELETE RESTRICT,
  "content" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "confidence" double precision,
  "model" text,
  "review_message_id" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "drafts_source_item_uq"
  ON "drafts" ("source_item_id");
CREATE INDEX IF NOT EXISTS "drafts_status_idx"
  ON "drafts" ("status");

CREATE TABLE IF NOT EXISTS "published_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "draft_id" uuid NOT NULL REFERENCES "drafts"("id") ON DELETE RESTRICT,
  "telegram_message_id" text NOT NULL,
  "target_channel" text NOT NULL,
  "published_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "published_posts_draft_uq"
  ON "published_posts" ("draft_id");

CREATE TABLE IF NOT EXISTS "processing_logs" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "source_item_id" uuid REFERENCES "source_items"("id") ON DELETE SET NULL,
  "level" text NOT NULL,
  "stage" text NOT NULL,
  "message" text NOT NULL,
  "meta" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "processing_logs_source_item_idx"
  ON "processing_logs" ("source_item_id");
CREATE INDEX IF NOT EXISTS "processing_logs_created_at_idx"
  ON "processing_logs" ("created_at");

INSERT INTO "sources" ("name", "telegram_username", "priority")
VALUES ('Huquqiy axborot — lotin', 'huquqiyaxborot_lotin', 10)
ON CONFLICT ("telegram_username") DO NOTHING;
