import { requireEnv } from "@/lib/env";

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

async function telegramCall<T>(method: string, payload: Record<string, unknown>): Promise<T> {
  const token = requireEnv("TELEGRAM_BOT_TOKEN");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  const body = (await response.json()) as TelegramApiResponse<T>;
  if (!response.ok || !body.ok || body.result === undefined) {
    throw new Error(body.description ?? `Telegram API HTTP ${response.status}`);
  }

  return body.result;
}

export async function sendDraftForReview(draft: { id: string; content: string }) {
  const chatId = requireEnv("TELEGRAM_ADMIN_CHAT_ID");
  const text = `🧾 Yangi huquqiy draft\n\n${draft.content}`.slice(0, 4000);

  return telegramCall<{ message_id: number }>("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Nashr qilish", callback_data: `publish:${draft.id}` },
          { text: "❌ Rad etish", callback_data: `reject:${draft.id}` },
        ],
      ],
    },
  });
}

export async function publishToTargetChannel(content: string) {
  return telegramCall<{ message_id: number }>("sendMessage", {
    chat_id: requireEnv("TELEGRAM_TARGET_CHANNEL_ID"),
    text: content,
    disable_web_page_preview: false,
  });
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text: string,
  showAlert = false,
) {
  return telegramCall<boolean>("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  });
}
