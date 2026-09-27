import {
  bigserial,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("telegram_public"),
    telegramUsername: text("telegram_username").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    priority: integer("priority").notNull().default(100),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    usernameUnique: uniqueIndex("sources_telegram_username_uq").on(table.telegramUsername),
    enabledPriorityIdx: index("sources_enabled_priority_idx").on(table.enabled, table.priority),
  }),
);

export const sourceItems = pgTable(
  "source_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    sourceUrl: text("source_url").notNull(),
    officialUrl: text("official_url"),
    status: text("status").notNull().default("new"),
    errorCode: text("error_code"),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => ({
    sourceExternalUnique: uniqueIndex("source_items_source_external_uq").on(
      table.sourceId,
      table.externalId,
    ),
    officialUrlIdx: index("source_items_official_url_idx").on(table.officialUrl),
    statusIdx: index("source_items_status_idx").on(table.status),
  }),
);

export const officialDocuments = pgTable(
  "official_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    url: text("url").notNull(),
    title: text("title"),
    content: text("content").notNull(),
    contentHash: text("content_hash").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    urlUnique: uniqueIndex("official_documents_url_uq").on(table.url),
    contentHashIdx: index("official_documents_content_hash_idx").on(table.contentHash),
  }),
);

export const drafts = pgTable(
  "drafts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceItemId: uuid("source_item_id")
      .notNull()
      .references(() => sourceItems.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => officialDocuments.id, { onDelete: "restrict" }),
    content: text("content").notNull(),
    status: text("status").notNull().default("pending"),
    confidence: doublePrecision("confidence"),
    model: text("model"),
    reviewMessageId: text("review_message_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceItemUnique: uniqueIndex("drafts_source_item_uq").on(table.sourceItemId),
    statusIdx: index("drafts_status_idx").on(table.status),
  }),
);

export const publishedPosts = pgTable(
  "published_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => drafts.id, { onDelete: "restrict" }),
    telegramMessageId: text("telegram_message_id").notNull(),
    targetChannel: text("target_channel").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    draftUnique: uniqueIndex("published_posts_draft_uq").on(table.draftId),
  }),
);

export const processingLogs = pgTable(
  "processing_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sourceItemId: uuid("source_item_id").references(() => sourceItems.id, {
      onDelete: "set null",
    }),
    level: text("level").notNull(),
    stage: text("stage").notNull(),
    message: text("message").notNull(),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceItemIdx: index("processing_logs_source_item_idx").on(table.sourceItemId),
    createdAtIdx: index("processing_logs_created_at_idx").on(table.createdAt),
  }),
);
