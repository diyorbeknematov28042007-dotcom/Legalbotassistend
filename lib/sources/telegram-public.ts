import { normalizeOfficialUrl } from "@/lib/sources/official";

export type TelegramSignal = {
  externalId: string;
  sourceUrl: string;
  officialUrl: string | null;
};

function decodeHtmlAttribute(input: string): string {
  return input
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function extractOfficialUrl(block: string): string | null {
  const links = [...block.matchAll(/href="([^"]+)"/gi)].map((match) =>
    decodeHtmlAttribute(match[1]),
  );

  for (const raw of links) {
    const normalized = normalizeOfficialUrl(raw);
    if (normalized) return normalized;
  }

  return null;
}

export async function fetchTelegramPublicSignals(
  username: string,
  limit = 12,
): Promise<TelegramSignal[]> {
  const cleanUsername = username.replace(/^@/, "").trim();
  if (!/^[A-Za-z0-9_]{5,}$/.test(cleanUsername)) {
    throw new Error("Invalid Telegram public channel username");
  }

  const response = await fetch(`https://t.me/s/${cleanUsername}`, {
    headers: {
      "user-agent": "Mozilla/5.0 Legalbotassistend/0.1",
      accept: "text/html",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Telegram preview HTTP ${response.status}`);
  }

  const html = await response.text();
  const markers = [...html.matchAll(/data-post="([^"]+)"/g)];

  const signals: TelegramSignal[] = [];
  for (let i = 0; i < markers.length; i += 1) {
    const marker = markers[i];
    const ref = marker[1];
    const start = marker.index ?? 0;
    const end = markers[i + 1]?.index ?? html.length;
    const block = html.slice(start, end);

    const [channel, postId] = ref.split("/");
    if (!channel || !postId || channel.toLowerCase() !== cleanUsername.toLowerCase()) {
      continue;
    }

    signals.push({
      externalId: postId,
      sourceUrl: `https://t.me/${cleanUsername}/${postId}`,
      officialUrl: extractOfficialUrl(block),
    });
  }

  return signals.slice(-limit).reverse();
}
