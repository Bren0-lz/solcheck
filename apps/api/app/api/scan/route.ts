import { NextRequest } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { jsonWithCors, optionsCors } from "@/lib/cors";
import { scanSolanaWallet } from "@/lib/solana";
import { persistScanSnapshot } from "@/lib/supabase";
import { ScanRequest, ScanResponse, SolanaCluster } from "@/lib/types";

export async function OPTIONS() {
  return optionsCors();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ScanRequest>;
    const walletAddress = body.walletAddress?.trim();

    if (!walletAddress) {
      return jsonWithCors(
        { error: "Missing required field: walletAddress" },
        400
      );
    }

    try {
      new PublicKey(walletAddress);
    } catch {
      return jsonWithCors(
        { error: "Invalid Solana wallet Base58 address." },
        400
      );
    }

    const cluster: SolanaCluster =
      body.cluster === "mainnet-beta" ? "mainnet-beta" : "devnet";

    const scanResult = await scanSolanaWallet(walletAddress, cluster);

    const { snapshotId, createdAt } = await persistScanSnapshot({
      walletAddress: scanResult.walletAddress,
      cluster: scanResult.cluster,
      solBalance: scanResult.solBalance,
      emptyTokenAccounts: scanResult.emptyAccounts.length,
      activeTokenAccounts: scanResult.activeTokenAccountsCount,
      reclaimableSol: scanResult.totalReclaimableSol,
      healthScore: scanResult.healthScore,
      riskFlags: scanResult.riskFlags,
    });

    const response: ScanResponse = {
      snapshotId,
      ...scanResult,
      scannedAt: createdAt,
    };

    return jsonWithCors(response);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to scan wallet on Solana RPC.";
    console.error("[POST /api/scan] Error:", err);
    return jsonWithCors({ error: message }, 500);
  }
}
