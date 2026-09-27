import { runMonitor } from "@/lib/pipeline/monitor";
import { requireEnv } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${requireEnv("CRON_SECRET")}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const summary = await runMonitor();
    return Response.json({ ok: true, summary });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown monitor error",
      },
      { status: 500 },
    );
  }
}
