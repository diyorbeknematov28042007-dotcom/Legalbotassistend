import { optionalEnv, requireEnv } from "@/lib/env";
import {
  configureTelegramWebhook,
  getBotProfile,
  getChatMember,
} from "@/lib/telegram/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${requireEnv("ADMIN_SECRET")}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const baseUrl = requireEnv("APP_BASE_URL");
    const targetChannel = requireEnv("TELEGRAM_TARGET_CHANNEL_ID");

    const bot = await getBotProfile();
    const webhookConfigured = await configureTelegramWebhook(baseUrl);
    const membership = await getChatMember(targetChannel, bot.id);

    const canPublish =
      membership.status === "administrator" &&
      membership.can_post_messages !== false;

    return Response.json({
      ok: true,
      bot: {
        id: bot.id,
        username: bot.username ?? null,
        firstName: bot.first_name,
      },
      webhookConfigured,
      targetChannel,
      membershipStatus: membership.status,
      canPublish,
      adminConfigured: Boolean(
        optionalEnv("TELEGRAM_ADMIN_USER_ID") &&
          optionalEnv("TELEGRAM_ADMIN_CHAT_ID"),
      ),
      next:
        optionalEnv("TELEGRAM_ADMIN_USER_ID") &&
        optionalEnv("TELEGRAM_ADMIN_CHAT_ID")
          ? "ready"
          : "Send /start to the bot, then add returned IDs to Vercel env and redeploy.",
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown Telegram setup error",
      },
      { status: 500 },
    );
  }
}
