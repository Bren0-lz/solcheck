import assert from "node:assert/strict";
import test from "node:test";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair } from "@solana/web3.js";
import {
  buildReclaimOnlyTransaction,
  MAX_ACCOUNTS_PER_BATCH,
} from "../apps/mobile/src/solana/reclaim";
import { buildAtomicReclaimAndVaultTransaction } from "../apps/mobile/src/solana/vaultClient";
import type { EmptyTokenAccount } from "../shared/types";

function generateMockEmptyAccounts(count: number): EmptyTokenAccount[] {
  return Array.from({ length: count }, (_, idx) => ({
    pubkey: Keypair.generate().publicKey.toBase58(),
    mint: Keypair.generate().publicKey.toBase58(),
    programId:
      idx % 2 === 0
        ? TOKEN_PROGRAM_ID.toBase58()
        : TOKEN_2022_PROGRAM_ID.toBase58(),
    reclaimableLamports: 2_039_280,
  }));
}

test("buildReclaimOnlyTransaction enforces MAX_ACCOUNTS_PER_BATCH (10) and preserves SPL vs Token-2022 program IDs", () => {
  const owner = Keypair.generate().publicKey;
  const accounts = generateMockEmptyAccounts(14);

  const built = buildReclaimOnlyTransaction(owner, accounts);
  assert.equal(built.closedCount, MAX_ACCOUNTS_PER_BATCH);
  assert.equal(built.transaction.instructions.length, 10);
  assert.equal(built.reclaimedLamports, 10 * 2_039_280);

  assert.equal(
    built.transaction.instructions[0].programId.toBase58(),
    TOKEN_PROGRAM_ID.toBase58()
  );
  assert.equal(
    built.transaction.instructions[1].programId.toBase58(),
    TOKEN_2022_PROGRAM_ID.toBase58()
  );
});

test("buildAtomicReclaimAndVaultTransaction orders closeAccount -> initialize_vault -> deposit and fits within Solana 1232-byte limit", () => {
  const vaultProgramId = Keypair.generate().publicKey;
  process.env.EXPO_PUBLIC_VAULT_PROGRAM_ID = vaultProgramId.toBase58();

  const owner = Keypair.generate().publicKey;
  const accounts = generateMockEmptyAccounts(10); // Maximum batch size

  const built = buildAtomicReclaimAndVaultTransaction({
    ownerPubkey: owner,
    accounts,
    vaultInitialized: false,
    defaultGoalName: "SOL Reserve",
    defaultTargetSol: 1.0,
  });

  // 10 closeAccount + 1 initialize_vault + 1 deposit = 12 instructions
  assert.equal(built.closedCount, 10);
  assert.equal(built.transaction.instructions.length, 12);

  // Verify order: first 10 are SPL/Token-2022 closes, 11th is initialize_vault, 12th is deposit
  const initIx = built.transaction.instructions[10];
  const depositIx = built.transaction.instructions[11];
  assert.equal(initIx.programId.toBase58(), vaultProgramId.toBase58());
  assert.deepEqual(
    Array.from(initIx.data.subarray(0, 8)),
    [48, 191, 163, 44, 71, 129, 63, 164] // initialize_vault discriminator
  );
  assert.deepEqual(
    Array.from(depositIx.data.subarray(0, 8)),
    [242, 35, 198, 137, 82, 225, 242, 182] // deposit discriminator
  );

  // Net deposit deducts 2,000,000 lamports safety margin when initializing vault in same tx
  assert.equal(built.depositedLamports, 10 * 2_039_280 - 2_000_000);

  // Prove serialized packet size is strictly below Solana's 1232-byte MTU limit
  built.transaction.feePayer = owner;
  built.transaction.recentBlockhash = Keypair.generate().publicKey.toBase58();
  const rawBytes = built.transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
  assert.ok(
    rawBytes.length < 1232,
    `Expected serialized atomic tx < 1232 bytes, got ${rawBytes.length} bytes`
  );
});

test("buildAtomicReclaimAndVaultTransaction skips initialize_vault and routes 100% of reclaimed rent when vault already initialized", () => {
  const vaultProgramId = Keypair.generate().publicKey;
  process.env.EXPO_PUBLIC_VAULT_PROGRAM_ID = vaultProgramId.toBase58();

  const owner = Keypair.generate().publicKey;
  const accounts = generateMockEmptyAccounts(8);

  const built = buildAtomicReclaimAndVaultTransaction({
    ownerPubkey: owner,
    accounts,
    vaultInitialized: true,
  });

  // 8 closeAccount + 1 deposit = 9 instructions
  assert.equal(built.transaction.instructions.length, 9);
  assert.equal(built.depositedLamports, 8 * 2_039_280);
});
