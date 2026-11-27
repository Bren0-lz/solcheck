import { NextRequest } from "next/server";
import { generateWalletDiagnosis } from "@/lib/advisor";
import { jsonWithCors, optionsCors } from "@/lib/cors";
import { getSolanaEcosystemResearch } from "@/lib/firecrawl";
import { updateSnapshotAiSummary } from "@/lib/supabase";
import { AnalyzeRequest, AppLang } from "@/lib/types";

export async function OPTIONS() {
  return optionsCors();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<AnalyzeRequest>;
    if (!body.walletAddress || !body.scanData) {
      return jsonWithCors(
        { error: "Missing required fields: walletAddress and scanData" },
        400
      );
    }

    const lang: AppLang = body.lang === "pt" ? "pt" : "en";
    const forceRefresh = Boolean(body.forceRefreshFirecrawl);

    const research = await getSolanaEcosystemResearch(forceRefresh);

    const analysis = await generateWalletDiagnosis({
      scanData: body.scanData,
      lang,
      researchContext: research.contextMarkdown,
      sources: research.sources,
      userQuestion: body.userQuestion?.trim() || undefined,
    });

    await updateSnapshotAiSummary({
      snapshotId: body.scanData.snapshotId,
      walletAddress: body.walletAddress,
      lang,
      summary: analysis.headline,
    });

    return jsonWithCors(analysis);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate AI diagnosis.";
    console.error("[POST /api/analyze] Error:", err);
    return jsonWithCors({ error: message }, 500);
  }
}
