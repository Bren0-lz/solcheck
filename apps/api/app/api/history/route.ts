import { NextRequest } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { jsonWithCors, optionsCors } from "@/lib/cors";
import { fetchWalletHistory } from "@/lib/supabase";
import { SolanaCluster } from "@/lib/types";

export async function OPTIONS() {
  return optionsCors();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet")?.trim();
    const clusterParam = searchParams.get("cluster");
    const cluster: SolanaCluster =
      clusterParam === "mainnet-beta" ? "mainnet-beta" : "devnet";

    if (!walletAddress) {
      return jsonWithCors(
        { error: "Missing required query parameter: ?wallet=<address>" },
        400
      );
    }

    try {
      new PublicKey(walletAddress);
    } catch {
      return jsonWithCors({ error: "Invalid Solana wallet address." }, 400);
    }

    const history = await fetchWalletHistory(walletAddress, cluster);
    return jsonWithCors(history);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch wallet history.";
    console.error("[GET /api/history] Error:", err);
    return jsonWithCors({ error: message }, 500);
  }
}
