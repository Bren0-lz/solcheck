import { NextRequest } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { jsonWithCors, optionsCors } from "@/lib/cors";
import { getConnection } from "@/lib/solana";
import { recordReclaimEvent } from "@/lib/supabase";
import { ReclaimLogRequest, VaultActionType } from "@/lib/types";

const VALID_ACTIONS = new Set<VaultActionType>([
  "reclaim",
  "reclaim_and_vault",
  "vault_deposit",
  "vault_withdraw",
]);

export async function OPTIONS() {
  return optionsCors();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ReclaimLogRequest>;
    const walletAddress = body.walletAddress?.trim();
    const txSignature = body.txSignature?.trim();
    const actionType = body.actionType;

    if (!walletAddress || !txSignature || !actionType) {
      return jsonWithCors(
        { error: "Missing walletAddress, txSignature, or actionType." },
        400
      );
    }

    if (!VALID_ACTIONS.has(actionType)) {
      return jsonWithCors({ error: "Invalid actionType." }, 400);
    }

    try {
      new PublicKey(walletAddress);
    } catch {
      return jsonWithCors({ error: "Invalid walletAddress." }, 400);
    }

    const accountsClosed = Math.max(0, Math.floor(Number(body.accountsClosed ?? 0)));
    const solAmount = Math.max(0, Number(body.solAmount ?? 0));

    // Optional non-blocking verification on Devnet RPC
    let verifiedOnChain = false;
    try {
      const connection = getConnection("devnet");
      const statusRes = await connection.getSignatureStatus(txSignature);
      if (statusRes?.value && !statusRes.value.err) {
        verifiedOnChain = true;
      }
    } catch {
      // Do not fail persistence if RPC hasn't indexed signature yet
    }

    const saved = await recordReclaimEvent({
      walletAddress,
      txSignature,
      actionType,
      accountsClosed,
      solAmount,
    });

    return jsonWithCors({
      ok: true,
      eventId: saved.eventId,
      createdAt: saved.createdAt,
      verifiedOnChain,
      explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to log transaction event.";
    console.error("[POST /api/reclaim-log] Error:", err);
    return jsonWithCors({ error: message }, 500);
  }
}
