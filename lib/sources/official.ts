import { createHash } from "node:crypto";

const OFFICIAL_DOMAINS = new Set([
  "lex.uz",
  "www.lex.uz",
  "gov.uz",
  "www.gov.uz",
  "president.uz",
  "www.president.uz",
  "sud.uz",
  "www.sud.uz",
  "soliq.uz",
  "www.soliq.uz",
  "adliya.uz",
  "www.adliya.uz",
  "regulation.gov.uz",
  "www.regulation.gov.uz",
  "my.gov.uz",
  "www.my.gov.uz",
  "senat.uz",
  "www.senat.uz",
  "parliament.gov.uz",
  "www.parliament.gov.uz"
]);

function decodeHtml(input: string): string {
  return input
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

export function normalizeOfficialUrl(raw: string): string | null {
  try {
    const decoded = decodeHtml(raw);
    const url = new URL(decoded);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!OFFICIAL_DOMAINS.has(url.hostname.toLowerCase())) return null;

    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || key === "fbclid" || key === "gclid") {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  return decodeHtml(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtml(match[1]).slice(0, 500) : undefined;
}

export async function fetchOfficialDocument(url: string) {
  const normalizedUrl = normalizeOfficialUrl(url);
  if (!normalizedUrl) {
    throw new Error("URL is not on the official-source allowlist");
  }

  const response = await fetch(normalizedUrl, {
    headers: {
      "user-agent": "Legalbotassistend/0.1 (+legal-news-agent)",
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Official source HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
    throw new Error(`Unsupported official source content-type: ${contentType}`);
  }

  const html = await response.text();
  const text = stripHtml(html).slice(0, 60_000);
  if (text.length < 120) {
    throw new Error("Official source returned too little readable text");
  }

  return {
    url: normalizedUrl,
    title: extractTitle(html),
    content: text,
    contentHash: createHash("sha256").update(text).digest("hex"),
  };
}
