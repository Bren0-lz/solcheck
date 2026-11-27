import { NextRequest } from "next/server";
import { jsonWithCors, optionsCors } from "@/lib/cors";
import {
  isElevenLabsConfigured,
  synthesizeVoiceBriefing,
} from "@/lib/elevenlabs";
import { AppLang, BriefingRequest } from "@/lib/types";

export async function OPTIONS() {
  return optionsCors();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<BriefingRequest>;
    const text = body.text?.trim();
    if (!text) {
      return jsonWithCors({ error: "Missing required field: text" }, 400);
    }

    const lang: AppLang = body.lang === "pt" ? "pt" : "en";

    if (!isElevenLabsConfigured()) {
      return jsonWithCors(
        {
          error:
            "ELEVENLABS_API_KEY is not configured yet. Set ELEVENLABS_API_KEY in apps/api/.env.local or Vercel.",
          code: "ELEVENLABS_UNCONFIGURED",
        },
        503
      );
    }

    const briefing = await synthesizeVoiceBriefing(text, lang);
    return jsonWithCors(briefing);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to synthesize ElevenLabs voice briefing.";
    console.error("[POST /api/briefing] Error:", err);
    return jsonWithCors({ error: message }, 500);
  }
}
