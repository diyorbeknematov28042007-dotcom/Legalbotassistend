import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { drafts, processingLogs, publishedPosts } from "@/lib/db/schema";
import { requireEnv } from "@/lib/env";
import {
  answerCallbackQuery,
  publishToTargetChannel,
} from "@/lib/telegram/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TelegramUpdate = {
  callback_query?: {
    id: string;
    from: { id: number };
    data?: string;
  };
};

async function rejectDraft(draftId: string) {
  const db = getDb();
  return db
    .update(drafts)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(and(eq(drafts.id, draftId), eq(drafts.status, "pending")))
    .returning();
}

async function publishDraft(draftId: string) {
  const db = getDb();

  const claimed = await db
    .update(drafts)
    .set({ status: "publishing", updatedAt: new Date() })
    .where(and(eq(drafts.id, draftId), eq(drafts.status, "pending")))
    .returning();

  const draft = claimed[0];
  if (!draft) {
    return { status: "already_processed" as const };
  }

  try {
    const sent = await publishToTargetChannel(draft.content);

    await db.transaction(async (tx) => {
      await tx.insert(publishedPosts).values({
        draftId: draft.id,
        telegramMessageId: String(sent.message_id),
        targetChannel: requireEnv("TELEGRAM_TARGET_CHANNEL_ID"),
      });

      await tx
        .update(drafts)
        .set({ status: "published", updatedAt: new Date() })
        .where(eq(drafts.id, draft.id));
    });

    return { status: "published" as const, messageId: sent.message_id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown publish error";

    await db
      .update(drafts)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(drafts.id, draft.id));

    await db.insert(processingLogs).values({
      level: "error",
      stage: "publish",
      message,
      meta: { draftId: draft.id },
    });

    throw error;
  }
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== requireEnv("TELEGRAM_WEBHOOK_SECRET")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const update = (await request.json()) as TelegramUpdate;
  const callback = update.callback_query;

  if (!callback?.data) {
    return Response.json({ ok: true, ignored: true });
  }

  if (String(callback.from.id) !== requireEnv("TELEGRAM_ADMIN_USER_ID")) {
    await answerCallbackQuery(callback.id, "Ruxsat yo‘q.", true);
    return Response.json({ ok: true, ignored: true });
  }

  const [action, draftId] = callback.data.split(":");
  if (!draftId || !["publish", "reject"].includes(action)) {
    await answerCallbackQuery(callback.id, "Noto‘g‘ri buyruq.", true);
    return Response.json({ ok: true, ignored: true });
  }

  try {
    if (action === "reject") {
      const rows = await rejectDraft(draftId);
      await answerCallbackQuery(
        callback.id,
        rows.length ? "Draft rad etildi." : "Draft avval qayta ishlangan.",
      );
      return Response.json({ ok: true });
    }

    const result = await publishDraft(draftId);
    await answerCallbackQuery(
      callback.id,
      result.status === "published" ? "Kanalga yuborildi." : "Draft avval qayta ishlangan.",
    );
    return Response.json({ ok: true, result });
  } catch (error) {
    await answerCallbackQuery(callback.id, "Nashrda xato yuz berdi.", true);
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
