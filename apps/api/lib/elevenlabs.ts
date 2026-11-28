import * as crypto from "crypto";
import { getSupabaseAdmin } from "./supabase";
import { AppLang, BriefingResponse } from "./types";

// Official ElevenLabs Premade Voice (George — included in Free Tier API, supports eleven_multilingual_v2)
const DEFAULT_PREMADE_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const SECONDARY_PREMADE_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah (Premade)
const TTS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const globalTtsCache = globalThis as unknown as {
  __solcheckTtsCache?: Map<string, string>;
};

function getMemoryTtsCache(): Map<string, string> {
  if (!globalTtsCache.__solcheckTtsCache) {
    globalTtsCache.__solcheckTtsCache = new Map();
  }
  return globalTtsCache.__solcheckTtsCache;
}

export function isElevenLabsConfigured(): boolean {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  return Boolean(key && !key.includes("<") && key.length > 8);
}

async function callElevenLabsTts(
  apiKey: string,
  voiceId: string,
  text: string
): Promise<Response> {
  return fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
      signal: AbortSignal.timeout(15000),
    }
  );
}

async function discoverFirstPremadeVoiceId(apiKey: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      voices?: Array<{ voice_id?: string; category?: string }>;
    };
    const premade = data.voices?.find(
      (v) => v.category === "premade" && v.voice_id
    );
    return premade?.voice_id ?? data.voices?.[0]?.voice_id ?? null;
  } catch {
    return null;
  }
}

export async function synthesizeVoiceBriefing(
  text: string,
  lang: AppLang
): Promise<BriefingResponse> {
  const cleanText = text.trim().slice(0, 1200);
  if (!cleanText) {
    throw new Error("Briefing text cannot be empty.");
  }

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey || apiKey.includes("<")) {
    throw new Error(
      "ELEVENLABS_API_KEY is not configured on the server. Add it to apps/api/.env.local or Vercel Environment Variables."
    );
  }

  const configuredVoiceId =
    lang === "pt"
      ? process.env.ELEVENLABS_VOICE_ID_PT?.trim() || DEFAULT_PREMADE_VOICE_ID
      : process.env.ELEVENLABS_VOICE_ID_EN?.trim() || DEFAULT_PREMADE_VOICE_ID;

  const hash = crypto
    .createHash("sha256")
    .update(`${lang}:${cleanText}`)
    .digest("hex")
    .slice(0, 24);
  const cacheSlug = `tts-${hash}`;

  // 1. Check in-memory & Supabase TTS cache first to preserve Free Tier character quota
  const memCache = getMemoryTtsCache();
  const fromMem = memCache.get(cacheSlug);
  if (fromMem) {
    return {
      audioBase64: fromMem,
      mimeType: "audio/mpeg",
      lang,
      charCount: cleanText.length,
    };
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data } = await supabase
        .from("protocol_research_cache")
        .select("extracted_markdown, expires_at")
        .eq("protocol_slug", cacheSlug)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (data?.extracted_markdown) {
        memCache.set(cacheSlug, String(data.extracted_markdown));
        return {
          audioBase64: String(data.extracted_markdown),
          mimeType: "audio/mpeg",
          lang,
          charCount: cleanText.length,
        };
      }
    } catch {
      // Proceed to live ElevenLabs synthesis
    }
  }

  // 2. Call ElevenLabs; if configuredVoiceId is a Library Voice restricted on Free Tier (HTTP 402),
  // automatically retry with Free-Tier Premade voices so synthesis succeeds seamlessly!
  let response = await callElevenLabsTts(apiKey, configuredVoiceId, cleanText);

  if (response.status === 402) {
    const fallbackCandidates = [
      DEFAULT_PREMADE_VOICE_ID,
      SECONDARY_PREMADE_VOICE_ID,
    ].filter((id) => id !== configuredVoiceId);

    for (const candidateId of fallbackCandidates) {
      response = await callElevenLabsTts(apiKey, candidateId, cleanText);
      if (response.ok) break;
    }

    if (!response.ok && response.status === 402) {
      const discoveredId = await discoverFirstPremadeVoiceId(apiKey);
      if (discoveredId) {
        response = await callElevenLabsTts(apiKey, discoveredId, cleanText);
      }
    }
  }

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(
      `ElevenLabs TTS failed (${response.status}): ${errBody.slice(0, 200)}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const audioBase64 = Buffer.from(arrayBuffer).toString("base64");

  if (memCache.size >= 40) {
    const oldestKey = memCache.keys().next().value;
    if (oldestKey) memCache.delete(oldestKey);
  }
  memCache.set(cacheSlug, audioBase64);

  if (supabase) {
    try {
      const now = new Date();
      await supabase.from("protocol_research_cache").upsert(
        {
          protocol_slug: cacheSlug,
          source_url: "elevenlabs://multilingual_v2",
          extracted_markdown: audioBase64,
          structured_insights: { lang, charCount: cleanText.length },
          fetched_at: now.toISOString(),
          expires_at: new Date(now.getTime() + TTS_CACHE_TTL_MS).toISOString(),
        },
        { onConflict: "protocol_slug" }
      );
    } catch {
      // Ignore cache write failure
    }
  }

  return {
    audioBase64,
    mimeType: "audio/mpeg",
    lang,
    charCount: cleanText.length,
  };
}
