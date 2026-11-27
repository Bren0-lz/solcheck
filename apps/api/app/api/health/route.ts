import { jsonWithCors, optionsCors } from "@/lib/cors";
import { isElevenLabsConfigured } from "@/lib/elevenlabs";
import { getVaultProgramId } from "@/lib/solana";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function OPTIONS() {
  return optionsCors();
}

export async function GET() {
  const vaultProgram = getVaultProgramId();
  const firecrawlKey = process.env.FIRECRAWL_API_KEY?.trim();
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const rpcUrl = process.env.SOLANA_RPC_URL?.trim();

  return jsonWithCors({
    ok: true,
    service: "solcheck-api",
    cluster: "devnet",
    vaultProgramId: vaultProgram ? vaultProgram.toBase58() : null,
    integrations: {
      dedicatedSolanaRpc: Boolean(
        rpcUrl && rpcUrl.startsWith("http") && !rpcUrl.includes("<")
      ),
      vaultProgramDeployed: Boolean(vaultProgram),
      supabaseConfigured: isSupabaseConfigured(),
      firecrawlConfigured: Boolean(
        firecrawlKey && !firecrawlKey.includes("<") && firecrawlKey.length > 8
      ),
      groqConfigured: Boolean(
        groqKey && !groqKey.includes("<") && groqKey.length > 10
      ),
      elevenlabsConfigured: isElevenLabsConfigured(),
    },
    timestamp: new Date().toISOString(),
  });
}
