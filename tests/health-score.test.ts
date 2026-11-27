import assert from "node:assert/strict";
import test from "node:test";
import { computeHealthScoreAndFlags } from "../apps/api/lib/solana";
import type { VaultState } from "../shared/types";

function makeVault(overrides?: Partial<VaultState>): VaultState {
  return {
    initialized: false,
    pda: "11111111111111111111111111111111",
    goalName: null,
    targetLamports: 0,
    currentLamports: 0,
    totalDepositedLamports: 0,
    totalReclaimedRoutedLamports: 0,
    progressPercent: 0,
    createdAt: null,
    ...overrides,
  };
}

test("computeHealthScoreAndFlags: clean wallet with funded Anchor vault reaches 100 (healthy)", () => {
  const result = computeHealthScoreAndFlags({
    solBalance: 1.5,
    emptyAccountsCount: 0,
    totalReclaimableSol: 0,
    activeTokenAccountsCount: 3,
    delegatedAccountsCount: 0,
    vault: makeVault({
      initialized: true,
      goalName: "SOL Reserve",
      targetLamports: 1_000_000_000,
      currentLamports: 250_000_000,
      progressPercent: 25,
    }),
  });

  assert.equal(result.healthScore, 100);
  assert.equal(result.status, "healthy");
  assert.equal(result.riskFlags.length, 0);
});

test("computeHealthScoreAndFlags: dirty demo wallet with 8 empty ATAs and idle SOL is penalized deterministically", () => {
  // Base 100 - (8 * 4 = 32) - 15 (idle SOL) = 53 (needs_attention) when activeTokenAccountsCount >= 2
  const result = computeHealthScoreAndFlags({
    solBalance: 1.842,
    emptyAccountsCount: 8,
    totalReclaimableSol: 0.01631424,
    activeTokenAccountsCount: 2,
    delegatedAccountsCount: 0,
    vault: makeVault({ initialized: false }),
  });

  assert.equal(result.healthScore, 53);
  assert.equal(result.status, "needs_attention");
  assert.ok(result.riskFlags.some((f) => f.code === "LOCKED_RENT" && f.severity === "high"));
  assert.ok(result.riskFlags.some((f) => f.code === "IDLE_SOL"));
  assert.ok(result.riskFlags.some((f) => f.code === "NO_SAVINGS_GOAL"));
});

test("computeHealthScoreAndFlags: caps empty ATA penalty at -36 and delegation penalty at -20", () => {
  // Base 100 - 36 (15 empty accounts capped) - 15 (idle SOL) - 20 (4 delegations capped) - 10 (concentration) = 19
  const result = computeHealthScoreAndFlags({
    solBalance: 2.5,
    emptyAccountsCount: 15,
    totalReclaimableSol: 0.0305892,
    activeTokenAccountsCount: 0,
    delegatedAccountsCount: 4,
    vault: makeVault({ initialized: false }),
  });

  assert.equal(result.healthScore, 19);
  assert.equal(result.status, "leaking_value");
  assert.ok(result.riskFlags.some((f) => f.code === "ACTIVE_DELEGATION"));
  assert.ok(result.riskFlags.some((f) => f.code === "HIGH_CONCENTRATION"));
});

test("computeHealthScoreAndFlags: awards +10 bonus when vault is initialized with positive balance", () => {
  // Base 100 - 12 (3 empty accounts) + 10 (vault bonus) = 98
  const result = computeHealthScoreAndFlags({
    solBalance: 0.8,
    emptyAccountsCount: 3,
    totalReclaimableSol: 0.00611784,
    activeTokenAccountsCount: 2,
    delegatedAccountsCount: 0,
    vault: makeVault({
      initialized: true,
      goalName: "Emergency Fund",
      targetLamports: 1_000_000_000,
      currentLamports: 100_000_000,
    }),
  });

  assert.equal(result.healthScore, 98);
  assert.equal(result.status, "healthy");
});
