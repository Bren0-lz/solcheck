import { createCloseAccountInstruction } from "@solana/spl-token";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { EmptyTokenAccount } from "../types/api";

/**
 * Maximum empty SPL accounts closed per transaction to stay safely below
 * Solana's 1232-byte packet limit (especially when combined with Anchor vault instructions).
 */
export const MAX_ACCOUNTS_PER_BATCH = 10;

export function buildCloseEmptyAccountsInstructions(
  ownerPubkey: PublicKey,
  accounts: EmptyTokenAccount[]
): {
  instructions: TransactionInstruction[];
  selectedBatch: EmptyTokenAccount[];
  reclaimedLamports: number;
} {
  const selectedBatch = accounts.slice(0, MAX_ACCOUNTS_PER_BATCH);

  const instructions = selectedBatch.map((acc) =>
    createCloseAccountInstruction(
      new PublicKey(acc.pubkey),
      ownerPubkey, // Refund rent lamports directly to wallet owner
      ownerPubkey, // Authority
      [],
      new PublicKey(acc.programId) // Supports both SPL Token and Token-2022
    )
  );

  const reclaimedLamports = selectedBatch.reduce(
    (sum, acc) => sum + acc.reclaimableLamports,
    0
  );

  return {
    instructions,
    selectedBatch,
    reclaimedLamports,
  };
}

export function buildReclaimOnlyTransaction(
  ownerPubkey: PublicKey,
  accounts: EmptyTokenAccount[]
): {
  transaction: Transaction;
  closedCount: number;
  reclaimedLamports: number;
} {
  const { instructions, selectedBatch, reclaimedLamports } =
    buildCloseEmptyAccountsInstructions(ownerPubkey, accounts);

  if (instructions.length === 0) {
    throw new Error("No empty SPL token accounts selected to reclaim.");
  }

  const transaction = new Transaction().add(...instructions);

  return {
    transaction,
    closedCount: selectedBatch.length,
    reclaimedLamports,
  };
}
