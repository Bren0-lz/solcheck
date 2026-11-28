import assert from "node:assert/strict";
import test from "node:test";
import { generateWalletDiagnosis } from "../apps/api/lib/advisor";
import { formatWalletOrRpcError } from "../apps/mobile/src/solana/errors";
import type { ProtocolSource, ScanResponse } from "../shared/types";

const SAMPLE_SOURCES: ProtocolSource[] = [
  {
    slug: "solana-rent",
    name: "Solana Docs — Rent & Account Fees",
    url: "https://solana.com/docs/core/fees",
    fetchedAt: "2026-11-27T12:00:00.000Z",
    cached: true,
  },
];

function makeScanResponse(overrides?: Partial<ScanResponse>): ScanResponse {
  return {
    snapshotId: "test-snap-1",
    walletAddress: "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg",
    cluster: "devnet",
    solBalance: 1.842,
    solLamports: 1_842_000_000,
    activeTokenAccountsCount: 2,
    emptyAccounts: Array.from({ length: 8 }, (_, idx) => ({
      pubkey: `ATA_${idx}`,
      mint: `MINT_${idx}`,
      programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      reclaimableLamports: 2_039_280,
    })),
    totalReclaimableLamports: 8 * 2_039_280,
    totalReclaimableSol: 0.01631424,
    delegatedAccountsCount: 0,
    healthScore: 53,
    status: "needs_attention",
    riskFlags: [
      {
        code: "LOCKED_RENT",
        severity: "high",
        value: "8 accounts / 0.0163 SOL",
      },
    ],
    vault: {
      initialized: false,
      pda: "11111111111111111111111111111111",
      goalName: null,
      targetLamports: 0,
      currentLamports: 0,
      totalDepositedLamports: 0,
      totalReclaimedRoutedLamports: 0,
      progressPercent: 0,
      createdAt: null,
    },
    scannedAt: "2026-11-27T12:00:00.000Z",
    ...overrides,
  };
}

test("formatWalletOrRpcError translates MWA cancellations and Anchor errors in EN and PT", () => {
  const cancelEn = formatWalletOrRpcError(
    new Error("java.util.concurrent.CancellationException: User declined authorization"),
    "en"
  );
  const cancelPt = formatWalletOrRpcError(
    new Error("User rejected sign_and_send_transactions"),
    "pt"
  );
  assert.match(cancelEn, /Signature cancelled in wallet/i);
  assert.match(cancelPt, /Assinatura cancelada na carteira/i);

  const vaultErrEn = formatWalletOrRpcError(
    new Error("custom program error: 0x1772"),
    "en"
  );
  assert.match(vaultErrEn, /Insufficient withdrawable balance/i);

  const rateErrPt = formatWalletOrRpcError(
    new Error("429 Too Many Requests"),
    "pt"
  );
  assert.match(rateErrPt, /429/);
});

test("generateWalletDiagnosis produces accurate EN and PT-BR voice scripts without inventing metrics", async () => {
  delete process.env.GROQ_API_KEY;
  const dirtyScan = makeScanResponse();

  const enDiag = await generateWalletDiagnosis({
    scanData: dirtyScan,
    lang: "en",
    researchContext: "Solana rent docs excerpt",
    sources: SAMPLE_SOURCES,
  });

  assert.equal(enDiag.lang, "en");
  assert.equal(enDiag.recommendedAction, "reclaim_and_vault");
  assert.ok(enDiag.headline.includes("8"));
  assert.ok(enDiag.headline.includes("0.0163"));

  const enWordCount = enDiag.voiceScript.trim().split(/\s+/).length;
  assert.ok(
    enWordCount >= 45 && enWordCount <= 90,
    `Expected EN voiceScript ~50-85 words, got ${enWordCount}`
  );

  const ptDiag = await generateWalletDiagnosis({
    scanData: dirtyScan,
    lang: "pt",
    researchContext: "Solana rent docs excerpt",
    sources: SAMPLE_SOURCES,
    userQuestion: "Como funciona o rent?",
  });

  assert.equal(ptDiag.lang, "pt");
  assert.ok(ptDiag.headline.includes("8"));
  assert.ok(ptDiag.insights.length >= 3);

  const ptWordCount = ptDiag.voiceScript.trim().split(/\s+/).length;
  assert.ok(
    ptWordCount >= 45 && ptWordCount <= 90,
    `Expected PT voiceScript ~50-85 words, got ${ptWordCount}`
  );
});
