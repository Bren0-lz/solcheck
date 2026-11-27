import { AppLang, BriefingResponse } from "./types";

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel (Multilingual v2)

export function isElevenLabsConfigured(): boolean {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  return Boolean(key && !key.includes("<") && key.length > 8);
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

  const voiceId =
    lang === "pt"
      ? process.env.ELEVENLABS_VOICE_ID_PT?.trim() || DEFAULT_VOICE_ID
      : process.env.ELEVENLABS_VOICE_ID_EN?.trim() || DEFAULT_VOICE_ID;

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(
      `ElevenLabs TTS failed (${response.status}): ${errBody.slice(0, 200)}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const audioBase64 = Buffer.from(arrayBuffer).toString("base64");

  return {
    audioBase64,
    mimeType: "audio/mpeg",
    lang,
    charCount: cleanText.length,
  };
}
