import { GoogleGenAI } from "@google/genai";

import { optionalEnv, requireEnv } from "@/lib/env";

const MAX_SOURCE_CHARS = 45_000;

export async function generateLegalNewsDraft(input: {
  title?: string;
  officialUrl: string;
  sourceText: string;
}) {
  const model = optionalEnv("GEMINI_MODEL") ?? "gemini-2.5-flash";
  const ai = new GoogleGenAI({ apiKey: requireEnv("GEMINI_API_KEY") });

  const prompt = [
    "Sen O‘zbekiston huquqiy yangiliklari uchun muharrirsan.",
    "Faqat quyida berilgan RASMIY MANBA matnidagi faktlardan foydalan.",
    "Telegram signalidagi matn senga berilmaydi va undan fakt sifatida foydalanilmaydi.",
    "Taxmin qilma. Manbada yo‘q bo‘lgan sana, summa, shaxs, huquq yoki majburiyatni qo‘shma.",
    "Normativ hujjat kuchga kirish sanasi aniq ko‘rsatilmagan bo‘lsa, o‘zing topib yozma.",
    "Matnni o‘zbek lotin yozuvida, sodda va professional uslubda yoz.",
    "Maksimal uzunlik 3200 belgi.",
    "Format: qisqa sarlavha; 2-5 ta asosiy punkt; 'Amaliy ahamiyati' bo‘limi; oxirida 'Rasmiy manba: <URL>'.",
    "Agar rasmiy matn mazmuni yetarli bo‘lmasa, javobni aynan SKIP deb qaytar.",
    "",
    `Sarlavha: ${input.title ?? "ko‘rsatilmagan"}`,
    `Rasmiy URL: ${input.officialUrl}`,
    "",
    "RASMIY MANBA:",
    input.sourceText.slice(0, MAX_SOURCE_CHARS),
  ].join("\n");

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.2,
      maxOutputTokens: 1800,
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  if (text === "SKIP") {
    return { skipped: true as const, content: "", model };
  }

  return {
    skipped: false as const,
    content: text.slice(0, 3600),
    model,
  };
}
