import { and, eq } from "drizzle-orm";

import { generateLegalNewsDraft } from "@/lib/ai/gemini";
import { getDb } from "@/lib/db/client";
import {
  drafts,
  officialDocuments,
  processingLogs,
  sourceItems,
  sources,
} from "@/lib/db/schema";
import { fetchOfficialDocument } from "@/lib/sources/official";
import { fetchTelegramPublicSignals } from "@/lib/sources/telegram-public";
import { sendDraftForReview } from "@/lib/telegram/bot";

type Summary = {
  sourcesChecked: number;
  signalsSeen: number;
  newItems: number;
  draftsCreated: number;
  skipped: number;
  failed: number;
};

async function log(
  level: "info" | "warn" | "error",
  stage: string,
  message: string,
  sourceItemId?: string,
  meta?: Record<string, unknown>,
) {
  const db = getDb();
  await db.insert(processingLogs).values({
    level,
    stage,
    message,
    sourceItemId,
    meta,
  });
}

export async function runMonitor(): Promise<Summary> {
  const db = getDb();
  const sourceRows = await db
    .select()
    .from(sources)
    .where(eq(sources.enabled, true))
    .orderBy(sources.priority);

  const summary: Summary = {
    sourcesChecked: 0,
    signalsSeen: 0,
    newItems: 0,
    draftsCreated: 0,
    skipped: 0,
    failed: 0,
  };

  for (const source of sourceRows) {
    summary.sourcesChecked += 1;

    let signals;
    try {
      signals = await fetchTelegramPublicSignals(source.telegramUsername);
    } catch (error) {
      summary.failed += 1;
      await log("error", "source_fetch", error instanceof Error ? error.message : "Unknown error", undefined, {
        sourceId: source.id,
        username: source.telegramUsername,
      });
      continue;
    }

    summary.signalsSeen += signals.length;

    for (const signal of signals) {
      if (!signal.officialUrl) {
        summary.skipped += 1;
        continue;
      }

      const inserted = await db
        .insert(sourceItems)
        .values({
          sourceId: source.id,
          externalId: signal.externalId,
          sourceUrl: signal.sourceUrl,
          officialUrl: signal.officialUrl,
          status: "new",
        })
        .onConflictDoNothing({
          target: [sourceItems.sourceId, sourceItems.externalId],
        })
        .returning();

      const item = inserted[0];
      if (!item) continue;

      summary.newItems += 1;

      try {
        const official = await fetchOfficialDocument(signal.officialUrl);

        const documentRows = await db
          .insert(officialDocuments)
          .values({
            url: official.url,
            title: official.title,
            content: official.content,
            contentHash: official.contentHash,
          })
          .onConflictDoUpdate({
            target: officialDocuments.url,
            set: {
              title: official.title,
              content: official.content,
              contentHash: official.contentHash,
              fetchedAt: new Date(),
            },
          })
          .returning();

        const document = documentRows[0];
        const generated = await generateLegalNewsDraft({
          title: official.title,
          officialUrl: official.url,
          sourceText: official.content,
        });

        if (generated.skipped) {
          await db
            .update(sourceItems)
            .set({ status: "skipped", processedAt: new Date() })
            .where(eq(sourceItems.id, item.id));
          summary.skipped += 1;
          continue;
        }

        const draftRows = await db
          .insert(drafts)
          .values({
            sourceItemId: item.id,
            documentId: document.id,
            content: generated.content,
            status: "pending",
            confidence: null,
            model: generated.model,
          })
          .onConflictDoNothing({ target: drafts.sourceItemId })
          .returning();

        const draft = draftRows[0];
        if (!draft) continue;

        const reviewMessage = await sendDraftForReview({
          id: draft.id,
          content: draft.content,
        });

        await db
          .update(drafts)
          .set({
            reviewMessageId: String(reviewMessage.message_id),
            updatedAt: new Date(),
          })
          .where(eq(drafts.id, draft.id));

        await db
          .update(sourceItems)
          .set({ status: "drafted", processedAt: new Date() })
          .where(eq(sourceItems.id, item.id));

        summary.draftsCreated += 1;
      } catch (error) {
        summary.failed += 1;
        const message = error instanceof Error ? error.message : "Unknown processing error";

        await db
          .update(sourceItems)
          .set({
            status: "failed",
            errorCode: message.slice(0, 250),
            processedAt: new Date(),
          })
          .where(eq(sourceItems.id, item.id));

        await log("error", "item_process", message, item.id, {
          sourceUrl: signal.sourceUrl,
          officialUrl: signal.officialUrl,
        });
      }
    }
  }

  return summary;
}

export async function claimDraftForPublish(draftId: string) {
  const db = getDb();
  const rows = await db
    .update(drafts)
    .set({ status: "publishing", updatedAt: new Date() })
    .where(and(eq(drafts.id, draftId), eq(drafts.status, "pending")))
    .returning();

  return rows[0] ?? null;
}
